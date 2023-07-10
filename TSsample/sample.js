import { WebRTCAdaptor } from "../dist/es/index.js";
const webRTCAdaptor = new WebRTCAdaptor({
    websocket_url: "wss://test.antmedia.io/WebRTCAppEE/websocket",
    mediaConstraints: {
        video: true,
        audio: false,
    },
    peerconnection_config: {
        'iceServers': [{ 'urls': 'stun:stun1.l.google.com:19302' }]
    },
    sdp_constraints: {
        OfferToReceiveAudio: false,
        OfferToReceiveVideo: false,
    },
    localVideoId: "localVideo",
    dataChannelEnabled: true,
    bandwith: 800,
    callback: (info, obj) => {
        console.log(info, obj);
        if (info == "initialized") {
            webRTCAdaptor.publish("stream12345");
            //webRTCAdaptor.publish(12); // this won'nt work and give compilation error because function expects a string as streamid
        }
    },
    callbackError: function (error, message) {
        // Handle error callbacks
        console.log(error, message);
    },
});
