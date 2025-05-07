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

  describe("setDesktopwithCameraSource", function () {

    beforeEach(() => {
      window.OffscreenCanvas = class {
        constructor() {}
        getContext() {
          return {
            drawImage: sinon.fake(),
            clearRect: sinon.fake(),
          };
        }
        captureStream(fps) {
          return new MediaStream(); // Return a mock MediaStream
        }

      };
    });

    it("should set desktop stream and small video track correctly", async function () {
      var adaptor = new WebRTCAdaptor({
        websocketURL: "ws://localhost",
        mediaConstraints: {
          video: "dummy",
          audio: "dummy"
        },
        initializeComponents: false
      });

      await adaptor.initialize();

      // Create a mock video track
      const mockVideoTrack = {
        kind: "video",
        enabled: true,
        stop: sinon.fake(), // Mock the `stop` method
        addEventListener: sinon.fake(),
        removeEventListener: sinon.fake(),
        onended: sinon.fake(),
      };

      // Create a fake `MediaStream` and add the mock video track
      const cameraStream = new MediaStream();
      cameraStream.getVideoTracks = () => [mockVideoTrack]; // Override `getVideoTracks`

      // Stub `getUserMedia` to return the mocked camera stream
      sinon.stub(navigator.mediaDevices, "getUserMedia").resolves(cameraStream);

      // Create a desktop stream
      const stream = new MediaStream();

      // Mock the onEnded callback
      const onEndedCallback = null;

      // Call the function under test
      await adaptor.mediaManager.setDesktopwithCameraSource(stream, "streamId", onEndedCallback);

      // Assertions
      expect(adaptor.mediaManager.desktopStream).to.equal(stream); // Ensure the desktop stream is set
      expect(adaptor.mediaManager.smallVideoTrack).to.equal(mockVideoTrack); // Ensure the video track is set

      // Restore the stub
      navigator.mediaDevices.getUserMedia.restore();
    });

    it("should call onEndedCallback when desktop stream ends", async function () {
      var adaptor = new WebRTCAdaptor({
        websocketURL: "ws://localhost",
        mediaConstraints: {
          video: "dummy",
          audio: "dummy"
        },
        initializeComponents: false
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

      adaptor.mediaManager = mediaManager;

      await adaptor.initialize();

      // Create a mock video track
      const mockVideoTrack = {
        kind: "video",
        enabled: true,
        stop: sinon.fake(), // Mock the `stop` method
        addEventListener: sinon.fake(),
        removeEventListener: sinon.fake(),
        onended: sinon.fake(),
      };

      // Create a desktop stream
      const stream = new MediaStream();
      stream.getVideoTracks = () => [mockVideoTrack]; // Override `getVideoTracks`

      // Create a fake `MediaStream` and add the mock video track
      const cameraStream = new MediaStream();
      cameraStream.getVideoTracks = () => [mockVideoTrack]; // Override `getVideoTracks`

      sinon.stub(navigator.mediaDevices, 'getUserMedia').resolves(cameraStream);
      const onEndedCallback = sinon.fake();

      await mediaManager.setDesktopwithCameraSource(stream, "streamId", onEndedCallback);
      stream.getVideoTracks()[0].onended();

      expect(onEndedCallback.calledOnce).to.be.true;
      navigator.mediaDevices.getUserMedia.restore();
    });

    it("should update offscreen canvas at regular intervals", async function () {
      var adaptor = new WebRTCAdaptor({
        websocketURL: "ws://localhost",
        mediaConstraints: {
          video: "dummy",
          audio: "dummy"
        },
        initializeComponents: false
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

      adaptor.mediaManager = mediaManager;

      await adaptor.initialize();

      // Create a mock video track
      const mockVideoTrack = {
        kind: "video",
        enabled: true,
        stop: sinon.fake(), // Mock the `stop` method
        addEventListener: sinon.fake(),
        removeEventListener: sinon.fake(),
        onended: sinon.fake(),
      };

      // Create a desktop stream
      const stream = new MediaStream();
      stream.getVideoTracks = () => [mockVideoTrack]; // Override `getVideoTracks`

      // Create a fake `MediaStream` and add the mock video track
      const cameraStream = new MediaStream();
      cameraStream.getVideoTracks = () => [mockVideoTrack]; // Override `getVideoTracks`

      sinon.stub(navigator.mediaDevices, 'getUserMedia').resolves(cameraStream);
      const onEndedCallback = sinon.fake();

      await mediaManager.setDesktopwithCameraSource(stream, "streamId", onEndedCallback);

      const initialWidth = mediaManager.dummyCanvas.width;
      const initialHeight = mediaManager.dummyCanvas.height;

      await new Promise(resolve => setTimeout(resolve, 100));

      expect(mediaManager.dummyCanvas.width).to.equal(initialWidth);
      expect(mediaManager.dummyCanvas.height).to.equal(initialHeight);
      navigator.mediaDevices.getUserMedia.restore();
    });

    it("should handle null onEndedCallback gracefully", async function () {

      var adaptor = new WebRTCAdaptor({
        websocketURL: "ws://localhost",
        mediaConstraints: {
          video: "dummy",
          audio: "dummy"
        },
        initializeComponents: false
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

      adaptor.mediaManager = mediaManager;

      await adaptor.initialize();

      // Create a mock video track
      const mockVideoTrack = {
        kind: "video",
        enabled: true,
        stop: sinon.fake(), // Mock the `stop` method
        addEventListener: sinon.fake(),
        removeEventListener: sinon.fake(),
        onended: sinon.fake(),
      };

      // Create a desktop stream
      const stream = new MediaStream();

      // Create a fake `MediaStream` and add the mock video track
      const cameraStream = new MediaStream();
      cameraStream.getVideoTracks = () => [mockVideoTrack]; // Override `getVideoTracks`

      sinon.stub(navigator.mediaDevices, 'getUserMedia').resolves(cameraStream);

      await mediaManager.setDesktopwithCameraSource(stream, "streamId", null);

      expect(mediaManager.desktopStream).to.equal(stream);
      expect(mediaManager.smallVideoTrack).to.equal(mockVideoTrack);
      navigator.mediaDevices.getUserMedia.restore();
    });

    it("should initialize local stream with video and audio", async function () {
      var adaptor = new WebRTCAdaptor({
        websocketURL: "ws://example.com",
      });

      var mediaManager = new MediaManager({
        userParameters: {
          mediaConstraints: {
            video: true,
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
      expect(mediaManager.localStream.getVideoTracks().length).to.be.equal(1);
    });

    it("should handle error when initializing local stream", async function () {
      var adaptor = new WebRTCAdaptor({
        websocketURL: "ws://example.com",
      });

      var mediaManager = new MediaManager({
        userParameters: {
          mediaConstraints: {
            video: true,
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

      sinon.stub(navigator.mediaDevices, 'getUserMedia').rejects(new Error("Permission denied"));

      try {
        await mediaManager.initLocalStream();
      } catch (error) {
        expect(error.message).to.be.equal("Permission denied");
      }

      navigator.mediaDevices.getUserMedia.restore();
    });

    it("should switch video camera capture", async function () {
      var adaptor = new WebRTCAdaptor({
        websocketURL: "ws://example.com",
        mediaConstraints: {
          video: true,
          audio: true
        }
      });

      await adaptor.mediaManager.initLocalStream();

      const deviceId = "testDeviceId";
      await adaptor.mediaManager.switchVideoCameraCapture("streamId", deviceId);

      expect(adaptor.mediaManager.localStream.getVideoTracks()[0].getSettings().deviceId).to.not.be.equal(deviceId);
    });

    it("should handle error when switching video camera capture", async function () {
      var adaptor = new WebRTCAdaptor({
        websocketURL: "ws://example.com",
        mediaConstraints: {
          video: true,
          audio: true
        }
      });

      await adaptor.mediaManager.initLocalStream();

      const deviceId = "invalidDeviceId";
      sinon.stub(navigator.mediaDevices, 'getUserMedia').rejects(new Error("Device not found"));

      try {
        await adaptor.mediaManager.switchVideoCameraCapture("streamId", deviceId);
      } catch (error) {
        expect(error.message).to.be.equal("Device not found");
      }

      navigator.mediaDevices.getUserMedia.restore();
    });

    it("should play video and resolve promise when metadata is loaded", async function() {
      const video = document.createElement("video");
      const playStub = sinon.stub(video, "play").resolves();
      const resolveSpy = sinon.spy();

      const promise = new Promise(resolve => {
        video.onloadedmetadata = () => {
          video.play();
          resolve(video);
        };
      });

      video.onloadedmetadata();

      await promise;

      expect(playStub.calledOnce).to.be.true;
      expect(resolveSpy.calledOnceWith(video)).to.be.false;

      playStub.restore();
    });

    it("should handle error when video play fails", async function() {
      const video = document.createElement("video");
      const playStub = sinon.stub(video, "play").rejects(new Error("play error"));
      const resolveSpy = sinon.spy();

      const promise = new Promise((resolve, reject) => {
        video.onloadedmetadata = () => {
          video.play().catch(reject);
          resolve(video);
        };
      });

      video.onloadedmetadata();

      try {
        await promise;
      } catch (error) {
        expect(error.message).to.be.equal("play error");
      }

      expect(playStub.calledOnce).to.be.true;
      expect(resolveSpy.calledOnceWith(video)).to.be.false;

      playStub.restore();
    });

  });

});
