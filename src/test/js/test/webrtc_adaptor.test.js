
import { WebRTCAdaptor } from '../../../main/webapp/js/webrtc_adaptor.js';


describe("WebRTCAdaptor", function() {

	var clock;

	var sandbox;

	var initialized = false;

	beforeEach(function () {
	  clock = sinon.useFakeTimers();
	  sandbox = sinon.createSandbox();
	});


	afterEach(() => {
	  // Restore the default sandbox here
	  sinon.restore();
	  clock.restore();
	  sandbox.restore();
	});


	it("Initialize", async function() {

		try {
			var adaptor = new WebRTCAdaptor({
			});
			expect.fail("It should throw exception because websocket url is mandatory");
		}
		catch (err) {

		}

		try {
			var websocketURL = "ws://localhost";
			var adaptor = new WebRTCAdaptor({
				websocketURL: websocketURL
			});

			expect(adaptor.websocketURL).to.be.equal(websocketURL);
		}
		catch (err) {
			expect.fail(err);
		}



	});


	it("Auto reconnect play", async function() {

		var adaptor = new WebRTCAdaptor({
			websocketURL: "ws://example.com",
			isPlayMode:true
		});

		var webSocketAdaptor = sinon.mock(adaptor.webSocketAdaptor);
		var closePeerConnection = sinon.replace(adaptor, "closePeerConnection", sinon.fake());

		var sendExpectation = webSocketAdaptor.expects("send");
		//sendExpectation first one is direct, second one through tryAgain
		sendExpectation.exactly(2);

		var streamId = "stream123";
		expect(adaptor.remotePeerConnection[streamId]).to.be.undefined;

		//first call for sendExpectation direct
		adaptor.play("stream123");

		expect(adaptor.remotePeerConnection[streamId]).to.not.be.undefined;

		clock.tick(4000);
		expect(closePeerConnection.called).to.be.false;
		clock.tick(1000);
		expect(closePeerConnection.called).to.be.true;

		expect(closePeerConnection.calledWithMatch("stream123")).to.be.true;

		adaptor.stop(streamId);

		expect(adaptor.remotePeerConnection[streamId]).to.not.be.undefined;

		sendExpectation.verify();

	});

	it("Auto reconnect publish", async function() {

		var adaptor = new WebRTCAdaptor({
			websocketURL: "ws://example.com",
			onlyDataChannel: true
		});

		var webSocketAdaptor = sinon.mock(adaptor.webSocketAdaptor);
		var closeWebsocketConnection = sinon.replace(adaptor, "closePeerConnection", sinon.fake());

		var sendExpectation = webSocketAdaptor.expects("send");
		//sendExpectation first one is direct, second one through tryAgain
		sendExpectation.exactly(2);

		var streamId = "stream1234";
		expect(adaptor.remotePeerConnection[streamId]).to.be.undefined;

		//first call for sendExpectation direct
		adaptor.publish(streamId);

		expect(adaptor.remotePeerConnection[streamId]).to.not.be.undefined;

		clock.tick(4000);
		expect(closeWebsocketConnection.called).to.be.false;
		clock.tick(1000);
		expect(closeWebsocketConnection.called).to.be.true;

		expect(closeWebsocketConnection.calledWithMatch(streamId)).to.be.true;
		
		adaptor.enableStats(streamId);
		expect(adaptor.remotePeerConnectionStats[streamId]).to.not.be.undefined
		
		expect(await adaptor.getStats(streamId)).to.be.true;
		

		console.log(adaptor.remotePeerConnectionStats[streamId])

		

		adaptor.stop(streamId);

		expect(adaptor.remotePeerConnection[streamId]).to.not.be.undefined;

		sendExpectation.verify();

	});


	it("Close websocket", async function()
	{
		var adaptor = new WebRTCAdaptor({
			websocketURL: "ws://example.com",
			isPlayMode: true
		});
		var webSocketAdaptor = sinon.mock(adaptor.webSocketAdaptor);
		var closeExpectation = webSocketAdaptor.expects("close");

		var closePeerConnection = sinon.replace(adaptor, "closePeerConnection", sinon.fake());

		var streamId = "stream123";
		expect(adaptor.remotePeerConnection[streamId]).to.be.undefined;
		adaptor.initPeerConnection(streamId, "play");
		expect(adaptor.remotePeerConnection[streamId]).to.not.be.undefined;

		adaptor.closeWebSocket();

		expect(closePeerConnection.calledWithMatch(streamId)).to.be.true;

		closeExpectation.verify();


	});

	it("Frequent try again call", async function()
	{
		var adaptor = new WebRTCAdaptor({
			websocketURL: "ws://example.com",
			isPlayMode: true
		});
		var webSocketAdaptor = sinon.mock(adaptor.webSocketAdaptor);
		var closeExpectation = webSocketAdaptor.expects("close");

		var closePeerConnection = sinon.replace(adaptor, "closePeerConnection", sinon.fake());

		const now = Date.now();
		adaptor.tryAgain();

		expect(adaptor.lastReconnectiontionTrialTime-now).to.be.at.most(100);

		const lrt = adaptor.lastReconnectiontionTrialTime;

		for (let i = 0; i < 100; i++) {
			adaptor.tryAgain();
			expect(adaptor.lastReconnectiontionTrialTime).to.be.equal(lrt);

		}

		clock.tick(3000);
		adaptor.tryAgain();
		expect(adaptor.lastReconnectiontionTrialTime).not.to.be.equal(lrt);
	});

	it("Reconnection for play", async function()
	{
		var adaptor = new WebRTCAdaptor({
			websocketURL: "ws://example.com",
			isPlayMode: true
		});
		var fakeSend = sinon.replace(adaptor.webSocketAdaptor, "send", sinon.fake());

		const streamId = "test"+Math.floor(Math.random() * 100);
		adaptor.playStreamId.push(streamId);
		var mockPC = sinon.mock(RTCPeerConnection);
		adaptor.remotePeerConnection[streamId] = mockPC
		mockPC.iceConnectionState = "disconnected";
		mockPC.close = sinon.fake();


		clock.tick(3000);
		console.log("---------");
		adaptor.tryAgain();

		assert(fakeSend.calledOnce);
		clock.tick(6000);
		assert(fakeSend.calledTwice);


	});

	it("Reconnection for publish", async function()
	{
		var adaptor = new WebRTCAdaptor({
			websocketURL: "ws://example.com",
			isPlayMode: true
		});
		var fakeSendPublish = sinon.replace(adaptor, "sendPublishCommand", sinon.fake());

		const streamId = "test"+Math.floor(Math.random() * 100);
		adaptor.publishStreamId = streamId;
		var mockPC = sinon.mock(RTCPeerConnection);
		adaptor.remotePeerConnection[streamId] = mockPC
		mockPC.iceConnectionState = "disconnected";
		mockPC.close = sinon.fake();


		adaptor.mediaManager.localStream = sinon.mock();
		var callback = sinon.stub();
    	callback.returns([sinon.mock()]);
		adaptor.mediaManager.localStream.getVideoTracks = callback;
		adaptor.mediaManager.localStream.getAudioTracks = callback;
		adaptor.mediaManager.localStream.getTracks = sinon.stub().returns([]);

		clock.tick(3000);
		console.log("---------");
		adaptor.tryAgain();

		assert(fakeSendPublish.calledOnce);
		clock.tick(6000);
		assert(fakeSendPublish.calledTwice);


	});

	it("Websocket send try catch", async function()
	{
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
		var adaptor = new WebRTCAdaptor({
			websocketURL: "ws://localhost",
			initializeComponents: false
		});

		initialized = false;
		await adaptor.initialize().then(()=> {
			initialized = true;
		})

		expect(initialized).to.be.true;

		expect(adaptor.mediaManager.localStream).to.be.not.null;

		initialized = false;
		await adaptor.enableAudioLevelForLocalStream((event) => {
			console.log("audio level: " + event.data);
		}).then(()=> {
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
		} catch (e) {
			console.error(e);
			assert(false);
		}
	});
	
	it("dummyStreamAndSwitch", async function() 
	{
		
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
		
		
		expect(adaptor.mediaManager.mediaConstraints).to.deep.equal({video:"dummy", audio:"dummy"});
		
		expect(adaptor.mediaManager.blackVideoTrack).to.not.be.null
		expect(adaptor.mediaManager.silentAudioTrack).to.not.be.null
		expect(adaptor.mediaManager.oscillator).to.not.be.null
		expect(adaptor.mediaManager.localStream.getVideoTracks().length).to.be.equal(1)
		expect(adaptor.mediaManager.localStream.getAudioTracks().length).to.be.equal(1)
		

		await adaptor.openStream({video:true, audio:true});
		
		expect(adaptor.mediaManager.blackVideoTrack).to.be.null
		expect(adaptor.mediaManager.silentAudioTrack).to.be.null
		expect(adaptor.mediaManager.oscillator).to.be.null
		
		expect(adaptor.mediaManager.mediaConstraints).to.deep.equal({video:true, audio:true});
		expect(adaptor.mediaManager.localStream.getVideoTracks().length).to.be.equal(1)
		expect(adaptor.mediaManager.localStream.getAudioTracks().length).to.be.equal(1)

	});
	
	it("updateAudioTrack", async function() 
	{
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

		adaptor.enableAudioLevelForLocalStream((value)=> {
			
		}, 200);
		
		expect(adaptor.mediaManager.localStreamSoundMeter).to.not.be.null;
		
		var audioTrack = adaptor.mediaManager.getSilentAudioTrack();
		
		var stream = new MediaStream();
		stream.addTrack(audioTrack);
		
		await adaptor.updateAudioTrack(stream, null, null);
		
		
		
		
	});
	
	
});
