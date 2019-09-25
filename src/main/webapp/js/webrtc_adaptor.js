/**
 *
 * @returns
 */
function WebRTCAdaptor(initialValues)
{
	var thiz = this;
	thiz.peerconnection_config = null;
	thiz.sdp_constraints = null;
	thiz.remotePeerConnection = new Array();
	thiz.remoteDescriptionSet = new Array();
	thiz.iceCandidateList = new Array();
	thiz.webSocketAdaptor = null;
	thiz.roomName = null;
	thiz.videoTrackSender = null;
	thiz.audioTrackSender = null;
	thiz.playStreamId = new Array();
	thiz.micGainNode = null;
	thiz.localStream = null;

	thiz.isPlayMode = false;
	thiz.debug = false;
	
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

	/**
	 * Get user media
	 */
	this.getUserMedia = function (mediaConstraints, audioConstraint) {
		navigator.mediaDevices.getUserMedia(mediaConstraints)
		.then(function(stream){

			//this trick, getting audio and video separately, make us add or remove tracks on the fly
			var audioTrack = stream.getAudioTracks();
			if (audioTrack.length > 0) {
				stream.removeTrack(audioTrack[0]);
			}
					
			//add callback if desktop is sharing
			if (mediaConstraints.video != "undefined" 
				  && typeof mediaConstraints.video.mandatory != "undefined"
				  && typeof mediaConstraints.video.mandatory.chromeMediaSource != "undefined"
				  && mediaConstraints.video.mandatory.chromeMediaSource == "desktop") {
				
				stream.getVideoTracks()[0].onended = function(event) {
					thiz.callback("screen_share_stopped");
				}
			}

			//now get only audio to add this stream
			if (audioConstraint != "undefined" && audioConstraint != false) {
				var media_audio_constraint = { audio: audioConstraint};
				navigator.mediaDevices.getUserMedia(media_audio_constraint)
				.then(function(audioStream) {
					
					
					if (thiz.mediaConstraints != "undefined" && thiz.mediaConstraints.video == "screen+camera" )
					{
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
							//call gotStream
							thiz.gotStream(canvasStream);

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
					else {
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
		})
		.catch(function(error) {
			thiz.callbackError(error.name, error.message);
		});
	}
	
	this.openScreen = function(audioConstraint, openCamera) 
	{
		var callback = function(message) 
		{
			if (message.data == "rtcmulticonnection-extension-loaded") {
				console.debug("rtcmulticonnection-extension-loaded parameter is received");
				window.postMessage("get-sourceId", "*");
			}
			else if (message.data == "PermissionDeniedError") {
				console.debug("Permission denied error");
				thiz.callbackError("screen_share_permission_denied");
			}
			else if (message.data && message.data.sourceId) {
				var mediaConstraints = {
						audio: false,
						video: {
							mandatory: {
								chromeMediaSource: 'desktop',
								chromeMediaSourceId: message.data.sourceId,
							},
							optional: []
						}
				};

				thiz.getUserMedia(mediaConstraints, audioConstraint);

				//remove event listener
				window.removeEventListener("message", callback);	    
			}

		}
		window.addEventListener("message", callback, false);

		window.postMessage("are-you-there", "*");
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
			
			if (mediaConstraints.video == "screen+camera" || mediaConstraints.video == "screen") {
				this.openScreen(audioConstraint);
			}
		    else {
				thiz.getUserMedia(mediaConstraints, audioConstraint);
		    }
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
	 * Checks chrome screen share extension is avaiable
	 * if exists it call callback with "screen_share_extension_available"
	 */
	this.checkExtension = function() {
		var callback = function (message) {

			if (message.data == "rtcmulticonnection-extension-loaded") {
				thiz.callback("screen_share_extension_available");
				window.removeEventListener("message", callback);
			}

		};
		//add event listener for desktop capture
		window.addEventListener("message", callback, false);

		window.postMessage("are-you-there", "*");

	};

	/*
	 * Call check extension. Below function is called when this class is created
	 */
	thiz.checkExtension();

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

	this.play = function (streamId, token, roomId) {
		thiz.playStreamId.push(streamId);
		var jsCmd =
		{
				command : "play",
				streamId : streamId,
				token : token,
				room : roomId,
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
				streamId: streamId,
		};

		thiz.webSocketAdaptor.send(JSON.stringify(jsCmd));
		thiz.closePeerConnection(streamId);
	}

	this.getStreamInfo = function(streamId) {
		var jsCmd = {
				command : "getStreamInfo",
				streamId: streamId,
		};
		this.webSocketAdaptor.send(JSON.stringify(jsCmd));
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
		var mediaConstraints = {
				video : true,
				audio : false
		};

		thiz.switchVideoSource(streamId, mediaConstraints, null);
	}

	this.switchDesktopCapture = function(streamId) {
		
		var screenShareExtensionCallback =  function(message) {

			if (message.data == "rtcmulticonnection-extension-loaded") {
				console.debug("rtcmulticonnection-extension-loaded parameter is received");
				window.postMessage("get-sourceId", "*");
			}
			else if (message.data == "PermissionDeniedError") {
				console.debug("Permission denied error");
				thiz.callbackError("screen_share_permission_denied");
			}
			else if (message.data && message.data.sourceId) {
				var mediaConstraints = {
						audio: false,
						video: {
							mandatory: {
								chromeMediaSource: 'desktop',
								chromeMediaSourceId: message.data.sourceId,
							},
							optional: []
						}
				};

				thiz.switchVideoSource(streamId, mediaConstraints, function(event) {
					thiz.callback("screen_share_stopped");
					thiz.switchVideoCapture(streamId);
				});

				//remove event listener
				window.removeEventListener("message", screenShareExtensionCallback);	    
			}
		}
		
		
		//add event listener for desktop capture
		window.addEventListener("message", screenShareExtensionCallback, false);

		window.postMessage("are-you-there", "*");
	}

	thiz.arrangeStreams = function(stream, onEndedCallback) {
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

	this.switchVideoSource = function (streamId, mediaConstraints, onEndedCallback) {

		navigator.mediaDevices.getUserMedia(mediaConstraints)
		.then(function(stream) {

			if (thiz.remotePeerConnection[streamId] != null) {
				var videoTrackSender = thiz.remotePeerConnection[streamId].getSenders().find(function(s) {
					return s.track.kind == "video";
				});

				videoTrackSender.replaceTrack(stream.getVideoTracks()[0]).then(function(result) {
					thiz.arrangeStreams(stream, onEndedCallback);

				}).catch(function(error) {
					console.log(error.name);
				});
			}
			else {
				thiz.arrangeStreams(stream, onEndedCallback);	
			}

		})
		.catch(function(error) {
			thiz.callbackError(error.name);
		});
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
					track: event.streams[0],
					streamId: streamId
			}
			thiz.callback("newStreamAvailable", dataObj);
		}

	}

	this.iceCandidateReceived = function(event, streamId) {
		if (event.candidate) {

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
	}


	this.initPeerConnection = function(streamId) {
		if (thiz.remotePeerConnection[streamId] == null) 
		{
			var closedStreamId = streamId;
			console.log("stream id in init peer connection: " + streamId + " close dstream id: " + closedStreamId);
			thiz.remotePeerConnection[streamId] = new RTCPeerConnection(thiz.peerconnection_config);
			thiz.remoteDescriptionSet[streamId] = false;
			thiz.iceCandidateList[streamId] = new Array();
			if (!thiz.playStreamId.includes(streamId)) 
			{
				thiz.remotePeerConnection[streamId].addStream(thiz.localStream);
			}
			thiz.remotePeerConnection[streamId].onicecandidate = function(event) {
				thiz.iceCandidateReceived(event, closedStreamId);
			}
			thiz.remotePeerConnection[streamId].ontrack = function(event) {
				thiz.onTrack(event, closedStreamId);
			}
		}
	}

	this.closePeerConnection = function(streamId) {
		if (thiz.remotePeerConnection[streamId] != null
				&& thiz.remotePeerConnection[streamId].signalingState != "closed") {
			thiz.remotePeerConnection[streamId].close();
			thiz.remotePeerConnection[streamId] = null;
			delete thiz.remotePeerConnection[streamId];
			var playStreamIndex = thiz.playStreamId.indexOf(streamId);
			if (playStreamIndex != -1) {
				thiz.playStreamId.splice(playStreamIndex, 1);
			}

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

		thiz.initPeerConnection(streamId);

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

			if (type == "offer") {
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

		thiz.initPeerConnection(streamId);
		
		if (thiz.remoteDescriptionSet[streamId] == true) {
			thiz.addIceCandidate(streamId, candidate);
		}
		else {
			console.debug("Ice candidate is added to list because remote description is not set yet");
			thiz.iceCandidateList[streamId].push(candidate);
		}

	}
	
	this.addIceCandidate = function(streamId, candidate) {
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

	this.startPublishing = function(idOfStream) {
		var streamId = idOfStream;

		thiz.initPeerConnection(streamId);

		thiz.remotePeerConnection[streamId].createOffer(thiz.sdp_constraints)
		.then(function(configuration) {
			thiz.gotDescription(configuration, streamId);
		})
		.catch(function (error) {

			console.error("create offer error for stream id: " + streamId + " error: " + error);
		});
	};
	
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
