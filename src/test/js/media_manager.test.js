import {WebRTCAdaptor} from '../../main/js/webrtc_adaptor.js';
import {MediaManager} from '../../main/js/media_manager.js';

describe("MediaManager", function () {


  it("initLocalStreamWithAudio", async function () {

    var adaptor = new WebRTCAdaptor({
      websocketURL: "ws://example.com",
    });

    var mediaManager = new MediaManager({
      userParameters: {
        mediaConstraints: {
          video: false,
          audio: true,
        }
      },
      webRTCAdaptor: adaptor,

      callback: (info, obj) => {
        adaptor.notifyEventListeners(info, obj)
      },
      callbackError: (error, message) => {
        adaptor.notifyErrorEventListeners(error, message)
      },
      getSender: (streamId, type) => {
        return adaptor.getSender(streamId, type)
      },
    });

    await mediaManager.initLocalStream();

    expect(mediaManager.localStream.getAudioTracks().length).to.be.equal(1);
    expect(mediaManager.localStream.getVideoTracks().length).to.be.equal(0);


  });


  it("testArgsNavigatorDisplayMedia", async function () {
     var adaptor = new WebRTCAdaptor({
      websocketURL: "ws://example.com",
    });

    var mediaManager = new MediaManager({
      userParameters: {
        mediaConstraints: {
          video: false,
          audio: true,
        }
      },
      webRTCAdaptor: adaptor,

      callback: (info, obj) => {
        adaptor.notifyEventListeners(info, obj)
      },
      callbackError: (error, message) => {
        adaptor.notifyErrorEventListeners(error, message)
      },
      getSender: (streamId, type) => {
        return adaptor.getSender(streamId, type)
      },
    });
    var costraints = {mediaConstraints: {
          video: true,
          audio: true,
        }}

    const callback = ()=>{
      alert("tst");
    }

    var getDisplayMediaStub = sinon.stub(navigator.mediaDevices, "getDisplayMedia")
    .rejects(new DOMException("Permission denied", "NotAllowedError"));

    var switchVideoCameraCaptureStub = sinon.stub(mediaManager, "switchVideoCameraCapture")
     sinon.stub(mediaManager, "prepareStreamTracks")

    mediaManager.localStream = "test";
    mediaManager.publishMode = "screen";

    await mediaManager.getMedia(costraints,"stream123");

    sinon.assert.calledWith(switchVideoCameraCaptureStub, "stream123");
   
  });

  it("getBlackVideoTrack", async function () {
    var adaptor = new WebRTCAdaptor({
      websocketURL: "ws://example.com",
    });

    var mediaManager = new MediaManager({
      userParameters: {
        mediaConstraints: {
          video: false,
          audio: true,
        }
      },
      webRTCAdaptor: adaptor,

      callback: (info, obj) => {
        adaptor.notifyEventListeners(info, obj)
      },
      callbackError: (error, message) => {
        adaptor.notifyErrorEventListeners(error, message)
      },
      getSender: (streamId, type) => {
        return adaptor.getSender(streamId, type)
      },
    });


    expect(mediaManager.replacementStream).to.be.null;
    expect(mediaManager.blackVideoTrack).to.be.null;
    expect(mediaManager.blackFrameTimer).to.be.null;

    mediaManager.getBlackVideoTrack();


    expect(mediaManager.replacementStream).to.not.be.null;
    expect(mediaManager.blackVideoTrack).to.not.be.null;
    expect(mediaManager.blackFrameTimer).to.not.be.null;


    mediaManager.stopBlackVideoTrack();
    mediaManager.clearBlackVideoTrackTimer();
    expect(mediaManager.blackVideoTrack).to.be.null;
    expect(mediaManager.blackFrameTimer).to.be.null;

  });


  it("turnOnOffLocalCamera", async function () {

    var adaptor = new WebRTCAdaptor({
      websocketURL: "ws://example.com",
      initializeComponents: false,
      mediaConstraints: {
        video: true,
        audio: true
      }
    });

    await adaptor.mediaManager.initLocalStream();

    expect(adaptor.mediaManager.localStream.getAudioTracks().length).to.be.equal(1);
    expect(adaptor.mediaManager.localStream.getVideoTracks().length).to.be.equal(1);

    expect(adaptor.mediaManager.blackVideoTrack).to.be.null;
    await adaptor.mediaManager.turnOffLocalCamera();

    expect(adaptor.mediaManager.blackVideoTrack).to.not.be.null;

    await adaptor.turnOnLocalCamera();
    expect(adaptor.mediaManager.blackVideoTrack).to.be.null;
    expect(adaptor.mediaManager.blackFrameTimer).to.be.null;

  });

  it("turnOnOffLocalCameraInScreenPlusCamera", async function () {

    var adaptor = new WebRTCAdaptor({
      websocketURL: "ws://example.com",
      initializeComponents: false,
      mediaConstraints: {
        video: true,
        audio: true
      }
    });

    adaptor.mediaManager.publishMode = "screen+camera";

    expect(adaptor.mediaManager.cameraEnabled).to.be.equal(true);

    await adaptor.mediaManager.turnOffLocalCamera();
    expect(adaptor.mediaManager.cameraEnabled).to.be.equal(false);

    await adaptor.turnOnLocalCamera();
    expect(adaptor.mediaManager.cameraEnabled).to.be.equal(true);
  });

  it("testOnEndedCallback", function (done) {
    this.timeout(5000);

    var adaptor = new WebRTCAdaptor({
      websocketURL: "ws://example.com",
      initializeComponents: false,
      mediaConstraints: {
        video: true,
        audio: true
      }
    });

    adaptor.mediaManager.initLocalStream().then(() => {
      expect(adaptor.mediaManager.localStream.getVideoTracks().length).to.be.equal(1);
      var newStream = adaptor.mediaManager.localStream;
      var onEndedCallback = function (event) {
        done()
      }
      adaptor.switchVideoCameraCapture("stream1", "test", onEndedCallback).then(() => {
        newStream.getVideoTracks()[0].onended();

      });

    });
  });
  it("changeLocalVideo", async function () {

    var videoElement = document.createElement("video");
    videoElement.id = "oldElement";
    var newVideoElement = document.createElement("video");
    newVideoElement.id = "newElement"

    var adaptor = new WebRTCAdaptor({
      websocketURL: "ws://example.com",
      localVideoElement: videoElement,
      initializeComponents: false,
      mediaConstraints: {
        video: true,
        audio: true
      }
    });

    await adaptor.mediaManager.initLocalStream();
    adaptor.mediaManager.changeLocalVideo(newVideoElement);
    expect(adaptor.mediaManager.localVideo.id).to.be.equal(newVideoElement.id);
    expect(adaptor.mediaManager.localVideo.srcObject.id).to.be.equal(adaptor.mediaManager.localStream.id);


  });
  it("muteUnmuteTest", async function () {
    var videoElement = document.createElement("video");

    var adaptor = new WebRTCAdaptor({
      websocketURL: "ws://example.com",
      localVideoElement: videoElement,
      initializeComponents: false,
      mediaConstraints: {
        video: true,
        audio: true
      }
    });

    await adaptor.mediaManager.initLocalStream();
    adaptor.muteLocalMic();
    expect(adaptor.mediaManager.isMuted).to.be.equal(true);
    adaptor.mediaManager.localStream.getAudioTracks().forEach(track => expect(track.enabled).to.be.equal(false));

    adaptor.unmuteLocalMic();
    expect(adaptor.mediaManager.isMuted).to.be.equal(false);
    adaptor.mediaManager.localStream.getAudioTracks().forEach(track => expect(track.enabled).to.be.equal(true));

  });
  
  it("unmute while silent", async function () {
      var videoElement = document.createElement("video");

      var adaptor = new WebRTCAdaptor({
        websocketURL: "ws://example.com",
        localVideoElement: videoElement,
        initializeComponents: false,
        mediaConstraints: {
          video: true,
          audio: "dummy"
        }
      });

      await adaptor.mediaManager.initLocalStream();
	  
	  var silentTrack = adaptor.mediaManager.localStream.getAudioTracks();

      adaptor.unmuteLocalMic();
	  
	  var micTrack = adaptor.mediaManager.localStream.getAudioTracks();

      expect(silentTrack).not.to.be.equal(micTrack);

  });
	
  it("enableSecondStreamInMixedAudio", async function () {
    var videoElement = document.createElement("video");

    var adaptor = new WebRTCAdaptor({
      websocketURL: "ws://example.com",
      localVideoElement: videoElement,
      initializeComponents: false,
      mediaConstraints: {
        video: true,
        audio: true
      }
    });

    await adaptor.mediaManager.initLocalStream();
    adaptor.mediaManager.secondaryAudioTrackGainNode = adaptor.mediaManager.audioContext.createGain();

    adaptor.mediaManager.enableSecondStreamInMixedAudio(true);
    expect(adaptor.mediaManager.secondaryAudioTrackGainNode.gain.value).to.be.equal(1);
    adaptor.mediaManager.enableSecondStreamInMixedAudio(false);
    expect(adaptor.mediaManager.secondaryAudioTrackGainNode.gain.value).to.be.equal(0);


  });
  
  it("testSwitchDesktopCapture", async function () {
      var videoElement = document.createElement("video");
	  
	  var streamId = "stream1";
	  
	  var mediaConstraints = {video: "something_video", audio: "something_audio"};

      var adaptor = new WebRTCAdaptor({
        websocketURL: "ws://example.com",
        localVideoElement: videoElement,
        initializeComponents: false,
        mediaConstraints: mediaConstraints
      });
	  
	  var shareMediaConstraint =  JSON.parse(JSON.stringify(mediaConstraints));
	  shareMediaConstraint.video = true;

	  var getMediaStub = sinon.stub(adaptor.mediaManager, "getMedia");
	  
	  await adaptor.mediaManager.switchDesktopCapture(streamId);

	  sinon.assert.calledWith(getMediaStub, shareMediaConstraint, streamId);
    });
	
	
	it("switchDesktopCaptureWithCamera", async function () {
	      var videoElement = document.createElement("video");
		  
		  var streamId = "stream1";
		  
		  var mediaConstraints = {video: "something_video", audio: "something_audio"};

	      var adaptor = new WebRTCAdaptor({
	        websocketURL: "ws://example.com",
	        localVideoElement: videoElement,
	        initializeComponents: false,
	        mediaConstraints: mediaConstraints
	      });
		  
		  var shareMediaConstraint =  JSON.parse(JSON.stringify(mediaConstraints));
		  shareMediaConstraint.video = true;

		  var getMediaStub = sinon.stub(adaptor.mediaManager, "getMedia");
		  
		  await adaptor.mediaManager.switchDesktopCaptureWithCamera(streamId);

		  sinon.assert.calledWith(getMediaStub, shareMediaConstraint, streamId);
	    });
  
  it("stopScreenShareSystemAudioTrack", async function(){
	  var videoElement = document.createElement("video");

	  var streamId = "stream1";

	  var mediaConstraints = { video: "true", audio: "true" };

	  var adaptor = new WebRTCAdaptor({
		  websocketURL: "ws://example.com",
		  localVideoElement: videoElement,
		  initializeComponents: false,
		  mediaConstraints: mediaConstraints
	  });

	  const fakeStop = sinon.fake();

	  const screenShareAudioTrack = {
		  stop: fakeStop 
	  };

	  adaptor.mediaManager.screenShareAudioTrack = screenShareAudioTrack;
	  adaptor.mediaManager.stopScreenShareSystemAudioTrack();

	  expect(fakeStop.calledOnce).to.be.true;
	  expect(adaptor.mediaManager.screenShareAudioTrack).to.be.null;
	  
	  //check that there is no error when calling stop again
	  adaptor.mediaManager.stopScreenShareSystemAudioTrack();
		    
  });
  
  it("getMedia-stopScreenShareSystemAudioTrack", async function(){
	var adaptor = new WebRTCAdaptor({
	    websocketURL: "ws://example.com",
	  });

	  var mediaManager = new MediaManager({
	    userParameters: {
	      mediaConstraints: {
	        video: false,
	        audio: true,
	      },
		  publishMode: "screen",
	    },
	    webRTCAdaptor: adaptor,

	    callback: (info, obj) => {
	      adaptor.notifyEventListeners(info, obj)
	    },
	    callbackError: (error, message) => {
	      adaptor.notifyErrorEventListeners(error, message)
	    },
	    getSender: (streamId, type) => {
	      return adaptor.getSender(streamId, type)
	    },
	  });
	  
	  var stopScreenShareSystemAudioTrack = sinon.replace(mediaManager, "stopScreenShareSystemAudioTrack", sinon.fake());

	  var navigatorDisplayMedia = sinon.replace(mediaManager, "navigatorDisplayMedia", sinon.fake.returns(Promise.resolve({})));

	  var prepareStreamTracks = sinon.replace(mediaManager, "prepareStreamTracks", sinon.fake());

	  
	  await mediaManager.getMedia({video:true})
	  
	  
	  expect(stopScreenShareSystemAudioTrack.calledOnce).to.be.true;

	 
  });
  
  
  it("prepareStreamTracks-stopScreenShareSystemAudioTrack", async function(){
  var adaptor = new WebRTCAdaptor({
      websocketURL: "ws://example.com",
    });

    var mediaManager = new MediaManager({
      userParameters: {
        mediaConstraints: {
          video: false,
          audio: true,
        },
  	  publishMode: "screen",
      },
      webRTCAdaptor: adaptor,

      callback: (info, obj) => {
        adaptor.notifyEventListeners(info, obj)
      },
      callbackError: (error, message) => {
        adaptor.notifyErrorEventListeners(error, message)
      },
      getSender: (streamId, type) => {
        return adaptor.getSender(streamId, type)
      },
    });
    
    var stopScreenShareSystemAudioTrack = sinon.replace(mediaManager, "stopScreenShareSystemAudioTrack", sinon.fake());

    var navigatorDisplayMedia = sinon.replace(mediaManager, "navigatorDisplayMedia", sinon.fake.returns(Promise.resolve({})));

	var stream = new MediaStream();
    await mediaManager.prepareStreamTracks({video:true}, false, stream, "stream1");
    
    expect(stopScreenShareSystemAudioTrack.calledOnce).to.be.true;

   
  });
  
  it("testStopScreenShareSystemAudioTrackCalled", async function(){
	  var videoElement = document.createElement("video");

	  var streamId = "stream1";
	
	  var mediaConstraints = { video: "true", audio: "true" };
	
	  var adaptor = new WebRTCAdaptor({
		  websocketURL: "ws://example.com",
		  localVideoElement: videoElement,
		  initializeComponents: false,
		  mediaConstraints: mediaConstraints
	  });
	  

	  
	  
	 adaptor.mediaManager.secondaryAudioTrackGainNode = {}
	 
	 var stopScreenShareSystemAudioTrack = sinon.replace(adaptor.mediaManager, "stopScreenShareSystemAudioTrack", sinon.fake());
	 
	 let setGainNodeStream = sinon.replace(adaptor.mediaManager, "setGainNodeStream", sinon.fake());

	 let updateAudioTrack = sinon.replace(adaptor.mediaManager, "updateAudioTrack", sinon.fake());
	 
	 adaptor.mediaManager.setGainNodeandUpdateAudioTrack("streamId", {
			getAudioTracks:( )=> {
				return [1,2,3]
			},
		}, 	
		{
				video:true,
				audio:true
		},
		true,
			sinon.fake()
		);
	 
	 expect(stopScreenShareSystemAudioTrack.calledOnce).to.be.true;
	 
	 //call again 
	 adaptor.mediaManager.setGainNodeandUpdateAudioTrack("streamId", {
	 		getAudioTracks:( )=> {
	 			return [1,2,3]
	 		},
	 	}, 	
	 	{
	 			video:true,
	 			audio:true
	 	},
	 	false,
	 	sinon.fake()
	 	);
		
	//no further call because stopDesktop is false
	expect(stopScreenShareSystemAudioTrack.calledTwice).to.be.false;
	  
		  
  });


  describe("checkAndStopLocalVideoTrackOnAndroid", function () {

    let mediaManager;
    let mockLocalStream;

    beforeEach(function () {
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

    it("should not stop video track if local stream exists and is not Android", function () {
      const mockVideoTrack = {stop: sinon.fake()};
      mockLocalStream.getVideoTracks.returns([mockVideoTrack]);
      sinon.stub(window, 'isAndroid').returns(false);

      mediaManager.checkAndStopLocalVideoTrackOnAndroid();

      sinon.assert.notCalled(mockVideoTrack.stop);
    });

    it("should not stop video track if local stream does not exist", function () {
      mediaManager.localStream = null;

      mediaManager.checkAndStopLocalVideoTrackOnAndroid();

      sinon.assert.notCalled(mockLocalStream.getVideoTracks);
    });

  });

  describe("disableAudioLevelWhenMuted", function () {

    let mediaManager;
    let mockAudioStream;

    beforeEach(function () {
      mockAudioStream = {
        getTracks: sinon.stub()
      };

      mediaManager = new MediaManager({
        userParameters: {
          mediaConstraints: {
            video: false,
            audio: true,
          }
        },
        localStream: mockAudioStream
      });
    });

    it("should stop audio track and clear meter refresh when disableAudioLevelWhenMuted is called", function () {
      const mockAudioTrack = {stop: sinon.fake()};
      mockAudioStream.getTracks.returns([mockAudioTrack]);
      mediaManager.meterRefresh = setInterval(() => {}, 1000);
      mediaManager.mutedSoundMeter = {stop: sinon.fake()};

      mediaManager.disableAudioLevelWhenMuted();

      expect(mediaManager.meterRefresh).to.be.null;
    });

    it("should not stop audio track if local stream does not exist", function () {
      mediaManager.localStream = null;

      mediaManager.disableAudioLevelWhenMuted();

      sinon.assert.notCalled(mockAudioStream.getTracks);
    });

    it("should not stop audio track if audio track does not exist", function () {
      mockAudioStream.getTracks.returns([]);

      mediaManager.disableAudioLevelWhenMuted();

      sinon.assert.notCalled(mockAudioStream.getTracks);
    });

    it("should not stop mutedSoundMeter if it does not exist", function () {
      mediaManager.mutedSoundMeter = null;

      mediaManager.disableAudioLevelWhenMuted();

      expect(mediaManager.mutedSoundMeter).to.be.null;
    });

    it("should not clear meterRefresh if it does not exist", function () {
      mediaManager.meterRefresh = null;

      mediaManager.disableAudioLevelWhenMuted();

      expect(mediaManager.meterRefresh).to.be.null;
    });

  });

  it("fallbacks to audio-only when camera permission denied", async function () {
    var adaptor = new WebRTCAdaptor({
      websocketURL: "ws://example.com",
      initializeComponents: false,
      mediaConstraints: {
        video: true,
        audio: true
      }
    });

    // create a real audio track via WebAudio
    var audioContext = new (window.AudioContext || window.webkitAudioContext)();
    var oscillator = audioContext.createOscillator();
    oscillator.type = "sine";
    oscillator.frequency.value = 440;
    var destination = audioContext.createMediaStreamDestination();
    oscillator.connect(destination);
    oscillator.start();
    var audioTrack = destination.stream.getAudioTracks()[0];

    // stub getUserMedia: reject when video requested, resolve when audio-only
    var originalGetUserMedia = navigator.mediaDevices.getUserMedia;
    navigator.mediaDevices.getUserMedia = async (constraints) => {
      if (constraints && constraints.video !== false) {
        throw new DOMException("Permission denied", "NotAllowedError");
      }
      return new MediaStream([audioTrack]);
    };

    var fallbackEventFired = false;
    adaptor.addEventListener((info, obj) => {
      if (info === "audio_only_fallback") {
        fallbackEventFired = true;
      }
    });

    await adaptor.mediaManager.initLocalStream();

    expect(fallbackEventFired).to.be.true;
    expect(adaptor.mediaManager.localStream.getAudioTracks().length).to.be.equal(1);
    expect(adaptor.mediaManager.localStream.getVideoTracks().length).to.be.equal(0);

    navigator.mediaDevices.getUserMedia = originalGetUserMedia;
  });

  it("does not fallback when disabled and camera permission denied", async function () {
    var adaptor = new WebRTCAdaptor({
      websocketURL: "ws://example.com",
      initializeComponents: false,
      mediaConstraints: {
        video: true,
        audio: true
      },
      fallbackToAudioIfVideoPermissionDenied: false
    });

    var originalGetUserMedia = navigator.mediaDevices.getUserMedia;
    navigator.mediaDevices.getUserMedia = async (constraints) => {
      throw new DOMException("Permission denied", "NotAllowedError");
    };

    let failed = false;
    try {
      await adaptor.mediaManager.initLocalStream();
    } catch (e) {
      failed = true;
      expect(e.name).to.be.equal("NotAllowedError");
    }

    expect(failed).to.be.true;

    navigator.mediaDevices.getUserMedia = originalGetUserMedia;
  });

});
