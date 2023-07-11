import "./external/selfie-segmentation/selfie_segmentation.js";
import {WebRTCAdaptor} from "./webrtc_adaptor.js";
import "./external/loglevel.min.js";

const Logger = window.log;
/**
 * This class is used to apply a video effect to the video stream.
 * It's compatible with Ant Media Server JavaScript SDK v2.5.2+
 *
 */
export class VideoEffect {
    static DEEPAR = "deepar";
    static VIRTUAL_BACKGROUND = "virtual-background";
    static BLUR_BACKGROUND = "blur-background";
    static NO_EFFECT = "no-effect";

    static deepARModelList = [
        'flower_face',
        'Ping_Pong'
    ];
    /**
     * @type {boolean}
     */
    static DEBUG = false;
    /**
     * LOCATE_FILE_URL is optional, it's to give locate url of selfie segmentation
     * If you would like to use CDN,
     * Give "https://cdn.jsdelivr.net/npm/@mediapipe/selfie_segmentation/"
     * or give local file relative path "./js/external/selfie-segmentation" according to your file
     */

        //static LOCATE_FILE_URL = "./js/external/selfie-segmentation";
    static LOCATE_FILE_URL = "https://cdn.jsdelivr.net/npm/@mediapipe/selfie_segmentation";

    static DEEP_AR_FOLDER_ROOT_URL = "https://cdn.jsdelivr.net/npm/deepar@4.0.3";

    static DEEP_AR_EFFECTS_URL = "../js/external/deepar-effects/";

    static DEEP_AR_EXTENSION = ".deepar";

    #virtualBackgroundImage = null;
    /**
     * 
     * @param {WebRTCAdaptor} webRTCAdaptor 
     */
    constructor(webRTCAdaptor) {
        this.webRTCAdaptor = webRTCAdaptor;

        this.selfieSegmentation = null;
        this.effectCanvas = null;
        this.ctx = null;
        this.rawLocalVideo = document.createElement('video');

        this.deepAR = null;

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
     * @param {MediaStream} stream - Original stream to be manipulated.
     * @returns {Promise<void>}
     */
    async init(stream) {
        await this.setRawLocalVideo(stream);

        let trackSettings = stream.getVideoTracks()[0].getSettings();
        this.effectCanvasFPS = trackSettings.frameRate;
        this.videoCallbackPeriodMs = 1000 / this.effectCanvasFPS;

        this.effectCanvas = this.createEffectCanvas(trackSettings.width, trackSettings.height);
        this.ctx = this.effectCanvas.getContext("2d");

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
     * This method is used to set raw local video.
     * @param {MediaStream} stream
     * @returns {Promise<void>}
     */
    setRawLocalVideo(stream) {
        this.rawLocalVideo.srcObject = stream;
        this.rawLocalVideo.muted = true;
        this.rawLocalVideo.autoplay = true;
        return this.rawLocalVideo.play();
    }

    /**
     * This method is used to create the canvas element which is used to apply the video effect.
     * @param {number} height
     * @param {number} width 
     */
    createEffectCanvas(width, height) {
        let effectCanvas = document.createElement('canvas');
        effectCanvas.id = "effectCanvas";
        effectCanvas.width = width;
        effectCanvas.height = height;
        return effectCanvas;
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
    /**
     * @param {HTMLElement} imageElement
     */
    set virtualBackgroundImage(imageElement) {
        this.#virtualBackgroundImage = imageElement;
    }

    startFpsCalculation() {
        this.statTimerId = setInterval(() => {
            var currentTime = new Date().getTime();
            var deltaTime = (currentTime - this.startTime) / 1000;
            this.startTime = currentTime;

            var fps = (this.renderedFrameCount - this.lastRenderedFrameCount) / deltaTime;
            this.renderedFrameCount = this.lastRenderedFrameCount;
            Logger.warn("Fps: " + fps + "fps");

        }, 1000);
    }

    stopFpsCalculation() {
        if (this.statTimerId !== -1) {
            clearInterval(this.statTimerId);
            this.statTimerId = -1;
        }
    }

    async processFrame() {

        await this.selfieSegmentation.send({image: this.rawLocalVideo});

        //call if the effect name is not NO_EFFECT
        if (this.effectName !== VideoEffect.NO_EFFECT) {
            setTimeout(() => {
                this.processFrame();
            }, this.videoCallbackPeriodMs);
        }
    }

    /**
     * Enable effect
     * @param {string} effectName
     * @param {string} deepARApiKey
     * @param {*} deepARModel
     */
    async enableEffect(effectName, deepARApiKey, deepARModel) {

        if (!this.isInitialized) {
            Logger.error("VideoEffect is not initialized!");
            return;
        }
        switch (effectName) {
            case VideoEffect.DEEPAR:
            case VideoEffect.VIRTUAL_BACKGROUND:
            case VideoEffect.BLUR_BACKGROUND:
            case VideoEffect.NO_EFFECT:
                break;
            default:
                Logger.warn("Unknown effect name please use the constants VideoEffect.VIRTUAL_BACKGROUND,VideoEffect.BLUR_BACKGROUND or VideoEffect.NO_EFFECT ");
                return;
        }
        var currentEffectName = this.effectName;
        this.effectName = effectName;

        if (currentEffectName === VideoEffect.DEEPAR && effectName !== VideoEffect.DEEPAR) {
            this.deepAR.shutdown();
            this.deepAR = null;
        }

        if (effectName === VideoEffect.VIRTUAL_BACKGROUND || effectName === VideoEffect.BLUR_BACKGROUND) {

            //check old effect name. If it's no effect, start the process
            if (currentEffectName === VideoEffect.NO_EFFECT || currentEffectName === VideoEffect.DEEPAR) {
                if (VideoEffect.DEBUG) {
                    this.startFpsCalculation();
                }
                //We cannot use the localStream of the webrtc adaptor because it's gets stopped when updateVideoTrack is called
                //get the video stream with current constraints and stop it when effects are disabled

                //audio:true makes the trick to play the video in the background as well otherwise it stops playing
                return navigator.mediaDevices.getUserMedia({
                    video: this.webRTCAdaptor.mediaConstraints.video,
                    audio: true
                }).then(localStream => {
                        return this.init(localStream).then(processedStream => {
                            return this.webRTCAdaptor.updateVideoTrack(processedStream, this.webRTCAdaptor.publishStreamId, null, true).then(() => {
                                    setTimeout(() => {
                                        this.processFrame();
                                    }, this.videoCallbackPeriodMs);
                                }
                            );
                        }).catch(err => {
                            //log and throw again to let the catch in the chain it
                            Logger.error(err);
                            throw err;
                        });
                    }
                );
            } else {
                return new Promise((resolve, reject) => {
                    resolve();
                });
            }
        } else if (effectName === VideoEffect.DEEPAR) {
            if (deepARApiKey === undefined || deepARApiKey === null || deepARApiKey === ""
                || deepARModel === undefined || deepARModel === null || deepARModel === "") {
                Logger.error("DeepAR API key or DeepAR Model is not set!");
                return;
            }
            if (currentEffectName === VideoEffect.DEEPAR) {
                this.deepAR.switchEffect(0, 'slot', VideoEffect.DEEP_AR_EFFECTS_URL + deepARModel + VideoEffect.DEEP_AR_EXTENSION);
                return;
            } else if (currentEffectName === VideoEffect.BLUR_BACKGROUND || currentEffectName === VideoEffect.VIRTUAL_BACKGROUND) {
                //Stop timer
                this.stopFpsCalculation();

                await this.#noEffect();
            }
            let canvas = this.createEffectCanvas(500, 500);
            let deepAR = new DeepAR({
                licenseKey: deepARApiKey,
                canvas: canvas,
                deeparWasmPath: VideoEffect.DEEP_AR_FOLDER_ROOT_URL + '/wasm/deepar.wasm',
                callbacks: {
                    onInitialize: function () {
                        deepAR.startVideo(true);
                    },
                }
            });
            this.deepAR = deepAR;
            this.deepAR.callbacks.onVideoStarted = () => {
                this.canvasStream = canvas.captureStream(30);
                this.webRTCAdaptor.updateVideoTrack(this.canvasStream, this.webRTCAdaptor.publishStreamId, null, true)
                this.deepAR.switchEffect(0, 'slot', VideoEffect.DEEP_AR_EFFECTS_URL + deepARModel + VideoEffect.DEEP_AR_EXTENSION);
            }
            this.deepAR.downloadFaceTrackingModel(VideoEffect.DEEP_AR_FOLDER_ROOT_URL + "/models/face/models-68-extreme.bin");
            this.deepAR.setVideoElement(this.rawLocalVideo, true);
        } else {
            if (currentEffectName === VideoEffect.DEEPAR) {
                let localStream = await navigator.mediaDevices.getUserMedia({
                    video: this.webRTCAdaptor.mediaConstraints.video,
                    audio: true
                });
                await this.setRawLocalVideo(localStream);
            }
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
     * @param {*} segmentation
     */
    drawSegmentationMask(segmentation) {
        this.ctx.drawImage(segmentation, 0, 0, this.effectCanvas.width, this.effectCanvas.height);
    }

    /**
     * This method is called by mediapipe when the segmentation mask is ready.
     * @param {*} results
     */
    onResults(results) {

        this.renderedFrameCount++;
        if (this.effectName == VideoEffect.BLUR_BACKGROUND) {
            this.drawBlurBackground(results.image, results.segmentationMask, this.backgroundBlurRange);
        } else if (this.effectName == VideoEffect.VIRTUAL_BACKGROUND) {
            this.drawVirtualBackground(results.image, results.segmentationMask, this.#virtualBackgroundImage);
        } else {
            this.drawImageDirectly(results.image);
        }
    }

    /**
     * This method is used to draw the raw frame directly to the canvas.
     * @param {*} image
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
     * @param {*} image
     * @param {*} segmentation
     * @param {*} virtualBackgroundImage
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
     * @param {*} image
     * @param {*} segmentation
     * @param {*} blurAmount
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

WebRTCAdaptor.register((webrtcAdaptorInstance) => {
    let videoEffect = new VideoEffect(webrtcAdaptorInstance);

    Object.defineProperty(webrtcAdaptorInstance, "enableEffect", {
        value: function (effectName, deepARApiKey, deepARModel) {
            return videoEffect.enableEffect(effectName, deepARApiKey, deepARModel);
        }
    });

    Object.defineProperty(webrtcAdaptorInstance, "setBackgroundImage", {
        value: function (imageElement) {
            videoEffect.virtualBackgroundImage = imageElement;
        }
    });

});
