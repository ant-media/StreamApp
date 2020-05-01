/**
 *
 * @returns
 */

"use strict";

function WebRTCAdaptor(initialValues)
{

	class PeerStats {

		constructor(streamId) {
			this.streamId = streamId;
			this.totalBytesReceivedCount = 0;
			this.totalBytesSent = 0;
			this.packetsLost = 0;
			this.fractionLost = 0;
			this.startTime = 0;
			this.lastBytesReceived = 0;
			this.lastBytesSent = 0;
			this.currentTimestamp = 0;
			this.lastTime = 0;
			this.timerId = 0;
			this.firstByteSentCount = 0;
			this.firstBytesReceivedCount = 0;
			this.audioLevel = -1;
		}

		//kbits/sec
		get averageOutgoingBitrate() {
			return Math.floor(8 * (this.totalBytesSentCount - this.firstByteSentCount) / (this.currentTimestamp - this.startTime));
		}

		//kbits/sec
		get averageIncomingBitrate() {
			return Math.floor(8 * (this.totalBytesReceivedCount - this.firstBytesReceivedCount) / (this.currentTimestamp - this.startTime));
		}

		//kbits/sec
		get currentOutgoingBitrate() {
			return Math.floor(8 * (this.totalBytesSentCount - this.lastBytesSent) / (this.currentTimestamp - this.lastTime));
		}

		//kbits/sec
		get currentIncomingBitrate() {
			return Math.floor(8 * (this.totalBytesReceivedCount - this.lastBytesReceived) / (this.currentTimestamp - this.lastTime));
		}

		set currentTime(timestamp) {
			this.lastTime = this.currentTimestamp;
			this.currentTimestamp = timestamp;
			if (this.startTime == 0) {
				this.startTime = timestamp-1; // do not have zero division error
			}
		}

		set totalBytesReceived(bytesReceived) {
			this.lastBytesReceived = this.totalBytesReceivedCount;
			this.totalBytesReceivedCount = bytesReceived;
			if (this.firstBytesReceivedCount == 0) {
				this.firstBytesReceivedCount = bytesReceived;
			}
		}

		set totalBytesSent(bytesSent) {
			this.lastBytesSent = this.totalBytesSentCount;
			this.totalBytesSentCount = bytesSent;
			if (this.firstByteSentCount == 0) {
				this.firstByteSentCount = bytesSent;
			}
		}

	}

	var thiz = this;
	thiz.peerconnection_config = null;
	thiz.sdp_constraints = null;
	thiz.remotePeerConnection = new Array();
	thiz.remotePeerConnectionStats = new Array();
	thiz.remoteDescriptionSet = new Array();
	thiz.iceCandidateList = new Array();
	thiz.webSocketAdaptor = null;
	thiz.roomName = null;
	thiz.videoTrackSender = null;
	thiz.audioTrackSender = null;
	thiz.playStreamId = new Array();
	thiz.micGainNode = null;
	thiz.localStream = null;
	thiz.bandwidth = 900; //default bandwidth kbps
	thiz.isMultiPeer = false; //used for multiple peer client
	thiz.multiPeerStreamId = null;   //used for multiple peer client

	thiz.isPlayMode = false;
	thiz.debug = false;

	thiz.publishMode="camera"; //screen, screen+camera

	/**
	 * Supported candidate types. Below types are for both sending and receiving candidates.
	 * It means if when client receives candidate from STUN server, it sends to the server if candidate's protocol
	 * is in the list. Likely, when client receives remote candidate from server, it adds as ice candidate
	 * if candidate protocol is in the list below.
	 */
	thiz.candidateTypes = ["udp", "tcp"];


	thiz.desktopStream = null;

	/**
	 * The cam_location below is effective when camera and screen is send at the same time.
	 * possible values are top and bottom. It's on right all the time
	 */
	thiz.camera_location = "top"

	/**
	 * The cam_margin below is effective when camera and screen is send at the same time.
	 * This is the margin value in px from the edges
	 */
	thiz.camera_margin = 15;

	/**
	 * Thiz camera_percent is how large the camera view appear on the screen. It's %15 by default.
	 */
	thiz.camera_percent = 15;

	for(var key in initialValues) {
		if(initialValues.hasOwnProperty(key)) {
			this[key] = initialValues[key];
		}
	}

	thiz.localVideo = document.getElementById(thiz.localVideoId);
	thiz.remoteVideo = document.getElementById(thiz.remoteVideoId);

	// It should be compatible previous version
	if(thiz.mediaConstraints.video == "camera") {
		thiz.publishMode="camera";
	}
	else if(thiz.mediaConstraints.video == "screen") {
		thiz.publishMode="screen";
	}
	else if(thiz.mediaConstraints.video == "screen+camera") {
		thiz.publishMode="screen+camera";
	}

	if (!("WebSocket" in window)) {
		console.log("WebSocket not supported.");
		thiz.callbackError("WebSocketNotSupported");
		return;
	}

	if (typeof navigator.mediaDevices == "undefined" && thiz.isPlayMode == false) {
		console.log("Cannot open camera and mic because of unsecure context. Please Install SSL(https)");
		thiz.callbackError("UnsecureContext");
		return;
	}

	this.switchDesktopwithCameraSource = function(stream, streamId, audioStream, onEndedCallback) {

		thiz.desktopStream = stream;

		navigator.mediaDevices.getUserMedia({video: true, audio: false})
		.then(function(cameraStream) {

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

			if(thiz.localStream == null){
				stream.addTrack(audioStream.getAudioTracks()[0]);
				thiz.gotStream(canvasStream);
			}
			else{
				thiz.switchDesktopSource(canvasStream,streamId,thiz.mediaConstraints,onended,null);
			}

			//update the canvas
			setInterval(function(){
				//draw screen to canvas
				canvas.width = screenVideo.videoWidth;
				canvas.height = screenVideo.videoHeight;
				canvasContext.drawImage(screenVideo, 0, 0, canvas.width, canvas.height);

				var cameraWidth = screenVideo.videoWidth * (thiz.camera_percent/100);
				var cameraHeight = (cameraVideo.videoHeight/cameraVideo.videoWidth)*cameraWidth

				var positionX = (canvas.width - cameraWidth) - thiz.camera_margin;
				var positionY;

				if (thiz.camera_location == "top") {
					positionY = thiz.camera_margin;
				}
				else { //if not top, make it bottom
					//draw camera on right bottom corner
					positionY = (canvas.height - cameraHeight) - thiz.camera_margin;
				}
				canvasContext.drawImage(cameraVideo, positionX, positionY, cameraWidth, cameraHeight);
			}, 66);


		})
		.catch(function(error) {
			thiz.callbackError(error.name, error.message);
		});
	}

	this.getUserMediaDetail = function (mediaConstraints,audioConstraint,stream) {

		//this trick, getting audio and video separately, make us add or remove tracks on the fly
		var audioTrack = stream.getAudioTracks();
		if (audioTrack.length > 0) {
			stream.removeTrack(audioTrack[0]);
		}

		//add callback if desktop is sharing
		stream.getVideoTracks()[0].onended = function(event) {
			thiz.callback("screen_share_stopped");
			thiz.switchVideoSource(streamId, mediaConstraints, null, true);
		}

		//now get only audio to add this stream
		if (audioConstraint != "undefined" && audioConstraint != false) {
			var media_audio_constraint = { audio: audioConstraint};
			navigator.mediaDevices.getUserMedia(media_audio_constraint)
			.then(function(audioStream) {

				if(thiz.publishMode == "screen"){
					thiz.switchDesktopSource(stream,streamId,mediaConstraints,onended,true);
				}
				else if(thiz.publishMode == "screen+camera" ){
					thiz.switchDesktopwithCameraSource(stream,streamId,audioStream,onended);
				}
				else{
					stream.addTrack(audioStream.getAudioTracks()[0]);
					thiz.gotStream(stream);
				}
			})
			.catch(function(error) {
				thiz.callbackError(error.name, error.message);
			});
		}
		else {
			stream.addTrack(audioStream.getAudioTracks()[0]);
			thiz.gotStream(stream);
		}
	}

	/**
	 * Get user media
	 */
	this.getUserMedia = function (mediaConstraints, audioConstraint) {

		// Check Media Constraint video value screen or screen + camera
		if(thiz.publishMode == "screen+camera" || thiz.publishMode == "screen"){

			navigator.mediaDevices.getDisplayMedia(mediaConstraints)
			.then(function(stream){

				thiz.getUserMediaDetail(mediaConstraints,audioConstraint,stream);

			})
			.catch(function(error) {
				if (error.name === "NotAllowedError") {
					console.debug("Permission denied error");
					thiz.callbackError("ScreenSharePermissionDenied");

					// Redirect Default Stream Camera
					if(thiz.localStream == null){

						var mediaConstraints = {
							video : true,
							audio : true
						};

						thiz.openStream(mediaConstraints);
					}
					else{
						thiz.switchVideoCapture(streamId);
					}

				}
				else{
					thiz.callbackError(error.name, error.message);
				}
			});
		}

		// If mediaConstraints only user camera
		else {
			navigator.mediaDevices.getUserMedia(mediaConstraints)
			.then(function(stream){

				thiz.getUserMediaDetail(mediaConstraints,audioConstraint,stream);

			})
			.catch(function(error) {
				thiz.callbackError(error.name, error.message);
			});

		}
	}

	/**
	 * Open media stream, it may be screen, camera or audio
	 */
	this.openStream = function(mediaConstraints) {

		thiz.mediaConstraints = mediaConstraints;
		var audioConstraint = false;
		if (typeof mediaConstraints.audio != "undefined" && mediaConstraints.audio != false) {
			audioConstraint = mediaConstraints.audio;
		}

		if (typeof mediaConstraints.video != "undefined") {
			thiz.getUserMedia(mediaConstraints, audioConstraint);
		}
		else {
			console.error("MediaConstraint video is not defined");
			thiz.callbackError("media_constraint_video_not_defined");
		}
	}

	/**
	 * Closes stream, if you want to stop peer connection, call stop(streamId)
	 */
	this.closeStream = function () {

		thiz.localStream.getVideoTracks().forEach(function(track) {
			track.onended = null;
			track.stop();
		});

		thiz.localStream.getAudioTracks().forEach(function(track) {
			track.onended = null;
			track.stop();
		});

	}

	/**
	 * Checks browser supports screen share feature
	 * if exist it calls callback with "browser_screen_share_supported"
	 */

	this.checkBrowserScreenShareSupported = function() {
		var callback = function (message) {

			if (navigator.mediaDevices.getDisplayMedia || navigator.getDisplayMedia ) {
				thiz.callback("browser_screen_share_supported");
				window.removeEventListener("message", callback);
			}
		};

		//add event listener for desktop capture
		window.addEventListener("message", callback, false);

		window.postMessage("are-you-there", "*");

	};

	/*
	 * Call check browser support. Below function is called when this class is created
	 */

	thiz.checkBrowserScreenShareSupported();

	/*
	 * Below lines are executed as well when this class is created
	 */
	if (!this.isPlayMode && typeof thiz.mediaConstraints != "undefined" && this.localStream == null)
	{
		if (typeof thiz.mediaConstraints.video != "undefined" && thiz.mediaConstraints.video != false)
		{
			// if it is not play mode and media constraint is defined, try to get user media
			if (thiz.mediaConstraints.audio.mandatory)
			{
				//this case captures mic and video(audio(screen audio) + video(screen)) and then provide mute/unmute mic with
				//enableMicInMixedAudio
				navigator.mediaDevices.getUserMedia({audio:true, video:false}).then(function(micStream){
					navigator.mediaDevices.getUserMedia(thiz.mediaConstraints)
					.then(function(stream)
							{
						//console.debug("audio stream track count: " + audioStream.getAudioTracks().length);

						var audioContext = new AudioContext();
						var desktopSoundGainNode = audioContext.createGain();

						desktopSoundGainNode.gain.value = 1;

						var audioDestionation = audioContext.createMediaStreamDestination();
						var audioSource = audioContext.createMediaStreamSource(stream);

						audioSource.connect(desktopSoundGainNode);

						thiz.micGainNode = audioContext.createGain();
						thiz.micGainNode.gain.value = 1;
						var audioSource2 = audioContext.createMediaStreamSource(micStream);
						audioSource2.connect(thiz.micGainNode);

						desktopSoundGainNode.connect(audioDestionation);
						thiz.micGainNode.connect(audioDestionation);

						stream.removeTrack(stream.getAudioTracks()[0]);
						audioDestionation.stream.getAudioTracks().forEach(function(track) {
							stream.addTrack(track);
						});

						console.debug("Running gotStream");
						thiz.gotStream(stream);

							}).catch(function (error) {
								thiz.callbackError(error.name, error.message);
							});
				}).catch(function(error) {
					thiz.callbackError(error.name, error.message);
				});
			}
			else {
				//most of the times, this statement runs
				thiz.openStream(thiz.mediaConstraints, thiz.mode);
			}
		}
		else {
			// get only audio
			var media_audio_constraint = { audio: thiz.mediaConstraints.audio };
			navigator.mediaDevices.getUserMedia(media_audio_constraint)
			.then(function(stream) {
				thiz.gotStream(stream);
			})
			.catch(function(error) {
				thiz.callbackError(error.name, error.message);
			});
		}
	}
	else {

		//just playing, it does not open any stream
		if (thiz.webSocketAdaptor == null || thiz.webSocketAdaptor.isConnected() == false) {
			thiz.webSocketAdaptor = new WebSocketAdaptor();
		}
	}

	this.enableMicInMixedAudio = function(enable) {
		if (thiz.micGainNode != null) {
			if (enable) {
				thiz.micGainNode.gain.value = 1;
			}
			else {
				thiz.micGainNode.gain.value = 0;
			}
		}
	}

	this.publish = function (streamId, token) {
		var jsCmd = {
				command : "publish",
				streamId : streamId,
				token : token,
				video: thiz.localStream.getVideoTracks().length > 0 ? true : false,
						audio: thiz.localStream.getAudioTracks().length > 0 ? true : false,
		};

		thiz.webSocketAdaptor.send(JSON.stringify(jsCmd));
	}


	this.joinRoom = function (roomName, streamId) {
		thiz.roomName = roomName;

		var jsCmd = {
				command : "joinRoom",
				room: roomName,
				streamId: streamId,
		}

		thiz.webSocketAdaptor.send(JSON.stringify(jsCmd));

	}

	this.play = function (streamId, token, roomId, enableTracks) {
		thiz.playStreamId.push(streamId);
		var jsCmd =
		{
				command : "play",
				streamId : streamId,
				token : token,
				room : roomId,
				trackList : enableTracks,
		}

		thiz.webSocketAdaptor.send(JSON.stringify(jsCmd));
	}

	this.stop = function(streamId) {
		thiz.closePeerConnection(streamId);

		var jsCmd = {
				command : "stop",
				streamId: streamId,
		};

		thiz.webSocketAdaptor.send(JSON.stringify(jsCmd));
	}

	this.join = function(streamId) {
		var jsCmd = {
				command : "join",
				streamId : streamId,
				multiPeer : thiz.isMultiPeer && thiz.multiPeerStreamId == null,
				mode : thiz.isPlayMode ? "play" : "both",
		};

		thiz.webSocketAdaptor.send(JSON.stringify(jsCmd));
	}

	this.leaveFromRoom = function(roomName) {
		thiz.roomName = roomName;
		var jsCmd = {
				command : "leaveFromRoom",
				room: roomName,
		};
		console.log ("leave request is sent for "+ roomName);

		thiz.webSocketAdaptor.send(JSON.stringify(jsCmd));
	}

	this.leave = function (streamId) {

		var jsCmd = {
				command : "leave",
				streamId: thiz.isMultiPeer && thiz.multiPeerStreamId != null ? thiz.multiPeerStreamId : streamId,
		};

		thiz.webSocketAdaptor.send(JSON.stringify(jsCmd));
		thiz.closePeerConnection(streamId);
		thiz.multiPeerStreamId = null;
	}

	this.getStreamInfo = function(streamId) {
		var jsCmd = {
				command : "getStreamInfo",
				streamId: streamId,
		};
		this.webSocketAdaptor.send(JSON.stringify(jsCmd));
	}

	this.enableTrack = function(mainTrackId, trackId, enabled) {
		var jsCmd = {
				command : "enableTrack",
				streamId : mainTrackId,
				trackId : trackId,
				enabled : enabled,
		};
		this.webSocketAdaptor.send(JSON.stringify(jsCmd));
	}

	this.getTracks = function(streamId, token) {
		thiz.playStreamId.push(streamId);
		var jsCmd =
		{
				command : "getTrackList",
				streamId : streamId,
				token : token,
		}

		thiz.webSocketAdaptor.send(JSON.stringify(jsCmd));
	}

	this.gotStream = function (stream)
	{
		thiz.localStream = stream;
		thiz.localVideo.srcObject = stream;
		if (thiz.webSocketAdaptor == null || thiz.webSocketAdaptor.isConnected() == false) {
			thiz.webSocketAdaptor = new WebSocketAdaptor();
		}
	};

	this.switchVideoCapture = function(streamId) {

		thiz.publishMode = "camera";

		thiz.switchVideoSource(streamId, thiz.mediaConstraints, null, true);
	}

	this.switchDesktopCapture = function(streamId) {

		thiz.publishMode = "screen";

		var audioConstraint = false;
		if (typeof mediaConstraints.audio != "undefined" && mediaConstraints.audio != false) {
			audioConstraint = mediaConstraints.audio;
		}

		thiz.getUserMedia(thiz.mediaConstraints, audioConstraint);
	}


	this.switchDesktopCaptureWithCamera = function(streamId) {

		thiz.publishMode = "screen+camera";

		var audioConstraint = false;
		if (typeof mediaConstraints.audio != "undefined" && mediaConstraints.audio != false) {
			audioConstraint = mediaConstraints.audio;
		}
		thiz.getUserMedia(mediaConstraints, audioConstraint);
	}

	thiz.arrangeStreams = function(stream, onEndedCallback, stopDesktop) {

		if (stopDesktop && thiz.desktopStream != null) {
			thiz.desktopStream.getVideoTracks()[0].stop();
		}

		var videoTrack = thiz.localStream.getVideoTracks()[0];
		thiz.localStream.removeTrack(videoTrack);
		videoTrack.stop();
		thiz.localStream.addTrack(stream.getVideoTracks()[0]);
		thiz.localVideo.srcObject = thiz.localStream;

		if (onEndedCallback != null) {
			stream.getVideoTracks()[0].onended = function(event) {
			onEndedCallback(event);
			}
		}
	}

	this.switchVideoSource = function (streamId, mediaConstraints, onEndedCallback, stopDesktop) {

		navigator.mediaDevices.getUserMedia(mediaConstraints)
		.then(function(stream) {

			if (thiz.remotePeerConnection[streamId] != null) {
				var videoTrackSender = thiz.remotePeerConnection[streamId].getSenders().find(function(s) {
					return s.track.kind == "video";
				});

				videoTrackSender.replaceTrack(stream.getVideoTracks()[0]).then(function(result) {
					thiz.arrangeStreams(stream, onEndedCallback, stopDesktop);

				}).catch(function(error) {
					console.log(error.name);
				});
			}
			else {
				thiz.arrangeStreams(stream, onEndedCallback, stopDesktop);
			}

		})
		.catch(function(error) {
			thiz.callbackError(error.name);
		});
	}

	this.switchDesktopSource = function (stream, streamId, mediaConstraints, onEndedCallback, stopDesktop) {

		if (thiz.remotePeerConnection[streamId] != null) {
			var videoTrackSender = thiz.remotePeerConnection[streamId].getSenders().find(function(s) {
				return s.track.kind == "video";
			});

			videoTrackSender.replaceTrack(stream.getVideoTracks()[0]).then(function(result) {
				thiz.arrangeStreams(stream, onEndedCallback, stopDesktop);

			}).catch(function(error) {
				console.log(error.name);
			});
		}
		else {
			thiz.arrangeStreams(stream, onEndedCallback, stopDesktop);
		}
	}


	this.onTrack = function(event, streamId) {
		console.log("onTrack");
		if (thiz.remoteVideo != null) {
			//thiz.remoteVideo.srcObject = event.streams[0];
			if (thiz.remoteVideo.srcObject !== event.streams[0]) {
				thiz.remoteVideo.srcObject = event.streams[0];
				console.log('Received remote stream');
			}
		}
		else {
			var dataObj = {
					stream: event.streams[0],
					track: event.track,
					streamId: streamId
			}
			thiz.callback("newStreamAvailable", dataObj);
		}

	}

	this.iceCandidateReceived = function(event, streamId) {
		if (event.candidate) {

			var protocolSupported = false;
			if (typeof event.candidate.protocol == "undefined") {
				thiz.candidateTypes.forEach(element => {
					if (event.candidate.candidate.toLowerCase().includes(element)) {
						protocolSupported = true;
					}
				});
			}
			else {
				protocolSupported = thiz.candidateTypes.includes(event.candidate.protocol.toLowerCase());
			}

			if (protocolSupported) {

				var jsCmd = {
						command : "takeCandidate",
						streamId : streamId,
						label : event.candidate.sdpMLineIndex,
						id : event.candidate.sdpMid,
						candidate : event.candidate.candidate
				};

				if (thiz.debug) {
					console.log("sending ice candiate for stream Id " + streamId );
					console.log(JSON.stringify(event.candidate));
				}
				thiz.webSocketAdaptor.send(JSON.stringify(jsCmd));
			}
			else {
				console.log("Candidate's protocol(full sdp: "+ event.candidate.candidate +") is not supported. Supported protocols: " + thiz.candidateTypes);
				if (event.candidate.candidate != "") { //
					thiz.callbackError("protocol_not_supported", "Support protocols: " + thiz.candidateTypes.toString() + " candidate: " + event.candidate.candidate);
				}
			}
		}
		else {
			console.error("No event.candidate in the iceCandidate event");
		}
	}


	this.initDataChannel = function(streamId, dataChannel) {
		dataChannel.onerror = (error) => {
			console.log("Data Channel Error:", error );
			var obj = {
				streamId: streamId,
				error: error
			};
			console.log("channel status: ", dataChannel.readyState);
			if (dataChannel.readyState != "closed") {
				thiz.callbackError("data_channel_error", obj);
			}
		};

		dataChannel.onmessage = (event) => {
			var obj = {
				streamId: streamId,
				event: event,
			};
			thiz.callback("data_received", obj);
		};

		dataChannel.onopen = () => {
			thiz.remotePeerConnection[streamId].dataChannel = dataChannel;
			console.log("Data channel is opened");
			thiz.callback("data_channel_opened", streamId)
		};

		dataChannel.onclose = () => {
			console.log("Data channel is closed");
			thiz.callback("data_channel_closed", streamId);
		};

	}

	// data channel mode can be "publish" , "play" or "peer" based on this it is decided which way data channel is created
	this.initPeerConnection = function(streamId, dataChannelMode) {
		if (thiz.remotePeerConnection[streamId] == null)
		{
			var closedStreamId = streamId;
			console.log("stream id in init peer connection: " + streamId + " close stream id: " + closedStreamId);
			thiz.remotePeerConnection[streamId] = new RTCPeerConnection(thiz.peerconnection_config);
			thiz.remoteDescriptionSet[streamId] = false;
			thiz.iceCandidateList[streamId] = new Array();
			if (!thiz.playStreamId.includes(streamId))
			{
				if(thiz.localStream != null) {
					thiz.remotePeerConnection[streamId].addStream(thiz.localStream);
				}
			}
			thiz.remotePeerConnection[streamId].onicecandidate = function(event) {
				thiz.iceCandidateReceived(event, closedStreamId);
			}
			thiz.remotePeerConnection[streamId].ontrack = function(event) {
				thiz.onTrack(event, closedStreamId);
			}

			if (dataChannelMode == "publish") {
				//open data channel if it's publish mode peer connection 
				const dataChannelOptions = {
						ordered: true,
				};

				var dataChannel = thiz.remotePeerConnection[streamId].createDataChannel(streamId, dataChannelOptions);
				thiz.initDataChannel(streamId, dataChannel);

			} else if(dataChannelMode == "play") {
				//in play mode, server opens the data channel 
				thiz.remotePeerConnection[streamId].ondatachannel = function(ev) {
					thiz.initDataChannel(streamId, ev.channel);
				};
			}
			else {
				//for peer mode do both for now
				const dataChannelOptions = {
						ordered: true,
				};

				var dataChannelPeer = thiz.remotePeerConnection[streamId].createDataChannel(streamId, dataChannelOptions);
				thiz.initDataChannel(streamId, dataChannelPeer);

				thiz.remotePeerConnection[streamId].ondatachannel = function(ev) {
					thiz.initDataChannel(streamId, ev.channel);
				};
			}

			thiz.remotePeerConnection[streamId].oniceconnectionstatechange = function (event) {
				var obj = {state:thiz.remotePeerConnection[streamId].iceConnectionState, streamId:streamId};
				thiz.callback("ice_connection_state_changed",obj);

				if (!thiz.isPlayMode) {
					if (thiz.remotePeerConnection[streamId].iceConnectionState == "connected") {

						thiz.changeBandwidth(thiz.bandwidth, streamId).then(() => {
							console.log("Bandwidth is changed to " + thiz.bandwidth);
						})
						.catch(e => console.error(e));
					}
				}
			}

		}
	}

	this.closePeerConnection = function(streamId) {
		
		if (thiz.remotePeerConnection[streamId] != null)
		{
			if (thiz.remotePeerConnection[streamId].dataChannel != null) {
				thiz.remotePeerConnection[streamId].dataChannel.close();
			}
			if (thiz.remotePeerConnection[streamId].signalingState != "closed") {
				thiz.remotePeerConnection[streamId].close();
				thiz.remotePeerConnection[streamId] = null;
				delete thiz.remotePeerConnection[streamId];
				var playStreamIndex = thiz.playStreamId.indexOf(streamId);
				if (playStreamIndex != -1)
				{
					thiz.playStreamId.splice(playStreamIndex, 1);
				}
			}

		}

		if (thiz.remotePeerConnectionStats[streamId] != null)
		{
			clearInterval(thiz.remotePeerConnectionStats[streamId].timerId);
			delete thiz.remotePeerConnectionStats[streamId];
		}
		
		
	}

	this.signallingState = function(streamId) {
		if (thiz.remotePeerConnection[streamId] != null) {
			return thiz.remotePeerConnection[streamId].signalingState;
		}
		return null;
	}

	this.iceConnectionState = function(streamId) {
		if (thiz.remotePeerConnection[streamId] != null) {
			return thiz.remotePeerConnection[streamId].iceConnectionState;
		}
		return null;
	}

	this.gotDescription = function(configuration, streamId)
	{
		thiz.remotePeerConnection[streamId]
		.setLocalDescription(configuration)
		.then(function(responose)  {
			console.debug("Set local description successfully for stream Id " + streamId);

			var jsCmd = {
					command : "takeConfiguration",
					streamId : streamId,
					type : configuration.type,
					sdp : configuration.sdp

			};

			if (thiz.debug) {
				console.debug("local sdp: ");
				console.debug(configuration.sdp);
			}

			thiz.webSocketAdaptor.send(JSON.stringify(jsCmd));

		}).catch(function(error){
			console.error("Cannot set local description. Error is: " + error);
		});
	}


	this.turnOffLocalCamera = function() {
		if (thiz.remotePeerConnection != null) {

			var track = thiz.localStream.getVideoTracks()[0];
			track.enabled = false;
		}
		else {
			this.callbackError("NoActiveConnection");
		}
	}

	this.turnOnLocalCamera = function() {
		if (thiz.remotePeerConnection != null) {
			var track = thiz.localStream.getVideoTracks()[0];
			track.enabled = true;
		}
		else {
			this.callbackError("NoActiveConnection");
		}
	}

	this.muteLocalMic = function() {
		if (thiz.remotePeerConnection != null) {
			var track = thiz.localStream.getAudioTracks()[0];
			track.enabled = false;
		}
		else {
			this.callbackError("NoActiveConnection");
		}
	}

	/**
	 * if there is audio it calls callbackError with "AudioAlreadyActive" parameter
	 */
	this.unmuteLocalMic = function() {
		if (thiz.remotePeerConnection != null) {
			var track = thiz.localStream.getAudioTracks()[0];
			track.enabled = true;
		}
		else {
			this.callbackError("NoActiveConnection");
		}
	}

	this.takeConfiguration = function (idOfStream, configuration, typeOfConfiguration)
	{
		var streamId = idOfStream
		var type = typeOfConfiguration;
		var conf = configuration;
		var isTypeOffer = (type == "offer");

		var dataChannelMode = "publish";
		if(isTypeOffer) {
			dataChannelMode = "play";
		}

		thiz.initPeerConnection(streamId, dataChannelMode);

		thiz.remotePeerConnection[streamId].setRemoteDescription(new RTCSessionDescription({
			sdp : conf,
			type : type
		})).then(function(response)  {

			if (thiz.debug) {
				console.debug("set remote description is succesfull with response: " + response + " for stream : "
						+ streamId + " and type: " + type);
				console.debug(conf);
			}

			thiz.remoteDescriptionSet[streamId] = true;
			var length = thiz.iceCandidateList[streamId].length;
			console.debug("Ice candidate list size to be added: " + length);
			for (var i = 0; i < length; i++) {
				thiz.addIceCandidate(streamId, thiz.iceCandidateList[streamId][i]);
			}
			thiz.iceCandidateList[streamId] = [];

			if (isTypeOffer) {
				//SDP constraints may be different in play mode
				console.log("try to create answer for stream id: " + streamId);

				thiz.remotePeerConnection[streamId].createAnswer(thiz.sdp_constraints)
				.then(function(configuration)
						{
					console.log("created answer for stream id: " + streamId);
					thiz.gotDescription(configuration, streamId);
						})
						.catch(function(error)
								{
							console.error("create answer error :" + error);
								});
			}

		}).catch(function(error){
			if (thiz.debug) {
				console.error("set remote description is failed with error: " + error);
			}
			if(error.toString().indexOf("InvalidAccessError") > -1 || error.toString().indexOf("setRemoteDescription")  > -1){
				/**
				 * This error generally occurs in codec incompatibility.
				 * AMS for a now supports H.264 codec. This error happens when some browsers try to open it from VP8.
				 */
				thiz.callbackError("notSetRemoteDescription");
			}
		});

	}


	this.takeCandidate = function(idOfTheStream, tmpLabel, tmpCandidate) {
		var streamId = idOfTheStream;
		var label = tmpLabel;
		var candidateSdp = tmpCandidate;

		var candidate = new RTCIceCandidate({
			sdpMLineIndex : label,
			candidate : candidateSdp
		});

		var dataChannelMode = "peer";
		thiz.initPeerConnection(streamId, dataChannelMode);

		if (thiz.remoteDescriptionSet[streamId] == true) {
			thiz.addIceCandidate(streamId, candidate);
		}
		else {
			console.debug("Ice candidate is added to list because remote description is not set yet");
			thiz.iceCandidateList[streamId].push(candidate);
		}
	};

	this.addIceCandidate = function(streamId, candidate) {
		if (thiz.candidateTypes.includes(candidate.protocol))
		{

			thiz.remotePeerConnection[streamId].addIceCandidate(candidate)
			.then(function(response) {
				if (thiz.debug) {
					console.log("Candidate is added for stream " + streamId);
				}
			})
			.catch(function (error) {
				console.error("ice candiate cannot be added for stream id: " + streamId + " error is: " + error  );
				console.error(candidate);
			});
		}
		else {
			if (thiz.debug) {
				console.log("Candidate's protocol("+candidate.protocol+") is not supported. Supported protocols:" + thiz.candidateTypes);
			}
		}
	};

	this.startPublishing = function(idOfStream) {
		var streamId = idOfStream;

		thiz.initPeerConnection(streamId, "publish");

		thiz.remotePeerConnection[streamId].createOffer(thiz.sdp_constraints)
		.then(function(configuration) {
			thiz.gotDescription(configuration, streamId);
		})
		.catch(function (error) {
			console.error("create offer error for stream id: " + streamId + " error: " + error);
		});
	};

	/**
	 * If we have multiple video tracks in coming versions, this method may cause some issues
	 */
	this.getVideoSender = function(streamId) {

		var videoSender = null;
		if ((adapter.browserDetails.browser === 'chrome' ||
				(adapter.browserDetails.browser === 'firefox' &&
						adapter.browserDetails.version >= 64)) &&
						'RTCRtpSender' in window &&
						'setParameters' in window.RTCRtpSender.prototype)
		{
			const senders = thiz.remotePeerConnection[streamId].getSenders();

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
	this.changeBandwidth = function(bandwidth, streamId) {

		var errorDefinition = "";

		var videoSender = thiz.getVideoSender(streamId);

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

	this.getStats = function(streamId)
	{
		thiz.remotePeerConnection[streamId].getStats(null).then(stats =>
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

			thiz.remotePeerConnectionStats[streamId].totalBytesReceived = bytesReceived;
			thiz.remotePeerConnectionStats[streamId].packetsLost = packetsLost;
			thiz.remotePeerConnectionStats[streamId].fractionLost = fractionLost;
			thiz.remotePeerConnectionStats[streamId].currentTime = currentTime;
			thiz.remotePeerConnectionStats[streamId].totalBytesSent = bytesSent;
			thiz.remotePeerConnectionStats[streamId].audioLevel = audioLevel;

			thiz.callback("updated_stats", thiz.remotePeerConnectionStats[streamId]);

		});
	}


	this.enableStats = function(streamId) {
		thiz.remotePeerConnectionStats[streamId] = new PeerStats(streamId);
		thiz.remotePeerConnectionStats[streamId].timerId = setInterval(() =>
		{
			thiz.getStats(streamId);

		}, 5000);
	}

	/**
	 * After calling this function, create new WebRTCAdaptor instance, don't use the the same objectone
	 * Because all streams are closed on server side as well when websocket connection is closed.
	 */
	this.closeWebSocket = function() {
		for (var key in thiz.remotePeerConnection) {
			thiz.remotePeerConnection[key].close();
		}
		//free the remote peer connection by initializing again
		thiz.remotePeerConnection = new Array();
		thiz.webSocketAdaptor.close();
	}

	this.peerMessage = function (streamId, definition, data) {
		var jsCmd = {
				command : "peerMessageCommand",
				streamId : streamId,
				definition : definition,
				data: data,
		};

		thiz.webSocketAdaptor.send(JSON.stringify(jsCmd));
	}

	this.sendData = function(streamId, message) {
		var dataChannel = thiz.remotePeerConnection[streamId].dataChannel;
		dataChannel.send(message);
	}

	function WebSocketAdaptor() {
		var wsConn = new WebSocket(thiz.websocket_url);

		var connected = false;

		var pingTimerId = -1;

		var clearPingTimer = function() {
			if (pingTimerId != -1) {
				if (thiz.debug) {
					console.debug("Clearing ping message timer");
				}
				clearInterval(pingTimerId);
				pingTimerId = -1;
			}
		}

		var sendPing = function() {
			var jsCmd = {
					command : "ping"
			};
			wsConn.send(JSON.stringify(jsCmd));
		}

		this.close = function() {
			wsConn.close();
		}

		wsConn.onopen = function() {
			if (thiz.debug) {
				console.log("websocket connected");
			}

			pingTimerId = setInterval(() => {
				sendPing();
			}, 3000);

			connected = true;
			thiz.callback("initialized");
		}

		this.send = function(text) {

			if (wsConn.readyState == 0 || wsConn.readyState == 2 || wsConn.readyState == 3) {
				thiz.callbackError("WebSocketNotConnected");
				return;
			}
			wsConn.send(text);
			console.log("sent message:" +text);
		}

		this.isConnected = function() {
			return connected;
		}

		wsConn.onmessage = function(event) {
			var obj = JSON.parse(event.data);

			if (obj.command == "start")
			{
				//this command is received first, when publishing so playmode is false

				if (thiz.debug) {
					console.debug("received start command");
				}

				thiz.startPublishing(obj.streamId);
			}
			else if (obj.command == "takeCandidate") {

				if (thiz.debug) {
					console.debug("received ice candidate for stream id " + obj.streamId);
					console.debug(obj.candidate);
				}

				thiz.takeCandidate(obj.streamId, obj.label, obj.candidate);

			} else if (obj.command == "takeConfiguration") {

				if (thiz.debug) {
					console.log("received remote description type for stream id: " + obj.streamId + " type: " + obj.type );
				}
				thiz.takeConfiguration(obj.streamId, obj.sdp, obj.type);

			}
			else if (obj.command == "stop") {
				console.debug("Stop command received");
				thiz.closePeerConnection(obj.streamId);
			}
			else if (obj.command == "error") {
				thiz.callbackError(obj.definition);
			}
			else if (obj.command == "notification") {
				thiz.callback(obj.definition, obj);
				if (obj.definition == "play_finished" || obj.definition == "publish_finished") {
					thiz.closePeerConnection(obj.streamId);
				}
			}
			else if (obj.command == "streamInformation") {
				thiz.callback(obj.command, obj);
			}
			else if (obj.command == "pong") {
				thiz.callback(obj.command);
			}
			else if (obj.command == "trackList") {
				thiz.callback(obj.command, obj);
			}
			else if (obj.command == "connectWithNewId") {
				thiz.multiPeerStreamId = obj.streamId;
				thiz.join(obj.streamId);
			}
			else if (obj.command == "peerMessageCommand") {
				thiz.callback(obj.command, obj);
			}
		}

		wsConn.onerror = function(error) {
			console.log(" error occured: " + JSON.stringify(error));
			clearPingTimer();
			thiz.callbackError(error)
		}

		wsConn.onclose = function(event) {
			connected = false;
			console.log("connection closed.");
			clearPingTimer();
			thiz.callback("closed", event);
		}
	}
}
