
import {WebRTCAdaptor} from "../dist/es/index.js"
import {getUrlParameter} from "../dist/es/index.js" 

const webRTCAdaptor = new WebRTCAdaptor({
  websocket_url: "wss://AMS_IP/WebRTCAppEE/websocket",
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
  dataChannelEnabled: true, // enable or disable data channel
  bandwith:800,
  callback: (info: string, obj: any) => {
    console.log(info,obj)

    if (info == "initialized") {
      webRTCAdaptor.publish("stream12345");
    //webRTCAdaptor.publish(12); // this won'nt work and give compilation error because function expects a string as streamid

    }
  },
  callbackError: function (error: any, message: string) {
    // Handle error callbacks
    console.log(error,message)
  },
});