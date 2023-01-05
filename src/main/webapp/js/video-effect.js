import "./external/selfie-segmentation/selfie_segmentation.js";

/**
 * This class is used to apply a video effect to the video stream.
 * It's compatible with Ant Media Server JavaScript SDK v2.5.2+
 */
export function VideoEffect() {
    this.isInitialized = false;
    this.selfieSegmentation = null;
    this.webRTCAdaptor = null;
    this.streamId = null;
    this.effectCanvas = null;
    this.ctx = null;
    this.isSelfieSegmentationLoaded = false;
    this.canvasStream = null;
    this.rawVideoStream = null;
    this.rawLocalVideo = null;
    this.virtualBackgroundImage = null;
    this.blurredEnabled = false;
    this.virtualBackgroundEnabled = false;
    this.backgroundBlurRange = 3;
    this.edgeBlurRange = 4;
    this.effectCanvasFPS = 20;

    /**
     * This method is used to initialize the video effect.
     * @param {WebRTCAdaptor} webRTCAdaptor - Ant Media Server JavaScript SDK instance
     * @param {string} streamId - Stream ID
     * @param {HTMLElement} virtualBackgroundImage - Element of virtual background image. You should set the image source before calling this method.
     * @param {HTMLElement} rawLocalVideo - Element of raw local video. It's used to keep the raw video stream.
     */
    this.init = function(webRTCAdaptor, streamId, virtualBackgroundImage, rawLocalVideo) {
        window.videoEffect = this;

        this.webRTCAdaptor = webRTCAdaptor;
        this.streamId = streamId;
        this.virtualBackgroundImage = virtualBackgroundImage;
        this.rawLocalVideo = rawLocalVideo;

        this.createEffectCanvas();
        this.initializeSelfieSegmentation();

        this.isInitialized = true;
    }

    /**
     * This method is used to create the canvas element which is used to apply the video effect.
     */
    this.createEffectCanvas = function() {
        this.effectCanvas = document.createElement('canvas');
        this.effectCanvas.id="effectCanvas";
        this.effectCanvas.width = 640;
        this.effectCanvas.height = 480;
        this.ctx = this.effectCanvas.getContext("2d");
    }

    /**
     * This method is used to initialize the selfie segmentation.
     */
    this.initializeSelfieSegmentation = function() {
        this.selfieSegmentation = new SelfieSegmentation({
            locateFile: (file) => {
                return `../js/external/selfie-segmentation/` + file;
            }
        });

        this.selfieSegmentation.setOptions({
            selfieMode: false, // true: selfie mode, false: portrait mode
            modelSelection: 1 // 0: General Model, 1: Landscape Model - We use Landscape Model for better performance
        });

        this.selfieSegmentation.onResults(this.onResults);

        this.isSelfieSegmentationLoaded = true;
        window.videoEffect.loadSelfieSegmentation();
    }

    /**
     * This method is used to activate the virtual background effect to the video stream.
     */
    this.enableVirtualBackground = function() {
        if (!this.isInitialized) {
            console.error("VideoEffect is not initialized!");
            return;
        }
        // if both virtual background and blur are disabled, set the canvas stream as custom video source
        if (!this.blurredEnabled && !this.virtualBackgroundEnabled) {
            this.setCanvasStreamAsCustomVideoSource();
        }
        this.blurredEnabled = false;
        this.virtualBackgroundEnabled = true;
    }

    /**
     * This method is used to activate the blur effect to the video stream.
     */
    this.enableBlur = function() {
        if (!this.isInitialized) {
            console.error("VideoEffect is not initialized!");
            return;
        }
        // if both virtual background and blur are disabled, set the canvas stream as custom video source
        if (!this.blurredEnabled && !this.virtualBackgroundEnabled) {
            this.setCanvasStreamAsCustomVideoSource();
        }
        this.blurredEnabled = true;
        this.virtualBackgroundEnabled = false;
    }

    /**
     * This method is used to disable the virtual background and blur effects.
     */
    this.removeEffect = function() {
        if (!this.isInitialized) {
            console.error("VideoEffect is not initialized!");
            return;
        }
        // if one of virtual background or blur is enabled, close the canvas stream
        if (this.blurredEnabled || this.virtualBackgroundEnabled) {
            this.webRTCAdaptor.closeCustomVideoSource(this.streamId).then(function() {
                window.videoEffect.canvasStream.getTracks().forEach(track => track.stop());
                window.videoEffect.canvasStream = null;
            });
        }
        this.blurredEnabled = false;
        this.virtualBackgroundEnabled = false;
    }

    /**
     * This method is used to prepare canvas stream and set the custom video source on Ant Media Server SDK.
     */
    this.setCanvasStreamAsCustomVideoSource = function() {
        if (this.isSelfieSegmentationLoaded) {
            this.playing();
            let newStream = new MediaStream();
            this.canvasStream = this.effectCanvas.captureStream(this.effectCanvasFPS);
            newStream.addTrack(this.canvasStream.getVideoTracks()[0]);
            if (this.rawVideoStream) {
                newStream.addTrack(this.rawVideoStream.getAudioTracks()[0]);
            }
            this.webRTCAdaptor.setCustomVideoSource(this.streamId, newStream);
        } else {
            // if mediapipe is not loaded, wait for 1 second and try again
            setTimeout(this.setCanvasStreamAsCustomVideoSource, 1000);
        }
    }

    /**
     * This method is used to prepare the raw video stream.
     */
    this.loadSelfieSegmentation = function() {
        if (videoEffect.rawVideoStream === null || videoEffect.rawLocalVideo.srcObject === null) {
            navigator.mediaDevices.getUserMedia({video: true, audio: true}).then(cameraStream => {
                window.videoEffect.rawVideoStream = cameraStream;
                window.videoEffect.rawLocalVideo.srcObject = cameraStream;
                window.videoEffect.rawLocalVideo.play();
            });
        }
        if (this.selfieSegmentation) return;
        this.playing();
    }

    /**
     * This method is used to send raw video stream to mediapipe.
     * @returns {Promise<void>}
     */
    this.playing = async function() {
        if (window.videoEffect.rawLocalVideo.readyState === window.videoEffect.rawLocalVideo.HAVE_ENOUGH_DATA
            && window.videoEffect.selfieSegmentation !== undefined) {
            await window.videoEffect.selfieSegmentation.send({image: window.videoEffect.rawLocalVideo});
        } else {
            setTimeout(window.videoEffect.playing, 100);
        }
    }

    /**
     * This method is used to draw the segmentation mask.
     * @param segmentation
     */
    this.drawSegmentationMask = function(segmentation) {
        this.ctx.drawImage(segmentation, 0, 0, this.effectCanvas.width, this.effectCanvas.height);
    }

    /**
     * This method is called by mediapipe when the segmentation mask is ready.
     * @param results
     */
    this.onResults = function(results) {
        window.videoEffect.runPostProcessing(
            results.image,
            results.segmentationMask,
            window.videoEffect.backgroundBlurRange
        );
        // if none of effects are enabled, stop sending image to selfie-segmentation
        if (window.videoEffect.blurredEnabled || window.videoEffect.virtualBackgroundEnabled) {
            setTimeout(window.videoEffect.playing, 100);
        }
    }

    this.runPostProcessing = function(image, segmentation, blurAmount) {
        if (this.blurredEnabled) {
            this.drawBlurBackground(image, segmentation, blurAmount);
        } else if (this.virtualBackgroundEnabled) {
            this.drawVirtualBackground(image, segmentation, this.virtualBackgroundImage);
        } else {
            this.drawImageDirectly(image);
        }
    }

    /**
     * This method is used to draw the raw frame directly to the canvas.
     * @param image
     */
    this.drawImageDirectly = function(image) {
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
    this.drawVirtualBackground = function(image, segmentation, virtualBackgroundImage) {
        this.ctx.save();
        this.ctx.filter = "none";
        this.ctx.clearRect(0, 0, this.effectCanvas.width, this.effectCanvas.height);
        this.ctx.drawImage(segmentation, 0, 0, this.effectCanvas.width, this.effectCanvas.height);
        this.ctx.globalCompositeOperation = 'source-out';
        this.ctx.drawImage(virtualBackgroundImage, 0, 0, virtualBackgroundImage.width, virtualBackgroundImage.height, 0, 0, this.effectCanvas.width, this.effectCanvas.height);
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
    this.drawBlurBackground = function(image, segmentation, blurAmount) {
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