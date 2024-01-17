import { getUrlParameter } from "./fetch.stream.js";
import { EmbeddedPlayer } from "./embedded-player.js";

import "./external/loglevel.min.js";
import { WebRTCAdaptor } from "./webrtc_adaptor.js";

const Logger = window.log;
Logger.setLevel("debug", true);

class Analytics {
    static publish = "Publish";
    static play = "Player"
    static statsPushInterval = 8;
    static statsSetInterval = 3;
    static APIKey = null;
    static webrtInfoList = ["bitrateMeasurement"];
    static Dash = "dash";
    static WebRTC = "webrtc";
    static HLS = "hls";

    constructor(APIKey, embeddedPlayer, customerId) {
        //chaning the data order here will also require to change the data order on bitmovin dashboard
        //other wise data will miss mach the key value
        Analytics.APIKey = APIKey
        var bitmovinKey = getUrlParameter("bitmovinKey");

        if (Analytics.APIKey == null || Analytics.APIKey == undefined || Analytics.APIKey == "") {
            Logger.debug("No Licence Key Specified");
            return
        }

        this.customData_fields = {
            "protocol": null,
            "videoHeight": null,
            "videoWidth": null,
            "clientType": null,
            "startTime": null,
            "videoDuration": null,
            "error": "error",      //WebRTCAdapter

            "videoBitrate": null,  //Embeded Player
            "audioBitrate": null,
            "targetBitrate": null,
            "endTime": null,
            "StartTimeEpoch": null,
            "statsUpdateCount": 0,
            "playOrder": "playOrder",
            "is360": "is360",
            "fileType": "playType",
            "autoPlay": "autoPlay",
            "errorCalled": "errorCalled"
        }


        this.webrtc_interval = null;
        this.currentAnalyizer = null;
        this.embeddedPlayer = embeddedPlayer;
        
        console.warn(embeddedPlayer)
        this.customerId = customerId || getUrlParameter("customerId");
        this.videoElementid = null;
        window.aaa = embeddedPlayer;
        var setStatInterval = setInterval(this.setStats.bind(this), Analytics.statsSetInterval * 1000);
        var pushStatsInterval = setInterval(this.pushStats.bind(this), Analytics.statsPushInterval * 1000);

    }

    analyze(clientType) {
        var title, streamId, videoElementid;

        if (this.embeddedPlayer instanceof EmbeddedPlayer) {
            title = window.location.pathname.substring(1, window.location.pathname.lastIndexOf("/"));
            streamId = this.embeddedPlayer.streamId
            videoElementid = EmbeddedPlayer.VIDEO_PLAYER_ID;
            this.customerId = getUrlParameter("customerId");
        }
        else if (this.embeddedPlayer instanceof WebRTCAdaptor) {
            var websocketURL = this.embeddedPlayer.websocketURL.split("/")
            title = websocketURL[websocketURL.length - 2];
            console.warn(title)
            if (clientType == Analytics.publish) {
                streamId = this.embeddedPlayer.publishStreamId;
                this.videoElementid = this.embeddedPlayer.localVideoElement.id;
                this.customData_fields.protocol = Analytics.WebRTC;
            }
            if (clientType == Analytics.play) {
                streamId = this.embeddedPlayer.playStreamId[0];
                this.videoElementid = this.embeddedPlayer.remoteVideoId;
            }
        }

        if (this.currentAnalyizer == null || this.embeddedPlayer instanceof EmbeddedPlayer) {
            this.currentAnalyizer = this.init_analytics(streamId, title, clientType);
            this.setStats({ "initStats": true, clientType })

        }
        else {
            //  Object.keys(this.customData_fields).forEach(key => this.customData_fields[key] = null);
            this.changeSrc(streamId, title, clientType)
            this.setStats({ "initStats": true, clientType })
        }
        return this.currentAnalyizer;
    }
    changeSrc(streamId, title, clientType) {
        this.currentAnalyizer.sourceChange({
            videoId: streamId,
            title: title,
            customData1: this.customData_fields.protocol,
            customData4: clientType
        });
    }
    //update the data in json object
    setStats(description) {
        if (description == null)
            description = {}
        if (Analytics.APIKey == null || Analytics.APIKey == undefined || this.currentAnalyizer == null || this.currentAnalyizer == undefined)
            return;

        let time = new Date();
        this.customData_fields.statsUpdateCount++;

        if (description.hasOwnProperty("initStats")) {
            // Object.keys(this.customData_fields).forEach(key => this.customData_fields[key] = null);
            if (this.embeddedPlayer instanceof EmbeddedPlayer) {
                this.customData_fields.protocol = this.embeddedPlayer.currentPlayType;
                this.customData_fields.is360 = this.embeddedPlayer.is360;
                this.customData_fields.playOrder = this.embeddedPlayer.playOrder;
                this.customData_fields.errorCalled = this.embeddedPlayer.errorCalled;
                this.customData_fields.error = this.embeddedPlayer.error;
                this.customData_fields.autoPlay = this.embeddedPlayer.autoPlay;
            }
            this.customData_fields.startTime = time.toUTCString();
            this.customData_fields.StartTimeEpoch = Date.now();
            this.customData_fields.clientType = description.clientType;
        }
        else if (description.hasOwnProperty("videoBitrate")) {
            this.customData_fields.videoBitrate = description.videoBitrate / this.customData_fields.statsUpdateCount;
            this.customData_fields.audioBitrate = description.audioBitrate / this.customData_fields.statsUpdateCount;
            this.customData_fields.targetBitrate = description.targetBitrate;
        }


        this.customData_fields.videoWidth = this.currentAnalyizer.analytics.adapter.getCurrentPlaybackInfo().videoPlaybackWidth;
        this.customData_fields.videoHeight = this.currentAnalyizer.analytics.adapter.getCurrentPlaybackInfo().videoPlaybackHeight;


        this.customData_fields.endTime = time.toUTCString();
        this.customData_fields.videoDuration = ((Date.now() - this.customData_fields.StartTimeEpoch) / (1000 * 60)).toFixed(3);
    }
    //send the data updates to bitmovin
    pushStats() {
        if (this.currentAnalyizer == null || this.currentAnalyizer == undefined)
            return;
        let FormatedCustomData = this.mapFieldToCustomdataFormat(this.customData_fields);
        this.currentAnalyizer.setCustomDataOnce(FormatedCustomData);
        console.info(this.FormatedCustomData)

    }
    init_analytics(streamId, title, clientType) {
        console.log(remoteVideo, this.videoElementid)
        const analyticsConfig = {
            key: Analytics.APIKey,
            videoId: streamId,
            title: title,
            customUserId: this.customerId,
            customData1: this.embeddedPlayer.currentPlayType,
            customData4: clientType
        };
        var bitmovinAnalytics;

        if (this.embeddedPlayer instanceof EmbeddedPlayer) {
            if (this.embeddedPlayer.currentPlayType == Analytics.Dash) {
                remoteVideo = document.getElementById("video-player");
                bitmovinAnalytics = new bitmovin.analytics.adapters.DashjsAdapter(analyticsConfig, remoteVideo);

            }
            else {
                var remoteVideo = document.getElementById("video-player_html5_api");
                bitmovinAnalytics = new bitmovin.analytics.adapters.VideojsAdapter(analyticsConfig, embeddedPlayer.videojsPlayer);
            }
        }
        else if (this.embeddedPlayer instanceof WebRTCAdaptor) {
            remoteVideo = document.getElementById(this.videoElementid);
            bitmovinAnalytics = new bitmovin.analytics.adapters.HTMLVideoElementAdapter(analyticsConfig, remoteVideo);
        }

        this.currentAnalyizer = bitmovinAnalytics;
        console.log(this.currentAnalyizer)
        window.aa = bitmovinAnalytics
        return bitmovinAnalytics;
    }

    //converting data to send to bitmovin according to their expected format
    mapFieldToCustomdataFormat(customData) {
        var newFormatedData = {};
        window.custom = customData;
        let i = 1;
        Object.keys(customData).forEach((data) => {
            newFormatedData["customData" + i] = this.customData_fields[data];
            i++;
        })
     //   console.warn(newFormatedData);
        return newFormatedData;
    }
    stop() {
        this.currentAnalyizer = null;
    }
}

export { Analytics };