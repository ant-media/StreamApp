import {SoundMeter} from "./soundmeter.js" 

export class MediaManager 
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
		this.originalAudioTrackGainNode = null;
		this.videoTrack = null;
		this.audioTrack = null;
		this.smallVideoTrack = null;		
		this.audioContext = null;
	    this.soundOriginGainNode = null;
		this.secondStreamGainNode = null;
		this.localStream = null;
		this.bandwidth = 900; //default bandwidth kbps
		this.isMultiPeer = false; //used for multiple peer client
		this.multiPeerStreamId = null;   //used for multiple peer client
		this.webSocketAdaptor = null;
		this.isPlayMode = false;
		this.debug = false;
		this.viewerInfo = "";
		this.publishStreamId = null;
		this.blackFrameTimer = null;
		this.idMapping = new Array();


		var threshold = 0.08;
		this.soundMeters = new Array();
		this.soundLevelList = new Array();

		/**
		 * This is used when only data is brodcasted with the same way video and/or audio.
	     * The difference is that no video or audio is sent when this field is true 
		 */
		this.onlyDataChannel = false;

		/**
		 * For audio check when the user is muted itself.
		 * Check enableAudioLevelWhenMuted
		 */
		this.mutedAudioStream = null;
		this.meterRefresh = null;
		
		/**
		 * While publishing and playing streams data channel is enabled by default
		 */
		this.dataChannelEnabled = true;

		this.receivingMessages = new Map();

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

		//A dummy stream created to replace the tracks when camera is turned off.
		this.dummyCanvas =document.createElement("canvas");

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
				
		//Check browser support for screen share function
		this.checkBrowserScreenShareSupported();
	}
	setDesktopwithCameraSource(stream, streamId, audioStream, onEndedCallback) 
	{
		this.desktopStream = stream;
		this.navigatorUserMedia({video: true, audio: false},cameraStream => {
			this.smallVideoTrack = cameraStream.getVideoTracks()[0];
			
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
			let checkVideo = false
			devices.forEach(device => {	
				if (device.kind == "audioinput" || device.kind == "videoinput") {
					deviceArray.push(device);
					if(device.kind=="audioinput"){
						checkAudio = true;
					}
					if(device.kind=="videoinput"){
						checkVideo = true;
					}
				}
			});
			this.callback("available_devices", deviceArray);
			if(checkAudio == false && this.localStream == null){
				console.log("Audio input not found")
				console.log("Retrying to get user media without audio")
				if(this.inputDeviceNotFoundLimit < 2){
					if(checkVideo != false){
						this.openStream({video : true, audio : false}, this.mode)
						this.inputDeviceNotFoundLimit++;
					}else{
						console.log("Video input not found")
						alert("There is no video or audio input")
					}
				}
				else{
					alert("No input device found, publish is not possible");
				}
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
				if (this.originalAudioTrackGainNode !== null) {
					this.originalAudioTrackGainNode.stop();
				}
				this.originalAudioTrackGainNode = audioStream.getAudioTracks()[1];

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
				this.checkWebSocketConnection();
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
		const resetTrack = (stream) => {
			let videoTracks = stream.getVideoTracks();
			let audioTracks = stream.getAudioTracks();
			
			if (videoTracks.length > 0) {
				if (this.videoTrack !== null)
					this.videoTrack.stop();
				this.videoTrack = videoTracks[0];
			}
			
			if (audioTracks.length > 0) {
				if (this.audioTrack !== null)
					this.audioTrack.stop();				
				this.audioTrack = audioTracks[0];	
			}		

			if (this.smallVideoTrack)
				this.smallVideoTrack.stop();
			return stream;
		}
		
		// Check Media Constraint video value screen or screen + camera
		if(this.publishMode == "screen+camera" || this.publishMode == "screen"){
			navigator.mediaDevices.getDisplayMedia(mediaConstraints)
			.then(stream =>{
				resetTrack(stream);
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
				resetTrack(stream);
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
		if (this.videoTrack !== null) {
			this.videoTrack.stop();
		}

		if (this.audioTrack !== null) {
			this.audioTrack.stop();
		}

		if (this.smallVideoTrack !== null) {
			this.smallVideoTrack.stop();
		}		
		if (this.originalAudioTrackGainNode) {
			this.originalAudioTrackGainNode.stop();
		}		
		
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

	gotStream(stream)
	{
		//NOTE: I couldn't find a possible reason that we call setGainNode here, it creates problems by adding the second audio track therefore commenting it out. Tahir.
		//Also the following line causes multiple audio tracks in a stream. burak
		//stream = this.setGainNodeStream(stream);

		this.localStream = stream;
		if (this.localVideo) {
			this.localVideo.srcObject = stream;
		}
		this.checkWebSocketConnection();
		this.getDevices();
	}
	
	/**
	* Toggle video track on the server side.
	*
	* streamId is the id of the stream
	* trackId is the id of the track. streamId is also one of the trackId of the stream. If you are having just a single track on your 
	*         stream, you need to give streamId as trackId parameter as well.  
	* enabled is the enable/disable video track. If it's true, server sends video track. If it's false, server does not send video
	
	*/
	toggleVideo(streamId, trackId, enabled) 
	{
		var jsCmd = {
				command : "toggleVideo",
				streamId: streamId,
				trackId: trackId,
				enabled: enabled,
		};
		this.webSocketAdaptor.send(JSON.stringify(jsCmd));
	}
	
	/**
	* Toggle audio track on the server side.
	*
	* streamId is the id of the stream
	* trackId is the id of the track. streamId is also one of the trackId of the stream. If you are having just a single track on your 
	*         stream, you need to give streamId as trackId parameter as well.  
	* enabled is the enable/disable video track. If it's true, server sends audio track. If it's false, server does not send audio
	*
	*/
	toggleAudio(streamId, trackId, enabled)
	{
		var jsCmd = {
				command : "toggleAudio",
				streamId: streamId,
				trackId: trackId,
				enabled: enabled,
		};
		this.webSocketAdaptor.send(JSON.stringify(jsCmd));
	}


	/**
	 * These methods are initialized when the user is muted himself in a publish scenario
	 * It will keep track if the user is trying to speak without sending any data to server
	 * Please don't forget to disable this function with disableAudioLevelWhenMuted if you use it.
	 */
	enableAudioLevelWhenMuted() {
		navigator.mediaDevices.getUserMedia({video:false, audio:true})
		.then((stream) => {
		this.mutedAudioStream = stream;
		const soundMeter = new SoundMeter(this.audioContext);
		soundMeter.connectToSource(this.mutedAudioStream, (e) => {
			if (e) {
				alert(e);
				return;
			}
			this.meterRefresh = setInterval(() => {
				if(soundMeter.instant.toFixed(2) > 0.1){
					this.callback("speaking_but_muted");
				}
			}, 200);
		});
			
		})
		.catch(function(err) {
			console.log("Can't get the soundlevel on mute")
		});
	}

	disableAudioLevelWhenMuted(){
		if(this.meterRefresh != null){
			clearInterval(this.meterRefresh)
		}

		if(this.mutedAudioStream != null){
			this.mutedAudioStream.getTracks().forEach(function(track) {
				track.stop();
			});
		}
	}
	
	switchDesktopCapture(streamId){
		this.publishMode = "screen";

		var audioConstraint = false;
		if (typeof this.mediaConstraints.audio != "undefined" && this.mediaConstraints.audio != false) {
			audioConstraint = this.mediaConstraints.audio;
		}
		
		if(typeof this.mediaConstraints.video != "undefined" && this.mediaConstraints.video != false){
			this.mediaConstraints.video = true
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

	enableAudioLevel(stream, streamId) {

		const soundMeter = new SoundMeter(this.audioContext);

		// Put variables in global scope to make them available to the
		// browser console.
		soundMeter.connectToSource(stream, function(e) {
		if (e) {
			alert(e);
			return;
		}
		console.log("Added sound meter for stream: " + streamId + " = " + soundMeter.instant.toFixed(2));
		});

		this.soundMeters[streamId] = soundMeter;
	}

	getSoundLevelList(streamsList){
		for(let i = 0; i < streamsList.length; i++){
			this.soundLevelList[streamsList[i]] = this.soundMeters[streamsList[i]].instant.toFixed(2); 
		}
		this.callback("gotSoundList" , this.soundLevelList);
	}
	

	setGainNodeStream(stream){
		if(this.mediaConstraints.audio != false && typeof this.mediaConstraints.audio != "undefined"){
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
		return stream;
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
			if(this.mediaConstraints.audio !== true)
				this.mediaConstraints.audio.deviceId = deviceId;
			else 
				this.mediaConstraints.audio = { "deviceId": deviceId };
		}
		this.setAudioInputSource(streamId, this.mediaConstraints, null, true, deviceId);
	}


	/**
	 * 
	 * @param {*} streamId Id of the stream to be changed.
	 * @param {*} deviceId Id of the device which will use as a media device
	 * @param {*} onEndedCallback callback for when the switching video state is completed, can be used to understand if it is loading or not
	 * 
	 * This method is used to switch to video capture. 
	 */
	switchVideoCameraCapture(streamId, deviceId, onEndedCallback) 
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
		navigator.mediaDevices.enumerateDevices().then(devices => {
			for(let i = 0; i < devices.length; i++) {	
				if (devices[i].kind == "videoinput") {
					//Adjust video source only if there is a matching device id with the given one.
					//It creates problems if we don't check that since video can be just true to select default cam and it is like that in many cases.
					if(devices[i].deviceId == deviceId){
						if(this.mediaConstraints.video !== true)
							this.mediaConstraints.video.deviceId = { exact: deviceId };
						else 
							this.mediaConstraints.video = { deviceId: { exact: deviceId } };
						this.setVideoCameraSource(streamId, this.mediaConstraints, null, true, deviceId);
						break;
					}
				}
			};
			//If no matching device found don't adjust the media constraints let it be true instead of a device ID
			console.debug("Given deviceId = " + deviceId + " - Media constraints video property = " + this.mediaConstraints.video);
			this.setVideoCameraSource(streamId, this.mediaConstraints, null, true, deviceId);
		})

	}

	switchDesktopCaptureWithCamera(streamId) 
	{
		if(typeof this.mediaConstraints.video != "undefined" && this.mediaConstraints.video != false){
			this.mediaConstraints.video = true
		}

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
		var newAudioTrack = stream.getAudioTracks()[0];
		
		if (this.localStream != null && this.localStream.getAudioTracks()[0] != null) 
		{
			var audioTrack = this.localStream.getAudioTracks()[0];
			this.localStream.removeTrack(audioTrack);
			audioTrack.stop();
			this.localStream.addTrack(newAudioTrack);
		}
		else if(this.localStream != null){
			this.localStream.addTrack(newAudioTrack);
		}
		else{
			this.localStream = stream;
		}
		

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

		var newVideoTrack = stream.getVideoTracks()[0];

		if(this.localStream != null && this.localStream.getVideoTracks()[0] != null){
			var videoTrack = this.localStream.getVideoTracks()[0];
			this.localStream.removeTrack(videoTrack);
			videoTrack.stop();
			this.localStream.addTrack(newVideoTrack);
		}
		else if(this.localStream != null){
			this.localStream.addTrack(newVideoTrack);
		}
		else{
			this.localStream = stream;
		}

		if (this.localVideo) {
			this.localVideo.srcObject = this.localStream;
		}

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
			 //Why did we update also the audio track here?
			 //This audio track update is necessary for such a case:
			 //If you enable screen share with browser audio and then 
			 //return back to the camera, the audio should be only from mic.
			 //If, we don't update audio with the following lines, 
			 //the mixed (mic+browser) audio would be streamed in the camera mode.
			 
			 stream = this.setGainNodeStream(stream);
			 this.updateAudioTrack(stream, streamId, mediaConstraints, onEndedCallback);
 
			 this.updateVideoTrack(stream, streamId, mediaConstraints, onEndedCallback, stopDesktop);
		 }, true);
	 }
	
	updateAudioTrack (stream, streamId, onEndedCallback) 
	{
		//These codes cover when audio source change with audio source buttons
		//this.setGainNodeStream should be call before the audio source change
		//this.setGainNodeStream codes calling in prepareStreamTracks function, but it's not calling when audio source change with switchAudioInputSource function
		stream = this.setGainNodeStream(stream);

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
					streamId: streamId,
					trackId: this.idMapping[streamId][event.transceiver.mid],
			}
			this.callback("newStreamAvailable", dataObj);
		}

	}

	initializeDummyFrame(){
		this.dummyCanvas.getContext('2d').fillRect(0, 0, 320, 240);
		this.replacementStream = this.dummyCanvas.captureStream();
	}

	turnOffLocalCamera(streamId) 
	 {
		 //Initialize the first dummy frame for switching.
		this.initializeDummyFrame();
		
		 if (this.remotePeerConnection != null) {
			 let choosenId;
			 if(streamId != null || typeof streamId != "undefined"){
				choosenId = streamId;
			 }
			 else{
				choosenId = this.publishStreamId;
			 }
			 this.updateVideoTrack(this.replacementStream, choosenId, this.mediaConstraints, null, true);
		 }
		 else {
			 this.callbackError("NoActiveConnection");
		 }

		 //We need to send black frames within a time interval, because when the user turn off the camera,
		//player can't connect to the sender since there is no data flowing. Sending a black frame in each 3 seconds resolves it.
		if(this.blackFrameTimer == null){
			this.blackFrameTimer = setInterval(() => {			
				this.initializeDummyFrame();
			}, 3000);
		}
	 }

	 turnOnLocalCamera(streamId) 
	 {
		if(this.blackFrameTimer != null){
			clearInterval(this.blackFrameTimer);
			this.blackFrameTimer = null;
		}
		 if(this.localStream == null){
			 this.navigatorUserMedia(this.mediaConstraints, stream =>{
				 this.gotStream(stream);
			 }, false);
		 }
		 //This method will get the camera track and replace it with dummy track
		 else if (this.remotePeerConnection != null) {
			 this.navigatorUserMedia(this.mediaConstraints, stream =>{
				let choosenId;
			 	if(streamId != null || typeof streamId != "undefined"){
					choosenId = streamId;
				 }
				 else{
					choosenId = this.publishStreamId;
				 }
				 this.updateVideoTrack(stream, choosenId, this.mediaConstraints, null, true);
			 }, false);
		 }
		 else {
			 this.callbackError("NoActiveConnection");
		 }
	 }

	muteLocalMic() 
	{
		if (this.remotePeerConnection != null) {
			this.localStream.getAudioTracks().forEach(track => track.enabled = false);
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
			this.localStream.getAudioTracks().forEach(track => track.enabled = true);
		}
		else {
			this.callbackError("NoActiveConnection");
		}
	}

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

}
