
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

});
