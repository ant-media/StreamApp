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

});
