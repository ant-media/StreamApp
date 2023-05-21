
import { WebRTCAdaptor } from '../../../main/webapp/js/webrtc_adaptor.js';


describe("WebRTCAdaptor", function() {
	
	var clock;
	
	var sandbox;

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
			expect.fail("WIt should throw exception because websocket url is mandatory");
		}
		catch (err) {

		}
		
		try {
			var websocketURL = "this_ weboscket url";
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
});