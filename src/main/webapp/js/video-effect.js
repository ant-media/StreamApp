import "./external/selfie-segmentation/selfie_segmentation.js";
import { WebRTCAdaptor } from "./webrtc_adaptor.js";

/**
 * This class is used to apply a video effect to the video stream.
 * It's compatible with Ant Media Server JavaScript SDK v2.5.2+
 * 
 */
export class VideoEffect
{    
    static VIRTUAL_BACKGROUND = "virtual-background";
    static BLUR_BACKGROUND = "blur-background";
    static NO_EFFECT = "no-effect";

    static DEBUG = false;
    /**
     * LOCATE_FILE_URL is optional, it's to give locate url of selfie segmentation
     * If you would like to use CDN, 
     * Give "https://cdn.jsdelivr.net/npm/@mediapipe/selfie_segmentation/"
     * or give local file relative path "./js/external/selfie-segmentation" according to your file
     */
     
    //static LOCATE_FILE_URL = "./js/external/selfie-segmentation";
    static LOCATE_FILE_URL = "https://cdn.jsdelivr.net/npm/@mediapipe/selfie_segmentation";

    #virtualBackgroundImage = null;

    constructor(webRTCAdaptor) 
    {
        this.webRTCAdaptor = webRTCAdaptor;
       
        this.selfieSegmentation = null;
        this.effectCanvas = null;
        this.ctx = null;
        this.rawLocalVideo = document.createElement('video');
       
        this.backgroundBlurRange = 3;
        this.edgeBlurRange = 4;
       
        this.effectName = VideoEffect.NO_EFFECT;

        this.startTime = 0;

        this.statTimerId = -1;

        this.renderedFrameCount = 0;
        this.lastRenderedFrameCount = 0;
        this.effectCanvasFPS = 0;
        this.videoCallbackPeriodMs = 0;

        this.initializeSelfieSegmentation();
        this.isInitialized = true;
       
    }

     /**
     * This method is used to initialize the video effect.
     * @param {HTMLElement} stream - Original stream to be manipulated.
     */
    init(stream) {
        this.rawLocalVideo.srcObject = stream;
        this.rawLocalVideo.muted = true;
        this.rawLocalVideo.autoplay = true;
        this.rawLocalVideo.play();
       
        let trackSettings = stream.getVideoTracks()[0].getSettings();
        this.effectCanvasFPS = trackSettings.frameRate;
        this.videoCallbackPeriodMs = 1000/this.effectCanvasFPS;

        this.createEffectCanvas(trackSettings.width, trackSettings.height);
        if (this.canvasStream) {
            this.canvasStream.getTracks().forEach((track) => track.stop());
            this.canvasStream = null;
        }
        this.canvasStream = this.effectCanvas.captureStream(this.effectCanvasFPS);        
        return new Promise((resolve, reject) => {
			resolve(this.canvasStream);
		})
    }

    /**
     * This method is used to create the canvas element which is used to apply the video effect.
     */
    createEffectCanvas(width, height) {
        this.effectCanvas = document.createElement('canvas');
        this.effectCanvas.id="effectCanvas";
        this.effectCanvas.width = width;
        this.effectCanvas.height = height;
        this.ctx = this.effectCanvas.getContext("2d");
        return this.effectCanvas;
    }

    /**
     * This method is used to initialize the selfie segmentation.
     */
    initializeSelfieSegmentation() {
        this.selfieSegmentation = new SelfieSegmentation({
            locateFile: (file) => {
                return VideoEffect.LOCATE_FILE_URL + "/" + file;
            }
        });

        this.selfieSegmentation.setOptions({
            selfieMode: false, // true: selfie mode, false: portrait mode
            modelSelection: 1 // 0: General Model, 1: Landscape Model - We use Landscape Model for better performance
        });

        this.selfieSegmentation.onResults((results) => {
            this.onResults(results);
        });

    }

    set virtualBackgroundImage(imageElement) {
        this.#virtualBackgroundImage = imageElement;
    }

    startFpsCalculation() {
        this.statTimerId = setInterval(()=> {
            var currentTime = new Date().getTime();
            var deltaTime = (currentTime - this.startTime) / 1000;
            this.startTime = currentTime;

            var fps = ( this.renderedFrameCount -  this.lastRenderedFrameCount) / deltaTime;
            this.renderedFrameCount = this.lastRenderedFrameCount;
            console.log("Fps: " + fps + "fps");

        }, 1000);
    }

    stopFpsCalculation() {
        if (this.statTimerId != -1) 
        {
            clearInterval(this.statTimerId);
            this.statTimerId = -1;
        }
    }

    async processFrame() 
    {    
        
        await this.selfieSegmentation.send({image: this.rawLocalVideo});
        
        //call if the effect name is not NO_EFFECT
        if (this.effectName != VideoEffect.NO_EFFECT) 
        {
            setTimeout(()=> {
                this.processFrame();
            }, this.videoCallbackPeriodMs);
        }        
    }

    /**
     * Enable effect 
     * @param {} effectName 
     */
    enableEffect(effectName) {
        
        if (!this.isInitialized) {
            console.error("VideoEffect is not initialized!");
            return;
        }
        switch (effectName) {
            case VideoEffect.VIRTUAL_BACKGROUND:
            case VideoEffect.BLUR_BACKGROUND:
            case VideoEffect.NO_EFFECT:
            break;
            default:
                console.warn("Unknown effect name please use the constants VideoEffect.VIRTUAL_BACKGROUND,VideoEffect.BLUR_BACKGROUND or VideoEffect.NO_EFFECT ");
                return;
        }
        var currentEffectName =  this.effectName;
        this.effectName = effectName;
        if (effectName == VideoEffect.VIRTUAL_BACKGROUND || effectName == VideoEffect.BLUR_BACKGROUND) {
            
            //check old effect name. If it's no effect, start the process
            if (currentEffectName == VideoEffect.NO_EFFECT) 
            {
                if (VideoEffect.DEBUG) 
                {
                    this.startFpsCalculation();      
                }
                //We cannot use the localStream of the webrtc adaptor because it's gets stopped when updateVideoTrack is called
                //get the video stream with current constraints and stop it when effects are disabled 

                //audio:true makes the trick to play the video in the background as well otherwise it stops playing
                return navigator.mediaDevices.getUserMedia({video:this.webRTCAdaptor.mediaConstraints.video, audio:true}).then(localStream => 
                {
                    return this.init(localStream).then(processedStream => 
                    {
                        return this.webRTCAdaptor.updateVideoTrack(processedStream, this.webRTCAdaptor.publishStreamId, null, true).then(() => 
                            {
                                setTimeout(()=> {
                                    this.processFrame();
                                }, this.videoCallbackPeriodMs);
                            }
                        );
                    }).catch(err => {
                        //log and throw again to let the catch in the chain it
                        console.error(err);
                        throw err;
                    });
                }
                );
            }
            else {
                return new Promise((resolve, reject) => {
                    resolve();
                });
            }
        }
        else {
            
            return new Promise((resolve, reject) => {
                //Stop timer
                this.stopFpsCalculation();
            
                this.#noEffect();
                resolve();
            })
        }
    }

    /**
     * This method is used to disable the virtual background and blur effects.
     */
    #noEffect() {

        this.rawLocalVideo.pause();
        if (this.canvasStream != null) {
            this.canvasStream.getVideoTracks().forEach(track => track.stop());
        }
        
        return this.webRTCAdaptor.switchVideoCameraCapture(this.webRTCAdaptor.publishStreamId);
    }


    /**
     * This method is used to draw the segmentation mask.
     * @param segmentation
     */
    drawSegmentationMask(segmentation) {
        this.ctx.drawImage(segmentation, 0, 0, this.effectCanvas.width, this.effectCanvas.height);
    }

    /**
     * This method is called by mediapipe when the segmentation mask is ready.
     * @param results
     */
    onResults(results) {
       
        this.renderedFrameCount++;
        if (this.effectName == VideoEffect.BLUR_BACKGROUND) {
            this.drawBlurBackground(results.image, results.segmentationMask, this.backgroundBlurRange);
        } 
        else if (this.effectName == VideoEffect.VIRTUAL_BACKGROUND) {
            this.drawVirtualBackground(results.image, results.segmentationMask, this.#virtualBackgroundImage);
        } 
        else {
            this.drawImageDirectly(results.image);
        }       
    }

    /**
     * This method is used to draw the raw frame directly to the canvas.
     * @param image
     */
    drawImageDirectly(image) {
        this.ctx.save();
        this.ctx.globalCompositeOperation = "source-over";
        this.ctx.filter = "none";
        this.ctx.drawImage(image, 0, 0, image.width, image.height);
        this.ctx.restore();
    }

    /**
     * This method is used to draw the frame with virtual background effect to the canvas.
     * @param image
     * @param segmentation
     * @param virtualBackgroundImage
     */
    drawVirtualBackground(image, segmentation, virtualBackgroundImage) {
        this.ctx.save();
        this.ctx.filter = "none";
        this.ctx.clearRect(0, 0, this.effectCanvas.width, this.effectCanvas.height);
        this.ctx.drawImage(segmentation, 0, 0, this.effectCanvas.width, this.effectCanvas.height);
        this.ctx.globalCompositeOperation = 'source-out';
        this.ctx.drawImage(virtualBackgroundImage, 0, 0, virtualBackgroundImage.naturalWidth, virtualBackgroundImage.naturalHeight, 0, 0, this.effectCanvas.width, this.effectCanvas.height);
        this.ctx.globalCompositeOperation = 'destination-atop';
        this.ctx.drawImage(image, 0, 0, this.effectCanvas.width, this.effectCanvas.height);
        this.ctx.restore();
    }

    /**
     * This method is used to draw frame with background blur effect to the canvas.
     * @param image
     * @param segmentation
     * @param blurAmount
     */
    drawBlurBackground(image, segmentation, blurAmount) {
        this.ctx.clearRect(0, 0, this.effectCanvas.width, this.effectCanvas.height);

        this.ctx.globalCompositeOperation = "copy";
        this.ctx.filter = "none";

        this.ctx.filter = "blur(" + this.edgeBlurRange + "px)";
        this.drawSegmentationMask(segmentation);
        this.ctx.globalCompositeOperation = "source-in";
        this.ctx.filter = "none";

        this.ctx.drawImage(image, 0, 0, this.effectCanvas.width, this.effectCanvas.height);

        this.ctx.globalCompositeOperation = "destination-over";
        this.ctx.filter = "blur(" + blurAmount + "px)";
        this.ctx.drawImage(image, 0, 0, this.effectCanvas.width, this.effectCanvas.height);

        this.ctx.restore();
    }

}

WebRTCAdaptor.register((webrtcAdaptorInstance) => 
{
    let videoEffect = new VideoEffect(webrtcAdaptorInstance);

    Object.defineProperty(webrtcAdaptorInstance, "enableEffect", {
        value: function(effectName) {
            return videoEffect.enableEffect(effectName);
        }
    });

    Object.defineProperty(webrtcAdaptorInstance, "setBackgroundImage", {
        value: function(imageElement) {
            videoEffect.virtualBackgroundImage = imageElement;
        }
    });

});

