import {WebRTCAdaptor} from '../../main/js/webrtc_adaptor.js';
import {MediaManager} from "../../main/js/media_manager.js";


describe("WebRTCAdaptor", function () {

  var clock;

  var sandbox;

  var initialized = false;

  beforeEach(function () {
    clock = sinon.useFakeTimers();
    sandbox = sinon.createSandbox();
  });


  afterEach(() => {
    // Restore the default sandbox here
    sinon.restore();
    clock.restore();
    sandbox.restore();
  });


  it("Initialize", async function () {

    try {
      var adaptor = new WebRTCAdaptor({});
      expect.fail("It should throw exception because websocket url is mandatory");
    } catch (err) {

    }

    try {
      var websocketURL = "ws://localhost";
      var adaptor = new WebRTCAdaptor({
        websocketURL: websocketURL
      });

      expect(adaptor.websocketURL).to.be.equal(websocketURL);
    } catch (err) {
      expect.fail(err);
    }


  });


  it("Auto reconnect play", async function () {

    var adaptor = new WebRTCAdaptor({
      websocketURL: "ws://example.com",
      isPlayMode: true
    });

    var webSocketAdaptor = sinon.mock(adaptor.webSocketAdaptor);
    var stopCall = sinon.replace(adaptor, "stop", sinon.fake());

    var sendExpectation = webSocketAdaptor.expects("send");
    //sendExpectation first one is direct, second one through tryAgain
    sendExpectation.exactly(2);

    var streamId = "stream123";
    expect(adaptor.remotePeerConnection[streamId]).to.be.undefined;

    //first call for sendExpectation direct
    adaptor.play("stream123");

    expect(adaptor.remotePeerConnection[streamId]).to.not.be.undefined;

    clock.tick(2000);
    expect(stopCall.called).to.be.false;
    clock.tick(1000);
    expect(stopCall.called).to.be.true;

    expect(stopCall.calledWithMatch("stream123")).to.be.true;

    adaptor.stop(streamId);

    expect(adaptor.remotePeerConnection[streamId]).to.not.be.undefined;

    //Add extra delay because play is called a few seconds later then the stop in tryAgain
    clock.tick(1500);

    sendExpectation.verify();

  });

  it("Auto reconnect publish", async function () {

    var adaptor = new WebRTCAdaptor({
      websocketURL: "ws://example.com",
      onlyDataChannel: true
    });

    var webSocketAdaptor = sinon.mock(adaptor.webSocketAdaptor);
    var stopCall = sinon.replace(adaptor, "stop", sinon.fake());

    var sendExpectation = webSocketAdaptor.expects("send");
    //sendExpectation first one is direct, second one through tryAgain
    sendExpectation.exactly(2);

    var streamId = "stream1234";
    expect(adaptor.remotePeerConnection[streamId]).to.be.undefined;

    //first call for sendExpectation direct
    adaptor.publish(streamId);

    expect(adaptor.remotePeerConnection[streamId]).to.not.be.undefined;

    clock.tick(2000);
    expect(stopCall.called).to.be.false;
    clock.tick(1000);
    expect(stopCall.called).to.be.true;

    expect(stopCall.calledWithMatch(streamId)).to.be.true;

    adaptor.enableStats(streamId);
    expect(adaptor.remotePeerConnectionStats[streamId]).to.not.be.undefined

    expect(await adaptor.getStats(streamId)).to.be.true;


    console.log(adaptor.remotePeerConnectionStats[streamId])


    adaptor.stop(streamId);

    expect(adaptor.remotePeerConnection[streamId]).to.not.be.undefined;
    //Add extra delay because publish is called a few seconds later the stop in tryAgain method

    clock.tick(1500);

    sendExpectation.verify();

  });

  it("toggleVideo", async function () {
    let adaptor = new WebRTCAdaptor({
      websocketURL: "ws://example.com",
      isPlayMode: true
    });

    let webSocketAdaptor = sinon.mock(adaptor.webSocketAdaptor);
    let streamId = "stream1";
    let trackId = "trackId";
    let enabled = true;

    let jsCmd = {
      command: "toggleVideo",
      streamId: streamId,
      trackId: trackId,
      enabled: enabled,
    };

    let sendExpectation = webSocketAdaptor.expects("send").once().withArgs(JSON.stringify(jsCmd));


    adaptor.toggleVideo(streamId, trackId, enabled);

    sendExpectation.verify()
  })


  it("Close websocket", async function () {
    var adaptor = new WebRTCAdaptor({
      websocketURL: "ws://example.com",
      isPlayMode: true
    });
    let webSocketAdaptor = sinon.mock(adaptor.webSocketAdaptor);
    let closeExpectation = webSocketAdaptor.expects("close");

    let closePeerConnection = sinon.replace(adaptor, "closePeerConnection", sinon.fake());

    let streamId = "stream123";
    expect(adaptor.remotePeerConnection[streamId]).to.be.undefined;
    adaptor.initPeerConnection(streamId, "play");
    expect(adaptor.remotePeerConnection[streamId]).to.not.be.undefined;

    adaptor.closeWebSocket();

    expect(closePeerConnection.calledWithMatch(streamId)).to.be.true;

    closeExpectation.verify();


  });

  it("Frequent try again call", async function () {
    var adaptor = new WebRTCAdaptor({
      websocketURL: "ws://example.com",
      isPlayMode: true
    });
    let webSocketAdaptor = sinon.mock(adaptor.webSocketAdaptor);
    let closeExpectation = webSocketAdaptor.expects("close");

    let closePeerConnection = sinon.replace(adaptor, "closePeerConnection", sinon.fake());

    const now = Date.now();
    adaptor.tryAgain();

    expect(adaptor.lastReconnectiontionTrialTime - now).to.be.at.most(100);

    const lrt = adaptor.lastReconnectiontionTrialTime;

    for (let i = 0; i < 100; i++) {
      adaptor.tryAgain();
      expect(adaptor.lastReconnectiontionTrialTime).to.be.equal(lrt);

    }

    clock.tick(3000);
    adaptor.tryAgain();
    expect(adaptor.lastReconnectiontionTrialTime).not.to.be.equal(lrt);
  });

  it("Test reconnection process started callback", async function () {
    var isReconnectionProcessStartedForPublisher = false;
    var isReconnectionProcessStartedForPlayer = false;

    var adaptor = new WebRTCAdaptor({
      websocketURL: "ws://example.com",
      isPlayMode: true,
      callback: (info, obj) => {
        if (info === "reconnection_attempt_for_publisher") {
          isReconnectionProcessStartedForPublisher = true;
        } else if (info === "reconnection_attempt_for_player") {
          isReconnectionProcessStartedForPlayer = true;
        }
      }
    });
    var webSocketAdaptor = sinon.mock(adaptor.webSocketAdaptor);

    var closeExpectation = webSocketAdaptor.expects("close");

    var closePeerConnection = sinon.replace(adaptor, "closePeerConnection", sinon.fake());

    // some times Data.now() returns 0 and it is blocking the test
    // so we set lastReconnectiontionTrialTime to -3000 to avoid this
    adaptor.lastReconnectiontionTrialTime = -3000;

    adaptor.publishStreamId = "testPublisher";
    adaptor.remotePeerConnection["testPublisher"] = sinon.mock(RTCPeerConnection);
    adaptor.remotePeerConnection["testPublisher"].iceConnectionState = "disconnected";

    adaptor.playStreamId.push("testPlayer");
    adaptor.remotePeerConnection["testPlayer"] = sinon.mock(RTCPeerConnection);
    adaptor.remotePeerConnection["testPlayer"].iceConnectionState = "disconnected";

    adaptor.tryAgain();

    clock.tick(3000);

    expect(isReconnectionProcessStartedForPublisher).equal(true);
    expect(isReconnectionProcessStartedForPlayer).equal(true);
  });

  it("Reconnection for play", async function () {
    var adaptor = new WebRTCAdaptor({
      websocketURL: "ws://example.com",
      isPlayMode: true
    });
    var fakeSend = sinon.replace(adaptor.webSocketAdaptor, "send", sinon.fake());

    const streamId = "test" + Math.floor(Math.random() * 100);
    adaptor.playStreamId.push(streamId);
    var mockPC = sinon.mock(RTCPeerConnection);
    adaptor.remotePeerConnection[streamId] = mockPC
    mockPC.iceConnectionState = "disconnected";
    mockPC.close = sinon.fake();


    clock.tick(3000);
    adaptor.tryAgain();
    //Add extra delay because publish is called a few seconds later the stop in tryAgain method

    clock.tick(1500);
    assert(fakeSend.calledOnce);
    clock.tick(2500);
    assert(fakeSend.calledTwice);


  });

  it("sanitize HTML", async function () {
    var adaptor = new WebRTCAdaptor({
      websocketURL: "ws://example.com",
      isPlayMode: true
    });
    var scriptMsg = "<script>alert(1)</script>"; //message with script
    var sanitizeMsg = adaptor.sanitizeHTML(scriptMsg);
    assert.notEqual(scriptMsg, sanitizeMsg)

    var text = "hi how are you"; //message without script
    var message = adaptor.sanitizeHTML(text)
    assert.strictEqual(text, message)
  })

  it("Reconnection for publish", async function () {
    var adaptor = new WebRTCAdaptor({
      websocketURL: "ws://example.com",
      isPlayMode: true
    });
    var fakeSendPublish = sinon.replace(adaptor, "sendPublishCommand", sinon.fake());
    var fakeStop = sinon.replace(adaptor, "stop", sinon.fake());

    const streamId = "test" + Math.floor(Math.random() * 100);
    adaptor.publishStreamId = streamId;
    var mockPC = sinon.mock(RTCPeerConnection);
    adaptor.remotePeerConnection[streamId] = mockPC
    mockPC.iceConnectionState = "disconnected";
    mockPC.close = sinon.fake();


    adaptor.mediaManager.localStream = sinon.mock();
    var callback = sinon.stub();
    callback.returns([sinon.mock()]);
    adaptor.mediaManager.localStream.getVideoTracks = callback;
    adaptor.mediaManager.localStream.getAudioTracks = callback;
    adaptor.mediaManager.localStream.getTracks = sinon.stub().returns([]);

    clock.tick(3000);
    adaptor.tryAgain();

    //Add extra delay because publish is called a few seconds later the stop in tryAgain method
    clock.tick(1500);
    assert(fakeSendPublish.calledOnce);
    assert(fakeStop.calledOnce);

    clock.tick(2500);
    assert(fakeSendPublish.calledTwice);


  });

  it("EnableStats - DisableStats", async function () {

    var adaptor = new WebRTCAdaptor({
      websocketURL: "ws://example.com",
      isPlayMode: true
    });

    const streamId = "test" + Math.floor(Math.random() * 100);
    adaptor.publishStreamId = streamId;
    var mockPC = sinon.mock(RTCPeerConnection);
    adaptor.remotePeerConnection[streamId] = mockPC

    expect(adaptor.remotePeerConnectionStats[streamId]).to.be.undefined;

    adaptor.enableStats(streamId);
    expect(adaptor.remotePeerConnectionStats[streamId].timerId).to.be.not.undefined;

    adaptor.disableStats(streamId);
    expect(adaptor.remotePeerConnectionStats[streamId]).to.be.undefined;


    adaptor.enableStats(streamId);
    expect(adaptor.remotePeerConnectionStats[streamId].timerId).to.be.not.undefined;


    adaptor.disableStats(streamId);
    expect(adaptor.remotePeerConnectionStats[streamId]).to.be.undefined;


  });

  it("Websocket send try catch", async function () {
    var adaptor = new WebRTCAdaptor({
      websocketURL: "ws://example.com",
      isPlayMode: true
    });

    adaptor.webSocketAdaptor.send("test");
    adaptor.webSocketAdaptor.close();
    adaptor.webSocketAdaptor.send("test");
    adaptor.webSocketAdaptor.connected = true;
    var spySend = sinon.spy(adaptor.webSocketAdaptor.send);
    try {
      spySend();
    } catch (e) {
      // pass
    }
    adaptor.webSocketAdaptor.send("test");
    assert(spySend.threw());

  });


  //there was a bug and this method is not initialized
  it("enableAudioLevelForLocalStream", async function () {
    let adaptor = new WebRTCAdaptor({
      websocketURL: "ws://localhost",
      initializeComponents: false,
      volumeMeterUrl: 'base/src/main/js/volume-meter-processor.js',
    });

    initialized = false;
    await adaptor.initialize().then(() => {
      initialized = true;
    })

    expect(initialized).to.be.true;

    expect(adaptor.mediaManager.localStream).to.be.not.null;

    initialized = false;
    await adaptor.enableAudioLevelForLocalStream((event) => {
      console.log("audio level: " + event.data);
    }).then(() => {
      initialized = true;
    }).catch((err) => {
      console.error("audiolevel error " + err);
    });

    expect(initialized).to.be.true;

    adaptor.disableAudioLevelForLocalStream();

    expect(adaptor.mediaManager.localStreamSoundMeter).to.be.null;

  });

  it("sendData", async function () {
    try {
      var adaptor = new WebRTCAdaptor({
        websocketURL: "ws://localhost",
        initializeComponents: false
      });

      let streamId = "test";
      var webSocketAdaptor = sinon.mock(adaptor.webSocketAdaptor);

      adaptor.remotePeerConnection[streamId] = sinon.mock(RTCPeerConnection);

      adaptor.remotePeerConnection[streamId].dataChannel = sinon.fake.returns({
        readyState: "open",
        send: sinon.fake()
      });
      adaptor.sendData(streamId, "test");

      adaptor.remotePeerConnection[streamId].dataChannel = undefined
      adaptor.sendData(streamId, "test");

      adaptor.remotePeerConnection[streamId].dataChannel = null
      adaptor.sendData(streamId, "test");
    } catch (e) {
      console.error(e);
      assert(false);
    }
  });

  it("dummyStreamAndSwitch", async function () {

    var adaptor = new WebRTCAdaptor({
      websocketURL: "ws://localhost",
      mediaConstraints: {
        video: "dummy",
        audio: "dummy"
      },
      initializeComponents: false
    });


    expect(adaptor.mediaManager.blackVideoTrack).to.be.null
    expect(adaptor.mediaManager.silentAudioTrack).to.be.null
    expect(adaptor.mediaManager.oscillator).to.be.null

    await adaptor.initialize();


    expect(adaptor.mediaManager.mediaConstraints).to.deep.equal({video: "dummy", audio: "dummy"});

    expect(adaptor.mediaManager.blackVideoTrack).to.not.be.null
    expect(adaptor.mediaManager.silentAudioTrack).to.not.be.null
    expect(adaptor.mediaManager.oscillator).to.not.be.null
    expect(adaptor.mediaManager.localStream.getVideoTracks().length).to.be.equal(1)
    expect(adaptor.mediaManager.localStream.getAudioTracks().length).to.be.equal(1)


    await adaptor.openStream({video: true, audio: true});

    expect(adaptor.mediaManager.blackVideoTrack).to.be.null
    expect(adaptor.mediaManager.silentAudioTrack).to.be.null
    expect(adaptor.mediaManager.oscillator).to.be.null

    expect(adaptor.mediaManager.mediaConstraints).to.deep.equal({video: true, audio: true});
    expect(adaptor.mediaManager.localStream.getVideoTracks().length).to.be.equal(1)
    expect(adaptor.mediaManager.localStream.getAudioTracks().length).to.be.equal(1)

  });

  it("updateAudioTrack", async function () {
    var adaptor = new WebRTCAdaptor({
      websocketURL: "ws://localhost",
      mediaConstraints: {
        video: "dummy",
        audio: "dummy"
      },
      initializeComponents: false
    });

    await adaptor.initialize();

    expect(adaptor.mediaManager.localStreamSoundMeter).to.be.null;

    adaptor.enableAudioLevelForLocalStream((value) => {

    }, 200);

    expect(adaptor.mediaManager.localStreamSoundMeter).to.not.be.null;

    var audioTrack = adaptor.mediaManager.getSilentAudioTrack();

    var stream = new MediaStream();
    stream.addTrack(audioTrack);

    await adaptor.updateAudioTrack(stream, null, null);
  });

  it("testSoundMeter", function (done) {
    this.timeout(5000);
    console.log("Starting testSoundMeter");

    var adaptor = new WebRTCAdaptor({
      websocketURL: "ws://localhost",
      mediaConstraints: {
        video: true,
        audio: true
      },
      initializeComponents: false,
      volumeMeterUrl: 'base/src/main/js/volume-meter-processor.js',
    });

    //fake stream in te browser is a period audio and silence, so getting sound level more than 0 requires

    adaptor.initialize().then(() => {
      var audioContext = new (window.AudioContext || window.webkitAudioContext)();
      var oscillator = audioContext.createOscillator();
      oscillator.type = "sine";
      oscillator.frequency.value = 800;
      var mediaStreamSource = audioContext.createMediaStreamDestination();
      oscillator.connect(mediaStreamSource);
      var mediaStreamTrack = mediaStreamSource.stream.getAudioTracks()[0];
      oscillator.start();

      adaptor.mediaManager.localStream = new MediaStream([mediaStreamTrack])
      adaptor.mediaManager.audioContext = audioContext;
      adaptor.enableAudioLevelForLocalStream((level) => {
        console.log("sound level -> " + level);
        if (level > 0) {
          done();
        }
      });

      expect(adaptor.mediaManager.localStreamSoundMeter).to.not.be.null;
    })
  })


  it("takeConfiguration", async function () {
    var adaptor = new WebRTCAdaptor({
      websocketURL: "ws://localhost",
      mediaConstraints: {
        video: true,
        audio: true
      },
      initializeComponents: false
    });

    await adaptor.initialize();
    expect(adaptor.remotePeerConnection["stream1"]).to.be.undefined;

    adaptor.takeConfiguration("stream1", "conf", "offer", "track1");

    expect(adaptor.remotePeerConnection["stream1"]).to.not.be.undefined;

  });

  it("takeCandidate", async function () {
    var adaptor = new WebRTCAdaptor({
      websocketURL: "ws://localhost",
      mediaConstraints: {
        video: true,
        audio: true
      },
      initializeComponents: false
    });

    await adaptor.initialize();

    expect(adaptor.remotePeerConnection["stream1"]).to.be.undefined;
    expect(adaptor.iceCandidateList["stream1"]).to.be.undefined;


    adaptor.takeCandidate("stream1", "label", "candidate");

    expect(adaptor.remotePeerConnection["stream1"]).to.not.be.undefined;

    expect(adaptor.iceCandidateList["stream1"].length).to.be.equal(1);

  });
  it("mutedButSpeaking", async () => {
    this.timeout(10000);
    var adaptor = new WebRTCAdaptor({
      websocketURL: "ws://localhost",
      mediaConstraints: {
        video: true,
        audio: true
      },
      initializeComponents: false,
      volumeMeterUrl: 'base/src/main/js/volume-meter-processor.js',
    });

    var audioContext = new (window.AudioContext || window.webkitAudioContext)();
    var oscillator = audioContext.createOscillator();
    oscillator.type = "sine";
    oscillator.frequency.value = 800;
    var mediaStreamSource = audioContext.createMediaStreamDestination();
    oscillator.connect(mediaStreamSource);
    var mediaStreamTrack = mediaStreamSource.stream.getAudioTracks()[0];
    oscillator.start();


    adaptor.mediaManager.mutedAudioStream = new MediaStream([mediaStreamTrack])
    adaptor.mediaManager.localStream = new MediaStream([mediaStreamTrack])
    adaptor.mediaManager.audioContext = audioContext;

    var getUserMediaFailed = new Promise(function (resolve, reject) {
      navigator.mediaDevices.getUserMedia = async () => {
        return Promise.reject();
      };
      adaptor.initialize().then(async () => {
        try {
          await adaptor.enableAudioLevelWhenMuted();
        } catch (e) {
          console.log("get user media failed test")
          resolve();
        }
      });
    });
    var speakingButMuted = getUserMediaFailed.then(() => {
      return new Promise(function (resolve, reject) {
        navigator.mediaDevices.getUserMedia = async () => {
          return Promise.resolve(new MediaStream([mediaStreamTrack]));
        };

        adaptor.initialize().then(async () => {
          adaptor.mediaManager.callback = (info) => {
            console.log("callback ", info);
            if (info === "speaking_but_muted") {
              console.log("speaking_but_muted1");
              resolve();
            }
          };
          await adaptor.enableAudioLevelWhenMuted();
        });
      });
    });

    var soundMeteraddModuleFailed = speakingButMuted.then(() => {
      adaptor.mediaManager.mutedSoundMeter.context.audioWorklet.addModule = async () => {
        return Promise.reject("error");
      };
      return new Promise(async function (resolve, reject) {
        adaptor.enableAudioLevelWhenMuted().catch((e) => {
          resolve()
        })
      });
    });

    console.assert(soundMeteraddModuleFailed, "soundMeteraddModuleFailed");

  });


  it("startPublishing", async function () {
    let adaptor = new WebRTCAdaptor({
      websocketURL: "ws://example.com",
      isPlayMode: true
    });

    let peerConnection = new RTCPeerConnection();
    let initPeerConnection = sinon.replace(adaptor, "initPeerConnection", sinon.fake.returns(peerConnection));

    let createOfferFake = sinon.replace(peerConnection, "createOffer", sinon.fake.returns(Promise.reject("this is on purpose")));

    adaptor.startPublishing("stream123");

    expect(initPeerConnection.calledWithExactly("stream123", "publish")).to.be.true;
  });

  it("join", async function () {

    let adaptor = new WebRTCAdaptor({
      websocketURL: "ws://example.com",
      isPlayMode: true
    });

    let streamId = "stream123";
    let jsCmd = {
      command: "join",
      streamId: streamId,
      multiPeer: false,
      mode: "play"
    };

    let webSocketAdaptor = sinon.mock(adaptor.webSocketAdaptor);

    let sendExpectation = webSocketAdaptor.expects("send").once().withArgs(JSON.stringify(jsCmd));

    adaptor.join(streamId);

    sendExpectation.verify()
  })


  it("getSubtracks", async function () {

      let adaptor = new WebRTCAdaptor({
        websocketURL: "ws://example.com",
        isPlayMode: true
      });

      let streamId = "test" + Math.floor(Math.random() * 100);
      let offset = Math.floor(Math.random() * 100);
      let size = Math.floor(Math.random() * 100);
      let role = "role1";
      let jsCmd = {
        command: "getSubtracks",
        streamId: streamId,
        role: role,
        offset: offset,
        size: size,
      };

      let webSocketAdaptor = sinon.mock(adaptor.webSocketAdaptor);

      let sendExpectation = webSocketAdaptor.expects("send").once().withArgs(JSON.stringify(jsCmd));

      adaptor.getSubtracks(streamId, role, offset, size);

      sendExpectation.verify()
    })

  it("joinRoom", async function () {

    let adaptor = new WebRTCAdaptor({
      websocketURL: "ws://example.com",
      isPlayMode: true
    });

    let streamId = "stream123";
    let roomId = "roomId";

    let jsCmd = {
      command: "joinRoom",
      room: roomId,
      streamId: streamId,
      mode: "multitrack",
    }

    let webSocketAdaptor = sinon.mock(adaptor.webSocketAdaptor);

    let sendExpectation = webSocketAdaptor.expects("send").once().withArgs(JSON.stringify(jsCmd));

    adaptor.joinRoom(roomId, streamId, "multitrack");

    sendExpectation.verify()

  });

  it("eventListeners", async function () {
    let adaptor = new WebRTCAdaptor({
      websocketURL: "ws://example.com",
      isPlayMode: true
    });


    var eventListenerCalled = false;
    adaptor.addEventListener((info, obj) => {
      eventListenerCalled = true;
    });

    var errorListenerCalled = false;
    adaptor.addErrorEventListener((error, message) => {
      errorListenerCalled = true;
    });


    adaptor.mediaManager.callback("info", "obj");

    adaptor.mediaManager.callbackError("info", "obj");

    expect(eventListenerCalled).to.be.true;
    expect(errorListenerCalled).to.be.true;

  });

  it("onTrack", async function () {

    {
      var videoElement = document.createElement("video");
      let adaptor = new WebRTCAdaptor({
        websocketURL: "ws://example.com",
        isPlayMode: true,
        remoteVideoElement: videoElement
      });

      var mediaStream = new MediaStream();
      var event = {
        streams: [mediaStream]
      }

      expect(videoElement.srcObject).to.be.null;

      adaptor.onTrack(event, "stream1");

      expect(videoElement.srcObject).to.not.be.null;
    }


    {
      let adaptor = new WebRTCAdaptor({
        websocketURL: "ws://example.com",
        isPlayMode: true,
      });

      var eventListenerCalled = false;
      adaptor.addEventListener((info, obj) => {
        if (info == "newTrackAvailable") {
          eventListenerCalled = true;
        }
      })

      var mediaStream = new MediaStream();
      var event = {
        streams: [mediaStream],
        transceiver: {
          id: "anyid"
        }
      }

      adaptor.idMapping["stream1"] = "anything";

      adaptor.onTrack(event, "stream1");

      expect(eventListenerCalled).to.be.true;

    }

  });

  it("getStreamInfo", async function () {
    let adaptor = new WebRTCAdaptor({
      websocketURL: "ws://example.com",
      isPlayMode: true
    });

    let streamId = "stream123";
    let jsCmd = {
      command: "getStreamInfo",
      streamId: streamId,
    };

    let webSocketAdaptor = sinon.mock(adaptor.webSocketAdaptor);

    let sendExpectation = webSocketAdaptor.expects("send").once().withArgs(JSON.stringify(jsCmd));

    adaptor.getStreamInfo(streamId);

    sendExpectation.verify()
  });


  it("getBroadcastObject", async function () {
    let adaptor = new WebRTCAdaptor({
      websocketURL: "ws://example.com",
      isPlayMode: true
    });

    let streamId = "stream123";
    let jsCmd = {
      command: "getBroadcastObject",
      streamId: streamId,
    };

    let webSocketAdaptor = sinon.mock(adaptor.webSocketAdaptor);

    let sendExpectation = webSocketAdaptor.expects("send").once().withArgs(JSON.stringify(jsCmd));

    adaptor.getBroadcastObject(streamId);

    sendExpectation.verify()
  });

  it("requestVideoTrackAssignments", async function () {

    let adaptor = new WebRTCAdaptor({
      websocketURL: "ws://example.com",
      isPlayMode: true
    });

    let streamId = "stream123";

    let jsCmd = {
      command: "getVideoTrackAssignmentsCommand",
      streamId: streamId,
    };

    let webSocketAdaptor = sinon.mock(adaptor.webSocketAdaptor);

    let sendExpectation = webSocketAdaptor.expects("send").once().withArgs(JSON.stringify(jsCmd));

    adaptor.requestVideoTrackAssignments(streamId);

    sendExpectation.verify()

  })


  it("registerPushNotificationToken", async function () {
    let adaptor = new WebRTCAdaptor({
      websocketURL: "ws://example.com",
      isPlayMode: true
    });

    let subscriberId = "subscriberId";
    let authToken = "autotokenkdnkf";
    let pnsRegistrationToken = "pnsRegistrationTokenpnsRegistrationTokenpnsRegistrationTokenpnsRegistrationToken";
    let pnstype = "fcm";

    let jsCmd = {
      command: "registerPushNotificationToken",
      subscriberId: subscriberId,
      token: authToken,
      pnsRegistrationToken: pnsRegistrationToken,
      pnsType: pnstype
    };

    let webSocketAdaptor = sinon.mock(adaptor.webSocketAdaptor);

    let sendExpectation = webSocketAdaptor.expects("send").once().withArgs(JSON.stringify(jsCmd));

    adaptor.registerPushNotificationToken(subscriberId, authToken, pnsRegistrationToken, pnstype);

    sendExpectation.verify()

  });


  it("sendPushNotification", async function () {
    let adaptor = new WebRTCAdaptor({
      websocketURL: "ws://example.com",
      isPlayMode: true
    });

    let subscriberId = "subscriberId";
    let authToken = "autotokenkdnkf";
    let pushNotificationContent = "pnsRegistrationTokenpnsRegistrationTokenpnsRegistrationTokenpnsRegistrationToken";
    let subscriberIdsToNotify = "string1";

    try {
      adaptor.sendPushNotification(subscriberId, authToken, pushNotificationContent, subscriberIdsToNotify);
      assert.fail("It should throw exception because pushNotificationContent is not json");
    } catch (e) {
      //pass
    }


    pushNotificationContent = {title: "title", body: "body"};
    let jsCmd = {
      command: "sendPushNotification",
      subscriberId: subscriberId,
      token: authToken,
      pushNotificationContent: pushNotificationContent,
      subscriberIdsToNotify: subscriberIdsToNotify
    };

    try {
      adaptor.sendPushNotification(subscriberId, authToken, pushNotificationContent, subscriberIdsToNotify);
      assert.fail("It should throw exception because subscriberIdsToNotify is not array");
    } catch (e) {
      //pass
    }

    jsCmd = {
      command: "sendPushNotification",
      subscriberId: subscriberId,
      token: authToken,
      pushNotificationContent: pushNotificationContent,
      subscriberIdsToNotify: subscriberIdsToNotify
    };

    subscriberIdsToNotify = ["string1"];

    jsCmd = {
      command: "sendPushNotification",
      subscriberId: subscriberId,
      token: authToken,
      pushNotificationContent: pushNotificationContent,
      subscriberIdsToNotify: subscriberIdsToNotify
    };
    let webSocketAdaptor = sinon.mock(adaptor.webSocketAdaptor);

    let sendExpectation = webSocketAdaptor.expects("send").once().withArgs(JSON.stringify(jsCmd));

    adaptor.sendPushNotification(subscriberId, authToken, pushNotificationContent, subscriberIdsToNotify);

    sendExpectation.verify()

  });


  it("sendPushNotificationToTopic", async function () {

    let adaptor = new WebRTCAdaptor({
      websocketURL: "ws://example.com",
      isPlayMode: true
    });

    let subscriberId = "subscriberId";
    let authToken = "autotokenkdnkf";
    let pushNotificationContent = "text";
    let topic = "topic";

    let jsCmd = {
      command: "sendPushNotification",
      subscriberId: subscriberId,
      token: authToken,
      pushNotificationContent: pushNotificationContent,
      topic: topic
    };

    try {
      adaptor.sendPushNotificationToTopic(subscriberId, authToken, pushNotificationContent, topic);
      assert.fail("It should throw exception because pushNotificationContent is not json");
    } catch (error) {
      //pass
    }

    pushNotificationContent = {title: "title", body: "body"};
    jsCmd = {
      command: "sendPushNotification",
      subscriberId: subscriberId,
      token: authToken,
      pushNotificationContent: pushNotificationContent,
      topic: topic
    };

    let webSocketAdaptor = sinon.mock(adaptor.webSocketAdaptor);

    let sendExpectation = webSocketAdaptor.expects("send").once().withArgs(JSON.stringify(jsCmd));

    adaptor.sendPushNotificationToTopic(subscriberId, authToken, pushNotificationContent, topic);

    sendExpectation.verify()

  });

  describe("checkAndStopLocalVideoTrackOnAndroid", function () {

    let mediaManager;
    let mockLocalStream;

    beforeEach(function () {
      window.isAndroid = () => {
      };

      mockLocalStream = {
        getVideoTracks: sinon.stub()
      };

      mediaManager = new MediaManager({
        websocketURL: "ws://example.com",
        initializeComponents: false,
        localStream: mockLocalStream
      });
    });

    it("should not stop video track if local stream exists and is not Android", function () {
      const mockVideoTrack = {stop: sinon.fake()};
      mockLocalStream.getVideoTracks.returns([mockVideoTrack]);
      sinon.stub(window, 'isAndroid').returns(false);

      mediaManager.checkAndStopLocalVideoTrackOnAndroid();

      sinon.assert.notCalled(mockVideoTrack.stop);
    });

    it("should not stop video track if local stream does not exist", function () {
      mediaManager.localStream = null;

      mediaManager.checkAndStopLocalVideoTrackOnAndroid();

      sinon.assert.notCalled(mockLocalStream.getVideoTracks);
    });

  });

  describe("turnOffLocalCamera", () => {
    let adaptor;
    let mockMediaManager;

    beforeEach(function () {
      mockMediaManager = {
        turnOffLocalCamera: sinon.fake()
      };

      adaptor = new WebRTCAdaptor({
        websocketURL: "ws://example.com",
        isPlayMode: true,
        mediaManager: mockMediaManager,
        initializeComponents: false
      });
    });

    it("should call turnOffLocalCamera on mediaManager with correct streamId", function () {
      const streamId = "testStreamId";
      let result = adaptor.turnOffLocalCamera(streamId);
      assert.notEqual(result, undefined);
    });

    it("should handle undefined streamId", function () {
      let result = adaptor.turnOffLocalCamera(undefined);
      assert.notEqual(result, undefined);
    });

    it("should handle null streamId", function () {
      let result = adaptor.turnOffLocalCamera(null);
      assert.notEqual(result, undefined);
    });

    it("should handle empty string streamId", function () {
      let result = adaptor.turnOffLocalCamera("");
      assert.notEqual(result, undefined);
    });
  });

  describe("getStats", function () {
    let adaptor;
    let mockPeerConnection;
    let mockStats;

    beforeEach(function () {
      mockPeerConnection = {
        getStats: sinon.stub()
      };
      mockStats = new Map();
      adaptor = new WebRTCAdaptor({
        websocketURL: "ws://example.com",
        initializeComponents: false
      });
      adaptor.remotePeerConnection = {"stream1": mockPeerConnection};
      adaptor.remotePeerConnectionStats = {"stream1": {}};
    });

    it("should resolve with true when getStats is successful", async function () {
      mockPeerConnection.getStats.resolves(mockStats);
      const result = await adaptor.getStats("stream1");
      expect(result).to.be.true;
    });

    it("should resolve with false when getStats fails", async function () {
      mockPeerConnection.getStats.rejects(new Error("getStats error"));
      const result = await adaptor.getStats("stream1");
      expect(result).to.be.false;
    });

  });

  describe("changeBandwidth", function () {

    let adaptor;

    beforeEach(function () {
      adaptor = new WebRTCAdaptor({
        websocketURL: "ws://example.com",
        initializeComponents: false,
      });
      adaptor.mediaManager = {
        changeBandwidth: sinon.fake()
      };
    });

    it("should call mediaManager's changeBandwidth with correct parameters", function () {
      const bandwidth = 500;
      const streamId = "stream1";

      adaptor.changeBandwidth(bandwidth, streamId);

      expect(adaptor.mediaManager.changeBandwidth.calledWithMatch(bandwidth, streamId)).to.be.true;
    });

    it("should handle zero bandwidth", function () {
      const bandwidth = 0;
      const streamId = "stream1";

      adaptor.changeBandwidth(bandwidth, streamId);

      expect(adaptor.mediaManager.changeBandwidth.calledWithMatch(bandwidth, streamId)).to.be.true;
    });

    it("should handle null streamId", function () {
      const bandwidth = 500;
      const streamId = null;

      adaptor.changeBandwidth(bandwidth, streamId);

      expect(adaptor.mediaManager.changeBandwidth.calledWithMatch(bandwidth, streamId)).to.be.true;
    });
  });

  describe("enableAudioLevelWhenMuted", function () {

    let adaptor;

    beforeEach(function () {
      adaptor = new WebRTCAdaptor({
        websocketURL: "ws://example.com",
        initializeComponents: false,
      });
      adaptor.mediaManager = {
        enableAudioLevelWhenMuted: sinon.fake()
      };
    });

    it("should call mediaManager's enableAudioLevelWhenMuted", function () {
      adaptor.enableAudioLevelWhenMuted();

      expect(adaptor.mediaManager.enableAudioLevelWhenMuted.called).to.be.true;
    });

  });

  describe("disableAudioLevelWhenMuted", function () {

    let adaptor;

    beforeEach(function () {
      adaptor = new WebRTCAdaptor({
        websocketURL: "ws://example.com",
        initializeComponents: false,
      });
      adaptor.mediaManager = {
        disableAudioLevelWhenMuted: sinon.fake()
      };
    });

    it("should call mediaManager's disableAudioLevelWhenMuted", function () {
      adaptor.disableAudioLevelWhenMuted();

      expect(adaptor.mediaManager.disableAudioLevelWhenMuted.called).to.be.true;
    });

  });

  describe("getVideoSender", function () {

    let adaptor;

    beforeEach(function () {
      adaptor = new WebRTCAdaptor({
        websocketURL: "ws://example.com",
        initializeComponents: false,
      });
      adaptor.mediaManager = {
        getVideoSender: sinon.fake()
      };
    });

    it("should call mediaManager's getVideoSender with correct parameters", function () {
      const streamId = "stream1";

      adaptor.getVideoSender(streamId);

      expect(adaptor.mediaManager.getVideoSender.calledWithMatch(streamId)).to.be.true;
    });

    it("should handle null streamId", function () {
      const streamId = null;

      adaptor.getVideoSender(streamId);

      expect(adaptor.mediaManager.getVideoSender.calledWithMatch(streamId)).to.be.true;
    });
  });

  describe("openStream", function () {

    let adaptor;

    beforeEach(function () {
      adaptor = new WebRTCAdaptor({
        websocketURL: "ws://example.com",
        initializeComponents: false,
      });
      adaptor.mediaManager = {
        openStream: sinon.fake()
      };
    });

    it("should call mediaManager's openStream with correct parameters", function () {
      const mediaConstraints = {video: true, audio: true};
      const streamId = "stream1";

      adaptor.openStream(mediaConstraints, streamId);

      expect(adaptor.mediaManager.openStream.calledWithMatch(mediaConstraints, streamId)).to.be.true;
    });

    it("should handle null streamId", function () {
      const mediaConstraints = {video: true, audio: true};
      const streamId = null;

      adaptor.openStream(mediaConstraints, streamId);

      expect(adaptor.mediaManager.openStream.calledWithMatch(mediaConstraints, streamId)).to.be.true;
    });
  });

  describe("closeStream", function () {

    let adaptor;

    beforeEach(function () {
      adaptor = new WebRTCAdaptor({
        websocketURL: "ws://example.com",
        initializeComponents: false,
      });
      adaptor.mediaManager = {
        closeStream: sinon.fake()
      };
    });

    it("should call mediaManager's closeStream", function () {
      adaptor.closeStream();

      expect(adaptor.mediaManager.closeStream.called).to.be.true;
    });

  });

  describe("applyConstraints", function () {

    let adaptor;

    beforeEach(function () {
      adaptor = new WebRTCAdaptor({
        websocketURL: "ws://example.com",
        initializeComponents: false,
      });
      adaptor.mediaManager = {
        applyConstraints: sinon.fake()
      };
    });

    it("should call mediaManager's applyConstraints", function () {
      let constraints = {video: true, audio: true};

      adaptor.applyConstraints(constraints);

      expect(adaptor.mediaManager.applyConstraints.calledWithMatch(constraints)).to.be.true;
    });

  });

  describe("switchVideoCameraFacingMode", function () {

    let adaptor;

    beforeEach(function () {
      adaptor = new WebRTCAdaptor({
        websocketURL: "ws://example.com",
        initializeComponents: false,
      });
      adaptor.mediaManager = {
        switchVideoCameraFacingMode: sinon.fake()
      };
    });

    it("should call mediaManager's switchVideoCameraFacingMode", function () {
      let streamId = "stream1";
      let facingMode = "user";

      adaptor.switchVideoCameraFacingMode(streamId, facingMode);

      expect(adaptor.mediaManager.switchVideoCameraFacingMode.calledWithMatch(streamId, facingMode)).to.be.true;
    });

  });

  describe("switchDesktopCaptureWithCamera", function () {

    let adaptor;

    beforeEach(function () {
      adaptor = new WebRTCAdaptor({
        websocketURL: "ws://example.com",
        initializeComponents: false,
      });
      adaptor.mediaManager = {
        switchDesktopCaptureWithCamera: sinon.fake()
      };
    });

    it("should call mediaManager's switchDesktopCaptureWithCamera", function () {
      let streamId = "stream1";

      adaptor.switchDesktopCaptureWithCamera(streamId);

      expect(adaptor.mediaManager.switchDesktopCaptureWithCamera.calledWithMatch(streamId)).to.be.true;
    });

  });

  describe("switchAudioInputSource", function () {

    let adaptor;

    beforeEach(function () {
      adaptor = new WebRTCAdaptor({
        websocketURL: "ws://example.com",
        initializeComponents: false,
      });
      adaptor.mediaManager = {
        switchAudioInputSource: sinon.fake()
      };
    });

    it("should call mediaManager's switchAudioInputSource", function () {
      let streamId = "stream1";
      let deviceId = "deviceId1";

      adaptor.switchAudioInputSource(streamId, deviceId);

      expect(adaptor.mediaManager.switchAudioInputSource.calledWithMatch(streamId, deviceId)).to.be.true;
    });

  });

  describe("setVolumeLevel", function () {

    let adaptor;

    beforeEach(function () {
      adaptor = new WebRTCAdaptor({
        websocketURL: "ws://example.com",
        initializeComponents: false,
      });
      adaptor.mediaManager = {
        setVolumeLevel: sinon.fake()
      };
    });

    it("should call mediaManager's setVolumeLevel", function () {
      let volumeLevel = 50;

      adaptor.setVolumeLevel(volumeLevel);

      expect(adaptor.mediaManager.setVolumeLevel.calledWithMatch(volumeLevel)).to.be.true;
    });

  });

  describe("switchDesktopCapture", function () {

    let adaptor;

    beforeEach(function () {
      adaptor = new WebRTCAdaptor({
        websocketURL: "ws://example.com",
        initializeComponents: false,
      });
      adaptor.mediaManager = {
        switchDesktopCapture: sinon.fake()
      };
    });

    it("should call mediaManager's switchDesktopCapture", function () {
      let streamId = "stream1";

      adaptor.switchDesktopCapture(streamId);

      expect(adaptor.mediaManager.switchDesktopCapture.calledWithMatch(streamId)).to.be.true;
    });

  });

  describe("updateVideoTrack", function () {

    let adaptor;

    beforeEach(function () {
      adaptor = new WebRTCAdaptor({
        websocketURL: "ws://example.com",
        initializeComponents: false,
      });
      adaptor.mediaManager = {
        updateVideoTrack: sinon.fake()
      };
    });

    it("should call mediaManager's updateVideoTrack", function () {
      let stream = "stream0";
      let streamId = "stream1";
      let onEndedCallback = null;
      let stopDesktop = false;

      adaptor.updateVideoTrack(stream, streamId, onEndedCallback, stopDesktop);

      expect(adaptor.mediaManager.updateVideoTrack.calledWithMatch(stream, streamId, onEndedCallback, stopDesktop)).to.be.true;
    });


  });

});
