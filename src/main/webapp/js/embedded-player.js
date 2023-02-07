
import { getUrlParameter } from "./fetch.stream.js";
import "./external/loglevel.min.js";

const Logger = window.log;

const STATIC_VIDEO_HTML =  "<video id='video-player' class='video-js vjs-default-skin vjs-big-play-centered' controls playsinline></video>";

export class EmbeddedPlayer {

	static DEFAULT_PLAY_ORDER = ["webrtc", "hls"];;

	static DEFAULT_PLAY_TYPE  =  ["mp4", "webm"];

	static HLS_EXTENSION  = "m3u8";

	static WEBRTC_EXTENSION = "webrtc";

	static DASH_EXTENSION = "mpd";

	/**
	* streamsFolder: streams folder. Optional. Default value is "streams"
	*/
	static STREAMS_FOLDER = "streams";

	static VIDEO_HTML = STATIC_VIDEO_HTML;

	static VIDEO_PLAYER_ID = "video-player";


    /**
    *  "playOrder": the order which technologies is used in playing. Optional. Default value is "webrtc,hls".
    *	possible values are "hls,webrtc","webrtc","hls","vod","dash"
    *   It will be taken from url parameter "playOrder".
    */
    playOrder;

    /**
     * currentPlayType: current play type in playOrder
     */
    currentPlayType;

    /**
     * "is360": if true, player will be 360 degree player. Optional. Default value is false.
     * It will be taken from url parameter "is360".
     */
    is360 = false;

    /**
     * "streamId": stream id. Mandatory. If it is not set, it will be taken from url parameter "id".
     * It will be taken from url parameter "id".
     */
    streamId;

    /**
     * "playType": play type. Optional.  It's used for vod. Default value is "mp4,webm".
     * It can be "mp4,webm","webm,mp4","mp4","webm","mov" and it's used for vod.
     * It will be taken from url parameter "playType".
     */
    playType;

    /**
     * "token": token. It's required when stream security for playback is enabled .
     * It will be taken from url parameter "token".
     */
    token;

    /**
     * autoplay: if true, player will be started automatically. Optional. Default value is true.
     * autoplay is false by default for mobile devices because of mobile browser's autoplay policy.
     * It will be taken from url parameter "autoplay".
     */
    autoPlay = true;

    /**
     * mute: if true, player will be started muted. Optional. Default value is true.
     * default value is true because of browser's autoplay policy.
     * It will be taken from url parameter "mute".
     */
    mute = true;

    /**
     * targetLatency: target latency in seconds. Optional. Default value is 3.
     * It will be taken from url parameter "targetLatency".
     * It's used for dash(cmaf) playback.
     */
    targetLatency = 3;

    /**
     * subscriberId: subscriber id. Optional. It will be taken from url parameter "subscriberId".
     */
    subscriberId;

    /**
     * subscriberCode: subscriber code. Optional. It will be taken from url parameter "subscriberCode".
     */
    subscriberCode;

    /**
     * window: window object
     */
    window;

    /**
     * video player container element
     */
    containerElement;

    /**
     * player placeholder element
     */
    placeHolderElement;

    /**
     * videojs player
     */
    videojsPlayer;

    /**
     * dash player
     */
    dashPlayer;

    /**
     * Ice servers for webrtc
     */
    iceServers;

    /**
     * ice connection state
     */
    iceConnected;

    /**
     * flag to check if error callback is called
     */
    errorCalled;

    /**
     * scene for 360 degree player
     */
    aScene;

    /**
     * player listener
     */
    playerListener

    /**
     * webRTCDataListener
     */
    webRTCDataListener;

    /**
     * Field to keep if tryNextMethod is already called
     */
    tryNextTechTimer;

    constructor(window, containerElement, placeHolderElement) {

		EmbeddedPlayer.DEFAULT_PLAY_ORDER = ["webrtc", "hls"];;

		EmbeddedPlayer.DEFAULT_PLAY_TYPE =  ["mp4", "webm"];

		EmbeddedPlayer.HLS_EXTENSION = "m3u8";

		EmbeddedPlayer.WEBRTC_EXTENSION = "webrtc";

		EmbeddedPlayer.DASH_EXTENSION = "mpd";

		/**
		* streamsFolder: streams folder. Optional. Default value is "streams"
		*/
		EmbeddedPlayer.STREAMS_FOLDER = "streams";

		EmbeddedPlayer.VIDEO_HTML = STATIC_VIDEO_HTML;

		EmbeddedPlayer.VIDEO_PLAYER_ID = "video-player";

        this.dom = window.document;
        this.window = window;
        var localStreamId = getUrlParameter("id", this.window.location.search);
        this.containerElement = containerElement;
        this.placeHolderElement = placeHolderElement;
        this.errorCalled = false;
        this.iceConnected = false;
        this.tryNextTechTimer = -1;
        this.videojsPlayer = null;

        this.iceServers = '[ { "urls": "stun:stun1.l.google.com:19302" } ]';

        if (localStreamId == null) {
            //check name variable for compatibility with older versions

            localStreamId = getUrlParameter("name", this.window.location.search);
            if (localStreamId == null) {
	 			Logger.warn("Please use id parameter instead of name parameter.");
			}
        }

        if (localStreamId == null) {
            var message = "Stream id is not set.Please add your stream id to the url as a query parameter such as ?id={STREAM_ID} to the url"
            Logger.error(message);
            //TODO: we may need to show this message on directly page
            alert(message);
            throw new Error(message);
        }
        this.streamId = localStreamId;

        var localIs360 = getUrlParameter("is360", this.window.location.search);
        if (localIs360 != null) {
            this.is360 = localIs360.toLocaleLowerCase() == "true";
        }

        var localPlayType = getUrlParameter("playType", this.window.location.search);
        if (localPlayType != null) {
            this.playType = localPlayType.split(',');
        }
        else {

            this.playType = EmbeddedPlayer.DEFAULT_PLAY_TYPE;
        }

        this.token = getUrlParameter("token", this.window.location.search);
        if (this.token === undefined) {
			this.token = null;
		}

    
        var localAutoPlay = getUrlParameter("autoplay", this.window.location.search);
        if (localAutoPlay != null) {
            this.autoPlay = localAutoPlay.toLocaleLowerCase() == "true";
        }
        

        var localMute = getUrlParameter("mute",this.window.location.search);
        if (localMute != null) {
            this.mute = localMute.toLocaleLowerCase() == "true";
        }

        var localTargetLatency = getUrlParameter("targetLatency", this.window.location.search);
        if (localTargetLatency != null) {
            var latencyInNumber = Number(localTargetLatency);
            if (!isNaN(latencyInNumber)) {
                this.targetLatency = latencyInNumber;
            }
            else {
                Logger.warn("targetLatency parameter is not a number. It will be ignored.");
            }
        }

        this.subscriberId = getUrlParameter("subscriberId", this.window.location.search);
        if (this.subscriberId === undefined) {
			this.subscriberId = null;
		}

        this.subscriberCode = getUrlParameter("subscriberCode",this.window.location.search);
        if (this.subscriberCode == null) {
			 this.subscriberCode = null;
		}

        var playOrderParameter = getUrlParameter("playOrder",this.window.location.search);
        if (playOrderParameter != null) {
            this.playOrder = playOrderParameter.split(',');
        }
        else {
            this.playOrder = EmbeddedPlayer.DEFAULT_PLAY_ORDER;
        }
        this.loadScripts();

        this.setPlayerVisible(false);


    }

    /**
     * load scripts dynamically
     */
    loadScripts() {
        if (this.playOrder.includes("hls") || this.playOrder.includes("vod") || this.playOrder.includes("webrtc")) {
            //it means we're going to use videojs
            //load videojs css
            var videoJsExternalCss = this.dom.createElement("link");
            videoJsExternalCss.setAttribute("rel", "stylesheet");
            videoJsExternalCss.setAttribute("type", "text/css");
            videoJsExternalCss.setAttribute("href", "css/external/video-js.css");
            this.dom.head.appendChild(videoJsExternalCss);

            //include videojs -> js
            var videoJsExternalJs = this.dom.createElement("script");
            videoJsExternalJs.type = "text/javascript";
            videoJsExternalJs.src = "js/external/video.js";
            videoJsExternalJs.async = false;
            this.dom.head.appendChild(videoJsExternalJs);

            // These files should call after videojs file loaded completely
            videoJsExternalJs.onload = () => {

                var videoJsQualityLevel = this.dom.createElement("script");
                videoJsQualityLevel.type = "text/javascript";
                videoJsQualityLevel.src = "js/external/videojs-contrib-quality-levels.min.js";
                this.dom.head.appendChild(videoJsQualityLevel);

                var videoJsQualitySelector = this.dom.createElement("script");
                videoJsQualitySelector.type = "text/javascript";
                videoJsQualitySelector.src = "js/external/videojs-hls-quality-selector.min.js";
                this.dom.head.appendChild(videoJsQualitySelector);

            }
        }

        if (this.playOrder.includes("webrtc")) {
            var webrtcVideoJsExternalCss = this.dom.createElement("link");
            webrtcVideoJsExternalCss.setAttribute("rel", "stylesheet");
            webrtcVideoJsExternalCss.setAttribute("type", "text/css");
            webrtcVideoJsExternalCss.setAttribute("href", "css/videojs-webrtc-plugin.css");
            this.dom.head.appendChild(webrtcVideoJsExternalCss);

            var webrtcVideoJsExternalJs = this.dom.createElement("script");
            webrtcVideoJsExternalJs.type = "text/javascript";
            webrtcVideoJsExternalJs.src = "js/videojs-webrtc-plugin.js";
            webrtcVideoJsExternalJs.async = false;
            this.dom.head.appendChild(webrtcVideoJsExternalJs);
        }
        if (this.playOrder.includes("dash")) {
            var js = this.dom.createElement("script");
            js.type = "text/javascript";
            js.src = "js/external/dash.all.min.js";
            this.dom.head.appendChild(js);
        }

        if (this.is360) {
            var aframeJS = this.dom.createElement("script");
            aframeJS.type = "text/javascript";
            aframeJS.src = "js/external/aframe.min.js";

            this.dom.head.appendChild(aframeJS);
        }
    }

    /**
     * enable 360 player
     */
    enable360Player() {
        this.aScene = this.dom.createElement("a-scene");
        var elementId = this.dom.getElementsByTagName("video")[0].id;
        this.aScene.innerHTML = "<a-videosphere src=\"#"+elementId+"\" rotation=\"0 180 0\" style=\"background-color: antiquewhite\"></a-videosphere>";
        this.dom.body.appendChild(this.aScene);
    }

    /**
     * set player visibility
     * @param {boolean} visible
     */
    setPlayerVisible(visible) {
        this.containerElement.style.display = visible ? "block" : "none";
        this.placeHolderElement.style.display = visible ? "none" : "block";

        if (this.is360) {
            if (visible) {
                this.enable360Player();
            }
            else if (this.aScene != null) {
                var elements = this.dom.getElementsByTagName("a-scene");
                while (elements.length > 0) {
                    this.dom.body.removeChild(elements[0]);
                    elements = this.dom.getElementsByTagName("a-scene");
                }
                this.aScene = null;
            }
        }
    }


    handleWebRTCInfoMessages(infos) {
	    if (infos["info"] == "ice_connection_state_changed") {
            Logger.debug("ice connection state changed to " + infos["obj"].state);
            if (infos["obj"].state == "completed" || infos["obj"].state == "connected") {
                this.iceConnected = true;
            }
            else if (infos["obj"].state == "failed" || infos["obj"].state == "disconnected" || infos["obj"].state == "closed") {
				//
				Logger.debug("Ice connection is not connected. tryNextTech to replay");
				this.tryNextTech();
			}

        }
        else if (infos["info"] == "closed") {
			//this means websocket is closed and it stops the playback - tryNextTech
			Logger.debug("Websocket is closed. tryNextTech to replay");
			this.tryNextTech();
		}
	}

    /**
     * Play the stream via videojs
     * @param {*} streamUrl
     * @param {*} extension
     * @returns
     */
    playWithVideoJS(streamUrl, extension) {
        var type;
        if (extension == "mp4") {
            type = "video/mp4";
        }
        else if (extension == "webm") {
            type = "video/webm";
        }
        else if (extension == "mov") {
            type = "video/mp4";
            alert("Browsers do not support to play mov format");
        }
        else if (extension == "avi") {
            type = "video/mp4";
            alert("Browsers do not support to play avi format");
        }
        else if (extension == "m3u8") {
            type = "application/x-mpegURL";
        }
        else if (extension == "mpd") {
            type = "application/dash+xml";
        }
        else if (extension == "webrtc") {
            type = "video/webrtc";
        }
        else {
            Logger.warn("Unknown extension: " + extension);
            return;
        }

        var preview = this.streamId;
        if (this.streamId.endsWith("_adaptive")) {
            preview = streamId.substring(0, streamId.indexOf("_adaptive"));
        }

        //same videojs is being use for hls, vod and webrtc streams
        this.videojsPlayer = videojs(EmbeddedPlayer.VIDEO_PLAYER_ID, {
            poster: "previews/" + preview + ".png",
            liveui: extension == "m3u8" ? true : false,
            liveTracker: {
                trackingThreshold: 0
            },
            html5: {
                vhs: {
                    limitRenditionByPlayerDimensions: false
                }
            },
            controls: true,
            class: 'video-js vjs-default-skin vjs-big-play-centered',
            muted: this.mute,
            preload: "auto",
            autoplay: this.autoPlay

        });

        this.videojsPlayer.on('error', (e) => {
            Logger.warn("There is an error in playback: " + e);
            // We need to add this kind of check. If we don't add this kind of checkpoint, it will create an infinite loop
            if (!this.errorCalled) {
                this.errorCalled = true;
                setTimeout(() => {
                    this.tryNextTech();
                    this.errorCalled = false;
                }, 2500)
            }
        });

		//webrtc specific events
		if (extension == "webrtc") {

	        this.videojsPlayer.on('webrtc-info', (event, infos) => {

	            //Logger.warn("info callback: " + JSON.stringify(infos));
				this.handleWebRTCInfoMessages(infos);
	        });


	        this.videojsPlayer.on('webrtc-error', (event, errors) => {
	            //some of the possible errors, NotFoundError, SecurityError,PermissionDeniedError
	            Logger.warn("error callback: " + JSON.stringify(errors));

	            if (errors["error"] == "no_stream_exist" || errors["error"] == "WebSocketNotConnected"
	                || errors["error"] == "not_initialized_yet" || errors["error"] == "data_store_not_available"
	                || errors["error"] == "highResourceUsage" || errors["error"] == "unauthorized_access"
	                || errors["error"] == "user_blocked") {

	                //handle high resource usage and not authroized errors && websocket disconnected
	                //Even if webrtc adaptor has auto reconnect scenario, we dispose the videojs immediately in tryNextTech
	                // so that reconnect scenario is managed here

	                this.tryNextTech();
	            }
	            else if (errors["error"] == "notSetRemoteDescription") {
	                /*
	                * If getting codec incompatible or remote description error, it will redirect HLS player.
	                */
	                Logger.warn("notSetRemoteDescription error. Redirecting to HLS player.");
	                this.playIfExists("hls");
	            }
	        });

	        this.videojsPlayer.on("webrtc-data-received", (event, obj) => {
	            Logger.warn("webrtc-data-received: " + JSON.stringify(obj));
	            if (this.webRTCDataListener != null) {
	                this.webRTCDataListener(obj);
	            }
	        });
        }

		//hls specific calls
		if (extension == "m3u8") {
	        videojs.Vhs.xhr.beforeRequest = (options) => {

                var securityParams = this.getSecurityQueryParams();
                if (!options.uri.includes(securityParams))
                {
                    if (!options.uri.endsWith("?"))
                    {
                        options.uri = options.uri + "?";
                    }
                    options.uri += securityParams;
                }

                Logger.debug("hls request: " + options.uri);
	            return options;
	        };


	        this.videojsPlayer.ready(() => {

	            // If it's already added to player, no need to add again
	            if (typeof this.videojsPlayer.hlsQualitySelector === "function") {
	                this.videojsPlayer.hlsQualitySelector({
	                    displayCurrentQuality: true,
	                });
	            }

	            // If there is no adaptive option in m3u8 no need to show quality selector
	            let qualityLevels = this.videojsPlayer.qualityLevels();
	            qualityLevels.on('addqualitylevel', function (event) {
	                let qualityLevel = event.qualityLevel;
	                if (qualityLevel.height) {
	                    qualityLevel.enabled = true;
	                } else {
	                    qualityLevels.removeQualityLevel(qualityLevel);
	                    qualityLevel.enabled = false;
	                }
	            });
	        });
        }

        //videojs is being used to play mp4, webm, m3u8 and webrtc
        //make the videoJS visible when ready is called except for webrtc
        //webrtc fires ready event all cases so we use "play" event to make the player visible

        //this setting is critical to play in mobile
        if (extension == "mp4" || extension == "webm" || extension == "m3u8") {
            this.makeVideoJSVisibleWhenReady();
        }

        this.videojsPlayer.on('ended', () => {
            //reinit to play after it ends
            Logger.warn("stream is ended")
            this.setPlayerVisible(false);
            //for webrtc, this event can be called by two reasons
            //1. ice connection is not established, it means that there is a networking issug
            //2. stream is ended
            if (this.currentPlayType != "vod") {
                //if it's vod, it means that stream is ended and no need to replay

                if (this.iceConnected) {
                    //if iceConnected is true, it means that stream is really ended for webrtc

                    //initialize to play again if the publishing starts again
                    this.playIfExists(this.playOrder[0]);
                }
                else if (this.currentPlayType == "hls") {
                    //if it's hls, it means that stream is ended

                    this.setPlayerVisible(false);
                    if (this.playOrder[0] = "hls")
                    {
                        //do not play again if it's hls because it play last seconds again, let the server clear it
                        setTimeout(() => {
                            this.playIfExists(this.playOrder[0]);
                        }, 10000);
                    }
                    else
                    {
                        this.playIfExists(this.playOrder[0]);
                    }
                    //TODO: what if the stream is hls vod then it always re-play
                }
                else {
                    //if iceConnected is false, it means that there is a networking issue for webrtc
                    this.tryNextTech();
                }
            }
            if (this.playerListener != null) {
                this.playerListener("ended");
            }

        });

        //webrtc plugin sends play event. On the other hand, webrtc plugin sends ready event for every scenario.
        //so no need to trust ready event for webrt play
        this.videojsPlayer.on("play", () => {
            this.setPlayerVisible(true);
            if (this.playerListener != null) {
                this.playerListener("play");
            }
        });
        this.iceConnected = false;

        this.videojsPlayer.src({
            src: streamUrl,
            type: type,
            withCredentials: true,
            iceServers: this.iceServers,
            reconnect: false, //webrtc adaptor has auto reconnect scenario, just disable it, we manage it here

        });

        if (this.autoPlay) {
            this.videojsPlayer.play().catch((e) => {
				 Logger.warn("Problem in playback. The error is " + e);
			});
        }
    }


    makeVideoJSVisibleWhenReady() {
		this.videojsPlayer.ready(() => {
			 this.setPlayerVisible(true);
		});
	}

    /**
     * check if stream exists via http
     * @param {*} streamsfolder
     * @param {*} streamId
     * @param {*} extension
     * @returns
     */
    checkStreamExistsViaHttp(streamsfolder, streamId, extension) {

        var streamPath = "";
        if (!streamId.startsWith(streamsfolder)) {
            streamPath += streamsfolder + "/";
        }
        streamPath += streamId;

        if (extension != null && extension != "") {
            //if there is extension, add it and try if _adaptive exists
            streamPath += "_adaptive" + "." + extension;
        }

        streamPath = this.addSecurityParams(streamPath);

        return fetch(streamPath, { method: 'HEAD' })
            .then((response) => {
                if (response.status == 200) {
                    // adaptive m3u8 & mpd exists,play it
                    return new Promise(function (resolve, reject) {
                        resolve(streamPath);
                    });
                } else {
                    //adaptive not exists, try mpd or m3u8 exists.
                    streamPath = streamsfolder + "/" + streamId + "." + extension;
                    streamPath = this.addSecurityParams(streamPath);

                    return fetch(streamPath, { method: 'HEAD' })
                        .then((response) => {
                            if (response.status == 200) {
                                return new Promise(function (resolve, reject) {
                                    resolve(streamPath);
                                });
                            }
                            else {
                                Logger.warn("No stream found");
                                return new Promise(function (resolve, reject) {
                                    reject("resource_is_not_available");
                                });
                            }
                        });
                }
            });
    }

    addSecurityParams(streamPath) {
        var securityParams = this.getSecurityQueryParams();
        if (securityParams != null && securityParams != "") {
            streamPath += "?" + securityParams;
        }
        return streamPath;
    }

    /**
     * try next tech if current tech is not working
     */
    tryNextTech() {
		if (this.tryNextTechTimer == -1)
		{
	        this.destroyDashPlayer();
	        this.destroyVideoJSPlayer();
	        this.setPlayerVisible(false);
	        var index = this.playOrder.indexOf(this.currentPlayType);
	        if (index == -1 || index == (this.playOrder.length - 1)) {
	            index = 0;
	        }
	        else {
	            index++;
	        }

	        this.tryNextTechTimer = setTimeout(() => {
				 this.tryNextTechTimer = -1;
	            this.playIfExists(this.playOrder[index]);
	        }, 3000);
        }
        else
        {
			Logger.debug("tryNextTech is already scheduled no need to schedule again");
		}
    }

    /**
     * play stream throgugh dash player
     * @param {string"} streamUrl
     */
    playViaDash(streamUrl) {
        this.destroyDashPlayer();
        this.dashPlayer = dashjs.MediaPlayer().create();
        this.dashPlayer.extend("RequestModifier", () => {
            return {
                modifyRequestHeader: function (xhr, { url }) {
                    return xhr;
                },
                modifyRequestURL: (url) => {
                    var modifiedUrl = ""

                    var securityParams = this.getSecurityQueryParams();
                    if (!url.includes(securityParams))
                    {
                        if (!url.endsWith("?"))
                        {
                            url += "?";
                        }
                        modifiedUrl = url + securityParams;
						Logger.warn(modifiedUrl);
						return modifiedUrl
                    }

                    return url;
                },
                modifyRequest(request) {

                },
            };
        });

        this.dashPlayer.updateSettings({
            streaming: {
                delay: {
                    liveDelay: this.targetLatency
                },
                liveCatchup: {
                    maxDrift: 0.05,
                    playbackRate: 0.5,
                    latencyThreshold: 60
                }
            }
        });

        this.dashPlayer.initialize(this.containerElement.firstChild, streamUrl, this.autoPlay);

        this.dashPlayer.setMute(this.mute);

        this.dashLatencyTimer = setInterval(() => {
            Logger.warn("live latency: " + this.dashPlayer.getCurrentLiveLatency());
        }, 2000);


       	this.makeDashPlayerVisibleWhenInitialized();

        this.dashPlayer.on(dashjs.MediaPlayer.events.PLAYBACK_PLAYING, (event) => {
            Logger.warn("playback started");
            this.setPlayerVisible(true);
            if (this.playerListener != null) {
                this.playerListener("play");
            }
        });
        this.dashPlayer.on(dashjs.MediaPlayer.events.PLAYBACK_ENDED, () => {
            Logger.warn("playback ended");
            this.destroyDashPlayer();
            this.setPlayerVisible(false);
            //streaming can be started again so try to play again with preferred tech
            if (this.playOrder[0] = "dash")
            {
                //do not play again if it's dash because it play last seconds again, let the server clear it
                setTimeout(() => {
                    this.playIfExists(this.playOrder[0]);
                }, 10000);
            }
            else {
                this.playIfExists(this.playOrder[0]);
            }
            if (this.playerListener != null) {
                this.playerListener("ended");
            }
        });
        this.dashPlayer.on(dashjs.MediaPlayer.events.PLAYBACK_ERROR, (event) => {
            this.tryNextTech();
        });
        this.dashPlayer.on(dashjs.MediaPlayer.events.ERROR, (event) => {
            this.tryNextTech();
        });
    }

    makeDashPlayerVisibleWhenInitialized() {
		 this.dashPlayer.on(dashjs.MediaPlayer.events.STREAM_INITIALIZED, (event) => {
            Logger.warn("Stream initialized");
            //make the player visible in mobile devices
            this.setPlayerVisible(true);
        });
	}

    /**
     * destroy the dash player
     */
    destroyDashPlayer() {
        if (this.dashPlayer) {
            this.dashPlayer.destroy();
            this.dashPlayer = null;
            clearInterval(this.dashLatencyTimer);
        }
    }

    /**
     * destroy the videojs player
     */
    destroyVideoJSPlayer() {
        if (this.videojsPlayer) {
            this.videojsPlayer.dispose();
            this.videojsPlayer = null;
        }
    }

    /**
     * play the stream with the given tech
     * @param {string} tech
     */
    async playIfExists(tech) {
        this.currentPlayType = tech;
        this.destroyVideoJSPlayer();
        this.destroyDashPlayer();
        this.setPlayerVisible(false);

        this.containerElement.innerHTML = EmbeddedPlayer.VIDEO_HTML;

        Logger.warn("Try to play the stream " + this.streamId + " with " + this.currentPlayType);
        switch (this.currentPlayType) {
            case "hls":
                //TODO: Test case for hls
                //1. Play stream with adaptive m3u8 for live and VoD
                //2. Play stream with m3u8 for live and VoD
                //3. if files are not available check nextTech is being called
                return this.checkStreamExistsViaHttp(EmbeddedPlayer.STREAMS_FOLDER, this.streamId, EmbeddedPlayer.HLS_EXTENSION).then((streamPath) => {

                    this.playWithVideoJS(streamPath, EmbeddedPlayer.HLS_EXTENSION);
                    Logger.warn("incoming stream path: " + streamPath);

                }).catch((error) => {

                    Logger.warn("HLS stream resource not available for stream:" + this.streamId + " error is " + error + ". Try next play tech");
                    this.tryNextTech();
                });
            case "dash":
                return this.checkStreamExistsViaHttp(EmbeddedPlayer.STREAMS_FOLDER, this.streamId + "/" + this.streamId, EmbeddedPlayer.DASH_EXTENSION).then((streamPath) => {
                    this.playViaDash(streamPath);
                }).catch((error) => {
                    Logger.warn("DASH stream resource not available for stream:" + this.streamId + " error is " + error + ". Try next play tech");
                    this.tryNextTech();
                });

            case "webrtc":
                var appName = this.window.location.pathname.substring(0, this.window.location.pathname.lastIndexOf("/") + 1);
                var path = this.window.location.hostname + ":" + this.window.location.port + appName + this.streamId + ".webrtc";
                var websocketURL = "ws://" + path;

                if (location.protocol.startsWith("https")) {
                    websocketURL = "wss://" + path;
                }

                return this.playWithVideoJS(this.addSecurityParams(websocketURL), EmbeddedPlayer.WEBRTC_EXTENSION);
            case "vod":
                //TODO: Test case for vod
                //1. Play stream with mp4 for VoD
                //2. Play stream with webm for VoD
                //3. Play stream with playOrder type

                var lastIndexOfDot = this.streamId.lastIndexOf(".");
                var extension;
                if (lastIndexOfDot != -1)
                {
                    //if there is a dot in the streamId, it means that this is extension, use it. make the extension empty
                    this.playType[0] = "";
                    extension = this.streamId.substring(lastIndexOfDot + 1);
                }
                else {
					//we need to give extension to playWithVideoJS
					extension = this.playType[0];
				}

                return this.checkStreamExistsViaHttp(EmbeddedPlayer.STREAMS_FOLDER, this.streamId,  this.playType[0]).then((streamPath) => {

                    //we need to give extension to playWithVideoJS
                    this.playWithVideoJS(streamPath, extension);

                }).catch((error) => {
                    Logger.warn("VOD stream resource not available for stream:" + this.streamId + " and play type " + this.playType[0] + ". Error is " + error);
                    if (this.playType.length > 1) {
                        Logger.warn("Try next play type which is " + this.playType[1] + ".")
                        this.checkStreamExistsViaHttp(EmbeddedPlayer.STREAMS_FOLDER, this.streamId, this.playType[1]).then((streamPath) => {
                            this.playWithVideoJS(streamPath, this.playType[1]);
                        }).catch((error) => {
                            Logger.warn("VOD stream resource not available for stream:" + this.streamId + " and play type error is " + error);
                        });
                    }

                });
        }
    }

    /**
     *
     * @returns {String} query string for security
     */
    getSecurityQueryParams() {
        var queryString = "";
        if (this.token != null) {
            queryString += "&token=" + this.token;
        }
        if (this.subscriberId != null) {
            queryString += "&subscriberId=" + this.subscriberId;
        }
        if (this.subscriberCode != null) {
            queryString += "&subscriberCode=" + this.subscriberCode;
        }
        return queryString;
    }

    /**
     * play the stream with videojs player or dash player
     */
    play() {
        if (this.streamId.startsWith(EmbeddedPlayer.STREAMS_FOLDER)) {

            //start videojs player because it directly try to play stream from streams folder
            var lastIndexOfDot = this.streamId.lastIndexOf(".");
            var extension = this.streamId.substring(lastIndexOfDot + 1);

            this.playOrder= ["vod"];


            if (extension == EmbeddedPlayer.DASH_EXTENSION)
            {
				this.playViaDash(this.addSecurityParams(this.streamId), extension);
			}
			else  {
				this.playWithVideoJS(this.addSecurityParams(this.streamId), extension);
			}
        }
        else {
            this.playIfExists(this.playOrder[0]);
        }
    }

    /**
     * mute or unmute the player
     * @param {boolean} mutestatus true to mute the player
     */
    mutePlayer(mutestatus)
    {
        this.mute = mutestatus;
        if (this.videojsPlayer) {
            this.videojsPlayer.muted(mutestatus);
        }
        if (this.dashPlayer) {
            this.dashPlayer.setMute(mutestatus);
        }
    }

    /**
     *
     * @returns {boolean} true if player is muted
     */
    isMuted() {
        return this.mute;
    }

    addPlayerListener(playerListener) {
        this.playerListener = playerListener;
    }

    /**
     * WebRTC data listener
     * @param {*} webRTCDataListener
     */
    addWebRTCDataListener(webRTCDataListener) {
        this.webRTCDataListener = webRTCDataListener
    }

    /**
     *
     * @param {*} data
     */
    sendWebRTCData(data) {
	    try {
	        if (this.videojsPlayer && this.currentPlayType == "webrtc") {
	            this.videojsPlayer.sendDataViaWebRTC(data);
	            return true;
	        }
	        else {
	            Logger.warn("Player is not ready or playType is not WebRTC");
	        }
	    } catch (error) {
	        // Handle the error here
	        Logger.error("An error occurred while sending WebRTC data: ", error);
	    }
	    return false;
	}




}
