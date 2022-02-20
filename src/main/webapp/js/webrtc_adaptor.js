/**
 *
 * @returns
 */

import {PeerStats} from "./peer_stats.js"
import {WebSocketAdaptor} from "./websocket_adaptor.js"
import {MediaManager} from "./media_manager.js" 


class ReceivingMessage{
		constructor(size) {
		this.size = size;
		this.received = 0;
		this.data = new ArrayBuffer(size);
	}
}

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
		this.idMapping = new Array();

		/**
		 * This is used when only data is brodcasted with the same way video and/or audio.
	     * The difference is that no video or audio is sent when this field is true 
		 */
		this.onlyDataChannel = false;

		
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


		this.mediaManager = new MediaManager({
			mediaConstraints : this.mediaConstraints,
			callback : (info, obj) => {this.callback(info, obj)},
			callbackError : (error, message) => {this.callbackError(error, message)},
			checkWebSocketConnection : () => {this.checkWebSocketConnection()},
			localVideo : this.localVideo,
			localVideoId : this.localVideoId,
		});
				
		//Check browser support for screen share function
		this.mediaManager.checkBrowserScreenShareSupported();
		
		if (!this.isPlayMode && !this.onlyDataChannel && typeof this.mediaConstraints != "undefined" && this.mediaManager.localStream == null)
		{
			this.mediaManager.checkWebRTCPermissions();

			// Get devices only in publish mode.
			this.mediaManager.getDevices();
			this.mediaManager.trackDeviceChange();

			if (typeof this.mediaConstraints.video != "undefined" && this.mediaConstraints.video != false)
			{
				this.mediaManager.openStream(this.mediaConstraints, this.mode);	
			}
			else {
				// get only audio
				var media_audio_constraint = { audio: this.mediaConstraints.audio };
				this.mediaManager.navigatorUserMedia(media_audio_constraint , stream => {
					this.mediaManager.gotStream(stream);
				}, true)
			}
		}
		else {
			//just playing, it does not open any stream
			this.checkWebSocketConnection();
		}
	} 

	publish(streamId, token, subscriberId, subscriberCode, streamName, mainTrack, metaData) 
	{
		this.publishStreamId =streamId;
		if (this.onlyDataChannel) {
			var jsCmd = {
				command : "publish",
				streamId : streamId,
				token : token,
				subscriberId: typeof subscriberId !== undefined ? subscriberId : "" ,
				subscriberCode: typeof subscriberCode !== undefined ? subscriberCode : "",
				streamName : typeof streamName !== undefined ? streamName : "" ,
				mainTrack : typeof mainTrack !== undefined ? mainTrack : "" ,
				video: false,
				audio: false,
				metaData: metaData,
			};
		}
		//If it started with playOnly mode and wants to publish now
		else if(this.mediaManager.localStream == null){
			this.mediaManager.navigatorUserMedia(this.mediaConstraints, (stream => {
				this.mediaManager.gotStream(stream);
				var jsCmd = {
					command : "publish",
					streamId : streamId,
					token : token,
					subscriberId: typeof subscriberId !== undefined ? subscriberId : "" ,
					subscriberCode: typeof subscriberCode !== undefined ? subscriberCode : "",
					streamName : typeof streamName !== undefined ? streamName : "" ,
					mainTrack : typeof mainTrack !== undefined ? mainTrack : "" ,				
					video: this.mediaManager.localStream.getVideoTracks().length > 0 ? true : false,
					audio: this.mediaManager.localStream.getAudioTracks().length > 0 ? true : false,
					metaData: metaData,
				};
				this.webSocketAdaptor.send(JSON.stringify(jsCmd));
			}), false);
		} 
		else{
			var jsCmd = {
					command : "publish",
					streamId : streamId,
					token : token,
					subscriberId: typeof subscriberId !== undefined ? subscriberId : "" ,
					subscriberCode: typeof subscriberCode !== undefined ? subscriberCode : "",
					streamName : typeof streamName !== undefined ? streamName : "" ,
					mainTrack : typeof mainTrack !== undefined ? mainTrack : "" ,
					video: this.mediaManager.localStream.getVideoTracks().length > 0 ? true : false,
					audio: this.mediaManager.localStream.getAudioTracks().length > 0 ? true : false,
					metaData: metaData,
			};
		}
		this.webSocketAdaptor.send(JSON.stringify(jsCmd));
	}

	joinRoom(roomName, streamId, mode) 
	{
		this.roomName = roomName;

		var jsCmd = {
				command : "joinRoom",
				room: roomName,
				streamId: streamId,
				mode: mode,
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
				viewerInfo : this.viewerInfo,
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
	
	upateStreamMetaData(streamId, metaData) 
	{
		var jsCmd = {
				command : "updateStreamMetaData",
				streamId: streamId,
				metaData: metaData,
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
				data: event.data,
			};

			var data = obj.data;

			if(typeof data === 'string' || data instanceof String){
				this.callback("data_received", obj);
			}
			else {
				var length = data.length || data.size || data.byteLength;

				var view = new Int32Array(data, 0, 1);
				var token = view[0];

				var msg = this.receivingMessages[token];
				if(msg == undefined) {
					var view = new Int32Array(data, 0, 2);
					var size = view[1];
					msg = new ReceivingMessage(size);
					this.receivingMessages[token] = msg;
					if(length > 8) {
						console.error("something went wrong in msg receiving");
					}
					return;
				}

				var rawData = data.slice(4, length);

				var dataView = new Uint8Array(msg.data);
				dataView.set(new Uint8Array(rawData), msg.received, length-4);
				msg.received += length-4;

				if(msg.size == msg.received) {
					obj.data = msg.data;
					this.callback("data_received", obj);
				}
			}
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
				if(this.mediaManager.localStream != null) {
					this.remotePeerConnection[streamId].addStream(this.mediaManager.localStream);
				}
			}
			this.remotePeerConnection[streamId].onicecandidate = event => {
				this.iceCandidateReceived(event, closedStreamId);
			}
			this.remotePeerConnection[streamId].ontrack = event => {
				this.onTrack(event, closedStreamId);
			}

			this.remotePeerConnection[streamId].onnegotiationneeded = event => {
				console.log("onnegotiationneeded");
			}

			if (this.dataChannelEnabled){
				// skip initializing data channel if it is disabled
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
		if(this.mediaManager.soundMeters[streamId] != null){
			delete this.mediaManager.soundMeters[streamId];
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

	takeConfiguration(idOfStream, configuration, typeOfConfiguration, idMapping)
	{
		var streamId = idOfStream
		var type = typeOfConfiguration;
		var conf = configuration;
		var isTypeOffer = (type == "offer");

		var dataChannelMode = "publish";
		if(isTypeOffer) {
			dataChannelMode = "play";
		}

		this.idMapping[streamId] = idMapping;

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
					//support for stereo
          			configuration.sdp = configuration.sdp.replace("useinbandfec=1", "useinbandfec=1; stereo=1");
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
		if(this.remotePeerConnectionStats[streamId] != null || typeof this.remotePeerConnectionStats[streamId] != 'undefined'){
			clearInterval(this.remotePeerConnectionStats[streamId].timerId);
		}
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

	checkWebSocketConnection()
	{
		if (this.webSocketAdaptor == null || (this.webSocketAdaptor.isConnected() == false && this.webSocketAdaptor.isConnecting() == false) ) {
			this.webSocketAdaptor = new WebSocketAdaptor({websocket_url : this.websocket_url, webrtcadaptor : this, callback : this.callback, callbackError : this.callbackError, debug : this.debug});
		}
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

	sendData(streamId, data) 
	{
		var CHUNK_SIZE = 16000;
		var dataChannel = this.remotePeerConnection[streamId].dataChannel;
        var length = data.length || data.size || data.byteLength;
		var sent = 0;

		if(typeof data === 'string' || data instanceof String){
			dataChannel.send(data);
		}
		else {
			var token = Math.floor(Math.random() * 999999);
			let header = new Int32Array(2);
			header[0] = token;
			header[1] = length;

			dataChannel.send(header);

			var sent = 0;
			while(sent < length) {
				var size = Math.min(length-sent, CHUNK_SIZE);
				var buffer = new Uint8Array(size+4);
				var tokenArray = new Int32Array(1);
				tokenArray[0] = token;
				buffer.set(new Uint8Array(tokenArray.buffer, 0, 4), 0);

				var chunk = data.slice(sent, sent+size);
				buffer.set(new Uint8Array(chunk), 4);
				sent += size;

				dataChannel.send(buffer);
			}
		}
	}


	turnOffLocalCamera(streamId) {this.mediaManager.turnOffLocalCamera(streamId);}
	turnOnLocalCamera(streamId) {this.mediaManager.turnOnLocalCamera(streamId);}
	muteLocalMic() {this.mediaManager.muteLocalMic(streamId);}
	unmuteLocalMic() {this.mediaManager.muteLocalMic(streamId);}
	switchDesktopCapture(streamId) {this.mediaManager.switchDesktopCapture(streamId);}
	switchVideoCameraCapture(streamId, deviceId) {this.mediaManager.switchVideoCameraCapture(streamId, deviceId);}
	switchDesktopCaptureWithCamera(streamId) {this.mediaManager.switchDesktopCaptureWithCamera(streamId);}
	switchAudioInputSource(streamId, deviceId) {this.mediaManager.switchAudioInputSource(streamId, deviceId);}
}