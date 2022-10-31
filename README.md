# [Ant Media Server](https://antmedia.io/) WebRTC SDK

WebSocket interface in publishing and playing WebRTC streams on Ant Media Server using Javascript.

For more information, visit [antmedia.io](https://antmedia.io)


[![NPM version](https://img.shields.io/badge/npm-v2.4.3-informational)](https://www.npmjs.com/package/@antmedia/webrtc_adaptor)
[![Build Status](https://api.travis-ci.com/ant-media/StreamApp.svg?branch=master)](https://app.travis-ci.com/github/ant-media/StreamApp)
[![Quality Gate Status](https://sonarcloud.io/api/project_badges/measure?project=io.antmedia%3Aant-media-server&metric=alert_status)](https://sonarcloud.io/dashboard?id=io.antmedia%3Aant-media-server)

## <a name="installation"></a>Installation

Using npm:
```shell
$ npm install @antmedia/webrtc_adaptor
```

Using yarn:
```shell
$ yarn add @antmedia/webrtc_adaptor
```

## <a name="requirements"></a>Requirements

Before start using Ant Media Server WebRTC SDK, you need a distribution of the Ant Media Server running on a server or local machine.
[Quick Start - Ant Media Server](https://resources.antmedia.io/docs/quick-start)

## <a name="usage">Usage

In your project, run:

```
npm i @antmedia/webrtc_adaptor --save-dev
```
Then inside your javascript file:
#### <a name="initialize">Initialize the WebRTCAdaptor
```javascript
  // ...
import { WebRTCAdaptor } from '@ant-media/webrtc_adaptor';

const webRTCAdaptor = new WebRTCAdaptor({
    websocket_url: "wss://your-domain.tld:5443/WebRTCAppEE/websocket",
    mediaConstraints: {
        video: true,
        audio: true,
    },
    peerconnection_config: {
        'iceServers': [{'urls': 'stun:stun1.l.google.com:19302'}]
    },
    sdp_constraints: {
        OfferToReceiveAudio : false,
        OfferToReceiveVideo : false,
    },
    localVideoId: "id-of-video-element", // <video id="id-of-video-element" autoplay muted></video>
    bandwidth: int|string, // default is 900 kbps, string can be 'unlimited'
    dataChannelEnabled: true|false, // enable or disable data channel
    callback: (info, obj) => {}, // check info callbacks bellow
    callbackError: function(error, message) {}, // check error callbacks bellow
});
//...
```
In another part of your script:
#### <a name="publish">Publish
```javascript
// You can start streaming by calling the publish method
webRTCAdaptor.publish(streamId);
```

#### <a name="play">Play
```javascript
// You can start streaming by calling the publish method
webRTCAdaptor.play(streamId);
```

## Samples
Visit The [Samples List](https://resources.antmedia.io/docs/sample-tools-and-applications) and look at their [sources codes](https://github.com/ant-media/StreamApp/tree/master/src/main/webapp)

## <a name="documentation">Documentation
[Javascript SDK Documentation](https://resources.antmedia.io/docs/javascript-sdk)

## <a name="livedemo">Live Demo
You can check our [live demo](https://antmedia.io/live-demo).

## <a name="issues">Issues
Create issues on the [Ant-Media-Server](https://github.com/ant-media/Ant-Media-Server/issues)


