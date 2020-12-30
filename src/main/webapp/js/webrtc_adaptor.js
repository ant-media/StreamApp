/**
 *
 * @returns
 */

import {PeerStats} from "./peer_stats.js"
import {WebSocketAdaptor} from "./websocket_adaptor.js"

export class WebRTCAdaptor
{
	constructor(initialValues){
		this.peerconnection_config = null;
		this.sdp_constraints = null;
		this.remotePeerConnection = new Array();
		this.remotePeerConnectionStats = new Array();
		this.remoteDescriptionSet = new Array();
		this.iceCandidateList = new Array();
		this.roomName = null;
		this.videoTrackSender = null;
		this.audioTrackSender = null;
		this.playStreamId = new Array();
		this.currentVolume = null;

		this.audioContext = null;
	    this.soundOriginGainNode = null;
		this.secondStreamGainNode = null;
		this.localStream = null;
		this.bandwidth = 900; //default bandwidth kbps
		this.isMultiPeer = false; //used for multiple peer client
		this.multiPeerStreamId = null;   //used for multiple peer client
		this.isWebSocketTriggered = false;
		this.webSocketAdaptor = null;
		this.isPlayMode = false;
		this.debug = false;

		this.publishMode="camera"; //screen, screen+camera

		/**
		 * Supported candidate types. Below types are for both sending and receiving candidates.
		 * It means if when client receives candidate from STUN server, it sends to the server if candidate's protocol
		 * is in the list. Likely, when client receives remote candidate from server, it adds as ice candidate
		 * if candidate protocol is in the list below.
		 */
		this.candidateTypes = ["udp", "tcp"];


		this.desktopStream = null;

		/**
		 * The cam_location below is effective when camera and screen is send at the same time.
		 * possible values are top and bottom. It's on right all the time
		 */
		this.camera_location = "top"

		/**
		 * The cam_margin below is effective when camera and screen is send at the same time.
		 * This is the margin value in px from the edges
		 */
		this.camera_margin = 15;

		/**
		 * this camera_percent is how large the camera view appear on the screen. It's %15 by default.
		 */
		this.camera_percent = 15;

		for(var key in initialValues) {
			if(initialValues.hasOwnProperty(key)) {
				this[key] = initialValues[key];
			}
		}

		this.localVideo = document.getElementById(this.localVideoId);
		this.remoteVideo = document.getElementById(this.remoteVideoId);

		// It should be compatible with previous version
		if(this.mediaConstraints.video == "camera") {
			this.publishMode="camera";
		}
		else if(this.mediaConstraints.video == "screen") {
			this.publishMode="screen";
		}
		else if(this.mediaConstraints.video == "screen+camera") {
			this.publishMode="screen+camera";
		}
				

		if (!this.isPlayMode && typeof this.mediaConstraints != "undefined" && this.localStream == null)
		{
			this.checkWebRTCPermissions();
			//Check browser support for screen share function
			this.checkBrowserScreenShareSupported();

			// Get devices only in publish mode.
			this.getDevices();
			this.trackDeviceChange();

			if (typeof this.mediaConstraints.video != "undefined" && this.mediaConstraints.video != false)
			{
				this.openStream(this.mediaConstraints, this.mode);	
			}
			else {
				// get only audio
				var media_audio_constraint = { audio: this.mediaConstraints.audio };
				this.navigatorUserMedia(media_audio_constraint , stream => {
					this.gotStream(stream);
				}, true)
			}
		}
		else {
			//just playing, it does not open any stream
			if (this.webSocketAdaptor == null || this.webSocketAdaptor.isConnected() == false) {
				this.webSocketAdaptor = new WebSocketAdaptor({websocket_url : this.websocket_url, webrtcadaptor : this, callback : this.callback, callbackError : this.callbackError, debug : this.debug});
			}
		}
	}
	setDesktopwithCameraSource(stream, streamId, audioStream, onEndedCallback) 
	{
		this.desktopStream = stream;
		this.navigatorUserMedia({video: true, audio: false},cameraStream => {

			//create a canvas element
			var canvas = document.createElement("canvas");
			var canvasContext = canvas.getContext("2d");

			//create video element for screen
			//var screenVideo = document.getElementById('sourceVideo');
			var screenVideo = document.createElement('video');

			screenVideo.srcObject = stream;
			screenVideo.play();
			//create video element for camera
			var cameraVideo = document.createElement('video');

			cameraVideo.srcObject = cameraStream;
			cameraVideo.play();
			var canvasStream = canvas.captureStream(15);

			if(this.localStream == null){
				this.gotStream(canvasStream);
			}
			else{
				this.updateVideoTrack(canvasStream,streamId,this.mediaConstraints,onended,null);
			}
			if (onEndedCallback != null) {
				stream.getVideoTracks()[0].onended = function(event) {
					onEndedCallback(event);
				}
			}

			//update the canvas
			setInterval(() => {
				//draw screen to canvas
				canvas.width = screenVideo.videoWidth;
				canvas.height = screenVideo.videoHeight;
				canvasContext.drawImage(screenVideo, 0, 0, canvas.width, canvas.height);

				var cameraWidth = screenVideo.videoWidth * (this.camera_percent/100);
				var cameraHeight = (cameraVideo.videoHeight/cameraVideo.videoWidth)*cameraWidth

				var positionX = (canvas.width - cameraWidth) - this.camera_margin;
				var positionY;

				if (this.camera_location == "top") {
					positionY = this.camera_margin;
				}
				else { //if not top, make it bottom
					//draw camera on right bottom corner
					positionY = (canvas.height - cameraHeight) - this.camera_margin;
				}
				canvasContext.drawImage(cameraVideo, positionX, positionY, cameraWidth, cameraHeight);
			}, 66);
		}, true)
	}
	trackDeviceChange(){
		navigator.mediaDevices.ondevicechange = () => {
			this.getDevices();
		}
	}
	getDevices(){
		navigator.mediaDevices.enumerateDevices().then(devices => {
			let deviceArray = new Array();
			let checkAudio = false
			devices.forEach(device => {	
				if (device.kind == "audioinput" || device.kind == "videoinput") {
					deviceArray.push(device);
					if(device.kind=="audioinput"){
						checkAudio = true;
					}
				}
			});
			this.callback("available_devices", deviceArray);
			if(checkAudio == false && this.localStream == null){
				console.log("Audio input not found")
				console.log("Retrying to get user media without audio")
				this.openStream({video : true, audio : false}, this.mode)
			}
		}).catch(err => {
			console.error("Cannot get devices -> error name: " + err.name + ": " + err.message);
		});
	}

	prepareStreamTracks(mediaConstraints,audioConstraint,stream,streamId) 
	{
		//this trick, getting audio and video separately, make us add or remove tracks on the fly
		var audioTrack = stream.getAudioTracks()
		if (audioTrack.length > 0 && this.publishMode == "camera") {
			audioTrack[0].stop();
			stream.removeTrack(audioTrack[0]);
		}
		//now get only audio to add this stream
		if (audioConstraint != "undefined" && audioConstraint != false) {
			var media_audio_constraint = { audio: audioConstraint};
			this.navigatorUserMedia(media_audio_constraint, audioStream => {

				audioStream = this.setGainNodeStream(audioStream);

				//add callback if desktop is sharing
				var onended = event => {
					this.callback("screen_share_stopped");
					this.setVideoCameraSource(streamId, mediaConstraints, null, true);
				}

				if(this.publishMode == "screen"){
					this.updateVideoTrack(stream,streamId,mediaConstraints,onended,true);
					if(audioTrack.length > 0 ){
						var mixedStream = this.mixAudioStreams(stream, audioStream, streamId);
						this.updateAudioTrack(mixedStream,streamId,null);
					}
					else{
						this.updateAudioTrack(audioStream,streamId,null);
					}
				}
				else if(this.publishMode == "screen+camera" ){
					if(audioTrack.length > 0 ){
						var mixedStream = this.mixAudioStreams(stream, audioStream, streamId);
						this.updateAudioTrack(mixedStream,streamId,null);
						this.setDesktopwithCameraSource(stream,streamId, mixedStream,onended);
					}
					else{
						this.updateAudioTrack(audioStream,streamId,null);
						this.setDesktopwithCameraSource(stream,streamId,audioStream,onended);
					}
				}
				else{
					if(audioConstraint != false && audioConstraint != undefined){
						stream.addTrack(audioStream.getAudioTracks()[0]);
					}
					this.gotStream(stream);
				}
			}, true)
		}
		else {
			if(typeof audioStream != "undefined" && audioStream.getAudioTracks()[0] != null){
				stream.addTrack(audioStream.getAudioTracks()[0]);
			}
			this.gotStream(stream);
		}
	}

	navigatorUserMedia(mediaConstraints, func ,catch_error)
	{
		if( catch_error == true){
		navigator.mediaDevices.getUserMedia(mediaConstraints).then(func).catch(error => {
			if (error.name == "NotFoundError"){
				this.getDevices()
			}else{
				this.callbackError(error.name, error.message);
			}
			});
		}else {
			navigator.mediaDevices.getUserMedia(mediaConstraints).then(func)
		}
	}

	/**
	 * Get user media
	 */
	getUserMedia(mediaConstraints, audioConstraint, streamId) 
	{
		// Check Media Constraint video value screen or screen + camera
		if(this.publishMode == "screen+camera" || this.publishMode == "screen"){
			navigator.mediaDevices.getDisplayMedia(mediaConstraints)
			.then(stream =>{
				this.prepareStreamTracks(mediaConstraints,audioConstraint,stream, streamId);

			})
			.catch(error => {
				if (error.name === "NotAllowedError") {
					console.debug("Permission denied error");
					this.callbackError("ScreenSharePermissionDenied");

					// Redirect Default Stream Camera
					if(this.localStream == null){

						var mediaConstraints = {
							video : true,
							audio : true
						};

						this.openStream(mediaConstraints);
					}
					else{
						this.switchVideoCameraCapture(streamId);
					}

				}
			});
		}
		// If mediaConstraints only user camera
		else {
			this.navigatorUserMedia(mediaConstraints, (stream =>{
				this.prepareStreamTracks(mediaConstraints,audioConstraint,stream, streamId);
			}),true);
		}
	}

	/**
	 * Open media stream, it may be screen, camera or audio
	 */
	openStream(mediaConstraints)
	{
		this.mediaConstraints = mediaConstraints;
		var audioConstraint = false;
		if (typeof mediaConstraints.audio != "undefined" && mediaConstraints.audio != false) {
			audioConstraint = mediaConstraints.audio;
		}

		if (typeof mediaConstraints.video != "undefined") {
			this.getUserMedia(mediaConstraints, audioConstraint);
		}
		else {
			console.error("MediaConstraint video is not defined");
			this.callbackError("media_constraint_video_not_defined");
		}
	}

	/**
	 * Closes stream, if you want to stop peer connection, call stop(streamId)
	 */
	closeStream() 
	{
		this.localStream.getVideoTracks().forEach(function(track) {
			track.onended = null;
			track.stop();
		});

		this.localStream.getAudioTracks().forEach(function(track) {
			track.onended = null;
			track.stop();
		});
	}
	/*
	* Checks if we is permitted from browser
	*/
	checkWebRTCPermissions(){
		if (!("WebSocket" in window)) {
			console.log("WebSocket not supported.");
			this.callbackError("WebSocketNotSupported");
			return;
		}

		if (typeof navigator.mediaDevices == "undefined" && this.isPlayMode == false) {
			console.log("Cannot open camera and mic because of unsecure context. Please Install SSL(https)");
			this.callbackError("UnsecureContext");
			return;
		}
		if (typeof navigator.mediaDevices == "undefined" || navigator.mediaDevices == undefined || navigator.mediaDevices == null ) {
			this.callbackError("getUserMediaIsNotAllowed");
		}
	}

	/**
	 * Checks browser supports screen share feature
	 * if exist it calls callback with "browser_screen_share_supported"
	 */

	checkBrowserScreenShareSupported() 
	{
		if ((typeof navigator.mediaDevices != "undefined"  && navigator.mediaDevices.getDisplayMedia) || navigator.getDisplayMedia ) {
			this.callback("browser_screen_share_supported");
		}
	};

	enableSecondStreamInMixedAudio(enable) 
	{
		
		if (this.secondStreamGainNode != null) {
			if (enable) {
				this.secondStreamGainNode.gain.value = 1;
			}
			else {
				this.secondStreamGainNode.gain.value = 0;
			}
		}
	}

	publish(streamId, token, subscriberId, subscriberCode) 
	{
		//If it started with playOnly mode and wants to publish now
		if(this.localStream == null){
			this.navigatorUserMedia(this.mediaConstraints, (stream => {
				this.gotStream(stream);
				var jsCmd = {
					command : "publish",
					streamId : streamId,
					token : token,
					subscriberId: typeof subscriberId !== undefined ? subscriberId : "" ,
					subscriberCode: typeof subscriberCode !== undefined ? subscriberCode : "",
					video: this.localStream.getVideoTracks().length > 0 ? true : false,
							audio: this.localStream.getAudioTracks().length > 0 ? true : false,
				};
				this.webSocketAdaptor.send(JSON.stringify(jsCmd));
			}), false);
		}else{
			var jsCmd = {
					command : "publish",
					streamId : streamId,
					token : token,
					subscriberId: typeof subscriberId !== undefined ? subscriberId : "" ,
					subscriberCode: typeof subscriberCode !== undefined ? subscriberCode : "",
					video: this.localStream.getVideoTracks().length > 0 ? true : false,
							audio: this.localStream.getAudioTracks().length > 0 ? true : false,
			};
		}
		this.webSocketAdaptor.send(JSON.stringify(jsCmd));
	}

	joinRoom(roomName, streamId) 
	{
		this.roomName = roomName;

		var jsCmd = {
				command : "joinRoom",
				room: roomName,
				streamId: streamId,
		}
		this.webSocketAdaptor.send(JSON.stringify(jsCmd));
	}
	
	play(streamId, token, roomId, enableTracks, subscriberId, subscriberCode) 
	{
		this.playStreamId.push(streamId);
		var jsCmd =
		{
				command : "play",
				streamId : streamId,
				token : token,
				room : roomId,
				trackList : enableTracks,
				subscriberId: typeof subscriberId !== undefined ? subscriberId : "" ,
				subscriberCode: typeof subscriberCode !== undefined ? subscriberCode : "",
		}

		this.webSocketAdaptor.send(JSON.stringify(jsCmd));
	}

	stop(streamId) 
	{
		this.closePeerConnection(streamId);

		var jsCmd = {
				command : "stop",
				streamId: streamId,
		};

		this.webSocketAdaptor.send(JSON.stringify(jsCmd));
	}

	join(streamId) 
	{
		var jsCmd = {
				command : "join",
				streamId : streamId,
				multiPeer : this.isMultiPeer && this.multiPeerStreamId == null,
				mode : this.isPlayMode ? "play" : "both",
		};

		this.webSocketAdaptor.send(JSON.stringify(jsCmd));
	}

	leaveFromRoom(roomName) 
	{
		this.roomName = roomName;
		var jsCmd = {
				command : "leaveFromRoom",
				room: roomName,
		};
		console.log ("leave request is sent for "+ roomName);

		this.webSocketAdaptor.send(JSON.stringify(jsCmd));
	}

	leave(streamId) 
	{
		var jsCmd = {
				command : "leave",
				streamId: this.isMultiPeer && this.multiPeerStreamId != null ? this.multiPeerStreamId : streamId,
		};

		this.webSocketAdaptor.send(JSON.stringify(jsCmd));
		this.closePeerConnection(streamId);
		this.multiPeerStreamId = null;
	}

	getStreamInfo(streamId) 
	{
		var jsCmd = {
				command : "getStreamInfo",
				streamId: streamId,
		};
		this.webSocketAdaptor.send(JSON.stringify(jsCmd));
	}
	
	getRoomInfo(roomName,streamId) 
	{
		var jsCmd = {
				command : "getRoomInfo",
				streamId : streamId,
				room: roomName,
		};
		this.webSocketAdaptor.send(JSON.stringify(jsCmd));
	}

	enableTrack(mainTrackId, trackId, enabled) 
	{
		var jsCmd = {
				command : "enableTrack",
				streamId : mainTrackId,
				trackId : trackId,
				enabled : enabled,
		};
		this.webSocketAdaptor.send(JSON.stringify(jsCmd));
	}

	getTracks(streamId, token) 
	{
		this.playStreamId.push(streamId);
		var jsCmd =
		{
				command : "getTrackList",
				streamId : streamId,
				token : token,
		}

		this.webSocketAdaptor.send(JSON.stringify(jsCmd));
	}

	gotStream(stream)
	{
		stream = this.setGainNodeStream(stream);

		this.localStream = stream;
		this.localVideo.srcObject = stream;
		
		if (this.webSocketAdaptor == null || this.webSocketAdaptor.isConnected() == false) {
			this.webSocketAdaptor = new WebSocketAdaptor({websocket_url : this.websocket_url, webrtcadaptor : this, callback : this.callback, callbackError : this.callbackError, debug: this.debug})
		}
		this.getDevices();
	}
	
	switchDesktopCapture(streamId){
		this.publishMode = "screen";

		var audioConstraint = false;
		if (typeof this.mediaConstraints.audio != "undefined" && this.mediaConstraints.audio != false) {
			audioConstraint = this.mediaConstraints.audio;
		}

		this.getUserMedia(this.mediaConstraints, audioConstraint, streamId);
	}
	/*
	* This method mixed the first stream audio to the second stream audio and 
	* returns mixed stream. 
	* stream: Initiali stream that contain video and audio
	* 
	*/
	mixAudioStreams(stream, secondStream,streamId)
	{
		//console.debug("audio stream track count: " + audioStream.getAudioTracks().length);
		var composedStream = new MediaStream();
		//added the video stream from the screen
		stream.getVideoTracks().forEach(function(videoTrack) {
			composedStream.addTrack(videoTrack);
		});

		this.audioContext = new AudioContext();
		var audioDestionation = this.audioContext.createMediaStreamDestination();

		if (stream.getAudioTracks().length > 0) {
			this.soundOriginGainNode = this.audioContext.createGain();

			//Adjust the gain for screen sound
			this.soundOriginGainNode.gain.value = 1;
			var audioSource = this.audioContext.createMediaStreamSource(stream);

			audioSource.connect(this.soundOriginGainNode).connect(audioDestionation);
		}
		else {
			console.debug("Origin stream does not have audio track")
		}

		if (secondStream.getAudioTracks().length > 0) {
			this.secondStreamGainNode = this.audioContext.createGain();
			
			//Adjust the gain for second sound
			this.secondStreamGainNode.gain.value = 1;

			var audioSource2 = this.audioContext.createMediaStreamSource(secondStream);
			audioSource2.connect(this.secondStreamGainNode).connect(audioDestionation);
		}
		else {
			console.debug("Second stream does not have audio track")
		}

		audioDestionation.stream.getAudioTracks().forEach(function(track) {
			composedStream.addTrack(track);
			console.log("audio destination add track");
		});

		return composedStream;
	}

	setGainNodeStream(stream){

		// Get the videoTracks from the stream.
  		const videoTracks = stream.getVideoTracks();

  		// Get the audioTracks from the stream.
  		const audioTracks = stream.getAudioTracks();

  		/**
   		* Create a new audio context and build a stream source,
   		* stream destination and a gain node. Pass the stream into 
   		* the mediaStreamSource so we can use it in the Web Audio API.
   		*/
  		this.audioContext = new AudioContext();
  		let mediaStreamSource = this.audioContext.createMediaStreamSource(stream);
  		let mediaStreamDestination = this.audioContext.createMediaStreamDestination();
  		this.soundOriginGainNode = this.audioContext.createGain();

  		/**
   		* Connect the stream to the gainNode so that all audio
   		* passes through the gain and can be controlled by it.
   		* Then pass the stream from the gain to the mediaStreamDestination
   		* which can pass it back to the RTC client.
   		*/
  		mediaStreamSource.connect(this.soundOriginGainNode);
  		this.soundOriginGainNode.connect(mediaStreamDestination);

  		if(this.currentVolume == null){
  			this.soundOriginGainNode.gain.value = 1;
  		}
  		else{
  			this.soundOriginGainNode.gain.value = this.currentVolume;
  		}

  		/**
   		* The mediaStreamDestination.stream outputs a MediaStream object
   		* containing a single AudioMediaStreamTrack. Add the video track
   		* to the new stream to rejoin the video with the controlled audio.
   		*/
  		const controlledStream = mediaStreamDestination.stream;

  		for (const videoTrack of videoTracks) {
    		controlledStream.addTrack(videoTrack);
  		}
		for (const audioTrack of audioTracks) {
    		controlledStream.addTrack(audioTrack);
  		}

  		/**
   		* Use the stream that went through the gainNode. This
   		* is the same stream but with altered input volume levels.
   		*/
   		return controlledStream;
	}

	switchAudioInputSource(streamId, deviceId) 
	{
		//stop the track because in some android devices need to close the current camera stream
		var audioTrack = this.localStream.getAudioTracks()[0];
		if (audioTrack) {
			audioTrack.stop();
		}
		else {
		   console.warn("There is no audio track in local stream");
		}

		if (typeof deviceId != "undefined" ) {
			this.mediaConstraints.audio = { "deviceId": deviceId };
		}
		this.setAudioInputSource(streamId, this.mediaConstraints, null, true, deviceId);
	}

	switchVideoCameraCapture(streamId, deviceId) 
	{
		//stop the track because in some android devices need to close the current camera stream
		var videoTrack = this.localStream.getVideoTracks()[0];
		if (videoTrack) {
			videoTrack.stop();
		}
		else {
		   console.warn("There is no video track in local stream");
		}
		
		this.publishMode = "camera";

		if (typeof deviceId != "undefined" ) {
			this.mediaConstraints.video = { "deviceId": deviceId };
		}
		this.setVideoCameraSource(streamId, this.mediaConstraints, null, true, deviceId);
	}

	switchDesktopCaptureWithCamera(streamId) 
	{
		this.publishMode = "screen+camera";

		var audioConstraint = false;
		if (typeof this.mediaConstraints.audio != "undefined" && this.mediaConstraints.audio != false) {
			audioConstraint = this.mediaConstraints.audio;
		}
		this.getUserMedia(this.mediaConstraints, audioConstraint, streamId);
	}
	
	/**
	 * This method updates the local stream. It removes existant audio track from the local stream
	 * and add the audio track in `stream` parameter to the local stream
	 */
	updateLocalAudioStream(stream, onEndedCallback) 
	{
		var audioTrack = this.localStream.getAudioTracks()[0];
		var newAudioTrack = stream.getAudioTracks()[0];
		
		if (audioTrack != null) 
		{
			this.localStream.removeTrack(audioTrack);
			audioTrack.stop();
		}

		
		this.localStream.addTrack(newAudioTrack);
		
		
		if (this.localVideo != null) 
		{   //it can be null
			this.localVideo.srcObject = this.localStream;
		}
		if (onEndedCallback != null) {
			stream.getAudioTracks()[0].onended = function(event) {
				onEndedCallback(event);
			}
		}
	}
	
	/**
	 * This method updates the local stream. It removes existant video track from the local stream
	 * and add the video track in `stream` parameter to the local stream
	 */
	updateLocalVideoStream(stream, onEndedCallback, stopDesktop) 
	{
		if (stopDesktop && this.desktopStream != null) {
			this.desktopStream.getVideoTracks()[0].stop();
		}

		var videoTrack = this.localStream.getVideoTracks()[0];
		this.localStream.removeTrack(videoTrack);
		videoTrack.stop();
		this.localStream.addTrack(stream.getVideoTracks()[0]);
		this.localVideo.srcObject = this.localStream;

		if (onEndedCallback != null) {
			stream.getVideoTracks()[0].onended = function(event) {
				onEndedCallback(event);
			}
		}
	}
	
	/**
	 * This method sets Audio Input Source. 
	 * It calls updateAudioTrack function for the update local audio stream.
	 */
	setAudioInputSource(streamId, mediaConstraints, onEndedCallback) 
	{
		this.navigatorUserMedia(mediaConstraints,stream => {
			this.updateAudioTrack(stream, streamId, mediaConstraints, onEndedCallback);
		}, true);
	}
	
	/**
	 * This method sets Video Input Source. 
	 * It calls updateVideoTrack function for the update local video stream.
	 */
	setVideoCameraSource(streamId, mediaConstraints, onEndedCallback, stopDesktop) 
	{
		this.navigatorUserMedia(mediaConstraints, stream => {
			stream = this.setGainNodeStream(stream);
			this.updateVideoTrack(stream, streamId, mediaConstraints, onEndedCallback, stopDesktop);
			this.updateAudioTrack(stream, streamId, mediaConstraints, onEndedCallback);
		}, true);
	}
	
	updateAudioTrack (stream, streamId, onEndedCallback) 
	{
		if (this.remotePeerConnection[streamId] != null) {
			var audioTrackSender = this.remotePeerConnection[streamId].getSenders().find(function(s) {
				return s.track.kind == "audio";
			});

			if (audioTrackSender) {
				audioTrackSender.replaceTrack(stream.getAudioTracks()[0]).then(result => {
					this.updateLocalAudioStream(stream, onEndedCallback);
	
				}).catch(function(error) {
					console.log(error.name);
				});
			}
			else {
				console.error("AudioTrackSender is undefined or null");
			}
		}
		else {
			this.updateLocalAudioStream(stream, onEndedCallback);
		}
	}

	updateVideoTrack(stream, streamId, mediaConstraints, onEndedCallback, stopDesktop) 
	{
		if (this.remotePeerConnection[streamId] != null) {
			var videoTrackSender = this.remotePeerConnection[streamId].getSenders().find(function(s) {
				return s.track.kind == "video";
			});

			if (videoTrackSender) {
				videoTrackSender.replaceTrack(stream.getVideoTracks()[0]).then(result => {
					this.updateLocalVideoStream(stream, onEndedCallback, stopDesktop);
	
				}).catch(error => {
					console.log(error.name);
				});
			}
			else {
				console.error("VideoTrackSender is undefined or null");
			}
		}
		else {
			this.updateLocalVideoStream(stream, onEndedCallback, stopDesktop);
		}
	}

	onTrack(event, streamId)
	{
		console.log("onTrack");
		if (this.remoteVideo != null) {
			//this.remoteVideo.srcObject = event.streams[0];
			if (this.remoteVideo.srcObject !== event.streams[0]) {
				this.remoteVideo.srcObject = event.streams[0];
				console.log('Received remote stream');
			}
		}
		else {
			var dataObj = {
					stream: event.streams[0],
					track: event.track,
					streamId: streamId
			}
			this.callback("newStreamAvailable", dataObj);
		}

	}

	iceCandidateReceived(event, streamId)
	{
		if (event.candidate) {

			var protocolSupported = false;
			
			if (event.candidate.candidate == "") {
				//event candidate can be received and its value can be "".
				//don't compare the protocols
				protocolSupported = true;
			}
			else if (typeof event.candidate.protocol == "undefined") {
				this.candidateTypes.forEach(element => {
					if (event.candidate.candidate.toLowerCase().includes(element)) {
						protocolSupported = true;
					}
				});
			}
			else {
				protocolSupported = this.candidateTypes.includes(event.candidate.protocol.toLowerCase());
			}
			

			if (protocolSupported) {

				var jsCmd = {
						command : "takeCandidate",
						streamId : streamId,
						label : event.candidate.sdpMLineIndex,
						id : event.candidate.sdpMid,
						candidate : event.candidate.candidate
				};

				if (this.debug) {
					console.log("sending ice candiate for stream Id " + streamId );
					console.log(JSON.stringify(event.candidate));
				}
				this.webSocketAdaptor.send(JSON.stringify(jsCmd));
			}
			else {
				console.log("Candidate's protocol(full sdp: "+ event.candidate.candidate +") is not supported. Supported protocols: " + this.candidateTypes);
				if (event.candidate.candidate != "") { //
					this.callbackError("protocol_not_supported", "Support protocols: " + this.candidateTypes.toString() + " candidate: " + event.candidate.candidate);
				}
			}
		}
		else {
			console.log("No event.candidate in the iceCandidate event");
		}
	}

	initDataChannel(streamId, dataChannel) 
	{
		dataChannel.onerror = (error) => {
			console.log("Data Channel Error:", error );
			var obj = {
				streamId: streamId,
				error: error
			};
			console.log("channel status: ", dataChannel.readyState);
			if (dataChannel.readyState != "closed") {
				this.callbackError("data_channel_error", obj);
			}
		};

		dataChannel.onmessage = (event) => {
			var obj = {
				streamId: streamId,
				event: event,
			};
			this.callback("data_received", obj);
		};

		dataChannel.onopen = () => {
			this.remotePeerConnection[streamId].dataChannel = dataChannel;
			console.log("Data channel is opened");
			this.callback("data_channel_opened", streamId)
		};

		dataChannel.onclose = () => {
			console.log("Data channel is closed");
			this.callback("data_channel_closed", streamId);
		};
	}

	// data channel mode can be "publish" , "play" or "peer" based on this it is decided which way data channel is created
	initPeerConnection(streamId, dataChannelMode) 
	{
		if (this.remotePeerConnection[streamId] == null)
		{
			var closedStreamId = streamId;
			console.log("stream id in init peer connection: " + streamId + " close stream id: " + closedStreamId);
			this.remotePeerConnection[streamId] = new RTCPeerConnection(this.peerconnection_config);
			this.remoteDescriptionSet[streamId] = false;
			this.iceCandidateList[streamId] = new Array();
			if (!this.playStreamId.includes(streamId))
			{
				if(this.localStream != null) {
					this.remotePeerConnection[streamId].addStream(this.localStream);
				}
			}
			this.remotePeerConnection[streamId].onicecandidate = event => {
				this.iceCandidateReceived(event, closedStreamId);
			}
			this.remotePeerConnection[streamId].ontrack = event => {
				this.onTrack(event, closedStreamId);
			}

			if (dataChannelMode == "publish") {
				//open data channel if it's publish mode peer connection 
				const dataChannelOptions = {
						ordered: true,
				};
				if (this.remotePeerConnection[streamId].createDataChannel) {
					var dataChannel = this.remotePeerConnection[streamId].createDataChannel(streamId, dataChannelOptions);
					this.initDataChannel(streamId, dataChannel);
				}
				else {
				    console.warn("CreateDataChannel is not supported");
				}

			} else if(dataChannelMode == "play") {
				//in play mode, server opens the data channel 
				this.remotePeerConnection[streamId].ondatachannel = ev => {
					this.initDataChannel(streamId, ev.channel);
				};
			}
			else {
				//for peer mode do both for now
				const dataChannelOptions = {
						ordered: true,
				};

				if (this.remotePeerConnection[streamId].createDataChannel) 
				{
					var dataChannelPeer = this.remotePeerConnection[streamId].createDataChannel(streamId, dataChannelOptions);
					this.initDataChannel(streamId, dataChannelPeer);
	
					this.remotePeerConnection[streamId].ondatachannel = ev => {
						this.initDataChannel(streamId, ev.channel);
					};
				}
				else {
				    console.warn("CreateDataChannel is not supported");
				}
			}

			this.remotePeerConnection[streamId].oniceconnectionstatechange = event => {
				var obj = {state:this.remotePeerConnection[streamId].iceConnectionState, streamId:streamId};
				this.callback("ice_connection_state_changed",obj);

				if (!this.isPlayMode) {
					if (this.remotePeerConnection[streamId].iceConnectionState == "connected") {

						this.changeBandwidth(this.bandwidth, streamId).then(() => {
							console.log("Bandwidth is changed to " + this.bandwidth);
						})
						.catch(e => console.warn(e));
					}
				}
			}

		}
	}

	closePeerConnection(streamId) 
	{	
		if (this.remotePeerConnection[streamId] != null)
		{
			if (this.remotePeerConnection[streamId].dataChannel != null) {
				this.remotePeerConnection[streamId].dataChannel.close();
			}
			if (this.remotePeerConnection[streamId].signalingState != "closed") {
				this.remotePeerConnection[streamId].close();
				this.remotePeerConnection[streamId] = null;
				delete this.remotePeerConnection[streamId];
				var playStreamIndex = this.playStreamId.indexOf(streamId);
				if (playStreamIndex != -1)
				{
					this.playStreamId.splice(playStreamIndex, 1);
				}
			}
		}

		if (this.remotePeerConnectionStats[streamId] != null)
		{
			clearInterval(this.remotePeerConnectionStats[streamId].timerId);
			delete this.remotePeerConnectionStats[streamId];
		}			
	}

	signallingState(streamId) 
	{
		if (this.remotePeerConnection[streamId] != null) {
			return this.remotePeerConnection[streamId].signalingState;
		}
		return null;
	}

	iceConnectionState(streamId) 
	{
		if (this.remotePeerConnection[streamId] != null) {
			return this.remotePeerConnection[streamId].iceConnectionState;
		}
		return null;
	}

	gotDescription(configuration, streamId)
	{
		this.remotePeerConnection[streamId]
		.setLocalDescription(configuration)
		.then(responose =>  {
			console.debug("Set local description successfully for stream Id " + streamId);

			var jsCmd = {
					command : "takeConfiguration",
					streamId : streamId,
					type : configuration.type,
					sdp : configuration.sdp

			};

			if (this.debug) {
				console.debug("local sdp: ");
				console.debug(configuration.sdp);
			}

			this.webSocketAdaptor.send(JSON.stringify(jsCmd));

		}).catch((error) =>{
			console.error("Cannot set local description. Error is: " + error);
		});
	}


	turnOffLocalCamera() 
	{
		if (this.remotePeerConnection != null) {

			var track = this.localStream.getVideoTracks()[0];
			track.enabled = false;
		}
		else {
			this.callbackError("NoActiveConnection");
		}
	}

	turnOnLocalCamera() 
	{
		//If it started in playOnly mode and wants to turn on the camera
		if(this.localStream == null){
			this.navigatorUserMedia(this.mediaConstraints, stream =>{
				this.gotStream(stream);
			}, false);
		}
		else if (this.remotePeerConnection != null) {
			var track = this.localStream.getVideoTracks()[0];
			track.enabled = true;
		}
	}

	muteLocalMic() 
	{
		if (this.remotePeerConnection != null) {
			var track = this.localStream.getAudioTracks()[0];
			track.enabled = false;
		}
		else {
			this.callbackError("NoActiveConnection");
		}
	}

	/**
	 * if there is audio it calls callbackError with "AudioAlreadyActive" parameter
	 */
	unmuteLocalMic() 
	{
		if (this.remotePeerConnection != null) {
			var track = this.localStream.getAudioTracks()[0];
			track.enabled = true;
		}
		else {
			this.callbackError("NoActiveConnection");
		}
	}

	takeConfiguration(idOfStream, configuration, typeOfConfiguration)
	{
		var streamId = idOfStream
		var type = typeOfConfiguration;
		var conf = configuration;
		var isTypeOffer = (type == "offer");

		var dataChannelMode = "publish";
		if(isTypeOffer) {
			dataChannelMode = "play";
		}

		this.initPeerConnection(streamId, dataChannelMode);

		this.remotePeerConnection[streamId].setRemoteDescription(new RTCSessionDescription({
			sdp : conf,
			type : type
		})).then(response =>  {

			if (this.debug) {
				console.debug("set remote description is succesfull with response: " + response + " for stream : "
						+ streamId + " and type: " + type);
				console.debug(conf);
			}

			this.remoteDescriptionSet[streamId] = true;
			var length = this.iceCandidateList[streamId].length;
			console.debug("Ice candidate list size to be added: " + length);
			for (var i = 0; i < length; i++) {
				this.addIceCandidate(streamId, this.iceCandidateList[streamId][i]);
			}
			this.iceCandidateList[streamId] = [];

			if (isTypeOffer) {
				//SDP constraints may be different in play mode
				console.log("try to create answer for stream id: " + streamId);

				this.remotePeerConnection[streamId].createAnswer(this.sdp_constraints)
				.then(configuration =>
						{
					console.log("created answer for stream id: " + streamId);
					this.gotDescription(configuration, streamId);
						})
						.catch((error) =>
								{
							console.error("create answer error :" + error);
								});
			}

		}).catch((error) => {
			if (this.debug) {
				console.error("set remote description is failed with error: " + error);
			}
			if(error.toString().indexOf("InvalidAccessError") > -1 || error.toString().indexOf("setRemoteDescription")  > -1){
				/**
				 * This error generally occurs in codec incompatibility.
				 * AMS for a now supports H.264 codec. This error happens when some browsers try to open it from VP8.
				 */
				this.callbackError("notSetRemoteDescription");
			}
		});

	}

	takeCandidate(idOfTheStream, tmpLabel, tmpCandidate) 
	{
		var streamId = idOfTheStream;
		var label = tmpLabel;
		var candidateSdp = tmpCandidate;

		var candidate = new RTCIceCandidate({
			sdpMLineIndex : label,
			candidate : candidateSdp
		});

		var dataChannelMode = "peer";
		this.initPeerConnection(streamId, dataChannelMode);

		if (this.remoteDescriptionSet[streamId] == true) {
			this.addIceCandidate(streamId, candidate);
		}
		else {
			console.debug("Ice candidate is added to list because remote description is not set yet");
			this.iceCandidateList[streamId].push(candidate);
		}
	};

	addIceCandidate(streamId, candidate) 
	{	
		var protocolSupported = false;
		if (candidate.candidate == "") {
			//candidate can be received and its value can be "".
			//don't compare the protocols
			protocolSupported = true;
		}
		else if (typeof candidate.protocol == "undefined") {
			this.candidateTypes.forEach(element => {
				if (candidate.candidate.toLowerCase().includes(element)) {
					protocolSupported = true;
				}
			});
		}
		else {
			protocolSupported = this.candidateTypes.includes(candidate.protocol.toLowerCase());
		}	
		
		if (protocolSupported)
		{

			this.remotePeerConnection[streamId].addIceCandidate(candidate)
			.then(response => {
				if (this.debug) {
					console.log("Candidate is added for stream " + streamId);
				}
			})
			.catch((error) => {
				console.error("ice candiate cannot be added for stream id: " + streamId + " error is: " + error  );
				console.error(candidate);
			});
		}
		else {
			if (this.debug) {
				console.log("Candidate's protocol("+candidate.protocol+") is not supported." +
						"Candidate: " + candidate.candidate +" Supported protocols:" + this.candidateTypes);
			}
		}
	};

	startPublishing(idOfStream) 
	{
		var streamId = idOfStream;

		this.initPeerConnection(streamId, "publish");

		this.remotePeerConnection[streamId].createOffer(this.sdp_constraints)
		.then(configuration => {
			this.gotDescription(configuration, streamId);
		})
		.catch((error) => {
			console.error("create offer error for stream id: " + streamId + " error: " + error);
		});
	};

	/**
	 * If we have multiple video tracks in coming versions, this method may cause some issues
	 */
	getVideoSender(streamId) 
	{
		var videoSender = null;
		if ((adapter.browserDetails.browser === 'chrome' ||
				(adapter.browserDetails.browser === 'firefox' ||
					adapter.browserDetails.browser === 'safari' &&
						adapter.browserDetails.version >= 64)) &&
						'RTCRtpSender' in window &&
						'setParameters' in window.RTCRtpSender.prototype)
		{
			if (this.remotePeerConnection[streamId] != null) {
				const senders = this.remotePeerConnection[streamId].getSenders();

				for (let i = 0; i < senders.length; i++) {
					if (senders[i].track != null && senders[i].track.kind == "video") {
						videoSender = senders[i];
						break;
					}
				}
			}

		}
		return videoSender;
	}

	/**
	 * bandwidth is in kbps
	 */
	changeBandwidth(bandwidth, streamId) 
	{
		var errorDefinition = "";

		var videoSender = this.getVideoSender(streamId);

		if (videoSender != null) {
			const parameters = videoSender.getParameters();

			if (!parameters.encodings) {
				parameters.encodings = [{}];
			}

			if (bandwidth === 'unlimited') {
				delete parameters.encodings[0].maxBitrate;
			}
			else {
				parameters.encodings[0].maxBitrate = bandwidth * 1000;
			}

			return videoSender.setParameters(parameters)
		}
		else {
			errorDefinition = "Video sender not found to change bandwidth. Streaming may not be active";
		}

		return Promise.reject(errorDefinition);
	};

	getStats(streamId)
	{
		console.log("peerstatsgetstats = " + this.remotePeerConnectionStats[streamId]);

		this.remotePeerConnection[streamId].getStats(null).then(stats =>
		{
			var bytesReceived = -1;
			var videoPacketsLost = -1;
			var audioPacketsLost = -1;
			var fractionLost = -1;
			var currentTime = -1;
			var bytesSent = -1;
			var audioLevel = -1;
			var qlr = "";
			var framesEncoded = -1;
			var width = -1;
			var height = -1;
			var fps = -1;
			var frameWidth = -1;
			var frameHeight = -1;
			var videoRoundTripTime = -1;
			var videoJitter = -1;

			var audioRoundTripTime = -1;
			var audioJitter = -1;
			
			var framesDecoded = -1;
			var framesDropped = -1;
			var framesReceived = -1;
			
			var audioJitterAverageDelay = -1;
	        var videoJitterAverageDelay = -1;


			stats.forEach(value => {

				//console.log(value);

				if (value.type == "inbound-rtp" && typeof value.kind != "undefined")
				{
					bytesReceived += value.bytesReceived;
					if (value.kind == "audio") {
						audioPacketsLost = value.packetsLost;
					}
					else if (value.kind == "video") {
						videoPacketsLost = value.packetsLost;
					}

					fractionLost += value.fractionLost;
					currentTime = value.timestamp;
					
					
				}
				else if (value.type == "outbound-rtp")
				{//TODO: SPLIT AUDIO AND VIDEO BITRATES
					bytesSent += value.bytesSent
					currentTime = value.timestamp
					qlr = value.qualityLimitationReason;
					if(value.framesEncoded != null) { //audio tracks are undefined here
						framesEncoded += value.framesEncoded;
					}
				}
				else if (value.type == "track" && typeof value.kind != "undefined" && value.kind == "audio") {
					if (typeof value.audioLevel != "undefined") {
						audioLevel = value.audioLevel;
					}
					
					if (typeof value.jitterBufferDelay != "undefined" && typeof value.jitterBufferEmittedCount != "undefined") {
						audioJitterAverageDelay = value.jitterBufferDelay/value.jitterBufferEmittedCount;
					}
				}
				else if (value.type == "track" && typeof value.kind != "undefined" && value.kind == "video") 
				{
					if (typeof value.frameWidth != "undefined") {
						frameWidth = value.frameWidth;
					}
					if (typeof value.frameHeight != "undefined") {
						frameHeight = value.frameHeight;
					}
					
					if (typeof value.framesDecoded != "undefined") {
						framesDecoded = value.framesDecoded ;
					}
					
					if (typeof value.framesDropped != "undefined") {
						framesDropped = value.framesDropped;
					}
					
					if (typeof value.framesReceived != "undefined") {
						framesReceived = value.framesReceived;
					}
					
					if (typeof value.jitterBufferDelay != "undefined" && typeof value.jitterBufferEmittedCount != "undefined") {
						videoJitterAverageDelay = value.jitterBufferDelay/value.jitterBufferEmittedCount;
					}
				}
				else if (value.type == "remote-inbound-rtp" && typeof value.kind != "undefined") {

					if (typeof value.packetsLost != "undefined") {
						if (value.kind == "video") {
							//this is the packetsLost for publishing
							videoPacketsLost = value.packetsLost;
						}
						else if (value.kind == "audio") {
							//this is the packetsLost for publishing
							audioPacketsLost = value.packetsLost;
						}
					}

					if (typeof value.roundTripTime != "undefined") {
						if (value.kind == "video") {
							videoRoundTripTime = value.roundTripTime;
						}
						else if (value.kind == "audio") {
							audioRoundTripTime = value.roundTripTime;
						}
					}

					if (typeof value.jitter != "undefined") {
						if (value.kind == "video") {
							videoJitter = value.jitter;
						}
						else if (value.kind == "audio") {
							audioJitter = value.jitter;
						}
					}
				}
				else if (value.type == "media-source")
				{
					if(value.kind == "video") { //returns video source dimensions, not necessarily dimensions being encoded by browser
						width = value.width;
						height = value.height;
						fps = value.framesPerSecond;
					}
				}
			});

			this.remotePeerConnectionStats[streamId].totalBytesReceived = bytesReceived;
			this.remotePeerConnectionStats[streamId].videoPacketsLost = videoPacketsLost;
			this.remotePeerConnectionStats[streamId].audioPacketsLost = audioPacketsLost;
			this.remotePeerConnectionStats[streamId].fractionLost = fractionLost;
			this.remotePeerConnectionStats[streamId].currentTime = currentTime;
			this.remotePeerConnectionStats[streamId].totalBytesSent = bytesSent;
			this.remotePeerConnectionStats[streamId].audioLevel = audioLevel;
			this.remotePeerConnectionStats[streamId].qualityLimitationReason = qlr;
			this.remotePeerConnectionStats[streamId].totalFramesEncoded = framesEncoded;
			this.remotePeerConnectionStats[streamId].resWidth = width;
			this.remotePeerConnectionStats[streamId].resHeight = height;
			this.remotePeerConnectionStats[streamId].srcFps = fps;
			this.remotePeerConnectionStats[streamId].frameWidth = frameWidth;
			this.remotePeerConnectionStats[streamId].frameHeight = frameHeight;
			this.remotePeerConnectionStats[streamId].videoRoundTripTime = videoRoundTripTime;
			this.remotePeerConnectionStats[streamId].videoJitter = videoJitter;
			this.remotePeerConnectionStats[streamId].audioRoundTripTime = audioRoundTripTime;
			this.remotePeerConnectionStats[streamId].audioJitter = audioJitter;
			this.remotePeerConnectionStats[streamId].framesDecoded = framesDecoded;
			this.remotePeerConnectionStats[streamId].framesDropped = framesDropped;
			this.remotePeerConnectionStats[streamId].framesReceived = framesReceived;
			
			this.remotePeerConnectionStats[streamId].videoJitterAverageDelay = videoJitterAverageDelay;
			this.remotePeerConnectionStats[streamId].audioJitterAverageDelay = audioJitterAverageDelay;


			this.callback("updated_stats", this.remotePeerConnectionStats[streamId]);

		});
	}
	disableStats(streamId) 
	{
		clearInterval(this.remotePeerConnectionStats[streamId].timerId);
	}

	enableStats(streamId) 
	{
		if (this.remotePeerConnectionStats[streamId] == null) {
			this.remotePeerConnectionStats[streamId] = new PeerStats(streamId);
			this.remotePeerConnectionStats[streamId].timerId = setInterval(() =>
			{
				this.getStats(streamId);

			}, 5000);
		}
	}

	/**
	 * After calling this function, create new WebRTCAdaptor instance, don't use the the same objectone
	 * Because all streams are closed on server side as well when websocket connection is closed.
	 */
	closeWebSocket() 
	{
		for (var key in this.remotePeerConnection) {
			this.remotePeerConnection[key].close();
		}
		//free the remote peer connection by initializing again
		this.remotePeerConnection = new Array();
		this.webSocketAdaptor.close();
	}

	peerMessage(streamId, definition, data) 
	{
		var jsCmd = {
				command : "peerMessageCommand",
				streamId : streamId,
				definition : definition,
				data: data,
		};

		this.webSocketAdaptor.send(JSON.stringify(jsCmd));
	}
	
	forceStreamQuality(streamId, resolution) 
	{
		var jsCmd = {
				command : "forceStreamQuality",
				streamId : streamId,
				streamHeight : resolution
		};
		this.webSocketAdaptor.send(JSON.stringify(jsCmd));
	}

	sendData(streamId, message) 
	{
		var dataChannel = this.remotePeerConnection[streamId].dataChannel;
		dataChannel.send(message);
	}
}