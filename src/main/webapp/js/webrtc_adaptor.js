/**
 *
 * @returns
 */

import {PeerStats} from "./PeerStats.js"
import {WebSocketAdaptor} from "./WebSocketAdaptor.js"

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
		this.micGainNode = null;
		this.localStream = null;
		this.bandwidth = 900; //default bandwidth kbps
		this.isMultiPeer = false; //used for multiple peer client
		this.multiPeerStreamId = null;   //used for multiple peer client
		this.roomTimerId = -1;
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
			
		/*
		* Call check browser support. Below function is called when this class is created
		*/

		this.checkBrowserScreenShareSupported();

		/*
		* Below lines are executed as well when this class is created
		*/
		if (!this.isPlayMode && typeof this.mediaConstraints != "undefined" && this.localStream == null)
		{
			if (typeof this.mediaConstraints.video != "undefined" && this.mediaConstraints.video != false)
			{
				// if it is not play mode and media constraint is defined, try to get user media
				if (this.mediaConstraints.audio.mandatory)
				{
					//this case captures mic and video(audio(screen audio) + video(screen)) and then provide mute/unmute mic with
					//enableMicInMixedAudio
					navigator.mediaDevices.getUserMedia({audio:true, video:false}).then((micStream) =>{
						navigator.mediaDevices.getUserMedia(this.mediaConstraints)
						.then((stream) =>
								{
							//console.debug("audio stream track count: " + audioStream.getAudioTracks().length);

							var audioContext = new AudioContext();
							var desktopSoundGainNode = audioContext.createGain();

							desktopSoundGainNode.gain.value = 1;

							var audioDestionation = audioContext.createMediaStreamDestination();
							var audioSource = audioContext.createMediaStreamSource(stream);

							audioSource.connect(desktopSoundGainNode);

							this.micGainNode = audioContext.createGain();
							this.micGainNode.gain.value = 1;
							var audioSource2 = audioContext.createMediaStreamSource(micStream);
							audioSource2.connect(this.micGainNode);

							desktopSoundGainNode.connect(audioDestionation);
							this.micGainNode.connect(audioDestionation);

							stream.removeTrack(stream.getAudioTracks()[0]);
							audioDestionation.stream.getAudioTracks().forEach(function(track) {
								stream.addTrack(track);
							});
							this.gotStream(stream);

						}).catch((error) => {
							this.callbackError(error.name, error.message);
						});
					}).catch((error)=> {
						thiz.callbackError(error.name, error.message);
					});
				}
				else {
					//most of the times, this statement runs
					this.openStream(this.mediaConstraints, this.mode);
				}
			}
			else {
				// get only audio
				var media_audio_constraint = { audio: this.mediaConstraints.audio };
				navigator.mediaDevices.getUserMedia(media_audio_constraint)
				.then(stream => {
					this.gotStream(stream);
				})
				.catch((error) => {
					this.callbackError(error.name, error.message);
				});
			}
		}
		else {

			//just playing, it does not open any stream
			if (this.webSocketAdaptor == null || this.isConnected() == false) {
				this.webSocketAdaptor = new WebSocketAdaptor({websocket_url : this.websocket_url, webrtcadaptor : this, callback : this.callback, callbackError : this.callbackError});
			}
		}
	}

	setDesktopwithCameraSource(stream, streamId, audioStream, onEndedCallback) {

		this.desktopStream = stream;

		navigator.mediaDevices.getUserMedia({video: true, audio: false})
		.then(cameraStream => {

			//create a canvas element
			var canvas = document.createElement("canvas");
			var canvasContext = canvas.getContext("2d");

			//create video element for screen
			//var screenVideo = document.getElementById('sourceVideo');
			var screenVideo = document.createElement('video');
			//TODO: check audio track
			screenVideo.srcObject = stream;
			screenVideo.play();
			//create video element for camera
			var cameraVideo = document.createElement('video');
			//TODO: check audio track
			cameraVideo.srcObject = cameraStream;
			cameraVideo.play();
			var canvasStream = canvas.captureStream(15);
			canvasStream.addTrack(audioStream.getAudioTracks()[0]);

			if(this.localStream == null){
				stream.addTrack(audioStream.getAudioTracks()[0]);
				this.gotStream(canvasStream);
			}
			else{
				this.updateVideoTrack(canvasStream,streamId,this.mediaConstraints,onended,null);
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


		})
		.catch(error => {
			this.callbackError(error.name, error.message);
		});
	}

	prepareStreamTracks = function (mediaConstraints,audioConstraint,stream,streamId) {
		//this trick, getting audio and video separately, make us add or remove tracks on the fly
		var audioTrack = stream.getAudioTracks();
		if (audioTrack.length > 0) {
			audioTrack[0].stop();
			stream.removeTrack(audioTrack[0]);
		}

		//now get only audio to add this stream
		if (audioConstraint != "undefined" && audioConstraint != false) {
			var media_audio_constraint = { audio: audioConstraint};
			navigator.mediaDevices.getUserMedia(media_audio_constraint)
			.then(audioStream => {

				//add callback if desktop is sharing
				var onended = event => {
					this.callback("screen_share_stopped");
					this.setVideoCameraSource(streamId, mediaConstraints, null, true);
				}

				if(this.publishMode == "screen"){
					this.updateVideoTrack(stream,streamId,mediaConstraints,onended,true);
				}
				else if(this.publishMode == "screen+camera" ){
					this.setDesktopwithCameraSource(stream,streamId,audioStream,onended);
				}
				else{
					stream.addTrack(audioStream.getAudioTracks()[0]);
					this.gotStream(stream);
				}
			})
			.catch(error => {
				this.callbackError(error.name, error.message);
			});
		}
		else {
			//TODO: there is no audioStream 
			stream.addTrack(audioStream.getAudioTracks()[0]);
			this.gotStream(stream);
		}
		
	}

	/**
	 * Get user media
	 */
	getUserMedia = function (mediaConstraints, audioConstraint, streamId) {
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
			navigator.mediaDevices.getUserMedia(mediaConstraints)
			.then(stream =>{

				this.prepareStreamTracks(mediaConstraints,audioConstraint,stream, streamId);

			})
			.catch(error => {
				this.callbackError(error.name, error.message);
			});

		}
	}

	/**
	 * Open media stream, it may be screen, camera or audio
	 */
	openStream(mediaConstraints){

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
	closeStream() {

		this.localStream.getVideoTracks().forEach(function(track) {
			track.onended = null;
			track.stop();
		});

		this.localStream.getAudioTracks().forEach(function(track) {
			track.onended = null;
			track.stop();
		});
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

	enableMicInMixedAudio(enable) {
		if (this.micGainNode != null) {
			if (enable) {
				this.micGainNode.gain.value = 1;
			}
			else {
				this.micGainNode.gain.value = 0;
			}
		}
	}

	publish(streamId, token) {
		//If it started with playOnly mode and wants to publish now
		if(this.localStream == null){
			navigator.mediaDevices.getUserMedia(this.mediaConstraints).then(stream => {
				this.gotStream(stream);
				var jsCmd = {
					command : "publish",
					streamId : streamId,
					token : token,
					video: this.localStream.getVideoTracks().length > 0 ? true : false,
							audio: this.localStream.getAudioTracks().length > 0 ? true : false,
				};
				this.webSocketAdaptor.send(JSON.stringify(jsCmd));
			});
		}else{
			console.debug("getvideotrack = " + this.localStream.getVideoTracks()[0])
			var jsCmd = {
					command : "publish",
					streamId : streamId,
					token : token,
					video: this.localStream.getVideoTracks().length > 0 ? true : false,
							audio: this.localStream.getAudioTracks().length > 0 ? true : false,
			};
		}
		this.webSocketAdaptor.send(JSON.stringify(jsCmd));
	}


	joinRoom(roomName, streamId) {
		this.roomName = roomName;

		var jsCmd = {
				command : "joinRoom",
				room: roomName,
				streamId: streamId,
		}
		this.webSocketAdaptor.send(JSON.stringify(jsCmd));
	}

	play(streamId, token, roomId, enableTracks) {
		this.playStreamId.push(streamId);
		var jsCmd =
		{
				command : "play",
				streamId : streamId,
				token : token,
				room : roomId,
				trackList : enableTracks,
		}

		this.webSocketAdaptor.send(JSON.stringify(jsCmd));
	}

	stop(streamId) {
		this.closePeerConnection(streamId);

		var jsCmd = {
				command : "stop",
				streamId: streamId,
		};

		this.webSocketAdaptor.send(JSON.stringify(jsCmd));
	}

	join(streamId) {
		var jsCmd = {
				command : "join",
				streamId : streamId,
				multiPeer : this.isMultiPeer && this.multiPeerStreamId == null,
				mode : this.isPlayMode ? "play" : "both",
		};

		this.webSocketAdaptor.send(JSON.stringify(jsCmd));
	}

	leaveFromRoom(roomName) {
		this.roomName = roomName;
		var jsCmd = {
				command : "leaveFromRoom",
				room: roomName,
		};
		console.log ("leave request is sent for "+ roomName);
		
		if ( this.roomTimerId != null)
		{
			clearInterval(this.roomTimerId);
		}

		this.webSocketAdaptor.send(JSON.stringify(jsCmd));
	}

	leave(streamId) {

		var jsCmd = {
				command : "leave",
				streamId: this.isMultiPeer && this.multiPeerStreamId != null ? this.multiPeerStreamId : streamId,
		};

		this.webSocketAdaptor.send(JSON.stringify(jsCmd));
		this.closePeerConnection(streamId);
		this.multiPeerStreamId = null;
	}

	getStreamInfo(streamId) {
		var jsCmd = {
				command : "getStreamInfo",
				streamId: streamId,
		};
		this.webSocketAdaptor.send(JSON.stringify(jsCmd));
	}
	
	getRoomInfo(roomName,streamId) {
		this.roomTimerId = setInterval(() => {
			var jsCmd = {
				command : "getRoomInfo",
				streamId : streamId,
				room: roomName,
		};
		this.webSocketAdaptor.send(JSON.stringify(jsCmd));
		}, 5000);
	}

	enableTrack(mainTrackId, trackId, enabled) {
		var jsCmd = {
				command : "enableTrack",
				streamId : mainTrackId,
				trackId : trackId,
				enabled : enabled,
		};
		this.webSocketAdaptor.send(JSON.stringify(jsCmd));
	}

	getTracks(streamId, token) {
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
		this.localStream = stream;
		this.localVideo.srcObject = stream;
		
		if (this.webSocketAdaptor == null || this.isConnected() == false) {
			this.webSocketAdaptor = new WebSocketAdaptor({websocket_url : this.websocket_url, webrtcadaptor : this, callback : this.callback, callbackError : this.callbackError})
		}

		navigator.mediaDevices.enumerateDevices().then(devices => {
			let deviceArray = new Array();

			devices.forEach(function(device) {	
				if (device.kind == "audioinput" || device.kind == "videoinput") {
					deviceArray.push(device);
				}
			});

			this.callback("available_devices", deviceArray);

		}).catch(err => {
			console.error("Cannot get devices -> error name: " + err.name + ": " + err.message);
		});
	};
	
	switchAudioInputSource(streamId, deviceId) {
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

	switchVideoCameraCapture(streamId, deviceId) {
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

	switchDesktopCapture(streamId) {

		this.publishMode = "screen";

		var audioConstraint = false;
		if (typeof this.mediaConstraints.audio != "undefined" && this.mediaConstraints.audio != false) {
			audioConstraint = this.mediaConstraints.audio;
		}

		this.getUserMedia(this.mediaConstraints, audioConstraint, streamId);
	}

	switchDesktopCaptureWithCamera(streamId) {

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
	updateLocalAudioStream(stream, onEndedCallback) {

		var audioTrack = this.localStream.getAudioTracks()[0];
		this.localStream.removeTrack(audioTrack);
		audioTrack.stop();
		this.localStream.addTrack(stream.getAudioTracks()[0]);
		this.localVideo.srcObject = this.localStream;

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
	updateLocalVideoStream = function(stream, onEndedCallback, stopDesktop) {

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
	setAudioInputSource(streamId, mediaConstraints, onEndedCallback) {

		navigator.mediaDevices.getUserMedia(mediaConstraints)
		.then(stream => {
			this.updateAudioTrack(stream, streamId, mediaConstraints, onEndedCallback);
		})
		.catch(error => {
			this.callbackError(error.name);
		});
	}
	
	/**
	 * This method sets Video Input Source. 
	 * It calls updateVideoTrack function for the update local video stream.
	 */
	setVideoCameraSource(streamId, mediaConstraints, onEndedCallback, stopDesktop) {

		navigator.mediaDevices.getUserMedia(mediaConstraints)
		.then(stream => {
			this.updateVideoTrack(stream, streamId, mediaConstraints, onEndedCallback, stopDesktop);
		})
		.catch(error =>{
			this.callbackError(error.name);
		});
	}
	
	updateAudioTrack (stream, streamId, mediaConstraints, onEndedCallback) {

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

	updateVideoTrack(stream, streamId, mediaConstraints, onEndedCallback, stopDesktop) {

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


	onTrack(event, streamId){

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

	iceCandidateReceived(event, streamId){

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


	initDataChannel(streamId, dataChannel) {

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
	initPeerConnection(streamId, dataChannelMode) {

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
						.catch(e => console.error(e));
					}
				}
			}

		}
	}

	closePeerConnection(streamId) {
		
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

	signallingState(streamId) {
		if (this.remotePeerConnection[streamId] != null) {
			return this.remotePeerConnection[streamId].signalingState;
		}
		return null;
	}

	iceConnectionState(streamId) {
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


	turnOffLocalCamera() {
		if (this.remotePeerConnection != null) {

			var track = this.localStream.getVideoTracks()[0];
			track.enabled = false;
		}
		else {
			this.callbackError("NoActiveConnection");
		}
	}

	turnOnLocalCamera() {
		//If it started in playOnly mode and wants to turn on the camera
		if(this.localStream == null){
			navigator.mediaDevices.getUserMedia(this.mediaConstraints).then(stream =>{
				this.gotStream(stream);
			});
		}
		else if (this.remotePeerConnection != null) {
			var track = this.localStream.getVideoTracks()[0];
			track.enabled = true;
		}
		else {
			this.callbackError("NoActiveConnection");
		}
	}

	muteLocalMic() {
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
	unmuteLocalMic() {
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

	takeCandidate(idOfTheStream, tmpLabel, tmpCandidate) {
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

	startPublishing(idOfStream) {
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
	getVideoSender(streamId) {

		var videoSender = null;
		if ((adapter.browserDetails.browser === 'chrome' ||
				(adapter.browserDetails.browser === 'firefox' &&
						adapter.browserDetails.version >= 64)) &&
						'RTCRtpSender' in window &&
						'setParameters' in window.RTCRtpSender.prototype)
		{
			const senders = this.remotePeerConnection[streamId].getSenders();

			for (let i = 0; i < senders.length; i++) {
				if (senders[i].track != null && senders[i].track.kind == "video") {
					videoSender = senders[i];
					break;
				}
			}

		}
		return videoSender;
	}

	/**
	 * bandwidth is in kbps
	 */
	changeBandwidth(bandwidth, streamId) {

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
			errorDefinition = "Video sender not found to change bandwidth";
		}

		return Promise.reject(errorDefinition);
	};

	getStats(streamId)
	{
		this.remotePeerConnection[streamId].getStats(null).then(stats =>
		{
			var bytesReceived = 0;
			var packetsLost = 0;
			var fractionLost = 0;
			var currentTime = 0;
			var bytesSent = 0;
			var audioLevel = -1;

			stats.forEach(value => {

				if (value.type == "inbound-rtp")
				{
					bytesReceived += value.bytesReceived;
					packetsLost += value.packetsLost;
					fractionLost += value.fractionLost;
					currentTime = value.timestamp;
				}
				else if (value.type == "outbound-rtp")
				{
					bytesSent += value.bytesSent
					currentTime = value.timestamp
				}
				else if (value.type == "track" && typeof value.kind != "undefined" && value.kind == "audio") {
					if (typeof value.audioLevel != "undefined") {
						audioLevel = value.audioLevel;
					}
				}
			});

			this.remotePeerConnectionStats[streamId].totalBytesReceived = bytesReceived;
			this.remotePeerConnectionStats[streamId].packetsLost = packetsLost;
			this.remotePeerConnectionStats[streamId].fractionLost = fractionLost;
			this.remotePeerConnectionStats[streamId].currentTime = currentTime;
			this.remotePeerConnectionStats[streamId].totalBytesSent = bytesSent;
			this.remotePeerConnectionStats[streamId].audioLevel = audioLevel;

			this.callback("updated_stats", this.remotePeerConnectionStats[streamId]);

		});
	}


	enableStats(streamId) {
		this.remotePeerConnectionStats[streamId] = new PeerStats(streamId);
		this.remotePeerConnectionStats[streamId].timerId = setInterval(() =>
		{
			this.getStats(streamId);

		}, 5000);
	}

	/**
	 * After calling this function, create new WebRTCAdaptor instance, don't use the the same objectone
	 * Because all streams are closed on server side as well when websocket connection is closed.
	 */
	closeWebSocket() {
		for (var key in this.remotePeerConnection) {
			this.remotePeerConnection[key].close();
		}
		//free the remote peer connection by initializing again
		this.remotePeerConnection = new Array();
		this.close();
	}

	peerMessage(streamId, definition, data) {
		var jsCmd = {
				command : "peerMessageCommand",
				streamId : streamId,
				definition : definition,
				data: data,
		};

		this.webSocketAdaptor.send(JSON.stringify(jsCmd));
	}
	
	forceStreamQuality(streamId, resolution) {
		var jsCmd = {
				command : "forceStreamQuality",
				streamId : streamId,
				streamHeight : resolution
		};
		this.webSocketAdaptor.send(JSON.stringify(jsCmd));
	}

	sendData(streamId, message) {
		var dataChannel = this.remotePeerConnection[streamId].dataChannel;
		dataChannel.send(message);
	}
}