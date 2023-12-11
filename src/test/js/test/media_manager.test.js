
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
	
	
    it("changeLocalVideo", async function(){
		
        var videoElement = document.createElement("video");
        videoElement.id="oldElement";
        var newVideoElement = document.createElement("video");
        newVideoElement.id="newElement"
        
		var adaptor = new WebRTCAdaptor({
			 websocketURL: "ws://example.com",
             localVideoElement : videoElement,
			 initializeComponents:false,
			 mediaConstraints: {
					video:true,
					audio:true
			}
		});
		  
        await adaptor.mediaManager.initLocalStream();
        adaptor.mediaManager.changeLocalVideo(newVideoElement);
        expect(adaptor.mediaManager.localVideo.id).to.be.equal(newVideoElement.id);
        expect(adaptor.mediaManager.localVideo.srcObject.id).to.be.equal(adaptor.mediaManager.localStream.id);


	});
    it("muteLocalMic", async function(){
		
		var adaptor = new WebRTCAdaptor({
			 websocketURL: "ws://example.com",
             localVideoElement : videoElement,
			 initializeComponents:false,
			 mediaConstraints: {
					video:true,
					audio:true
			}
		});
		  
        await adaptor.mediaManager.initLocalStream();
        adaptor.mediaManager.muteLocalMic();
        expect(adaptor.mediaManager.isMuted).to.be.equal(true);
        adaptor.mediaManager.localStream.getAudioTracks().forEach(track =>expect(track.enabled).to.be.equal(false));

	});
    it("unmuteLocalMic", async function(){
		
		var adaptor = new WebRTCAdaptor({
			 websocketURL: "ws://example.com",
             localVideoElement : videoElement,
			 initializeComponents:false,
			 mediaConstraints: {
					video:true,
					audio:true
			}
		});
		  
        await adaptor.mediaManager.initLocalStream();
        adaptor.mediaManager.unmuteLocalMic();
        expect(adaptor.mediaManager.isMuted).to.be.equal(false);
        adaptor.mediaManager.localStream.getAudioTracks().forEach(track =>expect(track.enabled).to.be.equal(true));

	});
    
});