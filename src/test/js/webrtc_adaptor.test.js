import { WebRTCAdaptor } from '../../main/js/webrtc_adaptor.js';
import { MediaManager } from "../../main/js/media_manager.js";
import { PeerStats } from "../../main/js/peer_stats.js";
import { WebSocketAdaptor } from '../../main/js/websocket_adaptor.js';

// Add this before the ICE ServerConfig debug logging test to mock Logger
window.Logger = { debug: () => {} };

describe("WebRTCAdaptor", function() {

	var clock;

	var sandbox;

	var initialized = false;

	var currentTest;

	var processStarted = false;

	beforeEach(function() {
		clock = sinon.useFakeTimers();
		sandbox = sinon.createSandbox();

		currentTest = this.currentTest;
		console.log("**** starting test: ****", currentTest.title);
	});


	afterEach(() => {
		console.log("**** ending test: ****", currentTest.title);
		// Restore the default sandbox here
		sinon.restore();
		clock.restore();
		sandbox.restore();

	});
	
	//I've put this test first because it fails when run in the middle, ı thnk one test breaks it. Let's revisit this case in another time - mekya
	it("testSoundMeter", function(done) {
			this.timeout(15000);
			console.log("Starting testSoundMeter");

			var adaptor = new WebRTCAdaptor({
				websocketURL: "ws://localhost",
				mediaConstraints: {
					video: true,
					audio: true
				},
				initializeComponents: false,
				volumeMeterUrl: '/volume-meter-processor.js',
			});

			//fake stream in te browser is a period audio and silence, so getting sound level more than 0 requires

			adaptor.initialize().then(() => {
				var audioContext = new (window.AudioContext || window.webkitAudioContext)();
				var oscillator = audioContext.createOscillator();
				oscillator.type = "sine";
				oscillator.frequency.value = 800;
				var mediaStreamSource = audioContext.createMediaStreamDestination();
				oscillator.connect(mediaStreamSource);
				var mediaStreamTrack = mediaStreamSource.stream.getAudioTracks()[0];
				oscillator.start();

				adaptor.mediaManager.localStream = new MediaStream([mediaStreamTrack])
				adaptor.mediaManager.audioContext = audioContext;
				adaptor.enableAudioLevelForLocalStream((level) => {
					console.log("sound level -> " + level);
					if (level > 0) {
						done();
					}
				});

				expect(adaptor.mediaManager.localStreamSoundMeter).to.not.be.null;
			})
		})


	it("Initialize", async function() {

		try {
			var adaptor = new WebRTCAdaptor({});
			expect.fail("It should throw exception because websocket url is mandatory");
		} catch (err) {

		}

		try {
			var websocketURL = "ws://localhost";
			var adaptor = new WebRTCAdaptor({
				websocketURL: websocketURL
			});

			expect(adaptor.websocketURL).to.be.equal(websocketURL);
		} catch (err) {
			expect.fail(err);
		}


	});


	it("Auto reconnect play", async function() {

		var adaptor = new WebRTCAdaptor({
			websocketURL: "ws://example.com",
			isPlayMode: true
		});

		var webSocketAdaptor = sinon.mock(adaptor.webSocketAdaptor);
		var stopCall = sinon.replace(adaptor, "stop", sinon.fake());

		var sendExpectation = webSocketAdaptor.expects("send");
		//sendExpectation first one is direct, second one through tryAgain
		sendExpectation.exactly(2);

		var streamId = "stream123";
		expect(adaptor.remotePeerConnection[streamId]).to.be.undefined;

		//first call for sendExpectation direct
		adaptor.play("stream123");

		expect(adaptor.remotePeerConnection[streamId]).to.not.be.undefined;

		clock.tick(2000);
		expect(stopCall.called).to.be.false;
		clock.tick(1000);
		expect(stopCall.called).to.be.true;

		expect(stopCall.calledWithMatch("stream123")).to.be.true;

		adaptor.stop(streamId);

		expect(adaptor.remotePeerConnection[streamId]).to.not.be.undefined;

		//Add extra delay because play is called a few seconds later then the stop in tryAgain
		clock.tick(1500);

		sendExpectation.verify();

	});

	it("Auto reconnect publish", async function() {

		var adaptor = new WebRTCAdaptor({
			websocketURL: "ws://example.com",
			onlyDataChannel: true
		});

		var webSocketAdaptor = sinon.mock(adaptor.webSocketAdaptor);
		var stopCall = sinon.replace(adaptor, "stop", sinon.fake());

		var sendExpectation = webSocketAdaptor.expects("send");
		//sendExpectation first one is direct, second one through tryAgain
		sendExpectation.exactly(2);

		var streamId = "stream1234";
		expect(adaptor.remotePeerConnection[streamId]).to.be.undefined;

		//first call for sendExpectation direct
		adaptor.publish(streamId);

		expect(adaptor.remotePeerConnection[streamId]).to.not.be.undefined;

		clock.tick(2000);
		expect(stopCall.called).to.be.false;
		clock.tick(1000);
		expect(stopCall.called).to.be.true;

		expect(stopCall.calledWithMatch(streamId)).to.be.true;

		adaptor.enableStats(streamId);
		expect(adaptor.remotePeerConnectionStats[streamId]).to.not.be.undefined

		expect(await adaptor.getStats(streamId)).to.be.not.null;


		console.log(adaptor.remotePeerConnectionStats[streamId])


		adaptor.stop(streamId);

		expect(adaptor.remotePeerConnection[streamId]).to.not.be.undefined;
		//Add extra delay because publish is called a few seconds later the stop in tryAgain method

		clock.tick(1500);

		sendExpectation.verify();

	});

	it("toggleVideo", async function() {
		let adaptor = new WebRTCAdaptor({
			websocketURL: "ws://example.com",
			isPlayMode: true
		});

		let webSocketAdaptor = sinon.mock(adaptor.webSocketAdaptor);
		let streamId = "stream1";
		let trackId = "trackId";
		let enabled = true;

		let jsCmd = {
			command: "toggleVideo",
			streamId: streamId,
			trackId: trackId,
			enabled: enabled,
		};

		let sendExpectation = webSocketAdaptor.expects("send").once().withArgs(JSON.stringify(jsCmd));


		adaptor.toggleVideo(streamId, trackId, enabled);

		sendExpectation.verify()
	})


	it("Close websocket", async function() {
		var adaptor = new WebRTCAdaptor({
			websocketURL: "ws://example.com",
			isPlayMode: true
		});
		let webSocketAdaptor = sinon.mock(adaptor.webSocketAdaptor);
		let closeExpectation = webSocketAdaptor.expects("close");

		let closePeerConnection = sinon.replace(adaptor, "closePeerConnection", sinon.fake());

		let streamId = "stream123";
		expect(adaptor.remotePeerConnection[streamId]).to.be.undefined;
		adaptor.initPeerConnection(streamId, "play");
		expect(adaptor.remotePeerConnection[streamId]).to.not.be.undefined;

		adaptor.closeWebSocket();

		expect(closePeerConnection.calledWithMatch(streamId)).to.be.true;

		closeExpectation.verify();


	});


	it("should set connected and connecting to false and log the correct message", function() {

		var adaptor = new WebRTCAdaptor({
			websocketURL: "ws://example.com",
			isPlayMode: true
		});
		let webSocketAdaptor = adaptor.webSocketAdaptor;


		webSocketAdaptor.connected = true;
		webSocketAdaptor.connecting = true;

		expect(webSocketAdaptor.connected).to.be.true;
		expect(webSocketAdaptor.connecting).to.be.true;
		// Simulate offline event
		const event = new Event("offline");
		window.dispatchEvent(event);

		// Assertions
		expect(webSocketAdaptor.connected).to.be.false;
		expect(webSocketAdaptor.connecting).to.be.false;

	});
	
	
	it("reconnectIfRequired", async function() {
		var adaptor = new WebRTCAdaptor({
									websocketURL: "ws://example.com",
									isPlayMode: true
								});
								
	    let tryAgain = sinon.replace(adaptor, "tryAgain", sinon.fake());
		

		adaptor.reconnectIfRequired(100);
		adaptor.reconnectIfRequired(200);
		clock.tick(300);
		
		expect(tryAgain.calledOnce).to.be.true;
		
		

	});
	
	it("oniceconnectionstatechangeCallback", async function() {
		var adaptor = new WebRTCAdaptor({
							websocketURL: "ws://example.com",
							isPlayMode: true
						});
		
		let reconnectIfRequired = sinon.replace(adaptor, "reconnectIfRequired", sinon.fake());
		var obj = { state: "failed", streamId: "streamId" };

		var stopFake = sinon.replace(adaptor, "stop", sinon.fake());
		adaptor.oniceconnectionstatechangeCallback(obj);
		expect(reconnectIfRequired.calledOnce).to.be.true;
		expect(reconnectIfRequired.calledWithExactly(0, false)).to.be.true;
		
		obj = { state: "closed", streamId: "streamId" };
		
		adaptor.oniceconnectionstatechangeCallback(obj);
		expect(reconnectIfRequired.calledTwice).to.be.true;
		expect(reconnectIfRequired.calledWithExactly(0, false)).to.be.true;
		expect(reconnectIfRequired.callCount).to.be.equal(2);
		
		obj = { state: "disconnected", streamId: "streamId" };
		adaptor.oniceconnectionstatechangeCallback(obj);
		expect(reconnectIfRequired.callCount).to.be.equal(3);
		
		
		obj = { state: "connected", streamId: "streamId" };
		adaptor.oniceconnectionstatechangeCallback(obj);
		expect(reconnectIfRequired.callCount).to.be.equal(3);
		
		
	});
	
	it("websocketCallback", async function() {
		var adaptor = new WebRTCAdaptor({
					websocketURL: "ws://example.com",
					isPlayMode: true
				});
		
		let reconnectIfRequired = sinon.replace(adaptor, "reconnectIfRequired", sinon.fake());
		
		var stopFake = sinon.replace(adaptor, "stop", sinon.fake());
		adaptor.websocketCallback("closed");
		
		expect(reconnectIfRequired.calledOnce).to.be.true;
		expect(reconnectIfRequired.calledWithExactly(0, true)).to.be.true;

		
		adaptor.websocketCallback("anyOtherThing");
		
		//it should be still once
		expect(reconnectIfRequired.calledOnce).to.be.true;

				
	});

	it("tryAgainForceReconnect", async function() {
		
		var adaptor = new WebRTCAdaptor({
							websocketURL: "ws://example.com",
							isPlayMode: true
						});
		var streamId = "streamId";	
		adaptor.publishStreamId = streamId;
		
		let stop = sinon.replace(adaptor, "stop", sinon.fake());
		
		var mockPC = sinon.mock(RTCPeerConnection);
		adaptor.remotePeerConnection[streamId] = mockPC
		mockPC.iceConnectionState = "connected";
		
		adaptor.tryAgain(false);	
		
		expect(stop.calledOnce).to.be.false;
		
		adaptor.tryAgain(true);	
		expect(stop.calledOnce).to.be.true;


	});
	


	it("Frequent try again call", async function() {
		var adaptor = new WebRTCAdaptor({
			websocketURL: "ws://example.com",
			isPlayMode: true
		});
		
		expect(adaptor.pendingTryAgainTimerId).to.be.equal(-1);
		let webSocketAdaptor = sinon.mock(adaptor.webSocketAdaptor);
		let closeExpectation = webSocketAdaptor.expects("close");

		let closePeerConnection = sinon.replace(adaptor, "closePeerConnection", sinon.fake());

		const now = Date.now();
		adaptor.tryAgain();

		expect(adaptor.lastReconnectiontionTrialTime - now).to.be.at.most(100);

		const lrt = adaptor.lastReconnectiontionTrialTime;

		for (let i = 0; i < 100; i++) {
			adaptor.tryAgain();
			expect(adaptor.lastReconnectiontionTrialTime).to.be.equal(lrt);

		}

		clock.tick(3000);
		adaptor.tryAgain();
		expect(adaptor.lastReconnectiontionTrialTime).not.to.be.equal(lrt);
	});

	it("ReconnectionProcessStartedCallback", async function() {
		var isReconnectionProcessStartedForPublisher = false;
		var isReconnectionProcessStartedForPlayer = false;

		var adaptor = new WebRTCAdaptor({
			websocketURL: "ws://example.com",
			isPlayMode: true,
			callback: (info, obj) => {
				if (info === "reconnection_attempt_for_publisher") {
					isReconnectionProcessStartedForPublisher = true;
				} else if (info === "reconnection_attempt_for_player") {
					isReconnectionProcessStartedForPlayer = true;
				}
			}
		});
		var webSocketAdaptor = sinon.mock(adaptor.webSocketAdaptor);

		var closeExpectation = webSocketAdaptor.expects("close");

		var closePeerConnection = sinon.replace(adaptor, "closePeerConnection", sinon.fake());

		// some times Data.now() returns 0 and it is blocking the test
		// so we set lastReconnectiontionTrialTime to -3000 to avoid this
		adaptor.lastReconnectiontionTrialTime = -3000;

		adaptor.publishStreamId = "testPublisher";
		adaptor.remotePeerConnection["testPublisher"] = sinon.mock(RTCPeerConnection);
		adaptor.remotePeerConnection["testPublisher"].iceConnectionState = "failed";

		adaptor.playStreamId.push("testPlayer");
		adaptor.remotePeerConnection["testPlayer"] = sinon.mock(RTCPeerConnection);
		adaptor.remotePeerConnection["testPlayer"].iceConnectionState = "failed";

		adaptor.tryAgain();

		clock.tick(3000);

		expect(isReconnectionProcessStartedForPublisher).equal(true);
		expect(isReconnectionProcessStartedForPlayer).equal(true);
	});

	it("ReconnectionForPlay", async function() {
		var adaptor = new WebRTCAdaptor({
			websocketURL: "ws://example.com",
			isPlayMode: true
		});
		var fakeSend = sinon.replace(adaptor.webSocketAdaptor, "send", sinon.fake());

		const streamId = "test" + Math.floor(Math.random() * 100);
		adaptor.playStreamId.push(streamId);
		var mockPC = sinon.mock(RTCPeerConnection);
		adaptor.remotePeerConnection[streamId] = mockPC
		mockPC.iceConnectionState = "failed";
		mockPC.close = sinon.fake();


		clock.tick(3000);
		adaptor.tryAgain();
		//Add extra delay because publish is called a few seconds later the stop in tryAgain method

		clock.tick(1500);
		assert(fakeSend.calledOnce);
		clock.tick(2500);
		assert(fakeSend.calledTwice);


	});

	it("sanitize HTML", async function() {
		var adaptor = new WebRTCAdaptor({
			websocketURL: "ws://example.com",
			isPlayMode: true
		});
		var scriptMsg = "<script>alert(1)</script>"; //message with script
		var sanitizeMsg = adaptor.sanitizeHTML(scriptMsg);
		assert.notEqual(scriptMsg, sanitizeMsg)

		var text = "hi how are you"; //message without script
		var message = adaptor.sanitizeHTML(text)
		assert.strictEqual(text, message)
	})

	it("ReconnectionForPublish", async function() {
		var adaptor = new WebRTCAdaptor({
			websocketURL: "ws://example.com",
			isPlayMode: true
		});
		var fakeSendPublish = sinon.replace(adaptor, "sendPublishCommand", sinon.fake());
		var fakeStop = sinon.replace(adaptor, "stop", sinon.fake());

		const streamId = "test" + Math.floor(Math.random() * 100);
		adaptor.publishStreamId = streamId;
		var mockPC = sinon.mock(RTCPeerConnection);
		adaptor.remotePeerConnection[streamId] = mockPC
		mockPC.iceConnectionState = "failed";
		mockPC.close = sinon.fake();


		adaptor.mediaManager.localStream = sinon.mock();
		var callback = sinon.stub();
		callback.returns([sinon.mock()]);
		adaptor.mediaManager.localStream.getVideoTracks = callback;
		adaptor.mediaManager.localStream.getAudioTracks = callback;
		adaptor.mediaManager.localStream.getTracks = sinon.stub().returns([]);

		clock.tick(3000);
		adaptor.tryAgain();

		//Add extra delay because publish is called a few seconds later the stop in tryAgain method
		clock.tick(1500);
		assert(fakeSendPublish.calledOnce);
		assert(fakeStop.calledOnce);

		clock.tick(2500);
		assert(fakeSendPublish.calledTwice);


	});

	it("EnableStats - DisableStats", async function() {

		var adaptor = new WebRTCAdaptor({
			websocketURL: "ws://example.com",
			isPlayMode: true
		});

		const streamId = "test" + Math.floor(Math.random() * 100);
		adaptor.publishStreamId = streamId;
		var mockPC = sinon.mock(RTCPeerConnection);
		adaptor.remotePeerConnection[streamId] = mockPC

		expect(adaptor.remotePeerConnectionStats[streamId]).to.be.undefined;

		adaptor.enableStats(streamId);
		expect(adaptor.remotePeerConnectionStats[streamId].timerId).to.be.not.undefined;

		adaptor.disableStats(streamId);
		expect(adaptor.remotePeerConnectionStats[streamId]).to.be.undefined;


		adaptor.enableStats(streamId);
		expect(adaptor.remotePeerConnectionStats[streamId].timerId).to.be.not.undefined;


		adaptor.disableStats(streamId);
		expect(adaptor.remotePeerConnectionStats[streamId]).to.be.undefined;


	});

	it("Websocket send try catch", async function() {
		var adaptor = new WebRTCAdaptor({
			websocketURL: "ws://example.com",
			isPlayMode: true
		});

		adaptor.webSocketAdaptor.send("test");
		adaptor.webSocketAdaptor.close();
		adaptor.webSocketAdaptor.send("test");
		adaptor.webSocketAdaptor.connected = true;
		var spySend = sinon.spy(adaptor.webSocketAdaptor.send);
		try {
			spySend();
		} catch (e) {
			// pass
		}
		adaptor.webSocketAdaptor.send("test");
		assert(spySend.threw());

	});


	//there was a bug and this method is not initialized
	it("enableAudioLevelForLocalStream", async function() {
		let adaptor = new WebRTCAdaptor({
			websocketURL: "ws://localhost",
			initializeComponents: false,
			volumeMeterUrl: 'base/src/main/js/volume-meter-processor.js',
		});

		initialized = false;
		await adaptor.initialize().then(() => {
			initialized = true;
		})

		expect(initialized).to.be.true;

		expect(adaptor.mediaManager.localStream).to.be.not.null;

		initialized = false;
		await adaptor.enableAudioLevelForLocalStream((event) => {
			console.log("audio level: " + event.data);
		}).then(() => {
			initialized = true;
		}).catch((err) => {
			console.error("audiolevel error " + err);
		});

		expect(initialized).to.be.true;

		adaptor.disableAudioLevelForLocalStream();

		expect(adaptor.mediaManager.localStreamSoundMeter).to.be.null;

	});

	it("sendData", async function() {
		try {
			var adaptor = new WebRTCAdaptor({
				websocketURL: "ws://localhost",
				initializeComponents: false
			});

			let streamId = "test";
			var webSocketAdaptor = sinon.mock(adaptor.webSocketAdaptor);

			adaptor.remotePeerConnection[streamId] = sinon.mock(RTCPeerConnection);

			adaptor.remotePeerConnection[streamId].dataChannel = sinon.fake.returns({
				readyState: "open",
				send: sinon.fake()
			});
			adaptor.sendData(streamId, "test");

			adaptor.remotePeerConnection[streamId].dataChannel = undefined
			adaptor.sendData(streamId, "test");

			adaptor.remotePeerConnection[streamId].dataChannel = null
			adaptor.sendData(streamId, "test");
		} catch (e) {
			console.error(e);
			assert(false);
		}
	});

	it("dummyStreamAndSwitch", async function() {

		var adaptor = new WebRTCAdaptor({
			websocketURL: "ws://localhost",
			mediaConstraints: {
				video: "dummy",
				audio: "dummy"
			},
			initializeComponents: false
		});


		expect(adaptor.mediaManager.blackVideoTrack).to.be.null
		expect(adaptor.mediaManager.silentAudioTrack).to.be.null
		expect(adaptor.mediaManager.oscillator).to.be.null

		await adaptor.initialize();


		expect(adaptor.mediaManager.mediaConstraints).to.deep.equal({ video: "dummy", audio: "dummy" });

		expect(adaptor.mediaManager.blackVideoTrack).to.not.be.null
		expect(adaptor.mediaManager.silentAudioTrack).to.not.be.null
		expect(adaptor.mediaManager.oscillator).to.not.be.null
		expect(adaptor.mediaManager.localStream.getVideoTracks().length).to.be.equal(1)
		expect(adaptor.mediaManager.localStream.getAudioTracks().length).to.be.equal(1)


		await adaptor.openStream({ video: true, audio: true });

		expect(adaptor.mediaManager.blackVideoTrack).to.be.null
		expect(adaptor.mediaManager.silentAudioTrack).to.be.null
		expect(adaptor.mediaManager.oscillator).to.be.null

		expect(adaptor.mediaManager.mediaConstraints).to.deep.equal({ video: true, audio: true });
		expect(adaptor.mediaManager.localStream.getVideoTracks().length).to.be.equal(1)
		expect(adaptor.mediaManager.localStream.getAudioTracks().length).to.be.equal(1)

	});

	it("updateAudioTrack", async function() {
		var adaptor = new WebRTCAdaptor({
			websocketURL: "ws://localhost",
			mediaConstraints: {
				video: "dummy",
				audio: "dummy"
			},
			initializeComponents: false
		});

		await adaptor.initialize();

		expect(adaptor.mediaManager.localStreamSoundMeter).to.be.null;

		adaptor.enableAudioLevelForLocalStream((value) => {

		}, 200);

		expect(adaptor.mediaManager.localStreamSoundMeter).to.not.be.null;

		var audioTrack = adaptor.mediaManager.getSilentAudioTrack();

		var stream = new MediaStream();
		stream.addTrack(audioTrack);

		await adaptor.updateAudioTrack(stream, null, null);
	});


	it("takeConfiguration", async function() {
		var adaptor = new WebRTCAdaptor({
			websocketURL: "ws://localhost",
			mediaConstraints: {
				video: true,
				audio: true
			},
			initializeComponents: false
		});

		await adaptor.initialize();
		expect(adaptor.remotePeerConnection["stream1"]).to.be.undefined;

		adaptor.takeConfiguration("stream1", "conf", "offer", "track1");

		expect(adaptor.remotePeerConnection["stream1"]).to.not.be.undefined;

	});

	it("takeCandidate", async function() {
		var adaptor = new WebRTCAdaptor({
			websocketURL: "ws://localhost",
			mediaConstraints: {
				video: true,
				audio: true
			},
			initializeComponents: false
		});

		await adaptor.initialize();

		expect(adaptor.remotePeerConnection["stream1"]).to.be.undefined;
		expect(adaptor.iceCandidateList["stream1"]).to.be.undefined;


		adaptor.takeCandidate("stream1", "label", "candidate");

		expect(adaptor.remotePeerConnection["stream1"]).to.not.be.undefined;

		expect(adaptor.iceCandidateList["stream1"].length).to.be.equal(1);

	});
	it("mutedButSpeaking", async () => {
		this.timeout(10000);
		var adaptor = new WebRTCAdaptor({
			websocketURL: "ws://localhost",
			mediaConstraints: {
				video: true,
				audio: true
			},
			initializeComponents: false,
			volumeMeterUrl: 'base/src/main/js/volume-meter-processor.js',
		});

		var audioContext = new (window.AudioContext || window.webkitAudioContext)();
		var oscillator = audioContext.createOscillator();
		oscillator.type = "sine";
		oscillator.frequency.value = 800;
		var mediaStreamSource = audioContext.createMediaStreamDestination();
		oscillator.connect(mediaStreamSource);
		var mediaStreamTrack = mediaStreamSource.stream.getAudioTracks()[0];
		oscillator.start();


		adaptor.mediaManager.mutedAudioStream = new MediaStream([mediaStreamTrack])
		adaptor.mediaManager.localStream = new MediaStream([mediaStreamTrack])
		adaptor.mediaManager.audioContext = audioContext;

		var getUserMediaFailed = new Promise(function(resolve, reject) {
			navigator.mediaDevices.getUserMedia = async () => {
				return Promise.reject();
			};
			adaptor.initialize().then(async () => {
				try {
					await adaptor.enableAudioLevelWhenMuted();
				} catch (e) {
					console.log("get user media failed test")
					resolve();
				}
			});
		});
		var speakingButMuted = getUserMediaFailed.then(() => {
			return new Promise(function(resolve, reject) {
				navigator.mediaDevices.getUserMedia = async () => {
					return Promise.resolve(new MediaStream([mediaStreamTrack]));
				};

				adaptor.initialize().then(async () => {
					adaptor.mediaManager.callback = (info) => {
						console.log("callback ", info);
						if (info === "speaking_but_muted") {
							console.log("speaking_but_muted1");
							resolve();
						}
					};
					await adaptor.enableAudioLevelWhenMuted();
				});
			});
		});

		var soundMeteraddModuleFailed = speakingButMuted.then(() => {
			adaptor.mediaManager.mutedSoundMeter.context.audioWorklet.addModule = async () => {
				return Promise.reject("error");
			};
			return new Promise(async function(resolve, reject) {
				adaptor.enableAudioLevelWhenMuted().catch((e) => {
					resolve()
				})
			});
		});

		console.assert(soundMeteraddModuleFailed, "soundMeteraddModuleFailed");

	});


	it("startPublishing", async function() {
		let adaptor = new WebRTCAdaptor({
			websocketURL: "ws://example.com",
			isPlayMode: true
		});

		let peerConnection = new RTCPeerConnection();
		let initPeerConnection = sinon.replace(adaptor, "initPeerConnection", sinon.fake.returns(peerConnection));

		let createOfferFake = sinon.replace(peerConnection, "createOffer", sinon.fake.returns(Promise.reject("this is on purpose")));

		adaptor.startPublishing("stream123");

		expect(initPeerConnection.calledWithExactly("stream123", "publish")).to.be.true;
	});

	it("join", async function() {

		let adaptor = new WebRTCAdaptor({
			websocketURL: "ws://example.com",
			isPlayMode: true
		});

		let streamId = "stream123";
		let jsCmd = {
			command: "join",
			streamId: streamId,
			multiPeer: false,
			mode: "play"
		};

		let webSocketAdaptor = sinon.mock(adaptor.webSocketAdaptor);

		let sendExpectation = webSocketAdaptor.expects("send").once().withArgs(JSON.stringify(jsCmd));

		adaptor.join(streamId);

		sendExpectation.verify()
	})


	it("getSubtracks", async function() {

		let adaptor = new WebRTCAdaptor({
			websocketURL: "ws://example.com",
			isPlayMode: true
		});

		let streamId = "test" + Math.floor(Math.random() * 100);
		let offset = Math.floor(Math.random() * 100);
		let size = Math.floor(Math.random() * 100);
		let role = "role1";
		let jsCmd = {
			command: "getSubtracks",
			streamId: streamId,
			role: role,
			offset: offset,
			size: size,
		};

		let webSocketAdaptor = sinon.mock(adaptor.webSocketAdaptor);

		let sendExpectation = webSocketAdaptor.expects("send").once().withArgs(JSON.stringify(jsCmd));

		adaptor.getSubtracks(streamId, role, offset, size);

		sendExpectation.verify()
	})

	it("joinRoom", async function() {

		let adaptor = new WebRTCAdaptor({
			websocketURL: "ws://example.com",
			isPlayMode: true
		});

		let streamId = "stream123";
		let roomId = "roomId";

		let jsCmd = {
			command: "joinRoom",
			room: roomId,
			mainTrack: roomId,
			streamId: streamId,
			mode: "multitrack",
			streamName: "streamName",
			role: "role",
			metadata: "metadata",

		}

		let webSocketAdaptor = sinon.mock(adaptor.webSocketAdaptor);

		let sendExpectation = webSocketAdaptor.expects("send").once().withArgs(JSON.stringify(jsCmd));

		adaptor.joinRoom(roomId, streamId, "multitrack", "streamName", "role", "metadata");

		sendExpectation.verify()

	});

	it("eventListeners", async function() {
		let adaptor = new WebRTCAdaptor({
			websocketURL: "ws://example.com",
			isPlayMode: true
		});


		var eventListenerCalled = false;
		adaptor.addEventListener((info, obj) => {
			eventListenerCalled = true;
		});

		var errorListenerCalled = false;
		adaptor.addErrorEventListener((error, message) => {
			errorListenerCalled = true;
		});


		adaptor.mediaManager.callback("info", "obj");

		adaptor.mediaManager.callbackError("info", "obj");

		expect(eventListenerCalled).to.be.true;
		expect(errorListenerCalled).to.be.true;

	});

	it("onTrack", async function() {

		{
			var videoElement = document.createElement("video");
			let adaptor = new WebRTCAdaptor({
				websocketURL: "ws://example.com",
				isPlayMode: true,
				remoteVideoElement: videoElement
			});

			var mediaStream = new MediaStream();
			var event = {
				streams: [mediaStream]
			}

			expect(videoElement.srcObject).to.be.null;

			adaptor.onTrack(event, "stream1");

			expect(videoElement.srcObject).to.not.be.null;
		}


		{
			let adaptor = new WebRTCAdaptor({
				websocketURL: "ws://example.com",
				isPlayMode: true,
			});

			var eventListenerCalled = false;
			adaptor.addEventListener((info, obj) => {
				if (info == "newTrackAvailable") {
					eventListenerCalled = true;
				}
			})

			var mediaStream = new MediaStream();
			var event = {
				streams: [mediaStream],
				transceiver: {
					id: "anyid"
				}
			}

			adaptor.idMapping["stream1"] = "anything";

			adaptor.onTrack(event, "stream1");

			expect(eventListenerCalled).to.be.true;

		}

	});

	it("getStreamInfo", async function() {
		let adaptor = new WebRTCAdaptor({
			websocketURL: "ws://example.com",
			isPlayMode: true
		});

		let streamId = "stream123";
		let jsCmd = {
			command: "getStreamInfo",
			streamId: streamId,
		};

		let webSocketAdaptor = sinon.mock(adaptor.webSocketAdaptor);

		let sendExpectation = webSocketAdaptor.expects("send").once().withArgs(JSON.stringify(jsCmd));

		adaptor.getStreamInfo(streamId);

		sendExpectation.verify()
	});


	it("getBroadcastObject", async function() {
		let adaptor = new WebRTCAdaptor({
			websocketURL: "ws://example.com",
			isPlayMode: true
		});

		let streamId = "stream123";
		let jsCmd = {
			command: "getBroadcastObject",
			streamId: streamId,
		};

		let webSocketAdaptor = sinon.mock(adaptor.webSocketAdaptor);

		let sendExpectation = webSocketAdaptor.expects("send").once().withArgs(JSON.stringify(jsCmd));

		adaptor.getBroadcastObject(streamId);

		sendExpectation.verify()
	});

	it("requestVideoTrackAssignments", async function() {

		let adaptor = new WebRTCAdaptor({
			websocketURL: "ws://example.com",
			isPlayMode: true
		});

		let streamId = "stream123";

		let jsCmd = {
			command: "getVideoTrackAssignmentsCommand",
			streamId: streamId,
		};

		let webSocketAdaptor = sinon.mock(adaptor.webSocketAdaptor);

		let sendExpectation = webSocketAdaptor.expects("send").once().withArgs(JSON.stringify(jsCmd));

		adaptor.requestVideoTrackAssignments(streamId);

		sendExpectation.verify()

	})


	it("registerPushNotificationToken", async function() {
		let adaptor = new WebRTCAdaptor({
			websocketURL: "ws://example.com",
			isPlayMode: true
		});

		let subscriberId = "subscriberId";
		let authToken = "autotokenkdnkf";
		let pnsRegistrationToken = "pnsRegistrationTokenpnsRegistrationTokenpnsRegistrationTokenpnsRegistrationToken";
		let pnstype = "fcm";

		let jsCmd = {
			command: "registerPushNotificationToken",
			subscriberId: subscriberId,
			token: authToken,
			pnsRegistrationToken: pnsRegistrationToken,
			pnsType: pnstype
		};

		let webSocketAdaptor = sinon.mock(adaptor.webSocketAdaptor);

		let sendExpectation = webSocketAdaptor.expects("send").once().withArgs(JSON.stringify(jsCmd));

		adaptor.registerPushNotificationToken(subscriberId, authToken, pnsRegistrationToken, pnstype);

		sendExpectation.verify()

	});


	it("sendPushNotification", async function() {
		let adaptor = new WebRTCAdaptor({
			websocketURL: "ws://example.com",
			isPlayMode: true
		});

		let subscriberId = "subscriberId";
		let authToken = "autotokenkdnkf";
		let pushNotificationContent = "pnsRegistrationTokenpnsRegistrationTokenpnsRegistrationTokenpnsRegistrationToken";
		let subscriberIdsToNotify = "string1";

		try {
			adaptor.sendPushNotification(subscriberId, authToken, pushNotificationContent, subscriberIdsToNotify);
			assert.fail("It should throw exception because pushNotificationContent is not json");
		} catch (e) {
			//pass
		}


		pushNotificationContent = { title: "title", body: "body" };
		let jsCmd = {
			command: "sendPushNotification",
			subscriberId: subscriberId,
			token: authToken,
			pushNotificationContent: pushNotificationContent,
			subscriberIdsToNotify: subscriberIdsToNotify
		};

		try {
			adaptor.sendPushNotification(subscriberId, authToken, pushNotificationContent, subscriberIdsToNotify);
			assert.fail("It should throw exception because subscriberIdsToNotify is not array");
		} catch (e) {
			//pass
		}

		jsCmd = {
			command: "sendPushNotification",
			subscriberId: subscriberId,
			token: authToken,
			pushNotificationContent: pushNotificationContent,
			subscriberIdsToNotify: subscriberIdsToNotify
		};

		subscriberIdsToNotify = ["string1"];

		jsCmd = {
			command: "sendPushNotification",
			subscriberId: subscriberId,
			token: authToken,
			pushNotificationContent: pushNotificationContent,
			subscriberIdsToNotify: subscriberIdsToNotify
		};
		let webSocketAdaptor = sinon.mock(adaptor.webSocketAdaptor);

		let sendExpectation = webSocketAdaptor.expects("send").once().withArgs(JSON.stringify(jsCmd));

		adaptor.sendPushNotification(subscriberId, authToken, pushNotificationContent, subscriberIdsToNotify);

		sendExpectation.verify()

	});


	it("sendPushNotificationToTopic", async function() {

		let adaptor = new WebRTCAdaptor({
			websocketURL: "ws://example.com",
			isPlayMode: true
		});

		let subscriberId = "subscriberId";
		let authToken = "autotokenkdnkf";
		let pushNotificationContent = "text";
		let topic = "topic";

		let jsCmd = {
			command: "sendPushNotification",
			subscriberId: subscriberId,
			token: authToken,
			pushNotificationContent: pushNotificationContent,
			topic: topic
		};

		try {
			adaptor.sendPushNotificationToTopic(subscriberId, authToken, pushNotificationContent, topic);
			assert.fail("It should throw exception because pushNotificationContent is not json");
		} catch (error) {
			//pass
		}

		pushNotificationContent = { title: "title", body: "body" };
		jsCmd = {
			command: "sendPushNotification",
			subscriberId: subscriberId,
			token: authToken,
			pushNotificationContent: pushNotificationContent,
			topic: topic
		};

		let webSocketAdaptor = sinon.mock(adaptor.webSocketAdaptor);

		let sendExpectation = webSocketAdaptor.expects("send").once().withArgs(JSON.stringify(jsCmd));

		adaptor.sendPushNotificationToTopic(subscriberId, authToken, pushNotificationContent, topic);

		sendExpectation.verify()

	});

	describe("checkAndStopLocalVideoTrackOnAndroid", function() {

		let mediaManager;
		let mockLocalStream;

		beforeEach(function() {
			window.isAndroid = () => {
			};

			mockLocalStream = {
				getVideoTracks: sinon.stub()
			};

			mediaManager = new MediaManager({
				websocketURL: "ws://example.com",
				initializeComponents: false,
				localStream: mockLocalStream
			});
		});

		it("should not stop video track if local stream exists and is not Android", function() {
			const mockVideoTrack = { stop: sinon.fake() };
			mockLocalStream.getVideoTracks.returns([mockVideoTrack]);
			sinon.stub(window, 'isAndroid').returns(false);

			mediaManager.checkAndStopLocalVideoTrackOnAndroid();

			sinon.assert.notCalled(mockVideoTrack.stop);
		});

		it("should not stop video track if local stream does not exist", function() {
			mediaManager.localStream = null;

			mediaManager.checkAndStopLocalVideoTrackOnAndroid();

			sinon.assert.notCalled(mockLocalStream.getVideoTracks);
		});

	});

	describe("turnOffLocalCamera", () => {
		let adaptor;
		let mockMediaManager;

		beforeEach(function() {
			mockMediaManager = {
				turnOffLocalCamera: sinon.fake()
			};

			adaptor = new WebRTCAdaptor({
				websocketURL: "ws://example.com",
				isPlayMode: true,
				mediaManager: mockMediaManager,
				initializeComponents: false
			});
		});

		it("should call turnOffLocalCamera on mediaManager with correct streamId", function() {
			const streamId = "testStreamId";
			let result = adaptor.turnOffLocalCamera(streamId);
			assert.notEqual(result, undefined);
		});

		it("should handle undefined streamId", function() {
			let result = adaptor.turnOffLocalCamera(undefined);
			assert.notEqual(result, undefined);
		});

		it("should handle null streamId", function() {
			let result = adaptor.turnOffLocalCamera(null);
			assert.notEqual(result, undefined);
		});

		it("should handle empty string streamId", function() {
			let result = adaptor.turnOffLocalCamera("");
			assert.notEqual(result, undefined);
		});
	});

	describe("getStats", function() {
		let adaptor;
		let mockPeerConnection;
		let mockStats;

		beforeEach(function() {
			mockPeerConnection = {
				getStats: sinon.stub()
			};
			mockStats = new Map();
			adaptor = new WebRTCAdaptor({
				websocketURL: "ws://example.com",
				initializeComponents: false,
				checkAndInitializePeerStats: sinon.fake()
			});
			adaptor.remotePeerConnection = { "stream1": mockPeerConnection };
			adaptor.remotePeerConnectionStats = { "stream1": {} };
			adaptor.addEventListener((info, obj) => {
				if (info === "updated_stats") {
					console.log(JSON.stringify(obj));
				}
			});
		});

		it("should resolve with true when getStats is successful", async function() {
			mockPeerConnection.getStats.resolves(mockStats);
			const result = await adaptor.getStats("stream1");
			expect(result).to.be.not.null;
		});

		it("should correctly process inbound RTP with audio kind", async function() {
			const consoleSpy = sinon.stub(console, 'log');

			let localMockStats = {
				type: "inbound-rtp",
				kind: "audio",
				trackIdentifier: "audioTrack1",
				bytesReceived: 1000,
				packetsLost: 10,
				jitterBufferDelay: 5,
				lastPacketReceivedTimestamp: 160000,
				fractionLost: 0.1,
				timestamp: Date.now()
			};
			mockPeerConnection.getStats.resolves([localMockStats]);
			const result = await adaptor.getStats("stream1");

			let localMockStatsProcessed = {
				"totalBytesReceived": 999,
				"videoPacketsLost": -1,
				"audioPacketsLost": 10,
				"fractionLost": -0.9,
				"currentTime": 0,
				"totalBytesSent": -1,
				"totalVideoPacketsSent": -1,
				"totalAudioPacketsSent": -1,
				"audioLevel": -1,
				"qualityLimitationReason": "",
				"totalFramesEncoded": -1,
				"resWidth": -1,
				"resHeight": -1,
				"srcFps": -1,
				"frameWidth": -1,
				"frameHeight": -1,
				"videoRoundTripTime": -1,
				"videoJitter": -1,
				"audioRoundTripTime": -1,
				"audioJitter": -1,
				"framesDecoded": -1,
				"framesDropped": -1,
				"framesReceived": -1,
				"videoJitterAverageDelay": -1,
				"audioJitterAverageDelay": -1,
				"availableOutgoingBitrate": null,
				"inboundRtpList": [
					{
						"trackIdentifier": "audioTrack1",
						"audioPacketsLost": 10,
						"bytesReceived": 1000,
						"jitterBufferDelay": 5,
						"lastPacketReceivedTimestamp": 160000,
						"fractionLost": 0.1,
						"currentTime": 0
					}
				]
			};


			expect(result).to.be.not.null;
			expect(result.inboundRtpList[0].trackIdentifier).to.equal("audioTrack1");
			expect(result.inboundRtpList[0].audioPacketsLost).to.equal(10);
			expect(result.inboundRtpList[0].bytesReceived).to.equal(1000);
			expect(result.inboundRtpList[0].jitterBufferDelay).to.equal(5);
			expect(result.inboundRtpList[0].lastPacketReceivedTimestamp).to.equal(160000);
			expect(result.inboundRtpList[0].fractionLost).to.equal(0.1);
			expect(result.inboundRtpList[0].currentTime).to.equal(0);


			consoleSpy.restore();
		});

		it("should correctly process inbound RTP with video kind", async function() {
			const consoleSpy = sinon.stub(console, 'log');

			let localMockStats = {
				type: "inbound-rtp",
				kind: "video",
				trackIdentifier: "videoTrack2",
				bytesReceived: 2000,
				packetsLost: 5,
				framesDropped: 2,
				framesDecoded: 50,
				framesPerSecond: 25,
				jitterBufferDelay: 10,
				lastPacketReceivedTimestamp: 160000,
				fractionLost: 0.05,
				timestamp: Date.now(),
				frameWidth: 1920,
				frameHeight: 1080
			};
			mockPeerConnection.getStats.resolves([localMockStats]);
			const result = await adaptor.getStats("stream1");

			let localMockStatsProcessed = {
				"totalBytesReceived": 1999,
				"videoPacketsLost": 5,
				"audioPacketsLost": -1,
				"fractionLost": -0.95,
				"currentTime": 0,
				"totalBytesSent": -1,
				"totalVideoPacketsSent": -1,
				"totalAudioPacketsSent": -1,
				"audioLevel": -1,
				"qualityLimitationReason": "",
				"totalFramesEncoded": -1,
				"resWidth": -1,
				"resHeight": -1,
				"srcFps": -1,
				"frameWidth": 1920,
				"frameHeight": 1080,
				"videoRoundTripTime": -1,
				"videoJitter": -1,
				"audioRoundTripTime": -1,
				"audioJitter": -1,
				"framesDecoded": 50,
				"framesDropped": 2,
				"framesReceived": -1,
				"videoJitterAverageDelay": -1,
				"audioJitterAverageDelay": -1,
				"availableOutgoingBitrate": null,
				"inboundRtpList": [
					{
						"trackIdentifier": "videoTrack2",
						"videoPacketsLost": 5,
						"framesDropped": 2,
						"framesDecoded": 50,
						"framesPerSecond": 25,
						"bytesReceived": 2000,
						"jitterBufferDelay": 10,
						"lastPacketReceivedTimestamp": 160000,
						"fractionLost": 0.05,
						"currentTime": 0,
						"frameWidth": 1920,
						"frameHeight": 1080
					}
				]
			};

			//assert(consoleSpy.calledWith(JSON.stringify(localMockStatsProcessed)), 'console.log was not called with the expected arguments');

			expect(result).to.be.not.null;
			expect(result.inboundRtpList[0].trackIdentifier).to.equal("videoTrack2");
			expect(result.inboundRtpList[0].videoPacketsLost).to.equal(5);
			expect(result.inboundRtpList[0].framesDropped).to.equal(2);
			expect(result.inboundRtpList[0].framesDecoded).to.equal(50);
			expect(result.inboundRtpList[0].framesPerSecond).to.equal(25);
			expect(result.inboundRtpList[0].bytesReceived).to.equal(2000);
			expect(result.inboundRtpList[0].jitterBufferDelay).to.equal(10);
			expect(result.inboundRtpList[0].lastPacketReceivedTimestamp).to.equal(160000);
			expect(result.inboundRtpList[0].fractionLost).to.equal(0.05);
			expect(result.inboundRtpList[0].currentTime).to.equal(0);
			expect(result.inboundRtpList[0].frameWidth).to.equal(1920);
			expect(result.inboundRtpList[0].frameHeight).to.equal(1080);


			consoleSpy.restore();
		});

		it("should resolve with false when getStats fails", async function() {
			mockPeerConnection.getStats.rejects(new Error("getStats error"));
			const result = await adaptor.getStats("stream1");
			expect(result).to.be.false;
		});

		it("should not reinitialize remotePeerConnectionStats for an existing streamId", function() {
			const streamId = "existingStream";
			adaptor.remotePeerConnectionStats[streamId] = new PeerStats(streamId);
			const initialStats = adaptor.remotePeerConnectionStats[streamId];
			adaptor.checkAndInitializePeerStats(streamId);
			expect(adaptor.remotePeerConnectionStats[streamId]).to.equal(initialStats);
		});

		it("should handle null streamId gracefully", function() {
			const streamId = null;
			expect(() => adaptor.checkAndInitializePeerStats(streamId)).not.to.throw();
			expect(adaptor.remotePeerConnectionStats[streamId]).to.be.undefined;
		});

		it("should handle undefined streamId gracefully", function() {
			const streamId = undefined;
			expect(() => adaptor.checkAndInitializePeerStats(streamId)).not.to.throw();
			expect(adaptor.remotePeerConnectionStats[streamId]).to.be.undefined;
		});

	});

	describe("changeBandwidth", function() {

		let adaptor;

		beforeEach(function() {
			adaptor = new WebRTCAdaptor({
				websocketURL: "ws://example.com",
				initializeComponents: false,
			});
			adaptor.mediaManager = {
				changeBandwidth: sinon.fake()
			};
		});

		it("should call mediaManager's changeBandwidth with correct parameters", function() {
			const bandwidth = 500;
			const streamId = "stream1";

			adaptor.changeBandwidth(bandwidth, streamId);

			expect(adaptor.mediaManager.changeBandwidth.calledWithMatch(bandwidth, streamId)).to.be.true;
		});

		it("should handle zero bandwidth", function() {
			const bandwidth = 0;
			const streamId = "stream1";

			adaptor.changeBandwidth(bandwidth, streamId);

			expect(adaptor.mediaManager.changeBandwidth.calledWithMatch(bandwidth, streamId)).to.be.true;
		});

		it("should handle null streamId", function() {
			const bandwidth = 500;
			const streamId = null;

			adaptor.changeBandwidth(bandwidth, streamId);

			expect(adaptor.mediaManager.changeBandwidth.calledWithMatch(bandwidth, streamId)).to.be.true;
		});
	});

	describe("enableAudioLevelWhenMuted", function() {

		let adaptor;

		beforeEach(function() {
			adaptor = new WebRTCAdaptor({
				websocketURL: "ws://example.com",
				initializeComponents: false,
			});
			adaptor.mediaManager = {
				enableAudioLevelWhenMuted: sinon.fake()
			};
		});

		it("should call mediaManager's enableAudioLevelWhenMuted", function() {
			adaptor.enableAudioLevelWhenMuted();

			expect(adaptor.mediaManager.enableAudioLevelWhenMuted.called).to.be.true;
		});

	});

	describe("disableAudioLevelWhenMuted", function() {

		let adaptor;

		beforeEach(function() {
			adaptor = new WebRTCAdaptor({
				websocketURL: "ws://example.com",
				initializeComponents: false,
			});
			adaptor.mediaManager = {
				disableAudioLevelWhenMuted: sinon.fake()
			};
		});

		it("should call mediaManager's disableAudioLevelWhenMuted", function() {
			adaptor.disableAudioLevelWhenMuted();

			expect(adaptor.mediaManager.disableAudioLevelWhenMuted.called).to.be.true;
		});

	});

	describe("getVideoSender", function() {

		let adaptor;

		beforeEach(function() {
			adaptor = new WebRTCAdaptor({
				websocketURL: "ws://example.com",
				initializeComponents: false,
			});
			adaptor.mediaManager = {
				getVideoSender: sinon.fake()
			};
		});

		it("should call mediaManager's getVideoSender with correct parameters", function() {
			const streamId = "stream1";

			adaptor.getVideoSender(streamId);

			expect(adaptor.mediaManager.getVideoSender.calledWithMatch(streamId)).to.be.true;
		});

		it("should handle null streamId", function() {
			const streamId = null;

			adaptor.getVideoSender(streamId);

			expect(adaptor.mediaManager.getVideoSender.calledWithMatch(streamId)).to.be.true;
		});
	});

	describe("openStream", function() {

		let adaptor;

		beforeEach(function() {
			adaptor = new WebRTCAdaptor({
				websocketURL: "ws://example.com",
				initializeComponents: false,
			});
			adaptor.mediaManager = {
				openStream: sinon.fake()
			};
		});

		it("should call mediaManager's openStream with correct parameters", function() {
			const mediaConstraints = { video: true, audio: true };
			const streamId = "stream1";

			adaptor.openStream(mediaConstraints, streamId);

			expect(adaptor.mediaManager.openStream.calledWithMatch(mediaConstraints, streamId)).to.be.true;
		});

		it("should handle null streamId", function() {
			const mediaConstraints = { video: true, audio: true };
			const streamId = null;

			adaptor.openStream(mediaConstraints, streamId);

			expect(adaptor.mediaManager.openStream.calledWithMatch(mediaConstraints, streamId)).to.be.true;
		});
	});

	describe("closeStream", function() {

		let adaptor;

		beforeEach(function() {
			adaptor = new WebRTCAdaptor({
				websocketURL: "ws://example.com",
				initializeComponents: false,
			});
			adaptor.mediaManager = {
				closeStream: sinon.fake()
			};
		});

		it("should call mediaManager's closeStream", function() {
			adaptor.closeStream();

			expect(adaptor.mediaManager.closeStream.called).to.be.true;
		});

	});

	describe("applyConstraints", function() {

		let adaptor;

		beforeEach(function() {
			adaptor = new WebRTCAdaptor({
				websocketURL: "ws://example.com",
				initializeComponents: false,
			});
			adaptor.mediaManager = {
				applyConstraints: sinon.fake()
			};
		});

		it("should call mediaManager's applyConstraints", function() {
			let constraints = { video: true, audio: true };

			adaptor.applyConstraints(constraints);

			expect(adaptor.mediaManager.applyConstraints.calledWithMatch(constraints)).to.be.true;
		});

	});

	describe("switchVideoCameraFacingMode", function() {

		let adaptor;

		beforeEach(function() {
			adaptor = new WebRTCAdaptor({
				websocketURL: "ws://example.com",
				initializeComponents: false,
			});
			adaptor.mediaManager = {
				switchVideoCameraFacingMode: sinon.fake()
			};
		});

		it("should call mediaManager's switchVideoCameraFacingMode", function() {
			let streamId = "stream1";
			let facingMode = "user";

			adaptor.switchVideoCameraFacingMode(streamId, facingMode);

			expect(adaptor.mediaManager.switchVideoCameraFacingMode.calledWithMatch(streamId, facingMode)).to.be.true;
		});

	});

	describe("switchDesktopCaptureWithCamera", function() {

		let adaptor;

		beforeEach(function() {
			adaptor = new WebRTCAdaptor({
				websocketURL: "ws://example.com",
				initializeComponents: false,
			});
			adaptor.mediaManager = {
				switchDesktopCaptureWithCamera: sinon.fake()
			};
		});

		it("should call mediaManager's switchDesktopCaptureWithCamera", function() {
			let streamId = "stream1";

			adaptor.switchDesktopCaptureWithCamera(streamId);

			expect(adaptor.mediaManager.switchDesktopCaptureWithCamera.calledWithMatch(streamId)).to.be.true;
		});

	});

	describe("switchAudioInputSource", function() {

		let adaptor;

		beforeEach(function() {
			adaptor = new WebRTCAdaptor({
				websocketURL: "ws://example.com",
				initializeComponents: false,
			});
			adaptor.mediaManager = {
				switchAudioInputSource: sinon.fake()
			};
		});

		it("should call mediaManager's switchAudioInputSource", function() {
			let streamId = "stream1";
			let deviceId = "deviceId1";

			adaptor.switchAudioInputSource(streamId, deviceId);

			expect(adaptor.mediaManager.switchAudioInputSource.calledWithMatch(streamId, deviceId)).to.be.true;
		});

	});

	describe("setVolumeLevel", function() {

		let adaptor;

		beforeEach(function() {
			adaptor = new WebRTCAdaptor({
				websocketURL: "ws://example.com",
				initializeComponents: false,
			});
			adaptor.mediaManager = {
				setVolumeLevel: sinon.fake()
			};
		});

		it("should call mediaManager's setVolumeLevel", function() {
			let volumeLevel = 50;

			adaptor.setVolumeLevel(volumeLevel);

			expect(adaptor.mediaManager.setVolumeLevel.calledWithMatch(volumeLevel)).to.be.true;
		});

	});

	describe("switchDesktopCapture", function() {

		let adaptor;

		beforeEach(function() {
			adaptor = new WebRTCAdaptor({
				websocketURL: "ws://example.com",
				initializeComponents: false,
			});
			adaptor.mediaManager = {
				switchDesktopCapture: sinon.fake()
			};
		});

		it("should call mediaManager's switchDesktopCapture", function() {
			let streamId = "stream1";

			adaptor.switchDesktopCapture(streamId);

			expect(adaptor.mediaManager.switchDesktopCapture.calledWithMatch(streamId)).to.be.true;
		});

	});

	describe("updateVideoTrack", function() {

		let adaptor;

		beforeEach(function() {
			adaptor = new WebRTCAdaptor({
				websocketURL: "ws://example.com",
				initializeComponents: false,
			});
			adaptor.mediaManager = {
				updateVideoTrack: sinon.fake()
			};
		});

		it("should call mediaManager's updateVideoTrack", function() {
			let stream = "stream0";
			let streamId = "stream1";
			let onEndedCallback = null;
			let stopDesktop = false;

			adaptor.updateVideoTrack(stream, streamId, onEndedCallback, stopDesktop);

			expect(adaptor.mediaManager.updateVideoTrack.calledWithMatch(stream, streamId, onEndedCallback, stopDesktop)).to.be.true;
		});


	});

	it("parseStats-publish", async function() {

		//sample publish statistics
		var stats = [{ "id": "AP", "timestamp": 1729330520732.352, "type": "media-playout", "kind": "audio", "synthesizedSamplesDuration": 0, "synthesizedSamplesEvents": 0, "totalPlayoutDelay": 0, "totalSamplesCount": 0, "totalSamplesDuration": 0 },
		{ "id": "CF4D:0B:4F:4D:8D:38:1C:AC:2A:F3:9C:17:29:92:EE:18:DF:B0:21:35:08:99:93:6D:12:F7:7D:A3:8E:72:8E:B8", "timestamp": 1729330520732.352, "type": "certificate", "base64Certificate": "MIIBFTCBvKADAgECAgh9MrqnGcYy7zAKBggqhkjOPQQDAjARMQ8wDQYDVQQDDAZXZWJSVEMwHhcNMjQxMDE4MDkzMzMxWhcNMjQxMTE4MDkzMzMxWjARMQ8wDQYDVQQDDAZXZWJSVEMwWTATBgcqhkjOPQIBBggqhkjOPQMBBwNCAAR6BNLECVPeybudk4KkGtMX1S3CkYJ+TCOgwtxVBKtGdPL8d4xUhbYC403jHZqrMwtbkY+IH1+uBbfuvz66FDGiMAoGCCqGSM49BAMCA0gAMEUCIQCQ9sr21P+NWMqg9QZthhOvTyhtkGnvDrww7I+ZqBamhgIgfqMp2YhIZC2QTONtIZnSs27vvEPWjomCowBzygeusTA=", "fingerprint": "4D:0B:4F:4D:8D:38:1C:AC:2A:F3:9C:17:29:92:EE:18:DF:B0:21:35:08:99:93:6D:12:F7:7D:A3:8E:72:8E:B8", "fingerprintAlgorithm": "sha-256" },
		{ "id": "CFF9:6F:09:D5:F9:01:7F:A3:4F:00:0D:AE:A7:7E:6F:A9:54:C7:67:4C:9E:F7:02:0E:CF:84:44:11:59:71:A7:BE", "timestamp": 1729330520732.352, "type": "certificate", "base64Certificate": "MIIBFzCBvaADAgECAgkAglBApme+IRgwCgYIKoZIzj0EAwIwETEPMA0GA1UEAwwGV2ViUlRDMB4XDTI0MTAxODA5MzMzMFoXDTI0MTExODA5MzMzMFowETEPMA0GA1UEAwwGV2ViUlRDMFkwEwYHKoZIzj0CAQYIKoZIzj0DAQcDQgAEseI9xyxWMKs3R2LGUPjzyYUrm8q2Ev+YhAIftwIYQ0JrE4piYUV+5j8DXJe1ldC5Yd+mlFL1PNi7qRYP9j4cwDAKBggqhkjOPQQDAgNJADBGAiEAotZ2yCw7yVXjqzgmzjm6Rh5zfSQNVqs/rA3385tuaD8CIQDfMC+JI7joQw04rFL0M0ik1YbvrKrNokqKu0N3rPMYVQ==", "fingerprint": "F9:6F:09:D5:F9:01:7F:A3:4F:00:0D:AE:A7:7E:6F:A9:54:C7:67:4C:9E:F7:02:0E:CF:84:44:11:59:71:A7:BE", "fingerprintAlgorithm": "sha-256" },
		{ "id": "COT01_111_minptime=10;stereo=1;useinbandfec=1", "timestamp": 1729330520732.352, "type": "codec", "channels": 2, "clockRate": 48000, "mimeType": "audio/opus", "payloadType": 111, "sdpFmtpLine": "minptime=10;stereo=1;useinbandfec=1", "transportId": "T01" },
		{ "id": "COT01_96", "timestamp": 1729330520732.352, "type": "codec", "clockRate": 90000, "mimeType": "video/VP8", "payloadType": 96, "transportId": "T01" },
		{ "id": "CPXuLks4I7_lSNilYVM", "timestamp": 1729330520732.352, "type": "candidate-pair", "availableOutgoingBitrate": 2563076, "bytesDiscardedOnSend": 0, "bytesReceived": 106219, "bytesSent": 14450360, "consentRequestsSent": 44, "currentRoundTripTime": 0, "lastPacketReceivedTimestamp": 1729330520728, "lastPacketSentTimestamp": 1729330520726, "localCandidateId": "IXuLks4I7", "nominated": true, "packetsDiscardedOnSend": 0, "packetsReceived": 2301, "packetsSent": 18196, "priority": 9115038255631187000, "remoteCandidateId": "IlSNilYVM", "requestsReceived": 47, "requestsSent": 45, "responsesReceived": 45, "responsesSent": 47, "state": "succeeded", "totalRoundTripTime": 0.023, "transportId": "T01", "writable": true },
		{ "id": "D1", "timestamp": 1729330520732.352, "type": "data-channel", "bytesReceived": 0, "bytesSent": 0, "dataChannelIdentifier": 1, "label": "streamId_dyvi2Oovo", "messagesReceived": 0, "messagesSent": 0, "protocol": "", "state": "open" },
		{ "id": "I9AXE+Zl0", "timestamp": 1729330520732.352, "type": "local-candidate", "address": "31.142.67.147", "candidateType": "srflx", "foundation": "518501176", "ip": "31.142.67.147", "isRemote": false, "networkType": "wifi", "port": 54238, "priority": 1686052607, "protocol": "udp", "relatedAddress": "172.20.10.2", "relatedPort": 53816, "transportId": "T01", "url": "stun:stun1.l.google.com:19302", "usernameFragment": "5Ukp" },
		{ "id": "IXuLks4I7", "timestamp": 1729330520732.352, "type": "local-candidate", "address": "172.20.10.2", "candidateType": "host", "foundation": "1579008401", "ip": "172.20.10.2", "isRemote": false, "networkType": "wifi", "port": 53816, "priority": 2122260223, "protocol": "udp", "transportId": "T01", "usernameFragment": "5Ukp" },
		{ "id": "IesfU0nCG", "timestamp": 1729330520732.352, "type": "local-candidate", "address": "172.20.10.2", "candidateType": "host", "foundation": "2696353029", "ip": "172.20.10.2", "isRemote": false, "networkType": "wifi", "port": 9, "priority": 1518280447, "protocol": "tcp", "tcpType": "active", "transportId": "T01", "usernameFragment": "5Ukp" },
		{ "id": "IlSNilYVM", "timestamp": 1729330520732.352, "type": "remote-candidate", "address": "172.20.10.2", "candidateType": "host", "foundation": "1478312482", "ip": "172.20.10.2", "isRemote": true, "port": 50000, "priority": 2122260223, "protocol": "udp", "transportId": "T01", "usernameFragment": "wtUu" },
		{ "id": "OT01A2527777913", "timestamp": 1729330520732.352, "type": "outbound-rtp", "codecId": "COT01_111_minptime=10;stereo=1;useinbandfec=1", "kind": "audio", "mediaType": "audio", "ssrc": 2527777913, "transportId": "T01", "bytesSent": 881500, "packetsSent": 5475, "active": true, "headerBytesSent": 153300, "mediaSourceId": "SA1", "mid": "0", "nackCount": 0, "remoteId": "RIA2527777913", "retransmittedBytesSent": 0, "retransmittedPacketsSent": 0, "targetBitrate": 64000, "totalPacketSendDelay": 0.000051 },
		{ "id": "OT01V1354817864", "timestamp": 1729330520732.352, "type": "outbound-rtp", "codecId": "COT01_96", "kind": "video", "mediaType": "video", "ssrc": 1354817864, "transportId": "T01", "bytesSent": 12902907, "packetsSent": 12386, "active": true, "encoderImplementation": "libvpx", "firCount": 0, "frameHeight": 1080, "frameWidth": 1920, "framesEncoded": 4089, "framesPerSecond": 37, "framesSent": 4089, "headerBytesSent": 309481, "hugeFramesSent": 2, "keyFramesEncoded": 2, "mediaSourceId": "SV2", "mid": "1", "nackCount": 0, "pliCount": 0, "powerEfficientEncoder": false, "qpSum": 38909, "qualityLimitationDurations": { "bandwidth": 0, "cpu": 0, "none": 109.53, "other": 0 }, "qualityLimitationReason": "none", "qualityLimitationResolutionChanges": 0, "remoteId": "RIV1354817864", "retransmittedBytesSent": 0, "retransmittedPacketsSent": 0, "rtxSsrc": 2624029362, "scalabilityMode": "L1T1", "targetBitrate": 1200000, "totalEncodeTime": 22.745, "totalEncodedBytesTarget": 0, "totalPacketSendDelay": 1.3370279999999999 },
		{ "id": "P", "timestamp": 1729330520732.352, "type": "peer-connection", "dataChannelsClosed": 0, "dataChannelsOpened": 1 },
		{ "id": "RIA2527777913", "timestamp": 1729330516942, "type": "remote-inbound-rtp", "codecId": "COT01_111_minptime=10;stereo=1;useinbandfec=1", "kind": "audio", "mediaType": "audio", "ssrc": 2527777913, "transportId": "T01", "jitter": 0, "packetsLost": 0, "fractionLost": 0, "localId": "OT01A2527777913", "roundTripTime": 0.001, "roundTripTimeMeasurements": 22, "totalRoundTripTime": 0.022 },
		{ "id": "RIV1354817864", "timestamp": 1729330520576, "type": "remote-inbound-rtp", "codecId": "COT01_96", "kind": "video", "mediaType": "video", "ssrc": 1354817864, "transportId": "T01", "jitter": 0.0006659999999999999, "packetsLost": 0, "fractionLost": 0, "localId": "OT01V1354817864", "roundTripTime": 0.001, "roundTripTimeMeasurements": 106, "totalRoundTripTime": 0.10915 },
		{ "id": "SA1", "timestamp": 1729330520732.352, "type": "media-source", "kind": "audio", "trackIdentifier": "c67ebf63-f9dc-43e7-95fd-87ac5ccf6734", "audioLevel": 0.02252265999328593, "totalAudioEnergy": 0.6837220094184183, "totalSamplesDuration": 110.10000000001942 },
		{ "id": "SV2", "timestamp": 1729330520732.352, "type": "media-source", "kind": "video", "trackIdentifier": "dc8e387c-57bf-40a3-8b67-8f62216e7c2e", "frames": 4104, "framesPerSecond": 39, "height": 1080, "width": 1920 },
		{ "id": "T01", "timestamp": 1729330520732.352, "type": "transport", "bytesReceived": 106219, "bytesSent": 14450360, "dtlsCipher": "TLS_ECDHE_ECDSA_WITH_AES_128_GCM_SHA256", "dtlsRole": "server", "dtlsState": "connected", "iceLocalUsernameFragment": "5Ukp", "iceRole": "controlling", "iceState": "connected", "localCertificateId": "CFF9:6F:09:D5:F9:01:7F:A3:4F:00:0D:AE:A7:7E:6F:A9:54:C7:67:4C:9E:F7:02:0E:CF:84:44:11:59:71:A7:BE", "packetsReceived": 2301, "packetsSent": 18196, "remoteCertificateId": "CF4D:0B:4F:4D:8D:38:1C:AC:2A:F3:9C:17:29:92:EE:18:DF:B0:21:35:08:99:93:6D:12:F7:7D:A3:8E:72:8E:B8", "selectedCandidatePairChanges": 1, "selectedCandidatePairId": "CPXuLks4I7_lSNilYVM", "srtpCipher": "AES_CM_128_HMAC_SHA1_80", "tlsVersion": "FEFD" }];


		var websocketURL = "wss://test.antmedia.io/live/websocket";
		processStarted = false;
		initialized = false;
		var adaptor = new WebRTCAdaptor({
			websocketURL: websocketURL,
			callback: (info, obj) => {
				console.log("callback info: " + info);
				if (info == "initialized") {
					initialized = true;
				}
			},
		});


		var streamId = "stream1";

		//getStats
		var peerStats = adaptor.parseStats(stats, streamId);

		console.log("publish peerStats: " + JSON.stringify(peerStats));
		expect(peerStats.streamId).to.be.equal(streamId);
		expect(peerStats.audioPacketsSent).to.be.equal(5475);
		expect(peerStats.videoPacketsSent).to.be.equal(12386);
		expect(peerStats.frameWidth).to.be.equal(1920);
		expect(peerStats.frameHeight).to.be.equal(1080);
		expect(peerStats.currentRoundTripTime).to.be.least(0);

		expect(peerStats.videoPacketsLost).to.be.least(0);
		expect(peerStats.audioPacketsLost).to.be.least(0);
		expect(peerStats.videoJitter).to.be.least(0.0006);
		expect(peerStats.audioJitter).to.be.equal(0);
		expect(peerStats.totalBytesSentCount).to.be.equal(13784406);
		expect(peerStats.lastFramesEncoded).to.be.equal(4088);
		expect(peerStats.totalFramesEncodedCount).to.be.equal(4088);
		expect(peerStats.frameWidth).to.be.equal(1920);
		expect(peerStats.frameHeight).to.be.equal(1080);
		expect(peerStats.qualityLimitationReason).to.be.equal("none");
		expect(peerStats.firstByteSentCount).to.be.not.equal(0);
		expect(peerStats.srcFps).to.be.equal(39);
		expect(peerStats.videoRoundTripTime).to.be.equal(0.001);
		//expect(peerStats.audioRoundTripTime).to.be.above(0);
		expect(peerStats.availableOutgoingBitrate).to.be.equal(2563.076);




		expect(peerStats.totalBytesReceivedCount).to.be.equal(-1);
		expect(peerStats.lastBytesSent).to.be.equal(0);
		expect(peerStats.videoPacketsLost).to.be.equal(0);
		expect(peerStats.fractionLost).to.be.equal(-1);
		expect(peerStats.startTime).to.be.not.equal(0);
		expect(peerStats.lastBytesReceived).to.be.equal(0);
		expect(peerStats.currentTimestamp).to.be.not.equal(0);
		expect(peerStats.lastTime).to.be.equal(0);
		expect(peerStats.timerId).to.be.equal(0);
		expect(peerStats.firstBytesReceivedCount).to.be.equal(-1);
		expect(peerStats.audioLevel).to.be.equal(-1);
		expect(peerStats.resWidth).to.be.equal(1920);
		expect(peerStats.resHeight).to.be.equal(1080);
		expect(peerStats.framesReceived).to.be.equal(-1);
		expect(peerStats.framesDropped).to.be.equal(-1);
		expect(peerStats.framesDecoded).to.be.equal(-1);
		expect(peerStats.audioJitterAverageDelay).to.be.equal(-1);
		expect(peerStats.videoJitterAverageDelay).to.be.equal(-1);
		expect(peerStats.inboundRtpList).to.be.empty;
		expect(peerStats.audioPacketsReceived).to.be.equal(-1);
		expect(peerStats.videoPacketsReceived).to.be.equal(-1);

	});

	it("parseStats-play", async function() {

		var stats = [{ "id": "AP", "timestamp": 1729360465698.781, "type": "media-playout", "kind": "audio", "synthesizedSamplesDuration": 0, "synthesizedSamplesEvents": 0, "totalPlayoutDelay": 174058.96224, "totalSamplesCount": 3614400, "totalSamplesDuration": 75.3 },
		{ "id": "CF48:5F:93:78:DB:03:CB:A8:ED:6E:0C:52:34:00:55:80:50:0B:7B:73:3C:AB:F1:C9:15:63:59:E2:8E:7B:09:DD", "timestamp": 1729360465698.781, "type": "certificate", "base64Certificate": "MIIBFzCBvaADAgECAgkApIGSBIC4JckwCgYIKoZIzj0EAwIwETEPMA0GA1UEAwwGV2ViUlRDMB4XDTI0MTAxODE3NTMxMFoXDTI0MTExODE3NTMxMFowETEPMA0GA1UEAwwGV2ViUlRDMFkwEwYHKoZIzj0CAQYIKoZIzj0DAQcDQgAEuAAt92Y89uymKvP0E2sc8vA8IAD2YrPMol4uO8VSsFZIevCMoBGcSkgFbDyqsV4zzEmNA9uyp2Qr3njOI/2lIDAKBggqhkjOPQQDAgNJADBGAiEAj0S++4Go0R6pbocel9F3AevVIRcBFERHQ/JbsDrRCEACIQCfHKdmFN6dl+7vBW1VXl1qqD9dhSRtl2sFo1knPYd6tA==", "fingerprint": "48:5F:93:78:DB:03:CB:A8:ED:6E:0C:52:34:00:55:80:50:0B:7B:73:3C:AB:F1:C9:15:63:59:E2:8E:7B:09:DD", "fingerprintAlgorithm": "sha-256" },
		{ "id": "CFDB:33:70:CB:A5:84:C4:9C:65:2E:7C:D9:61:87:5D:09:BF:A4:C2:04:CB:AB:CC:C6:AA:D9:57:D8:C5:1E:D8:E6", "timestamp": 1729360465698.781, "type": "certificate", "base64Certificate": "MIIBFjCBvaADAgECAgkAyueWBvMtqW4wCgYIKoZIzj0EAwIwETEPMA0GA1UEAwwGV2ViUlRDMB4XDTI0MTAxODE3NTMxMFoXDTI0MTExODE3NTMxMFowETEPMA0GA1UEAwwGV2ViUlRDMFkwEwYHKoZIzj0CAQYIKoZIzj0DAQcDQgAEb3mgpzNXygFciDx+zpI3FhEMWEVExL6L03ZF6q9dwzEErPo7cmileEz/h+57fWKHuImu4dw+oyHKRU30PHP0oTAKBggqhkjOPQQDAgNIADBFAiB+umpKbmN4F0iLvMQX9wXrxqwdOorxC/ADn6dWh2q/dQIhAJE4axj9umROWU9phNlMcU2AkxPSDqjVM/hvaV84YSzA", "fingerprint": "DB:33:70:CB:A5:84:C4:9C:65:2E:7C:D9:61:87:5D:09:BF:A4:C2:04:CB:AB:CC:C6:AA:D9:57:D8:C5:1E:D8:E6", "fingerprintAlgorithm": "sha-256" },
		{ "id": "CIT01_111_minptime=10;stereo=1;useinbandfec=1", "timestamp": 1729360465698.781, "type": "codec", "channels": 2, "clockRate": 48000, "mimeType": "audio/opus", "payloadType": 111, "sdpFmtpLine": "minptime=10;stereo=1;useinbandfec=1", "transportId": "T01" },
		{ "id": "CIT01_127_level-asymmetry-allowed=1;packetization-mode=1;profile-level-id=42e01f", "timestamp": 1729360465698.781, "type": "codec", "clockRate": 90000, "mimeType": "video/H264", "payloadType": 127, "sdpFmtpLine": "level-asymmetry-allowed=1;packetization-mode=1;profile-level-id=42e01f", "transportId": "T01" },
		{ "id": "CPdtvDwfjB_kGw81ZH2", "timestamp": 1729360465698.781, "type": "candidate-pair", "availableOutgoingBitrate": 300000, "bytesDiscardedOnSend": 0, "bytesReceived": 1475790, "bytesSent": 61385, "consentRequestsSent": 31, "currentRoundTripTime": 0, "lastPacketReceivedTimestamp": 1729360465684, "lastPacketSentTimestamp": 1729360465697, "localCandidateId": "IdtvDwfjB", "nominated": true, "packetsDiscardedOnSend": 0, "packetsReceived": 7261, "packetsSent": 1340, "priority": 9115038255631187000, "remoteCandidateId": "IkGw81ZH2", "requestsReceived": 34, "requestsSent": 32, "responsesReceived": 32, "responsesSent": 34, "state": "succeeded", "totalRoundTripTime": 0.011, "transportId": "T01", "writable": true },
		{ "id": "D3", "timestamp": 1729360465698.781, "type": "data-channel", "bytesReceived": 5355, "bytesSent": 0, "dataChannelIdentifier": 1, "label": "stream1", "messagesReceived": 40, "messagesSent": 0, "protocol": "", "state": "open" },
		{ "id": "IT01A3202491249", "timestamp": 1729360465698.781, "type": "inbound-rtp", "codecId": "CIT01_111_minptime=10;stereo=1;useinbandfec=1", "kind": "audio", "mediaType": "audio", "ssrc": 3202491249, "transportId": "T01", "jitter": 0, "packetsLost": 0, "packetsReceived": 3764, "audioLevel": 0.0076906643879512925, "bytesReceived": 482689, "concealedSamples": 1774, "concealmentEvents": 2, "estimatedPlayoutTimestamp": 3938327816566, "fecPacketsDiscarded": 0, "fecPacketsReceived": 0, "headerBytesReceived": 105392, "insertedSamplesForDeceleration": 2862, "jitterBufferDelay": 113116.8, "jitterBufferEmittedCount": 3612480, "jitterBufferMinimumDelay": 76147.2, "jitterBufferTargetDelay": 76300.8, "lastPacketReceivedTimestamp": 1729339016620.57, "mid": "1", "packetsDiscarded": 0, "playoutId": "AP", "remoteId": "ROA3202491249", "removedSamplesForAcceleration": 2670, "silentConcealedSamples": 0, "totalAudioEnergy": 0.9479140477134788, "totalProcessingDelay": 108273.23712, "totalSamplesDuration": 75.29000000000161, "totalSamplesReceived": 3613920, "trackIdentifier": "ARDAMSaaudioTrack0" },
		{ "id": "IT01V3262821271", "timestamp": 1729360465698.781, "type": "inbound-rtp", "codecId": "CIT01_127_level-asymmetry-allowed=1;packetization-mode=1;profile-level-id=42e01f", "kind": "video", "mediaType": "video", "ssrc": 3262821271, "transportId": "T01", "jitter": 0.01, "packetsLost": 0, "packetsReceived": 3346, "bytesReceived": 709312, "estimatedPlayoutTimestamp": 3938338821605, "firCount": 0, "frameHeight": 360, "frameWidth": 640, "framesAssembledFromMultiplePackets": 75, "framesDecoded": 2226, "framesDropped": 0, "framesPerSecond": 29, "framesReceived": 2226, "freezeCount": 0, "headerBytesReceived": 90444, "jitterBufferDelay": 31.145653, "jitterBufferEmittedCount": 2227, "jitterBufferMinimumDelay": 44.558583999999996, "jitterBufferTargetDelay": 44.558583999999996, "keyFramesDecoded": 75, "lastPacketReceivedTimestamp": 1729339016617.0981, "mid": "0", "nackCount": 0, "pauseCount": 0, "pliCount": 0, "remoteId": "ROV3262821271", "retransmittedBytesReceived": 112295, "retransmittedPacketsReceived": 519, "rtxSsrc": 3654956870, "totalAssemblyTime": 0.6750689999999999, "totalDecodeTime": 1.81971, "totalFreezesDuration": 0, "totalInterFrameDelay": 74.305, "totalPausesDuration": 0, "totalProcessingDelay": 33.002987, "totalSquaredInterFrameDelay": 2.597927000000023, "trackIdentifier": "ARDAMSvvideoTrack0" },
		{ "id": "IdtvDwfjB", "timestamp": 1729360465698.781, "type": "local-candidate", "address": "192.168.1.31", "candidateType": "host", "foundation": "2770254034", "ip": "192.168.1.31", "isRemote": false, "networkType": "wifi", "port": 54322, "priority": 2122260223, "protocol": "udp", "transportId": "T01", "usernameFragment": "KlG/" },
		{ "id": "IkGw81ZH2", "timestamp": 1729360465698.781, "type": "remote-candidate", "address": "192.168.1.31", "candidateType": "host", "foundation": "3335006257", "ip": "192.168.1.31", "isRemote": true, "port": 50001, "priority": 2122260223, "protocol": "udp", "transportId": "T01", "usernameFragment": "+T7W" },
		{ "id": "P", "timestamp": 1729360465698.781, "type": "peer-connection", "dataChannelsClosed": 0, "dataChannelsOpened": 1 },
		{ "id": "ROA3202491249", "timestamp": 1729339015650, "type": "remote-outbound-rtp", "codecId": "CIT01_111_minptime=10;stereo=1;useinbandfec=1", "kind": "audio", "mediaType": "audio", "ssrc": 3202491249, "transportId": "T01", "bytesSent": 476489, "packetsSent": 3715, "localId": "IT01A3202491249", "remoteTimestamp": 1729339015650, "reportsSent": 17, "roundTripTimeMeasurements": 0, "totalRoundTripTime": 0 },
		{ "id": "ROV3262821271", "timestamp": 1729339016116, "type": "remote-outbound-rtp", "codecId": "CIT01_127_level-asymmetry-allowed=1;packetization-mode=1;profile-level-id=42e01f", "kind": "video", "mediaType": "video", "ssrc": 3262821271, "transportId": "T01", "bytesSent": 702462, "packetsSent": 3323, "localId": "IT01V3262821271", "remoteTimestamp": 1729339016116, "reportsSent": 84, "roundTripTimeMeasurements": 0, "totalRoundTripTime": 0 },
		{ "id": "T01", "timestamp": 1729360465698.781, "type": "transport", "bytesReceived": 1475790, "bytesSent": 61385, "dtlsCipher": "TLS_ECDHE_ECDSA_WITH_AES_128_GCM_SHA256", "dtlsRole": "client", "dtlsState": "connected", "iceLocalUsernameFragment": "KlG/", "iceRole": "controlled", "iceState": "connected", "localCertificateId": "CF48:5F:93:78:DB:03:CB:A8:ED:6E:0C:52:34:00:55:80:50:0B:7B:73:3C:AB:F1:C9:15:63:59:E2:8E:7B:09:DD", "packetsReceived": 7261, "packetsSent": 1340, "remoteCertificateId": "CFDB:33:70:CB:A5:84:C4:9C:65:2E:7C:D9:61:87:5D:09:BF:A4:C2:04:CB:AB:CC:C6:AA:D9:57:D8:C5:1E:D8:E6", "selectedCandidatePairChanges": 1, "selectedCandidatePairId": "CPdtvDwfjB_kGw81ZH2", "srtpCipher": "AES_CM_128_HMAC_SHA1_80", "tlsVersion": "FEFD" }]

		var websocketURL = "wss://test.antmedia.io/live/websocket";

		var playAdaptor = new WebRTCAdaptor({
			websocketURL: websocketURL,
			isPlayMode: true,
			callback: (info, obj) => {
				console.log("callback info: " + info);
				if (info == "initialized") {
					initialized = true;
				}

			},
		});


	    var streamId = "stream1";

		var peerStats = playAdaptor.parseStats(stats, streamId);

		console.log("play peerStats: " + JSON.stringify(peerStats));
		expect(peerStats.streamId).to.be.equal(streamId);
		expect(peerStats.frameWidth).to.be.equal(640);
		expect(peerStats.frameHeight).to.be.equal(360);
		expect(peerStats.currentRoundTripTime).to.be.equal(0);

		expect(peerStats.videoPacketsLost).to.be.least(0);
		expect(peerStats.audioPacketsLost).to.be.least(0);
		expect(peerStats.videoJitter).to.be.least(0);
		expect(peerStats.audioJitter).to.be.least(0);
		expect(peerStats.lastFramesEncoded).to.be.equal(-1);
		expect(peerStats.totalFramesEncodedCount).to.be.equal(-1);
		expect(peerStats.frameWidth).to.be.equal(640);
		expect(peerStats.frameHeight).to.be.equal(360);
		expect(peerStats.qualityLimitationReason).to.be.equal("");
		expect(peerStats.firstByteSentCount).to.be.not.equal(0);
		expect(peerStats.srcFps).to.be.equal(-1);
		expect(peerStats.videoRoundTripTime).to.be.equal(-1);
		expect(peerStats.audioRoundTripTime).to.be.equal(-1);
		expect(peerStats.availableOutgoingBitrate).to.be.above(-1);




		expect(peerStats.totalBytesReceivedCount).to.be.equal(1192000);
		expect(peerStats.lastBytesSent).to.be.equal(0);
		expect(peerStats.videoPacketsLost).to.be.equal(0);
		//expect(peerStats.fractionLost).to.be.equal(-1);
		expect(peerStats.startTime).to.be.not.equal(0);
		expect(peerStats.lastBytesReceived).to.be.equal(0);
		expect(peerStats.currentTimestamp).to.be.not.equal(0);
		expect(peerStats.lastTime).to.be.equal(0);
		expect(peerStats.timerId).to.be.equal(0);
		expect(peerStats.firstBytesReceivedCount).to.be.above(0);
		expect(peerStats.audioLevel).to.be.equal(-1);
		expect(peerStats.resWidth).to.be.equal(-1);
		expect(peerStats.resHeight).to.be.equal(-1);
		expect(peerStats.framesReceived).to.be.equal(2226);
		expect(peerStats.framesDropped).to.be.equal(0);
		expect(peerStats.framesDecoded).to.be.equal(2226);
		expect(peerStats.audioJitterAverageDelay).to.be.equal(-1);
		expect(peerStats.videoJitterAverageDelay).to.be.equal(-1);
		expect(peerStats.audioPacketsReceived).to.be.equal(3764);
		expect(peerStats.videoPacketsReceived).to.be.equal(3346);


		expect(peerStats.totalBytesSentCount).to.be.equal(-1);
		expect(peerStats.totalAudioPacketsSent).to.be.equal(-1);
		expect(peerStats.totalVideoPacketsSent).to.be.equal(-1);




	});

	it("getSubtrackCount", async function() {

		let adaptor = new WebRTCAdaptor({
			websocketURL: "ws://example.com",
			isPlayMode: true
		});

		let streamId = "roomId";
		let role = "host";
		let status = "active";

		let jsCmd = {
			command: "getSubtracksCount",
			streamId: streamId,
			role: role,
			status: status,
		};

		let webSocketAdaptor = sinon.mock(adaptor.webSocketAdaptor);

		let sendExpectation = webSocketAdaptor.expects("send").once().withArgs(JSON.stringify(jsCmd));

		adaptor.getSubtrackCount(streamId, role, status);

		sendExpectation.verify()

	});


	it("Play with parameters", async function() {
            let publishStreamId = "publish1"
            let streamId = "stream1";
            let token = "yourToken";
            let roomId = "yourRoomId";
            let enableTracks = true;
            let subscriberId = "yourSubscriberId";
            let subscriberCode = "yourSubscriberCode";
            let metaData = "yourMetaData";
            let role = "subscriber";

    		var adaptor = new WebRTCAdaptor({
    			websocketURL: "ws://example.com",
    			isPlayMode: true,
    			publishStreamId: publishStreamId
    		});

    		var peerConnection = new RTCPeerConnection();
            var initPeerConnection = sinon.replace(adaptor, "initPeerConnection", sinon.fake.returns(peerConnection));
    		var webSocketAdaptor = sinon.mock(adaptor.webSocketAdaptor);

            adaptor.play(streamId, token, roomId, enableTracks, subscriberId, subscriberCode, metaData, role);

            let jsCmd = {
                command: "play",
                streamId: streamId,
                token: token,
                room: roomId,
                trackList: enableTracks,
                subscriberId: subscriberId,
                subscriberCode: subscriberCode,
                viewerInfo: metaData,
                role: role,
                userPublishId: publishStreamId
            };

    		webSocketAdaptor.expects("send").once().withArgs(JSON.stringify(jsCmd));
    		expect(initPeerConnection.calledWithExactly(streamId, "play")).to.be.true;
    	});



});

describe("ICE Server Configuration", function() {
    it("should set userDefinedIceServers to true if peerconnection_config is provided", function() {
        const adaptor = new WebRTCAdaptor({
            websocketURL: "ws://example.com",
            peerconnection_config: { iceServers: [{ urls: "stun:custom" }] },
            initializeComponents: false
        });
        expect(adaptor.userDefinedIceServers).to.be.true;
    });

    it("should set userDefinedIceServers to false if peerconnection_config is not provided", function() {
        const adaptor = new WebRTCAdaptor({
            websocketURL: "ws://example.com",
            initializeComponents: false
        });
        expect(adaptor.userDefinedIceServers).to.be.false;
    });

    it("getIceServerConfiguration should send getIceServerConfig if userDefinedIceServers is false", function() {
        const adaptor = new WebRTCAdaptor({
            websocketURL: "ws://example.com",
            initializeComponents: false
        });
        adaptor.userDefinedIceServers = false;
        adaptor.webSocketAdaptor = { send: sinon.fake() };
        adaptor.getIceServerConfiguration();
        expect(adaptor.webSocketAdaptor.send.calledOnce).to.be.true;
        const sentArg = JSON.parse(adaptor.webSocketAdaptor.send.firstCall.args[0]);
        expect(sentArg.command).to.equal("getIceServerConfig");
    });

    it("getIceServerConfiguration should NOT send getIceServerConfig if userDefinedIceServers is true", function() {
        const adaptor = new WebRTCAdaptor({
            websocketURL: "ws://example.com",
            initializeComponents: false
        });
        adaptor.userDefinedIceServers = true;
        adaptor.webSocketAdaptor = { send: sinon.fake() };
        adaptor.getIceServerConfiguration();
        expect(adaptor.webSocketAdaptor.send.called).to.be.false;
    });
});

describe("WebSocketAdaptor ICE ServerConfig Integration", function() {
    let originalLogger;
    let originalLog;
    before(function() {
        // Save and mock Logger and log for debug test
        originalLogger = window.Logger;
        originalLog = window.log;
        window.log = { debug: () => {} };
        window.Logger = window.log;
    });
    after(function() {
        window.Logger = originalLogger;
        window.log = originalLog;
    });

    it("should update peerconnection_config.iceServers for TURN server via real onmessage", function() {
        const adaptor = { peerconnection_config: { iceServers: [] } };
        const wsAdaptor = new WebSocketAdaptor({ websocket_url: "ws://example.com", webrtcadaptor: adaptor });
        wsAdaptor.debug = false;
        wsAdaptor.wsConn = {};
        wsAdaptor.initWebSocketConnection();
        const event = {
            data: JSON.stringify({
                command: "iceServerConfig",
                stunServerUri: "turn:turn.example.com",
                turnServerUsername: "user",
                turnServerCredential: "pass"
            })
        };
        wsAdaptor.wsConn.onmessage(event);
        expect(adaptor.peerconnection_config.iceServers.length).to.equal(2);
        expect(adaptor.peerconnection_config.iceServers[1].urls).to.equal("turn:turn.example.com");
        expect(adaptor.peerconnection_config.iceServers[1].username).to.equal("user");
        expect(adaptor.peerconnection_config.iceServers[1].credential).to.equal("pass");
    });

    it("should update peerconnection_config.iceServers for STUN server via real onmessage", function() {
        const adaptor = { peerconnection_config: { iceServers: [] } };
        const wsAdaptor = new WebSocketAdaptor({ websocket_url: "ws://example.com", webrtcadaptor: adaptor });
        wsAdaptor.debug = false;
        wsAdaptor.wsConn = {};
        wsAdaptor.initWebSocketConnection();
        const event = {
            data: JSON.stringify({
                command: "iceServerConfig",
                stunServerUri: "stun:stun.example.com"
            })
        };
        wsAdaptor.wsConn.onmessage(event);
        expect(adaptor.peerconnection_config.iceServers.length).to.equal(1);
        expect(adaptor.peerconnection_config.iceServers[0].urls).to.equal("stun:stun.example.com");
    });

});
