class Analytics {
    static dash = "dash";
    static webrtc = "webrtc";
    static hls = "hls";
    static publisher = "Publisher";
    static player = "Player"
    static statsPushInterval = 8;
    static statsSetInterval = 5;
    static APIKey= null;
    constructor(APIKey) {
        //chaning the data order here will also require to change the data order on bitmovin dashboard
        //other wise data will miss mach the key value
        Analytics.APIKey=APIKey
        if(APIKey ==null || APIKey==undefined){
            return
        }
        this.customData_fields = {
            "protocol": null,
            "videoBitrate": null,
            "audioBitrate": null,
            "targetBitrate": null,
            "clientType": null,
            "streamId": null,
            "videoElementID": null,
            "startTime": null,
            "endTime": null,
            "duration": null,
            "videoHegint": null,
            "videoWidth": null,
            "StartTimeEpoch": null,
            "statsUpdateCount": 0,
            "pageLoadTime":null
        }
        this.webrtc_interval = null;
        this.is_analytics_initialized = {};
        this.currentAnalyizer = null;

        var setStatInterval = setInterval(this.setStats.bind(this), Analytics.statsPushInterval * 1000);
        var pushStatsInterval = setInterval(this.pushStats.bind(this), Analytics.statsSetInterval * 1000);
    }

    analyze(clientType, streamId, title, customerId, protocol, videoElementid, webrtc_adaptor) {
        if(Analytics.APIKey ==null || Analytics.APIKey==undefined){
            return
        }
        window.a = webrtc_adaptor
        if (this.is_analytics_initialized[videoElementid]) {
            if (clientType == Analytics.publisher) {
                let srcobj = document.getElementById(videoElementid).srcObject;
                let src = document.getElementById(videoElementid).src;
                document.getElementById(videoElementid).srcObject = null;
                document.getElementById(videoElementid).src = null;
                document.getElementById(videoElementid).srcObject = srcobj;
                document.getElementById(videoElementid).src = src;
            }
            else if (clientType == Analytics.player) {
                document.getElementById(videoElementid).srcObject = null;
                document.getElementById(videoElementid).src = null;
            }
            let get_analytics = this.is_analytics_initialized[videoElementid];
            get_analytics.sourceChange({
                videoId: streamId,
                title: title,
                customData1: protocol,
                customData5: clientType
            });
            this.currentAnalyizer = get_analytics
            this.setStats({ "initStats": true, streamId, videoElementid })
            return
        }
        this.init_analytics(streamId, title, customerId, videoElementid, clientType, protocol);
        this.setStats({ "initStats": true, streamId, videoElementid })

    }
    //update the data in json object
    setStats(description) {
        if (Analytics.APIKey ==null || Analytics.APIKey==undefined ||description == null || description == undefined || description == {} || this.currentAnalyizer == null || this.currentAnalyizer == undefined)
            return;

        let time = new Date();
        this.customData_fields.statsUpdateCount++;
        if (description.hasOwnProperty("initStats")) {
            Object.keys(this.customData_fields).forEach(key => this.customData_fields[key] = null);
            this.customData_fields.protocol = description.protocol;
            this.customData_fields.videoElementID = description.videoElementid;
            this.customData_fields.clientType = description.clientType;
            this.customData_fields.startTime = time.toUTCString();
            this.customData_fields.StartTimeEpoch = Date.now();
            this.customData_fields.pageLoadTime = this.currentAnalyizer.analytics.pageLoadTime
        }
        else if (description.hasOwnProperty("videoBitrate")) {

            this.customData_fields.videoBitrate = description.videoBitrate / this.customData_fields.statsUpdateCount;
            this.customData_fields.audioBitrate = description.audioBitrate / this.customData_fields.statsUpdateCount;
            this.customData_fields.targetBitrate = description.targetBitrate;
        }

        this.customData_fields.videoWidth = this.currentAnalyizer.analytics.adapter.getCurrentQualityLevelInfo().width
        this.customData_fields.videoHegint = this.currentAnalyizer.analytics.adapter.getCurrentQualityLevelInfo().height

        this.customData_fields.endTime = time.toUTCString();
        this.customData_fields.duration = ((Date.now() - this.customData_fields.StartTimeEpoch) / (1000 * 60)).toFixed(3);
        console.info(this.customData_fields)
    }
    //send the data updates to bitmovin
    pushStats() {
        console.log(this.currentAnalyizer)
        if (this.currentAnalyizer == null || this.currentAnalyizer == undefined)
            return;
        let FormatedCustomData = this.mapFieldToCustomdataFormat(this.customData_fields);
        this.currentAnalyizer.setCustomDataOnce(FormatedCustomData);
    }
    init_analytics(streamId, title, customerId, videoElementid,clientType, protocol) {
        var remoteVideo = document.getElementById(videoElementid);
        const analyticsConfig = {
            key: Analytics.APIKey,
            videoId: streamId,
            title: title,
            customUserId: customerId,
            customData1: protocol,
            customData5: clientType
        };
        var bitmovinAnalytics = new bitmovin.analytics.adapters.HTMLVideoElementAdapter(analyticsConfig, remoteVideo);
        this.is_analytics_initialized[videoElementid] = bitmovinAnalytics;
        this.currentAnalyizer = bitmovinAnalytics;
        console.log(this.currentAnalyizer)
        window.aa = bitmovinAnalytics
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
    stop(){
        this.currentAnalyizer=null;
    }
}

export { Analytics };