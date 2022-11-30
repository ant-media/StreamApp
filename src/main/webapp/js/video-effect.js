import "./external/selfie-segmentation/selfie_segmentation.js";

export function VideoEffect() {
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

    this.init = function(webRTCAdaptor, streamId, virtualBackgroundImage) {
        window.videoEffect = this;
        this.webRTCAdaptor = webRTCAdaptor;
        this.streamId = streamId;
        this.virtualBackgroundImage = virtualBackgroundImage;

        this.effectCanvas = document.createElement('canvas');
        this.effectCanvas.id="effectCanvas";
        this.effectCanvas.width = 640;
        this.effectCanvas.height = 480;
        this.ctx = this.effectCanvas.getContext("2d");

        this.rawLocalVideo = document.getElementById("rawLocalVideo");

        this.selfieSegmentation = new SelfieSegmentation({
            locateFile: (file) => {
                return `js/external/selfie-segmentation/` + file;
            }
        });
        this.selfieSegmentation.setOptions({
            selfieMode: false,
            modelSelection: 1,
            effect: "background"
        });
        this.selfieSegmentation.onResults(this.onResults);

        this.playing();
        this.isSelfieSegmentationLoaded = true;
        window.videoEffect.loadMediapipe();
    }

    this.enableVirtualBackground = function() {
        // if both virtual background and blur are disabled, set the canvas stream as custom video source
        if (!this.blurredEnabled && !this.virtualBackgroundEnabled) {
            this.setCanvasStreamAsCustomVideoSource();
        }
        this.blurredEnabled = false;
        this.virtualBackgroundEnabled = true;
    }

    this.enableBlur = function() {
        // if both virtual background and blur are disabled, set the canvas stream as custom video source
        if (!this.blurredEnabled && !this.virtualBackgroundEnabled) {
            this.setCanvasStreamAsCustomVideoSource();
        }
        this.blurredEnabled = true;
        this.virtualBackgroundEnabled = false;
    }

    this.removeEffect = function() {
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

    this.setCanvasStreamAsCustomVideoSource = function() {
        if (this.isSelfieSegmentationLoaded) {
            this.playing();
            let newStream = new MediaStream();
            this.canvasStream = this.effectCanvas.captureStream(20);
            newStream.addTrack(this.canvasStream.getVideoTracks()[0]);
            if (this.rawVideoStream) {
                newStream.addTrack(this.rawVideoStream.getAudioTracks()[0]);
            }
            this.webRTCAdaptor.setCustomVideoSource(this.streamId, newStream);
        } else {
            setTimeout(this.setCanvasStreamAsCustomVideoSource, 1000);
        }
    }

    this.loadMediapipe = function() {
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

    this.playing = async function() {
        if (window.videoEffect.rawLocalVideo.readyState === window.videoEffect.rawLocalVideo.HAVE_ENOUGH_DATA
            && window.videoEffect.selfieSegmentation !== undefined) {
            await window.videoEffect.selfieSegmentation.send({image: window.videoEffect.rawLocalVideo});
        } else {
            setTimeout(window.videoEffect.playing, 100);
        }
    }

    this.drawSegmentationMask = function(segmentation) {
        this.ctx.drawImage(segmentation, 0, 0, this.effectCanvas.width, this.effectCanvas.height);
    }

    this.onResults = function(results) {
        window.videoEffect.runPostProcessing(
            results.image,
            results.segmentationMask,
            window.videoEffect.backgroundBlurRange
        );
        // if none of effects are enabled, stop sending image to sefie-segmentation
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

    this.drawImageDirectly = function(image) {
        this.ctx.save();
        this.ctx.globalCompositeOperation = "source-over";
        this.ctx.filter = "none";
        this.ctx.drawImage(image, 0, 0, image.width, image.height);
        this.ctx.restore();
    }

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

    this.drawBlurBackground = function(image, segmentation, blurAmount) {
        this.ctx.clearRect(0, 0, this.effectCanvas.width, this.effectCanvas.height);

        this.ctx.globalCompositeOperation = "copy";
        this.ctx.filter = "none";

        this.ctx.filter = "blur(" + this.edgeBlurRange + "px)";
        this.drawSegmentationMask(segmentation);
        this.ctx.globalCompositeOperation = "source-in";
        this.ctx.filter = "none";

        this.ctx.drawImage(image, 0, 0, this.effectCanvas.width, this.effectCanvas.height);

        this.blurBackground(image, blurAmount);

        this.ctx.restore();
    }

    this.blurBackground = function(image, blurAmount) {
        this.ctx.globalCompositeOperation = "destination-over";
        this.ctx.filter = "blur(" + blurAmount + "px)";
        this.ctx.drawImage(image, 0, 0, this.effectCanvas.width, this.effectCanvas.height);
    }

}