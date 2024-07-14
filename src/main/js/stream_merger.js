import './external/loglevel.min.js';
import {WebRTCAdaptor} from "./webrtc_adaptor.js"

const Logger = window.log;

export class StreamMerger {
    /**
     * 
     * @param {number} width 
     * @param {number} height 
     * @param {boolean} autoMode 
     * @param {*} aspectRatio 
     */
    constructor(initialValues) {
        this.streams = [];
        this.width = 480;
        this.height = 360;

        this.stream_height = 240;

        this.autoMode = true;

        this.aspectRatio = "4:3";

        //3:4 portrait mode stream width height
        this.pwidth = 0
        this.pheight = 0

        //4:3 landscape mode stream width height
        this.vwidth = 0
        this.vheight = 0;

        this.canvas = document.createElement('canvas');
        this.canvas.setAttribute('width', this.width);
        this.canvas.setAttribute('height', this.height);
        this.ctx = this.canvas.getContext('2d');

        this.streamCount = 0;
        this.frameCount = 0;

        this.started = false;
        this.fps = 30;

        this.trackAMSStreamMap = {};
        this.id3IntervalId = -1;
        this.layoutList = {};
        this.sendLayoutInfoToAMS = false;

        this.currentVideoTrackAssignments = {};
        this.isStopping = false;


        for (var key in initialValues) {
            if (initialValues.hasOwnProperty(key)) {
                this[key] = initialValues[key];
            }
        }

        if (this.headless) {
            document.getElementById("players").style.display = "none";
        }

        this.initializeWebRTCAdaptors();
    }

    initializeWebRTCAdaptors() {
        this.webRTCAdaptorPublisher = this.createPublisherAdaptor();
        this.webRTCAdaptorPlayer = this.createPlayerAdaptor();
    }

    initAudioContext() {
        const AudioContext = window.AudioContext || window.webkitAudioContext
        this.audioCtx = new AudioContext();
        this.audioDestination = this.audioCtx.createMediaStreamDestination()
        // delay node for video sync
        this.videoSyncDelayNode = this.audioCtx.createDelay(5.0)
        this.videoSyncDelayNode.connect(this.audioDestination)
    }

    changeAspectRatio(ratio) {
        this.aspectRatio = ratio;
        Logger.warn("Changing aspect ratio to: " + ratio);
        this.resizeAndSortV2();
    }
    /**
     * 
     * @param {number} height 
     */
    changeStreamSize(height) {
        this.stream_height = height;
        Logger.warn("Changing merged streams size to = " + height + "p");
        this.resizeAndSortV2();
    }

    getResult() {
        return this.result;
    }

    updateCanvasSize(width, height) {
        this.width = width;
        this.height = height;
        this.canvas.setAttribute('width', this.width);
        this.canvas.setAttribute('height', this.height);
    }

    /*
    * Options
    * streamId = Id of the stream
    * width = width of the stream that is being merged
    * height = height of the stream that is being merged
    * X = Starting location pixel on canvas horizontal
    * Y = Starting location pixel on canvas vertical
    * Xindex = placement index of videos, index 0 means width * 0, index 1 means width * 1 as starting points
    * Yindex = placement index of videos, index 0 means height * 0, index 1 means height* 1 as starting points
    * mute = mute stream or not
    * 
    */
    /**
     * 
     * @param {MediaStream} mediaStream 
     * @param {object} options 
     */
    addStream(mediaStream, options) {
        this.streamCount++;
        const stream = {}
        this.audioCtx.resume();
        stream.streamId = options.streamId;

        stream.width = options.width || 150;
        stream.height = options.height || 150;
        stream.Xindex = options.Xindex || 0;
        stream.Yindex = options.Yindex || 0;
        stream.portrait = false;
        stream.aspectRatio = 4 / 3;

        options.x == undefined ? stream.x = (stream.width * stream.Xindex) : stream.x = options.x;
        options.x == undefined ? stream.y = (stream.height * stream.Yindex) : stream.y = options.y;

        Logger.debug(stream.width, stream.Xindex, stream.x)
        stream.mute = options.mute || false;

        if (!stream.mute) {
            stream.audioSource = this.audioCtx.createMediaStreamSource(mediaStream)
            stream.audioGainNode = this.audioCtx.createGain() // Intermediate gain node
            stream.audioGainNode.gain.value = 1
            stream.audioSource.connect(stream.audioGainNode).connect(this.audioDestination) // Default is direct connect
        }
        stream.element = options.element;
        this.streams.push(stream);

        if (this.autoMode == true) {
            this.resizeAndSortV2();
            
            Logger.debug("streamId = " + stream.streamId);
            var pheight = mediaStream.getVideoTracks()[0].getSettings().height;
            var pwidth = mediaStream.getVideoTracks()[0].getSettings().width;

            if (pheight > pwidth) {
                Logger.debug("portrait mode");
                let xoffset = (stream.width - this.pwidth) / 2;
                stream.portrait = true;
                stream.x += xoffset;
                stream.width = this.pwidth;
                stream.height = this.pheight;
                Logger.warn("Location offset from metadata x = " + stream.x + " y = " + stream.y);
            }
        }
    }

    requestAnimationFrameV2(callback) {
        let fired = false
        const interval = setInterval(() => {
            if (!fired && document.hidden) {
                fired = true
                clearInterval(interval)
                callback()
            }
        }, 1000 / this.fps)
        requestAnimationFrame(() => {
            if (!fired) {
                fired = true
                clearInterval(interval)
                callback()
            }
        })
    }

    /*
    * For automatic sorting, since webcams use default ratio as 4:3 the default canvas ratio is also 4:3
    * This is because the canvas size is also dynamic
    */
    resizeAndSortV2() {
        //Clears all of the canvas when sorted.
        this.ctx.clearRect(0, 0, this.width, this.height);
        Logger.warn("Sorting the streams");

        let xindex = 0;
        let yindex = 0;


        let cropWidth = 0;
        let cropHeight = 0;
        let topWidth = 0;

        let remainingStreams = this.streams.length;

        let widthOffset = 0;
        let heightOffset = 0;

        const [pcwidth, pcheight, divider, yNumber] = this.calculateStreamDimensions();

        this.canvas.setAttribute('width', this.width);
        this.canvas.setAttribute('height', this.height);

        Logger.warn("Row number = " + yNumber)
        Logger.warn("canvas width = " + this.width + "canvas height = " + this.height);

        var extraStreams = this.streams.length - (yNumber * yNumber);
        let tmp = 0;
        for (let i = 1; i <= this.streams.length; i++) {

            Logger.warn("extraStreams = " + extraStreams + " stream length = " + this.streams.length)
            Logger.warn("Xindex = " + xindex + "Yindex = " + yindex);

            const stream = this.streams[i - 1];
            if (extraStreams <= 0 || this.streams.length <= 3) {
                this.pwidth = (pcwidth) / (divider);
                this.pheight = (pcheight) / (divider);

                this.vwidth = (this.width) / (divider);
                this.vheight = (this.height) / (divider);

                if (stream.portrait == true) {
                    stream.width = this.pwidth;
                    stream.height = this.pheight;

                    stream.x = this.vwidth * xindex;
                    stream.y = (this.vheight * yindex) - heightOffset;

                    let xoffset = (this.vwidth - this.pwidth) / 2;
                    stream.x += xoffset;
                } else {
                    stream.width = this.vwidth;
                    stream.height = this.vheight;
                    stream.x = this.vwidth * xindex;
                    stream.y = (this.vheight * yindex) - heightOffset;
                }
                tmp += (this.width) / (divider)
                Logger.warn("Video width = " + stream.width + "Video height = " + stream.height);

                if (xindex == 0) {
                    cropHeight = cropHeight + stream.height;
                    Logger.debug("CropHeight = " + cropHeight);
                }

                xindex++;
                if (yindex >= (yNumber) - 1 && this.streams.length != 1) {
                    Logger.warn("TopWidth = " + topWidth + " remainingStreams = " + remainingStreams);
                    widthOffset = (topWidth - (this.vwidth * remainingStreams)) / 2;
                    stream.x += widthOffset;
                }

                if (xindex >= yNumber) {
                    xindex = 0;
                    topWidth = tmp;
                    tmp = 0;
                    yindex++;
                    remainingStreams -= yNumber;
                }
            } else {
                this.pwidth = (pcwidth) / (divider + 1);
                this.pheight = (pcheight) / (divider + 1);

                this.vwidth = (this.width) / (divider + 1);
                this.vheight = (this.height) / (divider + 1);

                if (stream.portrait == true) {
                    stream.width = this.pwidth;
                    stream.height = this.pheight;
                    stream.x = this.vwidth * xindex;
                    stream.y = this.vheight * yindex;

                    let xoffset = (this.vwidth - this.pwidth) / 2;
                    stream.x += xoffset;
                } else {
                    stream.width = (this.vwidth);
                    stream.height = (this.vheight);
                    stream.x = this.vwidth * xindex;
                    stream.y = this.vheight * yindex;
                }
                cropWidth = cropWidth + ((this.width) / (divider + 1))

                Logger.warn("Video Width = " + stream.width + "VideoHeight = " + stream.height);

                if (xindex == 0) {
                    cropHeight = cropHeight + stream.height;
                    Logger.debug("CropHeight = " + cropHeight);
                }

                xindex++;
                if (xindex > yNumber) {
                    heightOffset = ((this.height) / (divider)) - stream.height;
                    xindex = 0;
                    yindex++;
                    widthOffset = this.width - cropWidth;
                    this.canvas.setAttribute('width', cropWidth);
                    Logger.warn("New canvas width= " + cropWidth);
                    topWidth = cropWidth;
                    cropWidth = 0;
                    extraStreams--;
                    remainingStreams -= (yNumber + 1);
                }
            }
        }
        this.canvas.setAttribute('height', cropHeight);
    }
    
    calculateStreamDimensions() {
        let divider = 0;

        var pcheight = 0;
        var pcwidth = 0;

        let yNumber = 0


        for (let i = 1; i <= 5; i++) {
            if (this.streams.length <= i * i) {
                divider = i;
                if (i * (i - 1) >= this.streams.length && this.streams.length > 2) {
                    yNumber = i - 1;
                    this.height = this.stream_height * yNumber;
                    if (this.aspectRatio == "16:9") {
                        let temp = (this.stream_height / 9) * 16;
                        this.width = temp * yNumber;
                    } else {
                        let temp = (this.stream_height / 3) * 4;
                        this.width = temp * yNumber;
                    }

                    pcheight = this.stream_height * yNumber;
                    if (this.aspectRatio == "16:9") {
                        let temp = (this.stream_height / 16) * 9;
                        pcwidth = temp * yNumber;
                    } else {
                        let temp = (this.stream_height / 4) * 3;
                        pcwidth = temp * yNumber;
                    }
                } else {
                    yNumber = i;
                    this.height = this.stream_height * yNumber;
                    if (this.aspectRatio == "16:9") {
                        let temp = (this.stream_height / 9) * 16;
                        this.width = temp * yNumber;
                    } else {
                        let temp = (this.stream_height / 3) * 4;
                        this.width = temp * yNumber;
                    }
                    pcheight = this.stream_height * yNumber;
                    if (this.aspectRatio == "16:9") {
                        let temp = (this.stream_height / 16) * 9;
                        pcwidth = temp * yNumber;
                    } else {
                        let temp = (this.stream_height / 4) * 3;
                        pcwidth = temp * yNumber;
                    }
                }
                break;
            }
        }

        return [pcwidth, pcheight, divider, yNumber]
    }

    start() {
        this.started = true
        this.requestAnimationFrameV2(this.draw.bind(this))

        // Get the result of merged stream canvas
        this.result = this.canvas.captureStream(this.fps)

        // Remove "dead" audio track
        const deadTrack = this.result.getAudioTracks()[0]
        if (deadTrack) this.result.removeTrack(deadTrack)

        // Add audio
        const audioTracks = this.audioDestination.stream.getAudioTracks()
        this.result.addTrack(audioTracks[0])
    }


    draw() {
        if (!this.started) return;
        this.frameCount++;

        let awaiting = this.streams.length;
        const done = () => {
            awaiting--;
            if (awaiting <= 0) {
                this.requestAnimationFrameV2(this.draw.bind(this));
            }
        }

        this.ctx.fillStyle = "#000000";
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

        this.streams.forEach((stream) => {
            // default draw function
            const width = stream.width;
            const height = stream.height;
            this.ctx.drawImage(stream.element, stream.x, stream.y, width, height)
            done()
        })

        if (this.streams.length === 0) done()
    }

    //Mutes or unmutes given streamId in merged stream
    /**
     * 
     * @param {string} streamId 
     */
    muteStream(streamId) {
        for (let i = 0; i < this.streams.length; i++) {
            const stream = this.streams[i]
            if (streamId === stream.streamId) {
                if (stream.element && stream.mute == false) {
                    stream.audioGainNode.gain.value = 0;
                    stream.mute = true;
                } else if (stream.element && stream.mute == true) {
                    stream.audioGainNode.gain.value = 1;
                    stream.mute = false;
                }
            }
        }
    }
    /**
     * 
     * @param {string} streamId 
     */
    removeStream(streamId) {
        let removed = false;
        for (let i = 0; i < this.streams.length; i++) {
            const stream = this.streams[i]
            if (streamId === stream.streamId) {
                if (stream.element) {
                    stream.element.remove()
                }
                removed = true;
                this.streams[i] = null
                this.streams.splice(i, 1)
                i--
            }
        }
        Logger.warn("removed streamId = " + streamId);

        if (this.autoMode == true) {
            this.resizeAndSortV2();
        }
    }

    clearAllStreams() {
        for (let i = 0; i < this.streams.length; i++) {
            const stream = this.streams[i]
            //if (stream.element) {
            //    stream.element.remove()
            //}
            this.streams[i] = null
            this.streams.splice(i, 1)
            i--
        }
    }

    stop() {
        this.started = false

        this.streams = []
        this.audioCtx.close().then(() => {
            console.log("debug55: Audio context closed")
        })
        this.audioCtx = null
        this.audioDestination = null
        this.videoSyncDelayNode = null

        this.result.getTracks().forEach((track) => {
            track.stop()
        })

        this.result = null
    }

    sendLayoutData(datatype) {
		var url = this.restURL + "/broadcasts/" + this.publishStreamId + "/"+datatype;
		console.log(url+"   "+url);

		var options = {
			method: 'POST',
			headers: {
				'Accept': 'application/json',
				'Content-Type': 'application/json',
			},
			body: JSON.stringify(this.layoutList),
		};

		fetch(url, options)
			.then(response => {
				console.log('Response:'+JSON.stringify(response));
				if (!response.ok) {
					throw new Error('Network response was not ok');
				}
					return response.json(); // Assuming response is plain text
			})
			.then(data => {
				console.log('Response data:'+JSON.stringify(data));
			})
			.catch(error => {
				console.log('There was a problem with the fetch operation:'+error);
			});
	}

	playVideo(obj) {
		var room = this.roomName;
		console.log("new stream available with id: "+ obj.streamId + "on the room:" + room);

		var trackId = obj.track.id.replace(obj.track.kind == "video" ? "ARDAMSv" : "ARDAMSa", "");
		if (trackId == room) {
			return;
		} 

		var streamId = this.trackAMSStreamMap[trackId];
		//If video or audio track assignment is not received yet, wait for 1 second and try again
		if (streamId == null || typeof streamId == "undefined") {
			console.warn(obj.track.kind + " track is not assigned to any stream yet");
			setTimeout(() => this.playVideo(obj), 1000);
			return;
		}

		console.log(trackId+" is assigned to " + streamId+" creating "+obj.track.kind);

		var video = document.getElementById("remoteVideo" + streamId);
		if (video == null) {
			this.createRemoteVideo(streamId);
			video = document.getElementById("remoteVideo" + streamId);
			video.srcObject = new MediaStream();
		}
		video.srcObject.addTrack(obj.track);

		obj.track.onended = event => {
			video.srcObject.removeTrack(event.currentTarget);
			if (video.srcObject.getTracks().length == 0) {
				this.removeRemoteVideo(streamId);
			}
		};

		if(!this.headless && video.srcObject.getTracks().length == 2) {
			this.updateLayout();
		}
	}

	updateLayout() {
		var xindex = 0;
		var yindex = 0;
		this.clearAllStreams();
		let players = document.getElementById("players").getElementsByTagName("video");
		for (let i = 0; i < players.length; i++) {
			let video = players[i];
			
			this.addStream(video.srcObject,{ Xindex: xindex, Yindex: yindex, streamId: streamId, element: video});
			if(xindex == 3){
				yindex ++;
				xindex = 0;
			}
			xindex ++;
		}
	}

	createRemoteVideo(streamId) {
		let video = document.createElement("video");
		video.id = "remoteVideo" + streamId;
		video.controls = true;
		video.autoplay = true;
		video.muted = true;
		video.playsinline = true;
		video.height = 50;
		document.getElementById("players").appendChild(video);
	}

	removeRemoteVideo(streamId) {
		var video = document.getElementById("remoteVideo" + streamId);
		if (video != null) {
			video.srcObject = null;
			document.getElementById("players").removeChild(video);
		}

		if(!this.headless && this.isStopping == false) {
			this.updateLayout();
		}
	}

	startMerger() {
        this.initAudioContext();
		var delayInMilliseconds = 1500;

		window.setTimeout(function () {
			this.start();
			var result = this.getResult();
			this.webRTCAdaptorPublisher.mediaManager.gotStream(result);
			this.webRTCAdaptorPublisher.publish(this.publishStreamId, this.token);
		}.bind(this), delayInMilliseconds);
	}

	startStreaming() {
        this.isStopping = false;
		this.startMerger();
		this.webRTCAdaptorPlayer.play(this.roomName, "", "", []);
	}

	stopStreaming() {
        this.isStopping = true;
		this.webRTCAdaptorPublisher.stop(this.publishStreamId);
		this.webRTCAdaptorPlayer.stop(this.roomName);

        this.stop();
	}

	processPublisherMessageAndUpdateLayout(data) {
		var messageObject = JSON.parse(data);
		if (messageObject == null || typeof messageObject != "object" || messageObject.streamId == null || typeof messageObject.streamId == "undefined" || messageObject.streamId !== this.publishStreamId) {
			return;
		}
		console.info("Message received: ", messageObject);
		this.clearAllStreams();
		var layoutOptions = messageObject.layoutOptions;
		var canvasOptions = layoutOptions.canvas;
		this.updateCanvasSize(canvasOptions.width, canvasOptions.height);
		var layout = layoutOptions.layout;
		layout.forEach(function (item) {
			let video = document.getElementById("remoteVideo" + item.streamId);
			if (video != null && typeof video != "undefined" && video.srcObject != null && typeof video.srcObject != "undefined") {
				let region = item.region;
				this.addStream(video.srcObject, { x: region.xPos, y: region.yPos, width: region.width, height: region.height, streamId: item.streamId, placeholderImageUrl: item.placeholderImageUrl, element: video});
			}
			//createImage(item.streamId+"IMG", item.placeholderImageUrl);
		}.bind(this));
		this.layoutList = data;
		this.sendLayoutData("sei");
		if(this.id3IntervalId == -1 && this.sendLayoutInfoToAMS) {
			this.id3IntervalId = setInterval(() => {
				this.sendLayoutData("id3");
			}, 1000);
		}
	}

	createPublisherAdaptor() {
		return new WebRTCAdaptor({
			websocketURL: this.websocketURL,
			localVideoId: "localVideo",
			isPlayMode: true,
			debug: true,
			callback: function (info, obj) {
				if (info == "initialized") {
					console.log("initialized");
					if(this.headless) {
						this.startMerger();
					}
				} 
				else if (info == "publish_started") {
					console.log("publish started");
					//this.startAnimation();
				} 
				else if (info == "data_received") {
					console.log("data_received: " + obj.data);
					this.processPublisherMessageAndUpdateLayout(obj.data);
				}
			}.bind(this),
			callbackError: function (error) {
				console.log("error callback: " + JSON.stringify(error));
			}.bind(this)
		});
	}

	processPlayerNotificationEvent(data) {
		var notificationEvent = JSON.parse(data);
		if (notificationEvent != null && typeof (notificationEvent) == "object") {
			var eventStreamId = notificationEvent.streamId;
			var eventTyp = notificationEvent.eventType;

			if (eventTyp == "VIDEO_TRACK_ASSIGNMENT_LIST") {
				console.log("VIDEO_TRACK_ASSIGNMENT_LIST: " + data);
				const jsonObject = JSON.parse(data);

				jsonObject.payload.forEach(item => {
					this.trackAMSStreamMap[item.videoLabel] = item.trackId;
				});
			}
			else if (eventTyp == "AUDIO_TRACK_ASSIGNMENT") {
				console.log("AUDIO_TRACK_ASSIGNMENT: " + data);
				const jsonObject = JSON.parse(data);

				jsonObject.payload.forEach(item => {
					this.trackAMSStreamMap[item.audioLabel] = item.trackId;
				});
			}
		}
	}

	createPlayerAdaptor() {
		return new WebRTCAdaptor({
			websocketURL: this.websocketURL,
			isPlayMode: true,
			debug: true,
			callback: function (info, obj) {
				if (info == "initialized") {
					console.log("initialized");
					if(this.headless) {
						this.webRTCAdaptorPlayer.play(this.roomName);
					}
				} 
				else if (info == "newStreamAvailable") {
					this.webRTCAdaptorPlayer.requestVideoTrackAssignments(this.roomName);
					this.playVideo(obj);
				} 
				else if (info == "data_received") {
					this.processPlayerNotificationEvent(obj.data);
				} 
			}.bind(this),
			callbackError: function (error) {
				console.log("error callback: " + JSON.stringify(error));
				if (error == "no_stream_exist") {
					setTimeout(function () {
						this.webRTCAdaptorPlayer.play(this.roomName);
						console.log("Retrying Play Stream");
					}.bind(this), 3000);
				}
			}.bind(this)
		});
	}

}
