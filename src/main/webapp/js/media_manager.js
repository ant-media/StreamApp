import {SoundMeter} from "./soundmeter.js"
import "./external/loglevel.min.js";

const Logger = window.log;
/**
 * Media management class is responsible to manage audio and video
 * sources and tracks management for the local stream.
 * Also audio and video properties (like bitrate) are managed by this class .
 */
export class MediaManager {
    /**
     * 
     * @param {object} initialValues 
     */
    constructor(initialValues) {
        /**
         * the maximum bandwith value that browser can send a stream
         * keep in mind that browser may send video less than this value
         */
        this.bandwidth = 1200; //kbps

        /**
         * This flags enables/disables debug logging
         */
        this.debug = false;

        /**
         * The cam_location below is effective when camera and screen is send at the same time.
         * possible values are top and bottom. It's on right all the time
         */
        this.camera_location = "top"

        /**
         * The cam_margin below is effective when camera and screen is send at the same time.
         * This is the margin value in px from the edges
         */
        this.camera_margin = 15;

        /**
         * this camera_percent is how large the camera view appear on the screen. It's %15 by default.
         */
        this.camera_percent = 15;

        /**
         * initial media constraints provided by the user
         */
        this.mediaConstraints = {
            video: true,
            audio: true
        };
        ;

        /**
         * this is the callback function to get video/audio sender from WebRTCAdaptor
         */
        this.getSender = initialValues.getSender;

        /**
         * This is the Stream Id for the publisher.
         */
        this.publishStreamId = null;

        /**
         * this is the object of the local stream to publish
         * it is initiated in initLocalStream method
         */
        this.localStream = null;

        /**
         * publish mode is determined by the user and set by @mediaConstraints.video
         * It may be camera, screen, screen+camera
         */
        this.publishMode = "camera"; //screen, screen+camera

        /**
         * Default callback. It's overriden below if it exists
         */
        this.callback = (info, obj) => {
            Logger.debug("Callback info: " + info + " object: " + typeof obj !== undefined ? JSON.stringify(obj) : "");
		};

		/**
		 * Default callback error implementation. It's overriden below if it exists
		 */
		this.callbackError = (err) => {
            Logger.error(err)
		}

        /**
         * The values of the above fields are provided as user parameters by the constructor.
         * TODO: Also some other hidden parameters may be passed here
         */
        for (var key in initialValues.userParameters) {
            if (initialValues.userParameters.hasOwnProperty(key)) {
                this[key] = initialValues.userParameters[key];
            }
        }

        /**
         * current volume value which is set by the user
         */
        this.currentVolume = null;

        /**
         * Keeps the audio track to be closed in case of audio track change
         */
        this.previousAudioTrack = null;
        
        /**
		 * silent audio track for switching between dummy track to real tracks on the fly
		 */
		this.silentAudioTrack = null;

        /**
         * The screen video track in screen+camera mode
         */
        this.desktopStream = null;


        /**
         * The camera (overlay) video track in screen+camera mode
         */
        this.smallVideoTrack = null;
        
        /**
		 * black video track for switching between dummy video track to real tracks on the fly
		 */
		this.blackVideoTrack = null;

        /**
         * Audio context to use for meter, mix, gain
         */
        this.audioContext = new AudioContext();
        
        /**
		 * osciallator to generate silent audio
		 */
        this.oscillator = null;

        /**
         * the main audio in single audio case
         * the primary audio in mixed audio case
         *
         * its volume can be controled
         */
        this.primaryAudioTrackGainNode = null;

        /**
         * the secondary audio in mixed audio case
         *
         * its volume can be controled
         */
        this.secondaryAudioTrackGainNode = null;


        /**
         * this is the sound meter object for the local stream
         */
        this.localStreamSoundMeter = null;

        /**
         * this is the level callback for sound meter object
         */
        this.levelCallback = null;

        /**
         * Timer to create black frame to publish when video is muted
         */
        this.blackFrameTimer = null;

        /**
         * Timer to draw camera and desktop to canvas
         */
        this.desktopCameraCanvasDrawerTimer = null;

        /**
         * For audio check when the user is muted itself.
         * Check enableAudioLevelWhenMuted
         */
        this.mutedAudioStream = null;

        /**
         * This flag is the status of audio stream
         * Checking when the audio stream is updated
         */
        this.isMuted = false;

        /**
         * meter refresh period for "are you talking?" check
         */
        this.meterRefresh = null;

        /**
         * For keeping track of whether user turned off the camera
         */
        this.cameraEnabled = true;
        
        
        /**
         * Replacement stream for video track when the camera is turn off
		 */
        this.replacementStream = null;

        /**
         * html video element that presents local stream
         */
        this.localVideo = this.localVideoElement || document.getElementById(this.localVideoId);

        //A dummy stream created to replace the tracks when camera is turned off.
        this.dummyCanvas = document.createElement("canvas");

        // It should be compatible with previous version
        if (this.mediaConstraints) {
            if (this.mediaConstraints.video == "camera") {
                this.publishMode = "camera";
            } else if (this.mediaConstraints.video == "screen") {
                this.publishMode = "screen";
            } else if (this.mediaConstraints.video == "screen+camera") {
                this.publishMode = "screen+camera";
            }
        } else {
            //just define default values
            this.mediaConstraints = {video: true, audio: true};
        }

        //Check browser support for screen share function
        this.checkBrowserScreenShareSupported();
    }

    /**
     * Called by the WebRTCAdaptor at the start if it isn't play mode
     */
    initLocalStream() {
        this.checkWebRTCPermissions();
        if (typeof this.mediaConstraints.video != "undefined" && this.mediaConstraints.video != false) 
        {
            return this.openStream(this.mediaConstraints);
        } 
        else if (typeof this.mediaConstraints.audio != "undefined" && this.mediaConstraints.audio != false) 
        {
            // get only audio
            var media_audio_constraint = {audio: this.mediaConstraints.audio};
            return this.navigatorUserMedia(media_audio_constraint, stream => {
                return this.gotStream(stream);
            }, true)
        } else {
            //neither video nor audio is requested
            //just return null stream
            Logger.debug("no media requested, just return an empty stream");
            return new Promise((resolve, reject) => {
                resolve(null);
            });
        }

    }

    /*
    * Called to checks if Websocket and media usage are allowed
    */
    checkWebRTCPermissions() {
        if (!("WebSocket" in window)) {
            Logger.debug("WebSocket not supported.");
            this.callbackError("WebSocketNotSupported");
            return;
        }

        if (typeof navigator.mediaDevices == "undefined") {
            Logger.debug("Cannot open camera and mic because of unsecure context. Please Install SSL(https)");
            this.callbackError("UnsecureContext");
            return;
        }
        if (typeof navigator.mediaDevices == "undefined" || navigator.mediaDevices == undefined || navigator.mediaDevices == null) {
            this.callbackError("getUserMediaIsNotAllowed");
        }
    }

    /*
     * Called to get the available video and audio devices on the system
     */
    getDevices() {
        return navigator.mediaDevices.enumerateDevices().then(devices => {
            var deviceArray = new Array();
            let checkAudio = false
            let checkVideo = false
            devices.forEach(device => {
                if (device.kind == "audioinput" || device.kind == "videoinput") {
                    deviceArray.push(device);
                    if (device.kind == "audioinput") {
                        checkAudio = true;
                    }
                    if (device.kind == "videoinput") {
                        checkVideo = true;
                    }
                }
            });
            this.callback("available_devices", deviceArray);

            //TODO: is the following part necessary. why?
            if (checkAudio == false && this.localStream == null) {
                Logger.debug("Audio input not found")
                Logger.debug("Retrying to get user media without audio")
                if (this.inputDeviceNotFoundLimit < 2) {
                    if (checkVideo != false) {
                        this.openStream({video: true, audio: false})
                        this.inputDeviceNotFoundLimit++;
                    } else {
                        Logger.debug("Video input not found")
                        alert("There is no video or audio input")
                    }
                } else {
                    alert("No input device found, publish is not possible");
                }
            }
            return deviceArray;
        }).catch(err => {
            Logger.error("Cannot get devices -> error name: " + err.name + ": " + err.message);
            throw err;
        });
    }

    /*
     * Called to add a device change listener
     */
    trackDeviceChange() {
        navigator.mediaDevices.ondevicechange = () => {
            this.getDevices();
        }
    }

    /**
     * This function create a canvas which combines screen video and camera video as an overlay
     *
     * @param {*} stream : screen share stream
     * @param {*} streamId
     * @param {*} onEndedCallback : callback when called on screen share stop
     */
    setDesktopwithCameraSource(stream, streamId, onEndedCallback) {
        this.desktopStream = stream;
        return this.navigatorUserMedia({video: true, audio: false}, cameraStream => {
            this.smallVideoTrack = cameraStream.getVideoTracks()[0];

            //create a canvas element
            var canvas = document.createElement("canvas");
            var canvasContext = canvas.getContext("2d");

            //create video element for screen
            //var screenVideo = document.getElementById('sourceVideo');
            var screenVideo = document.createElement('video');

            screenVideo.srcObject = stream;
            screenVideo.play();
            //create video element for camera
            var cameraVideo = document.createElement('video');

            cameraVideo.srcObject = cameraStream;
            cameraVideo.play();
            var canvasStream = canvas.captureStream(15);

            if (onEndedCallback != null) {
                stream.getVideoTracks()[0].onended = function (event) {
                    onEndedCallback(event);
                }
            }
            var promise;
            if (this.localStream == null) {
                promise = this.gotStream(canvasStream);
            } else {
                promise = this.updateVideoTrack(canvasStream, streamId, onended, null);
            }

            promise.then(() => {

                //update the canvas
                this.desktopCameraCanvasDrawerTimer = setInterval(() => {
                    //draw screen to canvas
                    canvas.width = screenVideo.videoWidth;
                    canvas.height = screenVideo.videoHeight;
                    canvasContext.drawImage(screenVideo, 0, 0, canvas.width, canvas.height);

                    var cameraWidth = screenVideo.videoWidth * (this.camera_percent / 100);
                    var cameraHeight = (cameraVideo.videoHeight / cameraVideo.videoWidth) * cameraWidth

                    var positionX = (canvas.width - cameraWidth) - this.camera_margin;
                    var positionY;

                    if (this.camera_location == "top") {
                        positionY = this.camera_margin;
                    } else { //if not top, make it bottom
                        //draw camera on right bottom corner
                        positionY = (canvas.height - cameraHeight) - this.camera_margin;
                    }
                    canvasContext.drawImage(cameraVideo, positionX, positionY, cameraWidth, cameraHeight);
                }, 66);
            });
        }, true)
    }

    /**
     * This function does these:
     *    1. Remove the audio track from the stream provided if it is camera. Other case
     *       is screen video + system audio track. In this case audio is kept in stream.
     *    2. Open audio track again if audio constaint isn't false
     *    3. Make audio track Gain Node to be able to volume adjustable
     *  4. If screen is shared and system audio is available then the system audio and
     *     opened audio track are mixed
     *
     * @param {*} mediaConstraints
     * @param {*} audioConstraint
     * @param {*} stream
     * @param {*} streamId
     */
    prepareStreamTracks(mediaConstraints, audioConstraint, stream, streamId) {
        //this trick, getting audio and video separately, make us add or remove tracks on the fly
        var audioTracks = stream.getAudioTracks()
        if (audioTracks.length > 0 && this.publishMode == "camera") {
            audioTracks[0].stop();
            stream.removeTrack(audioTracks[0]);
        }
        //now get only audio to add this stream
        if (audioConstraint != "undefined" && audioConstraint != false) {
            var media_audio_constraint = {audio: audioConstraint};
            return this.navigatorUserMedia(media_audio_constraint).then((audioStream) => {

                //here audioStream has onr audio track only
                audioStream = this.setGainNodeStream(audioStream);
                // now audio stream has two audio strams.
                // 1. Gain Node : this will be added to local stream to publish
                // 2. Original audio track : keep its reference to stop later

                //add callback if desktop is sharing
                var onended = event => {
                    this.callback("screen_share_stopped");
                    this.setVideoCameraSource(streamId, mediaConstraints, null, true);
                }

                if (this.publishMode == "screen") {
                    return this.updateVideoTrack(stream, streamId, onended, true).then(() => {
                        if (audioTracks.length > 0) { //system audio share case, then mix it with device audio
                            audioStream = this.mixAudioStreams(stream, audioStream);
                        }
                        return this.updateAudioTrack(audioStream, streamId, null);
                    });
                } else if (this.publishMode == "screen+camera") {
                    if (audioTracks.length > 0) { //system audio share case, then mix it with device audio
                        audioStream = this.mixAudioStreams(stream, audioStream);
                    }

                    return this.updateAudioTrack(audioStream, streamId, null).then(() => {
                        return this.setDesktopwithCameraSource(stream, streamId, onended);
                    });

                } else {
                    if (audioConstraint != false && audioConstraint != undefined) {
                        stream.addTrack(audioStream.getAudioTracks()[0]);
                    }

                    if (stream.getVideoTracks().length > 0) 
                    {
                        return this.updateVideoTrack(stream, streamId, null, null).then(() => 
                        {
                            return this.updateAudioTrack(stream, streamId, null).then(() => {
                                return this.gotStream(stream);
                            });
                        });
                    }
                    else if (stream.getAudioTracks().length > 0)
                    {
                        return this.updateAudioTrack(stream, streamId, null).then(() => {
                            return this.gotStream(stream);
                        });
                    }
                    else 
                    {
                        return this.gotStream(stream);
                    }
                }
            }).catch (error => {
	            if (error.name == "NotFoundError") {
	                this.getDevices()
	            } 
                else {
	                this.callbackError(error.name, error.message);
	            }
	            //throw error for promise
                throw error;
            });
        } else {
            return this.gotStream(stream);
        }
    }

    /**
     * Called to get user media (camera and/or mic)
     *
     * @param {*} mediaConstraints : media constaint
     * @param {*} func : callback on success. The stream which is got, is passed as parameter to this function
     * @param {*} catch_error : error is checked if catch_error is true
     */
    navigatorUserMedia(mediaConstraints, func, catch_error) {
	
		if (mediaConstraints.video == "dummy" || mediaConstraints.audio == "dummy") {
			var stream = new MediaStream();
			
			if (mediaConstraints.audio == "dummy") 
			{
				stream.addTrack(this.getSilentAudioTrack());
			}
			
			if (mediaConstraints.video == "dummy") 
			{	
				stream.addTrack(this.getBlackVideoTrack());
			}
			
			return new Promise((resolve, reject) => {
            	resolve(stream);
        	})
		}
		else 
		{	
				
			return navigator.mediaDevices.getUserMedia(mediaConstraints).then((stream) => {
	            if (typeof func != "undefined" || func != null) {
	                func(stream);
	            }
	            return stream;
	        }).catch(error => {
	            if (catch_error == true) {
	                if (error.name == "NotFoundError") {
	                    this.getDevices()
	                } else {
	                    this.callbackError(error.name, error.message);
	                }
	            } else {
	                Logger.warn(error);
	
	            }
	            //throw error if there is a promise
	            throw error;
	        });
        }
    }

    /**
     * Called to get display media (screen share)
     *
     * @param {*} mediaConstraints : media constaint
     * @param {*} func : callback on success. The stream which is got, is passed as parameter to this function
     */
    navigatorDisplayMedia(mediaConstraints, func) {
        return navigator.mediaDevices.getDisplayMedia(mediaConstraints)
            .then((stream) => {
                if (typeof func != "undefined") {
                    func(stream);
                }
                return stream;
            })
            .catch(error => {
                if (error.name === "NotAllowedError") {
                    Logger.debug("Permission denied error");
                    this.callbackError("ScreenSharePermissionDenied");

                    // If error catched then redirect Default Stream Camera
                    if (this.localStream == null) {
                        var mediaConstraints = {
                            video: true,
                            audio: true
                        };

                        this.openStream(mediaConstraints);
                    } else {
                        this.switchVideoCameraCapture(streamId);
                    }
                }
            });
    }

    /**
     * Called to get the media (User Media or Display Media)
     * @param {*} mediaConstraints, media constraints 
     * @param {*} streamId, streamId to be used to replace track if there is an active peer connection
     */
    getMedia(mediaConstraints, streamId) 
    {
        var audioConstraint = false;
        if (typeof mediaConstraints.audio != "undefined" && mediaConstraints.audio != false) {
            audioConstraint = mediaConstraints.audio;
        }

        if (this.desktopCameraCanvasDrawerTimer != null) {
            clearInterval(this.desktopCameraCanvasDrawerTimer);
            this.desktopCameraCanvasDrawerTimer = null;
        }

        // Check Media Constraint video value screen or screen + camera
        if (this.publishMode == "screen+camera" || this.publishMode == "screen") {
            return this.navigatorDisplayMedia(mediaConstraints).then(stream => {
                if (this.smallVideoTrack)
                    this.smallVideoTrack.stop();
                return this.prepareStreamTracks(mediaConstraints, audioConstraint, stream, streamId);
            });
        }
        else {
            return this.navigatorUserMedia(mediaConstraints).then(stream => {
                if (this.smallVideoTrack)
                    this.smallVideoTrack.stop();
                return this.prepareStreamTracks(mediaConstraints, audioConstraint, stream, streamId);
            }).catch(error => {
                if (error.name == "NotFoundError") {
                    this.getDevices()
                } else {
                    this.callbackError(error.name, error.message);
                }
            });
        }
    }


    /**
     * Open media stream, it may be screen, camera or audio
     */
    openStream(mediaConstraints, streamId) {
        this.mediaConstraints = mediaConstraints;
        
        return this.getMedia(mediaConstraints, streamId).then(() => {
			if (this.mediaConstraints.video != "dummy" && this.mediaConstraints.video != undefined) {
				this.stopBlackVideoTrack();
				this.clearBlackVideoTrackTimer();
			}
			
			if (this.mediaConstraints.audio != "dummy" && this.mediaConstraints.audio != undefined) {
				this.stopSilentAudioTrack();
			}			
		});
    }



    /**
     * Closes stream, if you want to stop peer connection, call stop(streamId)
     */
    closeStream() {
        if (this.localStream) {
            this.localStream.getVideoTracks().forEach(function (track) {
                track.onended = null;
                track.stop();
            });

            this.localStream.getAudioTracks().forEach(function (track) {
                track.onended = null;
                track.stop();
            });
        }

        if (this.videoTrack) {
            this.videoTrack.stop();
        }

        if (this.audioTrack) {
            this.audioTrack.stop();
        }

        if (this.smallVideoTrack) {
            this.smallVideoTrack.stop();
        }
        if (this.previousAudioTrack) {
            this.previousAudioTrack.stop();
        }
    }


    /**
     * Checks browser supports screen share feature
     * if exist it calls callback with "browser_screen_share_supported"
     */
    checkBrowserScreenShareSupported() {
        if ((typeof navigator.mediaDevices != "undefined" && navigator.mediaDevices.getDisplayMedia) || navigator.getDisplayMedia) {
            this.callback("browser_screen_share_supported");
        }
    };

    /**
     * Changes the secondary stream gain in mixed audio mode
     *
     * @param {*} enable
     */
    enableSecondStreamInMixedAudio(enable) {
        if (this.secondaryAudioTrackGainNode != null) {
            if (enable) {
                this.secondaryAudioTrackGainNode.gain.value = 1;
            } else {
                this.secondaryAudioTrackGainNode.gain.value = 0;
            }
        }
    }

    /**
     * Changes local stream when new stream is prepared
     *
     * @param {*} stream
     */
    gotStream(stream) {
        this.localStream = stream;
        if (this.localVideo) {
            this.localVideo.srcObject = stream;
        }
        this.getDevices();
        this.trackDeviceChange();
        return new Promise((resolve, reject) => {
            resolve();
        })
    }

    /**
     * Changes local video and sets localStream as source
     *
     * @param {*} videoEl
     */
    changeLocalVideo(videoEl) {
        this.localVideo = videoEl
        if (this.localStream) {
            this.localVideo.srcObject = this.localStream
        }
    }

    /**
     * These methods are initialized when the user is muted himself in a publish scenario
     * It will keep track if the user is trying to speak without sending any data to server
     * Please don't forget to disable this function with disableAudioLevelWhenMuted if you use it.
     */
    enableAudioLevelWhenMuted() {
        navigator.mediaDevices.getUserMedia({video: false, audio: true})
            .then((stream) => {
                this.mutedAudioStream = stream;
                this.mutedSoundMeter = new SoundMeter(this.audioContext);
                soundMeter.connectToSource(this.mutedAudioStream, (value) => {
                    if (value > 0.1) {
                        this.callback("speaking_but_muted");
                    }
                }, (e) => {
                    if (e) {
                        alert(e);
                        return;
                    }
                    this.meterRefresh = setInterval(() => {
                        if (soundMeter.instant.toFixed(2) > 0.1) {
                            this.callback("speaking_but_muted");
                        }
                    }, 200);
                });

            })
            .catch(function (err) {
                Logger.debug("Can't get the soundlevel on mute")
            });
    }

    disableAudioLevelWhenMuted() {
        if (this.meterRefresh != null) {
            clearInterval(this.meterRefresh);
            this.meterRefresh = null;
        }

        if (this.mutedSoundMeter != null) {
            this.mutedSoundMeter.stop();
            this.mutedSoundMeter = null;
        }

        if (this.mutedAudioStream != null) {
            this.mutedAudioStream.getTracks().forEach(function (track) {
                track.stop();
            });
        }
    }


    /**
	 * @Deprecated. It's not the job of SDK to make these things. It increases the complexity of the code. 
     * We provide samples for having these function
     * 
     * This method mixed the first stream audio to the second stream audio and
     * @param {*} stream  : Primary stream that contain video and audio (system audio)
     * @param {*} secondStream :stream has device audio
     * @returns mixed stream.
     */
    mixAudioStreams(stream, secondStream) {
        //Logger.debug("audio stream track count: " + audioStream.getAudioTracks().length);
        var composedStream = new MediaStream();
        //added the video stream from the screen
        stream.getVideoTracks().forEach(function (videoTrack) {
            composedStream.addTrack(videoTrack);
        });

        var audioDestionation = this.audioContext.createMediaStreamDestination();

        if (stream.getAudioTracks().length > 0) {
            this.primaryAudioTrackGainNode = this.audioContext.createGain();

            //Adjust the gain for screen sound
            this.primaryAudioTrackGainNode.gain.value = 1;
            var audioSource = this.audioContext.createMediaStreamSource(stream);

            audioSource.connect(this.primaryAudioTrackGainNode).connect(audioDestionation);
        } else {
            Logger.debug("Origin stream does not have audio track")
        }

        if (secondStream.getAudioTracks().length > 0) {
            this.secondaryAudioTrackGainNode = this.audioContext.createGain();

            //Adjust the gain for second sound
            this.secondaryAudioTrackGainNode.gain.value = 1;

            var audioSource2 = this.audioContext.createMediaStreamSource(secondStream);
            audioSource2.connect(this.secondaryAudioTrackGainNode).connect(audioDestionation);
        } else {
            Logger.debug("Second stream does not have audio track")
        }

        audioDestionation.stream.getAudioTracks().forEach(function (track) {
            composedStream.addTrack(track);
            Logger.debug("audio destination add track");
        });

        return composedStream;
    }

    /**
     * This method creates a Gain Node stream to make the audio track adjustable
     *
     * @param {*} stream
     * @returns
     */
    setGainNodeStream(stream) {
        if (this.mediaConstraints.audio != false && typeof this.mediaConstraints.audio != "undefined") {
            // Get the videoTracks from the stream.
            const videoTracks = stream.getVideoTracks();

            // Get the audioTracks from the stream.
            const audioTracks = stream.getAudioTracks();

            /**
             * Create a new audio context and build a stream source,
             * stream destination and a gain node. Pass the stream into
             * the mediaStreamSource so we can use it in the Web Audio API.
             */
            this.audioContext = new AudioContext();
            let mediaStreamSource = this.audioContext.createMediaStreamSource(stream);
            let mediaStreamDestination = this.audioContext.createMediaStreamDestination();
            this.primaryAudioTrackGainNode = this.audioContext.createGain();

            /**
             * Connect the stream to the gainNode so that all audio
             * passes through the gain and can be controlled by it.
             * Then pass the stream from the gain to the mediaStreamDestination
             * which can pass it back to the RTC client.
             */
            mediaStreamSource.connect(this.primaryAudioTrackGainNode);
            this.primaryAudioTrackGainNode.connect(mediaStreamDestination);

            if (this.currentVolume == null) {
                this.primaryAudioTrackGainNode.gain.value = 1;
            } else {
                this.primaryAudioTrackGainNode.gain.value = this.currentVolume;
            }

            /**
             * The mediaStreamDestination.stream outputs a MediaStream object
             * containing a single AudioMediaStreamTrack. Add the video track
             * to the new stream to rejoin the video with the controlled audio.
             */
            const controlledStream = mediaStreamDestination.stream;

            for (const videoTrack of videoTracks) {
                controlledStream.addTrack(videoTrack);
            }
            for (const audioTrack of audioTracks) {
                controlledStream.addTrack(audioTrack);
            }

            if (this.previousAudioTrack !== null) {
                this.previousAudioTrack.stop();
            }
            this.previousAudioTrack = controlledStream.getAudioTracks()[1];

            /**
             * Use the stream that went through the gainNode. This
             * is the same stream but with altered input volume levels.
             */
            return controlledStream;
        }
        return stream;
    }

    /**
     * Called by User
     * to switch the Screen Share mode
     *
     * @param {*} streamId
     */
    switchDesktopCapture(streamId) {
        this.publishMode = "screen";

        if (typeof this.mediaConstraints.video != "undefined" && this.mediaConstraints.video != false) {
            this.mediaConstraints.video = true
        }
        //TODO: I don't think we need to get audio again. We just need to switch the video stream
        return this.getMedia(this.mediaConstraints, streamId);
    }

    /**
     * Called by User
     * to switch the Screen Share with Camera mode
     *
     * @param {*} streamId
     */
    switchDesktopCaptureWithCamera(streamId) {
        if (typeof this.mediaConstraints.video != "undefined" && this.mediaConstraints.video != false) {
            this.mediaConstraints.video = true
        }

        this.publishMode = "screen+camera";

        //TODO: I don't think we need to get audio again. We just need to switch the video stream
        return this.getMedia(this.mediaConstraints, streamId);
    }

    /**
     * This method updates the local stream. It removes existant audio track from the local stream
     * and add the audio track in `stream` parameter to the local stream
     */
    updateLocalAudioStream(stream, onEndedCallback) {
        var newAudioTrack = stream.getAudioTracks()[0];

        if (this.localStream != null && this.localStream.getAudioTracks()[0] != null) 
        {
            var audioTrack = this.localStream.getAudioTracks()[0];
            if (audioTrack != newAudioTrack) 
            {
	            this.localStream.removeTrack(audioTrack);
	            audioTrack.stop();
	            this.localStream.addTrack(newAudioTrack);
            }
        } else if (this.localStream != null) {
            this.localStream.addTrack(newAudioTrack);
        } else {
            this.localStream = stream;
        }
        
  
        if (this.localVideo != null) {   //it can be null
            this.localVideo.srcObject = this.localStream;
        }

        if (onEndedCallback != null) {
            stream.getAudioTracks()[0].onended = function (event) {
                onEndedCallback(event);
            }
        }

        if (this.isMuted) {
            this.muteLocalMic();
        } else {
            this.unmuteLocalMic();
        }

        if (this.localStreamSoundMeter != null) {
            this.enableAudioLevelForLocalStream(this.levelCallback)
        }
    }

    /**
     * This method updates the local stream. It removes existant video track from the local stream
     * and add the video track in `stream` parameter to the local stream
     */
    updateLocalVideoStream(stream, onEndedCallback, stopDesktop) {
        if (stopDesktop && this.desktopStream != null) {
            this.desktopStream.getVideoTracks()[0].stop();
        }

        var newVideoTrack = stream.getVideoTracks()[0];

        if (this.localStream != null && this.localStream.getVideoTracks()[0] != null ) 
        {
            var videoTrack = this.localStream.getVideoTracks()[0];
            
            if (videoTrack != newVideoTrack) 
            {
	            this.localStream.removeTrack(videoTrack);
	            videoTrack.stop();		
	            this.localStream.addTrack(newVideoTrack);
            }
        } else if (this.localStream != null) {
            this.localStream.addTrack(newVideoTrack);
        } else {
            this.localStream = stream;
        }

        if (this.localVideo) {
            this.localVideo.srcObject = this.localStream;
        }

        if (onEndedCallback != null) {
            stream.getVideoTracks()[0].onended = function (event) {
                onEndedCallback(event);
            }
        }
    }

    /**
     * Called by User
     * to change video source
     *
     * @param {*} streamId
     * @param {*} deviceId
     */
    switchAudioInputSource(streamId, deviceId) {
        //stop the track because in some android devices need to close the current camera stream
        var audioTrack = this.localStream.getAudioTracks()[0];
        if (audioTrack) {
            audioTrack.stop();
        } else {
            Logger.warn("There is no audio track in local stream");
        }

        if (typeof deviceId != "undefined") {
            //Update the media constraints
            if (this.mediaConstraints.audio !== true)
                this.mediaConstraints.audio.deviceId = deviceId;
            else
                this.mediaConstraints.audio = {"deviceId": deviceId};

            //to change only audio track set video false otherwise issue #3826 occurs on Android
            let tempMediaConstraints = {"video": false, "audio": {"deviceId": deviceId}};
            return this.setAudioInputSource(streamId, tempMediaConstraints, null, deviceId);
        } else {
            return new Promise((resolve, reject) => {
                reject("There is no device id for audio input source");
            });
        }
    }


    /**
     * This method sets Audio Input Source and called when you change audio device
     * It calls updateAudioTrack function to update local audio stream.
     */
    setAudioInputSource(streamId, mediaConstraints, onEndedCallback) {
        return this.navigatorUserMedia(mediaConstraints, stream => {
            stream = this.setGainNodeStream(stream);
            return this.updateAudioTrack(stream, streamId, mediaConstraints, onEndedCallback);
        }, true);
    }

    /**
     * Called by User
     * to change video camera capture
     *
     * @param {*} streamId Id of the stream to be changed.
     * @param {*} deviceId Id of the device which will use as a media device
     * @param {*} onEndedCallback callback for when the switching video state is completed, can be used to understand if it is loading or not
     *
     * This method is used to switch to video capture.
     */
    switchVideoCameraCapture(streamId, deviceId, onEndedCallback) {
        //stop the track because in some android devices need to close the current camera stream
        if (this.localStream && this.localStream.getVideoTracks().length > 0) {
            var videoTrack = this.localStream.getVideoTracks()[0];
            videoTrack.stop();
        } else {
            Logger.warn("There is no video track in local stream");
        }

        this.publishMode = "camera";
        return navigator.mediaDevices.enumerateDevices().then(devices => {
            for (let i = 0; i < devices.length; i++) {
                if (devices[i].kind == "videoinput") {
                    //Adjust video source only if there is a matching device id with the given one.
                    //It creates problems if we don't check that since video can be just true to select default cam and it is like that in many cases.
                    if (devices[i].deviceId == deviceId) {
                        if (this.mediaConstraints.video !== true)
                            this.mediaConstraints.video.deviceId = {exact: deviceId};
                        else
                            this.mediaConstraints.video = {deviceId: {exact: deviceId}};
                        break;
                    }
                }
            }
            ;
            //If no matching device found don't adjust the media constraints let it be true instead of a device ID
            Logger.debug("Given deviceId = " + deviceId + " - Media constraints video property = " + this.mediaConstraints.video);
            return this.setVideoCameraSource(streamId, this.mediaConstraints, null, true, deviceId);
        })

    }

    /**
     * This method sets Video Input Source and called when you change video device
     * It calls updateVideoTrack function to update local video stream.
     */
    setVideoCameraSource(streamId, mediaConstraints, onEndedCallback, stopDesktop) {
        return this.navigatorUserMedia(mediaConstraints, stream => {
            if (stopDesktop && this.secondaryAudioTrackGainNode && stream.getAudioTracks().length > 0) {
                //This audio track update is necessary for such a case:
                //If you enable screen share with browser audio and then
                //return back to the camera, the audio should be only from mic.
                //If, we don't update audio with the following lines,
                //the mixed (mic+browser) audio would be streamed in the camera mode.
                this.secondaryAudioTrackGainNode = null;
                stream = this.setGainNodeStream(stream);
                this.updateAudioTrack(stream, streamId, mediaConstraints, onEndedCallback)

            }

            if (this.cameraEnabled) {
                return this.updateVideoTrack(stream, streamId, onEndedCallback, stopDesktop);
            } else {
                return this.turnOffLocalCamera();
            }
        }, true);
    }

    /**
     * Called by User
     * to switch between front and back camera on mobile devices
     *
     * @param {*} streamId Id of the stream to be changed.
     * @param {*} facingMode it can be "user" or "environment"
     *
     * This method is used to switch front and back camera.
     */
    switchVideoCameraFacingMode(streamId, facingMode) {
        //stop the track because in some android devices need to close the current camera stream
        if (this.localStream && this.localStream.getVideoTracks().length > 0) {
            var videoTrack = this.localStream.getVideoTracks()[0];
            videoTrack.stop();
        } else {
            Logger.warn("There is no video track in local stream");
        }

        // When device id set, facing mode is not working
        // so, remove device id
        if (this.mediaConstraints.video !== undefined && this.mediaConstraints.video.deviceId !== undefined) {
            delete this.mediaConstraints.video.deviceId;
        }

        var videoConstraint = {
            'facingMode': facingMode
        };

        this.mediaConstraints.video = Object.assign({},
            this.mediaConstraints.video,
            videoConstraint);

        this.publishMode = "camera";
        Logger.debug("Media constraints video property = " + this.mediaConstraints.video);
        return this.setVideoCameraSource(streamId, {video: this.mediaConstraints.video}, null, true);
    }

    /**
     * Updates the audio track in the audio sender
     * getSender method is set on MediaManagercreation by WebRTCAdaptor
     *
     * @param {*} stream
     * @param {*} streamId
     * @param {*} onEndedCallback
     */
    updateAudioTrack(stream, streamId, onEndedCallback) {
        var audioTrackSender = this.getSender(streamId, "audio");
        if (audioTrackSender) {
            return audioTrackSender.replaceTrack(stream.getAudioTracks()[0]).then(result => {
                this.updateLocalAudioStream(stream, onEndedCallback);

            }).catch(function (error) {
                Logger.debug(error.name);
                throw error;
            });
        } else {
            this.updateLocalAudioStream(stream, onEndedCallback);
            return new Promise((resolve, reject) => {
                resolve();
            });
        }
    }

    /**
     * Updates the video track in the video sender
     * getSender method is set on MediaManagercreation by WebRTCAdaptor
     *
     * @param {*} stream
     * @param {*} streamId
     * @param {*} onEndedCallback
     */
    updateVideoTrack(stream, streamId, onEndedCallback, stopDesktop) {
        var videoTrackSender = this.getSender(streamId, "video");
        if (videoTrackSender) 
        {
            return videoTrackSender.replaceTrack(stream.getVideoTracks()[0]).then(result => {
                this.updateLocalVideoStream(stream, onEndedCallback, stopDesktop);

            }).catch(error => {
                Logger.debug(error.name);
            });
        } else {
            this.updateLocalVideoStream(stream, onEndedCallback, stopDesktop);
            return new Promise((resolve, reject) => {
                resolve();
            });
        }
    }
    
    /**
     * If you mute turn off the camera still some data should be sent
     * Tihs method create a black frame to reduce data transfer
     */
    getBlackVideoTrack() {
		this.dummyCanvas.getContext('2d').fillRect(0, 0, 320, 240);
		
		//REFACTOR: it's not good to set to a replacement stream  
		this.replacementStream = this.dummyCanvas.captureStream();
		 //We need to send black frames within a time interval, because when the user turn off the camera,
        //player can't connect to the sender since there is no data flowing. Sending a black frame in each 3 seconds resolves it.
        if (this.blackFrameTimer == null) {
            this.blackFrameTimer = setInterval(() => {
                this.getBlackVideoTrack();
            }, 3000);
        }
        
        this.blackVideoTrack = this.replacementStream.getVideoTracks()[0];
        return this.blackVideoTrack;
	}
    
    /**
     * Silent audio track
	 */
    getSilentAudioTrack() 
    {
		this.stopSilentAudioTrack();
		this.oscillator = this.audioContext.createOscillator();
  		let dst = this.oscillator.connect(this.audioContext.createMediaStreamDestination());
  		this.oscillator.start();
  		this.silentAudioTrack = dst.stream.getAudioTracks()[0];
  		return this.silentAudioTrack;
	}
	
	
	stopSilentAudioTrack() {
		if (this.oscillator != null) {
			this.oscillator.stop();
			this.oscillator.disconnect();
			this.oscillator = null;
		}
		
		if (this.silentAudioTrack != null) {
			this.silentAudioTrack.stop();
			this.silentAudioTrack = null;
		}
		
 
	}

    /**
     * Called by User
     * turns of the camera stream and starts streaming black dummy frame
     */
    turnOffLocalCamera(streamId) {
        //Initialize the first dummy frame for switching.
        this.getBlackVideoTrack();

        if (this.localStream != null) 
        {
            let choosenId;
            if (streamId != null || typeof streamId != "undefined") {
                choosenId = streamId;
            } else {
                choosenId = this.publishStreamId;
            }
            this.cameraEnabled = false;
            return this.updateVideoTrack(this.replacementStream, choosenId, null, true);
        } 
        else {

            return new Promise((resolve, reject) => {
                this.callbackError("NoActiveConnection");
                reject("NoActiveStream");
            });
        }
    }
    
    clearBlackVideoTrackTimer() 
    {
		if (this.blackFrameTimer != null) {
            clearInterval(this.blackFrameTimer);
            this.blackFrameTimer = null;
        }
	}
	
	stopBlackVideoTrack() 
	{
		 if (this.blackVideoTrack != null) {
			this.blackVideoTrack.stop();
			this.blackVideoTrack = null;
		}
	}

    /**
     * Called by User
     * turns of the camera stream and starts streaming camera again instead of black dummy frame
     */
    turnOnLocalCamera(streamId) {
        this.clearBlackVideoTrackTimer();
        
        this.stopBlackVideoTrack();
       
		
        if (this.localStream == null) {
            return this.navigatorUserMedia(this.mediaConstraints, stream => {
                this.gotStream(stream);
            }, false);
        }
        //This method will get the camera track and replace it with dummy track
        else {
            return this.navigatorUserMedia(this.mediaConstraints, stream => {
                let choosenId;
                if (streamId != null || typeof streamId != "undefined") {
                    choosenId = streamId;
                } else {
                    choosenId = this.publishStreamId;
                }
                this.cameraEnabled = true;
                this.updateVideoTrack(stream, choosenId, null, true);
            }, false);
        }
    }

    /**
     * Called by User
     * to mute local audio streaming
     */
    muteLocalMic() {
        this.isMuted = true;
        if (this.localStream != null) {
            this.localStream.getAudioTracks().forEach(track => track.enabled = false);
        } else {
            this.callbackError("NoActiveConnection");
        }
    }

    /**
     * Called by User
     * to unmute local audio streaming
     *
     * if there is audio it calls callbackError with "AudioAlreadyActive" parameter
     */
    unmuteLocalMic() {
        this.isMuted = false;
        if (this.localStream != null) {
            this.localStream.getAudioTracks().forEach(track => track.enabled = true);
        } else {
            this.callbackError("NoActiveConnection");
        }
    }

    /**
     * If we have multiple video tracks in coming versions, this method may cause some issues
     */
    getVideoSender(streamId) {
        var videoSender = null;
        if (typeof adapter !== "undefined" && adapter !== null && ((adapter.browserDetails.browser === 'chrome' ||
                (adapter.browserDetails.browser === 'firefox' ||
                    adapter.browserDetails.browser === 'safari' &&
                    adapter.browserDetails.version >= 64)) &&
            'RTCRtpSender' in window &&
            'setParameters' in window.RTCRtpSender.prototype)) {
            videoSender = this.getSender(streamId, "video");

        }
        return videoSender;
    }

    /**
     * Called by User
     * to set maximum video bandwidth is in kbps
     */
    changeBandwidth(bandwidth, streamId) {
        var errorDefinition = "";

        var videoSender = this.getVideoSender(streamId);

        if (videoSender != null) {
            const parameters = videoSender.getParameters();

            if (!parameters.encodings) {
                parameters.encodings = [{}];
            }

            if (bandwidth === 'unlimited') {
                delete parameters.encodings[0].maxBitrate;
            } else {
                parameters.encodings[0].maxBitrate = bandwidth * 1000;
            }

            return videoSender.setParameters(parameters)
        } else {
            errorDefinition = "Video sender not found to change bandwidth. Streaming may not be active";
        }

        return Promise.reject(errorDefinition);
    };

    /**
     * Called by user
     * sets the volume level
     *
     * @param {*} volumeLevel : Any number between 0 and 1.
     */
    setVolumeLevel(volumeLevel) {
        this.currentVolume = volumeLevel;
        if (this.primaryAudioTrackGainNode != null) {
            this.primaryAudioTrackGainNode.gain.value = volumeLevel;
        }

        if (this.secondaryAudioTrackGainNode != null) {
            this.secondaryAudioTrackGainNode.gain.value = volumeLevel;
        }
    }

    /**
     * Called by user
     * To create a sound meter for the local stream
     *
     * @param {Function} levelCallback : callback to provide the audio level to user
     * @param {*} period : measurement period
     */
    enableAudioLevelForLocalStream(levelCallback) {
        this.levelCallback = levelCallback;
        this.disableAudioLevelForLocalStream();
        this.localStreamSoundMeter = new SoundMeter(this.audioContext);
        if (this.audioContext.state !== 'running') {
            return this.audioContext.resume().then(() => {
                return this.localStreamSoundMeter.connectToSource(this.localStream, levelCallback);
            })
        }
        else {
            return this.localStreamSoundMeter.connectToSource(this.localStream, levelCallback);
        }
    }

    disableAudioLevelForLocalStream() {
        if (this.localStreamSoundMeter != null) {
            this.localStreamSoundMeter.stop();
            this.localStreamSoundMeter = null;
        }
    }

    /**
     * Called by user
     * To change audio/video constraints on the fly
     *
     */
    applyConstraints(newConstraints) {

        var constraints = {};
        if (newConstraints.audio === undefined && newConstraints.video === undefined) {
            //if audio or video field is not defined, assume that it's a video constraint
            constraints.video = newConstraints;
            this.mediaConstraints.video = Object.assign({},
                this.mediaConstraints.video,
                constraints.video);
        } else if (newConstraints.video !== undefined) {
            constraints.video = newConstraints.video;
            this.mediaConstraints.video = Object.assign({},
                this.mediaConstraints.video,
                constraints.video);
        }


        if (newConstraints.audio !== undefined) {

            constraints.audio = newConstraints.audio;

            this.mediaConstraints.audio = Object.assign({},
                this.mediaConstraints.audio,
                constraints.audio);
        }


        var promise = null;
        if (constraints.video !== undefined) 
        {
            if (this.localStream && this.localStream.getVideoTracks().length > 0) {
                var videoTrack = this.localStream.getVideoTracks()[0];
                promise = videoTrack.applyConstraints(this.mediaConstraints.video);
            } else {
                promise = new Promise((resolve, reject) => {
                    reject("There is no video track to apply constraints");
                });
            }
        }

        if (constraints.audio !== undefined) {
            //just give the audio constraints not to get video stream
            //we dont call applyContrains for audio because it does not work. I think this is due to gainStream things. This is why we call getUserMedia again

            //use the publishStreamId because we don't have streamId in the parameter anymore
            promise = this.setAudioInputSource(this.publishStreamId, {audio: this.mediaConstraints.audio}, null);
        }

        if (this.localStreamSoundMeter != null) {
            this.enableAudioLevelForLocalStream(this.levelCallback)
        }
        return promise;
    }
}


