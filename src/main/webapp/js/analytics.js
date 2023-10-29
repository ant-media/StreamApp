import { getUrlParameter } from "./fetch.stream.js";
import { EmbeddedPlayer } from "./embedded-player.js";

import "./external/loglevel.min.js";

const Logger = window.log;
Logger.setLevel("debug", true);

class Analytics {
    static publisher = "Publisher";
    static player = "Player"
    static statsPushInterval = 8;
    static statsSetInterval = 5;
    static APIKey = null;
    static webrtInfoList = ["bitrateMeasurement"];

    constructor(APIKey, embeddedPlayer) {
        //chaning the data order here will also require to change the data order on bitmovin dashboard
        //other wise data will miss mach the key value
        Analytics.APIKey = APIKey
        var bitmovinKey = getUrlParameter("bitmovinKey");

        if (Analytics.APIKey == null || Analytics.APIKey == undefined || Analytics.APIKey == "") {
            Logger.debug("No Licence Key Specified");
            return
        }

        this.customData_fields = {
            "protocol": null, //currentPlayType
            "videoBitrate": null,
            "videoDuration": null,
            "videoHegint": null,
            "videoWidth": null,
            "audioBitrate": null,
            "targetBitrate": null,
            "clientType": null,
            "startTime": null,
            "endTime": null,
            "StartTimeEpoch": null,
            "statsUpdateCount": 0,
            "pageLoadTime": null,
            "playOrder": "playOrder",
            "is360": "is360",
            "fileType": "playType",
            "autoPlay": "autoPlay",
            "errorCalled": "errorCalled",
            "error": "error"
        }


        this.webrtc_interval = null;
        this.is_analytics_initialized = {};
        this.currentAnalyizer = null;
        this.embeddedPlayer = embeddedPlayer;

        // var setStatInterval = setInterval(this.setStats.bind(this), Analytics.statsPushInterval * 1000);
        var pushStatsInterval = setInterval(this.pushStats.bind(this), Analytics.statsSetInterval * 1000);

    }

    analyze(clientType) {
        var title = window.location.pathname.substring(1, window.location.pathname.lastIndexOf("/"));
        var streamId = this.embeddedPlayer.streamId
        var videoElementid = EmbeddedPlayer.VIDEO_PLAYER_ID;
        var customerId = getUrlParameter("customerId");


        this.currentAnalyizer = this.init_analytics(streamId, title, customerId, videoElementid, clientType);
        this.setStats({ "initStats": true, clientType })

        return this.currentAnalyizer;
    }
    //update the data in json object
    setStats(description) {

        if (Analytics.APIKey == null || Analytics.APIKey == undefined || description == null || description == undefined || description == {} || this.currentAnalyizer == null || this.currentAnalyizer == undefined)
            return;

        let time = new Date();
        this.customData_fields.statsUpdateCount++;
        if (description.hasOwnProperty("initStats")) {
            Object.keys(this.customData_fields).forEach(key => this.customData_fields[key] = null);
            this.customData_fields.protocol = this.embeddedPlayer.currentPlayType;
            this.customData_fields.clientType = description.clientType;
            this.customData_fields.is360 = this.embeddedPlayer.is360;
            this.customData_fields.playOrder = this.embeddedPlayer.playOrder;
            this.customData_fields.errorCalled = this.embeddedPlayer.errorCalled;
            this.customData_fields.error = this.embeddedPlayer.error;
            this.customData_fields.startTime = time.toUTCString();
            this.customData_fields.autoPlay = this.embeddedPlayer.autoPlay;
            this.customData_fields.StartTimeEpoch = Date.now();
            this.customData_fields.pageLoadTime = this.currentAnalyizer.analytics.pageLoadTime
        }
        else if (description.hasOwnProperty("videoBitrate")) {
            this.customData_fields.videoBitrate = description.videoBitrate / this.customData_fields.statsUpdateCount;
            this.customData_fields.audioBitrate = description.audioBitrate / this.customData_fields.statsUpdateCount;
            this.customData_fields.targetBitrate = description.targetBitrate;
        }

        this.customData_fields.videoWidth = this.currentAnalyizer.analytics.adapter.getCurrentPlaybackInfo().videoPlaybackWidth;
        this.customData_fields.videoHegint = this.currentAnalyizer.analytics.adapter.getCurrentPlaybackInfo().videoPlaybackHeight;

        
        this.customData_fields.endTime = time.toUTCString();
        this.customData_fields.videoDuration = ((Date.now() - this.customData_fields.StartTimeEpoch) / (1000 * 60)).toFixed(3);
        console.info(this.customData_fields)
    }
    //send the data updates to bitmovin
    pushStats() {
        if (this.currentAnalyizer == null || this.currentAnalyizer == undefined)
            return;
        let FormatedCustomData = this.mapFieldToCustomdataFormat(this.customData_fields);
        this.currentAnalyizer.setCustomDataOnce(FormatedCustomData);
    }
    init_analytics(streamId, title, customerId, videoElementid, clientType) {
        var remoteVideo = document.getElementById("video-player_html5_api");
        console.log(remoteVideo, videoElementid)
        const analyticsConfig = {
            key: Analytics.APIKey,
            videoId: streamId,
            title: title,
            customUserId: customerId,
            customData1: this.embeddedPlayer.currentPlayType,
            customData5: clientType
        };
        //var bitmovinAnalytics = new bitmovin.analytics.adapters.HTMLVideoElementAdapter(analyticsConfig, remoteVideo);
        var bitmovinAnalytics;
        if (this.embeddedPlayer.currentPlayType == "dash") {
            remoteVideo = document.getElementById("video-player");
            bitmovinAnalytics = new bitmovin.analytics.adapters.HTMLVideoElementAdapter(analyticsConfig, remoteVideo);

        }
        else {
            bitmovinAnalytics = new bitmovin.analytics.adapters.VideojsAdapter(analyticsConfig, embeddedPlayer.videojsPlayer);
        }
        this.is_analytics_initialized[videoElementid] = bitmovinAnalytics;
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
        console.warn(newFormatedData);
        return newFormatedData;
    }
    stop() {
        this.currentAnalyizer = null;
    }
}

export { Analytics };