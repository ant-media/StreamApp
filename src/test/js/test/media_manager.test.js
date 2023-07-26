
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
	
	
	
});