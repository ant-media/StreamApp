
import { WebRTCAdaptor } from '../../../main/webapp/js/webrtc_adaptor.js';
import { MediaManager } from '../../../main/webapp/js/media_manager.js';

describe("MediaManager", function() {


	it("initLocalStreamWithAudio", async function() {

		var adaptor = new WebRTCAdaptor({
			 websocketURL: "ws://example.com",
		});

		var mediaManager = new MediaManager({
            userParameters: {
				mediaConstraints: {
					video:false,
					audio:true,
				}
			},
            webRTCAdaptor: adaptor,

            callback: (info, obj) => {
                this.notifyEventListeners(info, obj)
            },
            callbackError: (error, message) => {
                this.notifyErrorEventListeners(error, message)
            },
            getSender: (streamId, type) => {
                return this.getSender(streamId, type)
            },
        });

        await mediaManager.initLocalStream();

        expect(mediaManager.localStream.getAudioTracks().length).to.be.equal(1);
        expect(mediaManager.localStream.getVideoTracks().length).to.be.equal(0);



	});

    it("should change the local video element and set its srcObject to the local stream", function() {
        const mediaManager = new MediaManager({
            userParameters: {
                mediaConstraints: {
                    video: true,
                    audio: true,
                },
            },
            webRTCAdaptor: {},
            callback: () => {},
            callbackError: () => {},
            getSender: () => {},
        });

        const videoEl = document.createElement("video");
        mediaManager.changeLocalVideo(videoEl);

        expect(mediaManager.localVideo).to.equal(videoEl);
        expect(mediaManager.localVideo.srcObject).to.equal(null);

        const stream = new MediaStream();
        mediaManager.localStream = stream;
        mediaManager.changeLocalVideo(videoEl);

        expect(mediaManager.localVideo.srcObject).to.equal(stream);
    });


	it("getBlackVideoTrack", async function(){
		var adaptor = new WebRTCAdaptor({
			 websocketURL: "ws://example.com",
		});

		var mediaManager = new MediaManager({
            userParameters: {
				mediaConstraints: {
					video:false,
					audio:true,
				}
			},
            webRTCAdaptor: adaptor,

            callback: (info, obj) => {
                this.notifyEventListeners(info, obj)
            },
            callbackError: (error, message) => {
                this.notifyErrorEventListeners(error, message)
            },
            getSender: (streamId, type) => {
                return this.getSender(streamId, type)
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


	it("turnOnOffLocalCamera", async function(){

		var adaptor = new WebRTCAdaptor({
			 websocketURL: "ws://example.com",
			 initializeComponents:false,
			 mediaConstraints: {
					video:true,
					audio:true
			}
		});


        await adaptor.mediaManager.initLocalStream();

        expect(adaptor.mediaManager.localStream.getAudioTracks().length).to.be.equal(1);
        expect(adaptor.mediaManager.localStream.getVideoTracks().length).to.be.equal(1);

        expect(adaptor.mediaManager.blackVideoTrack).to.be.null;
        await adaptor.mediaManager.turnOffLocalCamera();

        expect(adaptor.mediaManager.blackVideoTrack).to.not.be.null;

        await adaptor.mediaManager.turnOnLocalCamera();
        expect(adaptor.mediaManager.blackVideoTrack).to.be.null;
        expect(adaptor.mediaManager.blackFrameTimer).to.be.null;

	});

    describe("prepareStreamTracks", function() {
        let mediaManager;
        let stream;
        let streamId;
        let mediaConstraints;
        let audioConstraint;
        let isInit;

        beforeEach(function() {
            mediaManager = new MediaManager({
                userParameters: {
                    mediaConstraints: {
                        video: true,
                        audio: true,
                    },
                },
                webRTCAdaptor: {},
                callback: () => {},
                callbackError: () => {},
                getSender: () => {},
            });

            stream = new MediaStream();
            streamId = "testStreamId";
            mediaConstraints = { video: true, audio: true };
            audioConstraint = true;
            isInit = true;

            mediaManager.navigatorUserMedia({ video: true, audio: true }, () => {}, () => {}).then((newStream) => {
                stream = newStream;
            });

            mediaManager.audioConstraint = true;
        });

        it("should update tracks if audio tracks exist and publish mode is camera and isInit is true", async function() {
            mediaManager.publishMode = "camera";
            mediaManager.audioConstraint = true;
            sinon.stub(mediaManager, "updateTracks");

            let audioConstraint = true;

            await mediaManager.prepareStreamTracks(mediaConstraints, audioConstraint, stream, streamId, isInit);

            sinon.assert.calledOnce(mediaManager.updateTracks);
        });

        /* TODO: Mocking MediaStreamTrack is not working properly, so this test is disabled for now.
        it("should remove audio track if audio tracks exist and publish mode is camera and isInit is false", async function() {
          mediaManager.publishMode = "camera";
          isInit = false;
          let audioTrack = sinon.stub(MediaStreamTrack);
          audioTrack.stop.returns(true);
          sinon.stub(audioTrack, "stop");
          sinon.stub(stream, "removeTrack");

          await mediaManager.prepareStreamTracks(mediaConstraints, audioConstraint, stream, streamId, isInit);

          sinon.assert.calledOnce(audioTrack.stop);
          sinon.assert.calledOnce(stream.removeTrack);
        });
         */

        it("should get audio stream and process it if audioConstraint is truthy", async function() {
            audioConstraint = { echoCancellation: true };
            let audioStream = new MediaStream();
            sinon.stub(mediaManager, "navigatorUserMedia").resolves(audioStream);
            sinon.stub(mediaManager, "processAudioStream");

            await mediaManager.prepareStreamTracks(mediaConstraints, audioConstraint, stream, streamId, isInit);

            sinon.assert.calledOnce(mediaManager.navigatorUserMedia);
            sinon.assert.calledOnce(mediaManager.processAudioStream);
        });

        it("should call gotStream if audioConstraint is falsy", async function() {
            audioConstraint = false;
            sinon.stub(mediaManager, "gotStream");

            await mediaManager.prepareStreamTracks(mediaConstraints, audioConstraint, stream, streamId, isInit);

            sinon.assert.calledOnce(mediaManager.gotStream);
        });

        it("should call handleError if getting audio stream fails", async function() {
            audioConstraint = { echoCancellation: true };
            const error = new Error("getUserMedia failed");
            sinon.stub(mediaManager, "navigatorUserMedia").rejects(error);
            sinon.stub(mediaManager, "handleError");

            await mediaManager.prepareStreamTracks(mediaConstraints, audioConstraint, stream, streamId, isInit);

            sinon.assert.calledOnce(mediaManager.navigatorUserMedia);
            sinon.assert.calledOnce(mediaManager.handleError);
        });
    });

    describe("handleScreenMode", function() {
        let mediaManager;
        let stream;
        let streamId;
        let audioStream;
        let audioTracks;

        beforeEach(function() {
          mediaManager = new MediaManager({
            userParameters: {
              mediaConstraints: {
                video: true,
                audio: true,
              },
            },
            webRTCAdaptor: {},
            callback: () => {},
            callbackError: () => {},
            getSender: () => {},
          });

          stream = new MediaStream();
          streamId = "testStreamId";
          audioStream = new MediaStream();
          let audioTrack = sinon.mock(MediaStreamTrack);
          audioTracks = [audioTrack, audioTrack];
        });

        it("should update video track and mix audio streams if audio tracks exist", async function() {
          sinon.stub(mediaManager, "updateVideoTrack").resolves();
          sinon.stub(mediaManager, "mixAudioStreams").returns(audioStream);
          sinon.stub(mediaManager, "updateAudioTrack").resolves();

          await mediaManager.handleScreenMode(audioStream, audioTracks, stream, streamId);

          sinon.assert.calledOnce(mediaManager.updateVideoTrack);
          sinon.assert.calledOnce(mediaManager.mixAudioStreams);
          sinon.assert.calledOnce(mediaManager.updateAudioTrack);
        });

        it("should update video track and update audio track if no audio tracks exist", async function() {
          audioTracks = [];

          sinon.stub(mediaManager, "updateVideoTrack").resolves();
          sinon.stub(mediaManager, "updateAudioTrack").resolves();

          await mediaManager.handleScreenMode(audioStream, audioTracks, stream, streamId);

          sinon.assert.calledOnce(mediaManager.updateVideoTrack);
          sinon.assert.calledOnce(mediaManager.updateAudioTrack);
        });
      });

    describe("handleScreenCameraMode", function() {
        let mediaManager;
        let stream;
        let streamId;
        let audioStream;
        let audioTracks;
        let onended;

        beforeEach(function() {
            mediaManager = new MediaManager({
                userParameters: {
                    mediaConstraints: {
                        video: true,
                        audio: true,
                    },
                },
                webRTCAdaptor: {},
                callback: () => {},
                callbackError: () => {},
                getSender: () => {},
            });

            stream = new MediaStream();
            streamId = "testStreamId";
            audioStream = new MediaStream();
            let audioTrack = sinon.mock(MediaStreamTrack);
            audioTracks = [audioTrack, audioTrack];
            onended = sinon.stub();
        });

        it("should mix audio streams and update audio and video tracks", async function() {
            sinon.stub(mediaManager, "mixAudioStreams").returns(audioStream);
            sinon.stub(mediaManager, "updateAudioTrack").resolves();
            sinon.stub(mediaManager, "setDesktopwithCameraSource").resolves();

            await mediaManager.handleScreenCameraMode(audioStream, audioTracks, stream, streamId, onended);

            sinon.assert.calledOnce(mediaManager.mixAudioStreams);
            sinon.assert.calledOnce(mediaManager.updateAudioTrack);
            sinon.assert.calledOnce(mediaManager.setDesktopwithCameraSource);
        });

        it("should not mix audio streams if no audio tracks exist", async function() {
            audioTracks = [];

            sinon.stub(mediaManager, "mixAudioStreams").resolves();
            sinon.stub(mediaManager, "updateAudioTrack").resolves();
            sinon.stub(mediaManager, "setDesktopwithCameraSource").resolves();

            await mediaManager.handleScreenCameraMode(audioStream, [], stream, streamId, onended);

            sinon.assert.notCalled(mediaManager.mixAudioStreams);
            sinon.assert.calledOnce(mediaManager.updateAudioTrack);
            sinon.assert.calledOnce(mediaManager.setDesktopwithCameraSource);
        });
    });

    describe("handleDefaultMode", function() {
        let mediaManager;
        let stream;
        let streamId;
        let audioStream;
        let audioTracks;
        let audioTrack;
        let audioConstraint;

        beforeEach(function() {
            mediaManager = new MediaManager({
                userParameters: {
                    mediaConstraints: {
                        video: true,
                        audio: true,
                    },
                },
                webRTCAdaptor: {},
                callback: () => {},
                callbackError: () => {},
                getSender: () => {},
            });

            stream = new MediaStream();
            streamId = "testStreamId";
            audioStream = new MediaStream();
            audioTrack = sinon.mock(MediaStreamTrack);
            audioTracks = [audioTrack, audioTrack];
            audioConstraint = true;
        });

        it("should add audio track to stream if audioConstraint is truthy", async function() {
            sinon.stub(audioStream, "getAudioTracks").returns([audioTrack]);
            sinon.stub(mediaManager, "updateTracks").resolves();
            sinon.stub(stream, "addTrack").resolves();

            await mediaManager.handleDefaultMode(audioConstraint, audioStream, audioTracks, stream, streamId);

            sinon.assert.calledOnce(audioStream.getAudioTracks);
            sinon.assert.calledWith(stream.addTrack, {});
            sinon.assert.calledOnce(mediaManager.updateTracks);
        });

        it("should not add audio track to stream if audioConstraint is falsy", async function() {
            audioConstraint = false;
            sinon.stub(audioStream, "getAudioTracks");
            sinon.stub(mediaManager, "updateTracks").resolves();
            sinon.stub(stream, "addTrack").resolves();

            await mediaManager.handleDefaultMode(audioConstraint, audioStream, audioTracks, stream, streamId);

            sinon.assert.notCalled(audioStream.getAudioTracks);
            sinon.assert.notCalled(stream.addTrack);
            sinon.assert.calledOnce(mediaManager.updateTracks);
        });
    });

    describe("updateTracks", function() {
        let mediaManager;
        let stream;
        let streamId;

        beforeEach(function() {
            mediaManager = new MediaManager({
                userParameters: {
                    mediaConstraints: {
                        video: true,
                        audio: true,
                    },
                },
                webRTCAdaptor: {},
                callback: () => {},
                callbackError: () => {},
                getSender: () => {},
            });

            stream = new MediaStream();
            streamId = "testStreamId";
        });

        it("should update video and audio tracks if video tracks exist", async function() {
            let videoTrack = sinon.mock(MediaStreamTrack);
            let audioTrack = sinon.mock(MediaStreamTrack);
            sinon.stub(stream, "getVideoTracks").returns([videoTrack]);
            sinon.stub(stream, "getAudioTracks").returns([audioTrack]);
            sinon.stub(mediaManager, "updateVideoTrack").resolves();
            sinon.stub(mediaManager, "updateAudioTrack").resolves();
            sinon.stub(mediaManager, "gotStream").resolves();

            await mediaManager.updateTracks(stream, streamId);

            sinon.assert.calledOnce(mediaManager.updateVideoTrack);
            sinon.assert.calledOnce(mediaManager.updateAudioTrack);
            sinon.assert.calledOnce(mediaManager.gotStream);
        });

        it("should update audio track if no video tracks exist", async function() {
            let audioTrack = sinon.mock(MediaStreamTrack);
            sinon.stub(stream, "getVideoTracks").returns([]);
            sinon.stub(stream, "getAudioTracks").returns([audioTrack]);
            sinon.stub(mediaManager, "updateVideoTrack").resolves();
            sinon.stub(mediaManager, "updateAudioTrack").resolves();
            sinon.stub(mediaManager, "gotStream").resolves();

            await mediaManager.updateTracks(stream, streamId);

            sinon.assert.notCalled(mediaManager.updateVideoTrack);
            sinon.assert.calledOnce(mediaManager.updateAudioTrack);
            sinon.assert.calledOnce(mediaManager.gotStream);
        });

        it("should call gotStream if no tracks exist", async function() {
            sinon.stub(stream, "getVideoTracks").returns([]);
            sinon.stub(stream, "getAudioTracks").returns([]);
            sinon.stub(mediaManager, "updateVideoTrack").resolves();
            sinon.stub(mediaManager, "updateAudioTrack").resolves();
            sinon.stub(mediaManager, "gotStream").resolves();

            await mediaManager.updateTracks(stream, streamId);

            sinon.assert.notCalled(mediaManager.updateVideoTrack);
            sinon.assert.notCalled(mediaManager.updateAudioTrack);
            sinon.assert.calledOnce(mediaManager.gotStream);
        });
    });

    describe("gotStream", function() {
        let mediaManager;
        let stream;
        let localVideo;

        beforeEach(function() {
            mediaManager = new MediaManager({
                userParameters: {
                    mediaConstraints: {
                        video: true,
                        audio: true,
                    },
                },
                webRTCAdaptor: {},
                callback: () => {},
                callbackError: () => {},
                getSender: () => {},
            });

            stream = new MediaStream();
            localVideo = document.createElement("video");
            sinon.stub(mediaManager, "getDevices");
            sinon.stub(mediaManager, "trackDeviceChange");
        });

        it("should set localStream and localVideo srcObject", function() {
            mediaManager.localVideo = localVideo;

            mediaManager.gotStream(stream);

            expect(mediaManager.localStream).to.equal(stream);
            expect(mediaManager.localVideo.srcObject).to.equal(stream);
        });

        it("should call getDevices and trackDeviceChange", function() {
            mediaManager.gotStream(stream);

            sinon.assert.calledOnce(mediaManager.getDevices);
            sinon.assert.calledOnce(mediaManager.trackDeviceChange);
        });

        it("should return a resolved promise", async function() {
            const result = await mediaManager.gotStream(stream);

            expect(result).to.be.undefined;
        });
    });

});
