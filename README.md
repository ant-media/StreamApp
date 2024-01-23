# [Ant Media Server](https://antmedia.io/) WebRTC JS SDK

WebSocket interface in publishing and playing WebRTC streams on Ant Media Server using Javascript.

For more information, visit [antmedia.io](https://antmedia.io)


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
[Quick Start - Ant Media Server](https://antmedia.io/docs/)

## <a name="usage">Usage

In your project, run:

```
npm i @antmedia/webrtc_adaptor
```
Then inside your javascript file:
#### <a name="initialize">Initialize the WebRTCAdaptor
```javascript
  // ...
import { WebRTCAdaptor } from '@antmedia/webrtc_adaptor';

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
// You can start playing the stream by calling the play method
webRTCAdaptor.play(streamId);
```

## Samples
Visit The [Samples List](https://antmedia.io/webrtc-samples/) and look at their [sources codes](https://github.com/ant-media/StreamApp/tree/master/src/main/webapp)

## <a name="documentation">Documentation
[Javascript SDK Documentation](https://antmedia.io/docs/guides/developer-sdk-and-api/sdk-integration/javascript-sdk/)

## <a name="livedemo">Live Demo
You can check our [live demo](https://antmedia.io/live-demo).

## <a name="issues">Issues
Create issues on the [Ant-Media-Server](https://github.com/ant-media/Ant-Media-Server/issues)


## StreamApp for Ant Media Server Developers 

This repository includes the default streaming application for Ant Media Server. Ant Media Server Developer can use it as a base app to get started for their applications.
It has mainly three components.

### JS SDK
  The fileslocated under `src/main/js/` directory are the JS SDK. It's compiled, tested and deployed to `src/main/webapp/js` directory.
  They been published to npmjs.org as well as mentioned above.

### Embedded Player
  The files located under `embedded-player` are the embedded player for Ant Media Server. It mainly use [@antmedia/web_player](https://www.npmjs.com/package/@antmedia/web_player)
  to provide a embedded player for default applications. It's compiled and deployed to the `src/main/webapp/js` and it's being used by `src/main/webapp/play.html`
  
### Maven Project
  Generally this repo is a maven project and it provides java files, web.xml and properties file to creates a Streaming app. 
  
### How to Build
- In the main directory, run the following command to install npm packages
  ```
  npm install
  ```
- Go to embedded-player and install the npm packages
  ```
  cd embedded-player
  npm install
  ```
- Switch back to main directory and run the `redeploy.sh`. It compiles and copies the js files to the `src/main/webapp/js` 
  ```
  ./redeploy.sh
  ```    

