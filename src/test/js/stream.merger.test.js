import { StreamMerger } from '../../main/js/stream_merger.js';

describe("StreamMerger", function () {
  let clock;
  let sandbox;
  let streamMerger

  var currentTest;
  
  beforeEach(function () {
    currentTest = this.currentTest;

    console.log("**** starting test: ****", currentTest.title);

    clock = sinon.useFakeTimers();
    sandbox = sinon.createSandbox();
    const initialValues = {
      websocketURL: "ws://example.com",
      headless: false,
    };

    streamMerger = new StreamMerger(initialValues);
    streamMerger.audioCtx = createMockAudioContext();
    streamMerger.audioDestination = streamMerger.audioCtx.createMediaStreamDestination();
    streamMerger.addAudioTrackToCanvasStream = sinon.stub();
    streamMerger.initializeWebRTCAdaptors = sinon.stub();
    streamMerger.setPlayersInvisible = sinon.stub();
    streamMerger.start();

  });

  afterEach(() => {

    // Restore the default sandbox and timers
    //streamMerger.stopStreaming();
    sinon.restore();
    clock.restore();
    sandbox.restore();
    
    console.log("**** ending test: ****", currentTest.title);

  });

  function createMockAudioContext() {
    const audioDestination = {stream: createMockMediaStream()};

    const audioCtx = {
      createMediaStreamDestination: sinon.stub().returns(audioDestination),
      createMediaStreamSource: sinon.stub().returns({connect: sinon.stub().returns({connect: sinon.stub()})}),
      createGain: sinon.stub().returns({gain:{}, connect: sinon.stub()}),
      createAnalyser: sinon.stub().returns({connect: sinon.stub()}),
      close: sinon.stub(),
      resume: sinon.stub(),

    };
    return audioCtx;
  }

  function createMockMediaStream(width = 640, height = 480) {
    const mediaStream = new MediaStream();
  
    // Create mock MediaStreamTrack objects
    const audioTrack = {
      kind: 'audio',
      id: 'audioTrack',
      enabled: true,
      stop: sinon.stub(),
      getSettings: sinon.stub().returns({ sampleRate: 48000,  })
    };
    
  
    const videoTrack = {
      kind: 'video',
      id: 'videoTrack',
      enabled: true,
      stop: sinon.stub(),
      getSettings: sinon.stub().returns({ width: width, height: height})
    };
  
    // Stub the MediaStream methods
    sinon.stub(mediaStream, 'addTrack').callsFake((track) => {
      if (!mediaStream._tracks) {
        mediaStream._tracks = [];
      }
      mediaStream._tracks.push(track);
    });
  
    sinon.stub(mediaStream, 'getTracks').callsFake(() => {
      return mediaStream._tracks || [];
    });
  
    sinon.stub(mediaStream, 'getAudioTracks').callsFake(() => {
      return (mediaStream._tracks || []).filter(track => track.kind === 'audio');
    });
  
    sinon.stub(mediaStream, 'getVideoTracks').callsFake(() => {
      return (mediaStream._tracks || []).filter(track => track.kind === 'video');
    });

    mediaStream.addTrack(audioTrack);
    mediaStream.addTrack(videoTrack);
  
    return mediaStream;
  }

 
  it("should change the aspect ratio and call resizeAndSortV2", function () {
    const resizeAndSortV2Spy = sinon.spy(streamMerger, "resizeAndSortV2");

    const newAspectRatio = "16:9";
    streamMerger.changeAspectRatio(newAspectRatio);

    expect(streamMerger.aspectRatio).to.equal(newAspectRatio);
    expect(resizeAndSortV2Spy.calledOnce).to.be.true;
  });

  it("should change the merged streams size", function () {
    const resizeAndSortV2Spy = sinon.spy(streamMerger, "resizeAndSortV2");

    const height = 480;
    streamMerger.changeStreamSize(height);
    expect(streamMerger.stream_height).to.equal(height);
    expect(resizeAndSortV2Spy.calledOnce).to.be.true;

  });

  it("should update the canvas size", function () {
    const width = 640;
    const height = 480;
    streamMerger.updateCanvasSize(width, height);
    expect(streamMerger.width).to.equal(width);
    expect(streamMerger.height).to.equal(height);
  });

  

  it("should add a stream to the streams array", async function () {
    
    const mediaStream = createMockMediaStream();
    
    const options = {
      streamId: "stream1",
      width: 320,
      height: 240,
      Xindex: 0,
      Yindex: 0,
      mute: false,
      element: document.createElement("video")
    };
    streamMerger.addStream(mediaStream, options);
    expect(streamMerger.streams.length).to.equal(1);
  });


  it("should set the correct properties for the added stream", async function () {
    streamMerger.resizeAndSortV2 = () => {};
    streamMerger.pwidth = 100;
    streamMerger.pheight = 200;
  
    const mediaStream = createMockMediaStream(480, 640);
    
    const options = {
      streamId: "stream1",
      width: 320,
      height: 240,
      Xindex: 0,
      Yindex: 0,
      mute: false,
      element: document.createElement("video")
    };
    streamMerger.addStream(mediaStream, options);

    const addedStream = streamMerger.streams[0];
    expect(addedStream.streamId).to.equal("stream1");
    expect(addedStream.width).to.equal(100);
    expect(addedStream.height).to.equal(200);
    expect(addedStream.Xindex).to.equal(0);
    expect(addedStream.Yindex).to.equal(0);
    expect(addedStream.portrait).to.be.true;
    expect(addedStream.aspectRatio).to.equal(4 / 3);
    expect(addedStream.x).to.equal(110);
    expect(addedStream.y).to.equal(0);
    expect(addedStream.mute).to.be.false;
    expect(addedStream.element).to.be.an.instanceOf(HTMLVideoElement);
  });
 
  it("should calculate the stream dimensions correctly", function () {
    // Set the necessary properties for the test
    streamMerger.stream_height = 480;
    streamMerger.aspectRatio = "16:9";

    // Call the method to calculate the stream dimensions
    const [pcwidth, pcheight, divider] = streamMerger.calculateStreamDimensions();

    // Assert the expected values
    expect(pcwidth).to.equal(270);
    expect(pcheight).to.equal(480);
    expect(divider).to.equal(1);
  });


  
  it("should resize and sort the streams correctly", function () {
    streamMerger.width = 480;
    streamMerger.height = 360;

    const mediaStream1 = new MediaStream();
    const options1 = { streamId: "stream1", width: 150, height: 150, Xindex: 0, Yindex: 0, mute: false };
    
    const mediaStream2 = new MediaStream();
    const options2 = { streamId: "stream2", width: 150, height: 150, Xindex: 1, Yindex: 0, mute: false };
    
    const mediaStream3 = new MediaStream();
    const options3 = { streamId: "stream3", width: 150, height: 150, Xindex: 0, Yindex: 1, mute: false };
    
    streamMerger.streams.push(mediaStream1);
    streamMerger.streams.push(mediaStream2);
    streamMerger.streams.push(mediaStream3);

    // Call the resizeAndSortV2 method
    streamMerger.resizeAndSortV2();
  
    // Assert the expected values
    expect(streamMerger.streams[0].width).to.equal(320);
    expect(streamMerger.streams[0].height).to.equal(240);
    expect(streamMerger.streams[0].x).to.equal(0);
    expect(streamMerger.streams[0].y).to.equal(0);
  
    expect(streamMerger.streams[1].width).to.equal(320);
    expect(streamMerger.streams[1].height).to.equal(240);
    expect(streamMerger.streams[1].x).to.equal(320);
    expect(streamMerger.streams[1].y).to.equal(0);
  
    expect(streamMerger.streams[2].width).to.equal(320);
    expect(streamMerger.streams[2].height).to.equal(240);
    expect(streamMerger.streams[2].x).to.equal(160);
    expect(streamMerger.streams[2].y).to.equal(240);
  });

  it("should resize and sort four streams correctly", function () {
    streamMerger.width = 480;
    streamMerger.height = 360;

    const mediaStream1 = new MediaStream();
    const options1 = { streamId: "stream1", width: 150, height: 150, Xindex: 0, Yindex: 0, mute: false };
    
    const mediaStream2 = new MediaStream();
    const options2 = { streamId: "stream2", width: 150, height: 150, Xindex: 1, Yindex: 0, mute: false };
    
    const mediaStream3 = new MediaStream();
    const options3 = { streamId: "stream3", width: 150, height: 150, Xindex: 0, Yindex: 1, mute: false };

    const mediaStream4 = new MediaStream();
    const options4 = { streamId: "stream4", width: 150, height: 150, Xindex: 1, Yindex: 1, mute: false };
    
    streamMerger.streams.push(mediaStream1);
    streamMerger.streams.push(mediaStream2);
    streamMerger.streams.push(mediaStream3);
    streamMerger.streams.push(mediaStream4);

    // Call the resizeAndSortV2 method
    streamMerger.resizeAndSortV2();
  
    // Assert the expected values
    expect(streamMerger.streams[0].width).to.equal(320);
    expect(streamMerger.streams[0].height).to.equal(240);
    expect(streamMerger.streams[0].x).to.equal(0);
    expect(streamMerger.streams[0].y).to.equal(0);
  
    expect(streamMerger.streams[1].width).to.equal(320);
    expect(streamMerger.streams[1].height).to.equal(240);
    expect(streamMerger.streams[1].x).to.equal(320);
    expect(streamMerger.streams[1].y).to.equal(0);
  
    expect(streamMerger.streams[2].width).to.equal(320);
    expect(streamMerger.streams[2].height).to.equal(240);
    expect(streamMerger.streams[2].x).to.equal(0);
    expect(streamMerger.streams[2].y).to.equal(240);

    expect(streamMerger.streams[3].width).to.equal(320);
    expect(streamMerger.streams[3].height).to.equal(240);
    expect(streamMerger.streams[3].x).to.equal(320);
    expect(streamMerger.streams[3].y).to.equal(240);
  });

  it("should resize and sort five streams correctly", function () {
    streamMerger.width = 480;
    streamMerger.height = 360;

    const mediaStream1 = new MediaStream();
    const options1 = { streamId: "stream1", width: 150, height: 150, Xindex: 0, Yindex: 0, mute: false };
    
    const mediaStream2 = new MediaStream();
    const options2 = { streamId: "stream2", width: 150, height: 150, Xindex: 1, Yindex: 0, mute: false };
    
    const mediaStream3 = new MediaStream();
    const options3 = { streamId: "stream3", width: 150, height: 150, Xindex: 0, Yindex: 1, mute: false };

    const mediaStream4 = new MediaStream();
    const options4 = { streamId: "stream4", width: 150, height: 150, Xindex: 1, Yindex: 1, mute: false };

    const mediaStream5 = new MediaStream();
    const options5 = { streamId: "stream5", width: 150, height: 150, Xindex: 1, Yindex: 1, mute: false };
    
    streamMerger.streams.push(mediaStream1);
    streamMerger.streams.push(mediaStream2);
    streamMerger.streams.push(mediaStream3);
    streamMerger.streams.push(mediaStream4);
    streamMerger.streams.push(mediaStream5);


    // Call the resizeAndSortV2 method
    streamMerger.resizeAndSortV2();
  
    // Assert the expected values
    expect(streamMerger.streams[0].width).to.equal(160);
    expect(streamMerger.streams[0].height).to.equal(120);
    expect(streamMerger.streams[0].x).to.equal(0);
    expect(streamMerger.streams[0].y).to.equal(0);
  
    expect(streamMerger.streams[1].width).to.equal(160);
    expect(streamMerger.streams[1].height).to.equal(120);
    expect(streamMerger.streams[1].x).to.equal(160);
    expect(streamMerger.streams[1].y).to.equal(0);
  
    expect(streamMerger.streams[2].width).to.equal(160);
    expect(streamMerger.streams[2].height).to.equal(120);
    expect(streamMerger.streams[2].x).to.equal(320);
    expect(streamMerger.streams[2].y).to.equal(0);

    expect(streamMerger.streams[3].width).to.approximately(213.3, 0.1);
    expect(streamMerger.streams[3].height).to.equal(160);
    expect(streamMerger.streams[3].x).to.approximately(26.7, 0.1);
    expect(streamMerger.streams[3].y).to.equal(120);

    expect(streamMerger.streams[4].width).to.approximately(213.3, 0.1);
    expect(streamMerger.streams[4].height).to.equal(160);
    expect(streamMerger.streams[4].x).to.equal(240);
    expect(streamMerger.streams[4].y).to.equal(120);
  });

  it("should update the layout based on the received message", function () {
    const layoutData = {
      layoutOptions: {
        canvas: {
          width: 640,
          height: 480
        },
        layout: [
          {
            streamId: "stream1",
            region: {
              xPos: 0,
              yPos: 0,
              width: 320,
              height: 240
            },
            placeholderImageUrl: "https://example.com/image1.jpg"
          },
          {
            streamId: "stream2",
            region: {
              xPos: 320,
              yPos: 0,
              width: 320,
              height: 240
            },
            placeholderImageUrl: "https://example.com/image2.jpg"
          }
        ]
      },
    streamId: "stream0",
    };

    const video1 = document.createElement("video");
    video1.srcObject = createMockMediaStream();
    const video2 = document.createElement("video");
    video2.srcObject = createMockMediaStream();

    sinon.stub(document, 'getElementById').withArgs('remoteVideostream1').returns(video1)
    .withArgs('remoteVideostream2').returns(video2);

    streamMerger.publishStreamId = "stream0";

    streamMerger.processPublisherMessageAndUpdateLayout(JSON.stringify(layoutData));

    expect(streamMerger.streams.length).to.equal(2);

    const stream1 = streamMerger.streams[0];
    expect(stream1.streamId).to.equal("stream1");
    expect(stream1.x).to.equal(0);
    expect(stream1.y).to.equal(0);
    expect(stream1.width).to.equal(320);
    expect(stream1.height).to.equal(240);
    expect(stream1.element).to.equal(video1);

    const stream2 = streamMerger.streams[1];
    expect(stream2.streamId).to.equal("stream2");
    expect(stream2.x).to.equal(320);
    expect(stream2.y).to.equal(0);
    expect(stream2.width).to.equal(320);
    expect(stream2.height).to.equal(240);
    expect(stream2.element).to.equal(video2);
  });

  it("should assign video tracks correctly", function () {
    const data = `{
      "streamId": "stream1",
      "eventType": "VIDEO_TRACK_ASSIGNMENT_LIST",
      "payload": [
        {
          "videoLabel": "video1",
          "trackId": "track1"
        },
        {
          "videoLabel": "video2",
          "trackId": "track2"
        }
      ]
    }`;

    streamMerger.processPlayerNotificationEvent(data);

    expect(streamMerger.trackAMSStreamMap["video1"]).to.equal("track1");
    expect(streamMerger.trackAMSStreamMap["video2"]).to.equal("track2");
  });

  it("should assign audio tracks correctly", function () {
    const data = `{
      "streamId": "stream1",
      "eventType": "AUDIO_TRACK_ASSIGNMENT",
      "payload": [
        {
          "audioLabel": "audio1",
          "trackId": "track1"
        },
        {
          "audioLabel": "audio2",
          "trackId": "track2"
        }
      ]
    }`;

    streamMerger.processPlayerNotificationEvent(data);

    expect(streamMerger.trackAMSStreamMap["audio1"]).to.equal("track1");
    expect(streamMerger.trackAMSStreamMap["audio2"]).to.equal("track2");
  });

  it("should not create video element and add track before get assignments", function () {
    const streamId = "stream1";
    const trackId = "ARDAMSvtrack1";

    streamMerger.playVideo({ streamId, track: { id: trackId, kind: "video" } });
   
    const videoElement = document.getElementById("remoteVideostream1");

    expect(videoElement).to.be.null;
  });


  it("should create video element and add track", function () {
    const streamId = "stream1";
    const trackId = "ARDAMSv"+"track1";

    const players = document.createElement("div");
    players.id = "players"; 

    document.body.appendChild(players);
    expect(document.getElementById("players")).not.to.be.null;

    streamMerger.trackAMSStreamMap["track1"] = streamId;

    let trackMock = {
      id: trackId,
      kind: "video",
    };

    // Create a mock MediaStream object
    let mediaStreamMock = createMockMediaStream();

    const originalMediaStream = window.MediaStream;
    // Stub the MediaStream constructor to return the mock MediaStream object
    window.MediaStream = sinon.stub().returns(mediaStreamMock);
    streamMerger.playVideo({ streamId, track: trackMock});
   
    const videoElement = document.getElementById("remoteVideostream1");

    //console.log(document.documentElement.outerHTML);

    expect(videoElement).to.not.be.null;


    streamMerger.removeRemoteVideo(streamId);
    expect(document.getElementById("remoteVideostream1")).to.be.null;

    window.MediaStream = originalMediaStream;
  });


  
it('should mute and unmute the stream correctly', function() {
  const streamId = 'stream1';
  streamMerger.streams = [
    {
        streamId: streamId,
        element: true,
        mute: false,
        audioGainNode: { gain: { value: 1 } }
    }
  ];

  // Mute the stream
  streamMerger.muteStream(streamId);
  let stream = streamMerger.streams[0];
  expect(stream.mute).to.be.true;
  expect(stream.audioGainNode.gain.value).to.equal(0);

  // Unmute the stream
  streamMerger.muteStream(streamId);
  stream = streamMerger.streams[0];
  expect(stream.mute).to.be.false;
  expect(stream.audioGainNode.gain.value).to.equal(1);
});

it("should remove the specified stream from the streams array", function () {
  const mediaStream1 = createMockMediaStream();
  const options1 = { streamId: "stream1", width: 320, height: 240, Xindex: 0, Yindex: 0, mute: false };
  
  const mediaStream2 = createMockMediaStream();
  const options2 = { streamId: "stream2", width: 320, height: 240, Xindex: 1, Yindex: 0, mute: false };
  
  const mediaStream3 = createMockMediaStream();
  const options3 = { streamId: "stream3", width: 320, height: 240, Xindex: 0, Yindex: 1, mute: false };
  
  streamMerger.addStream(mediaStream1, options1);
  streamMerger.addStream(mediaStream2, options2);
  streamMerger.addStream(mediaStream3, options3);

  const initialStreamsLength = streamMerger.streams.length;

  streamMerger.removeStream("stream2");

  expect(streamMerger.streams.length).to.equal(initialStreamsLength - 1);
  expect(streamMerger.streams.find(stream => stream.streamId === "stream2")).to.be.undefined;
});


it("should remove all streams from the streams array", function () {
  const mediaStream1 = createMockMediaStream();
  const options1 = { streamId: "stream1", width: 320, height: 240, Xindex: 0, Yindex: 0, mute: false };
  
  const mediaStream2 = createMockMediaStream();
  const options2 = { streamId: "stream2", width: 320, height: 240, Xindex: 1, Yindex: 0, mute: false };
  
  const mediaStream3 = createMockMediaStream();
  const options3 = { streamId: "stream3", width: 320, height: 240, Xindex: 0, Yindex: 1, mute: false };
  
  streamMerger.addStream(mediaStream1, options1);
  streamMerger.addStream(mediaStream2, options2);
  streamMerger.addStream(mediaStream3, options3);

  streamMerger.clearAllStreams();

  expect(streamMerger.streams.length).to.equal(0);
});

it("should stop the stream merger and clean up resources", function () {
  const mediaStream1 = createMockMediaStream();
  const options1 = { streamId: "stream1", width: 320, height: 240, Xindex: 0, Yindex: 0, mute: false };
  
  streamMerger.addStream(mediaStream1, options1);

  streamMerger.stop();

  expect(streamMerger.started).to.be.false;
  expect(streamMerger.streams.length).to.equal(0);
  expect(streamMerger.audioCtx).to.be.null;
  expect(streamMerger.audioDestination).to.be.null;
  expect(streamMerger.videoSyncDelayNode).to.be.null;
  expect(streamMerger.result).to.be.null;
});

it("should start streaming", function () {
  streamMerger.setPlayersInvisible = sinon.stub();
  streamMerger.initializeWebRTCAdaptors = sinon.stub();
  streamMerger.startMerger = sinon.stub();
  streamMerger.webRTCAdaptorPlayer = {
    play: sinon.stub()
  };

  streamMerger.startStreaming();

  expect(streamMerger.setPlayersInvisible.calledOnce).to.be.true;
  expect(streamMerger.initializeWebRTCAdaptors.calledOnce).to.be.true;
  expect(streamMerger.startMerger.calledOnce).to.be.true;
  expect(streamMerger.webRTCAdaptorPlayer.play.calledOnce).to.be.true;
});

it("should stop streaming", function () {
  const stopSpy = sinon.stub(); 
  const stopPlayerSpy = sinon.stub();
  streamMerger.webRTCAdaptorPublisher = {stop: stopSpy};
  streamMerger.webRTCAdaptorPlayer = {stop: stopPlayerSpy};

  streamMerger.stopStreaming();

  expect(stopSpy.calledOnceWith(streamMerger.publishStreamId)).to.be.true;
  expect(stopPlayerSpy.calledOnceWith(streamMerger.roomName)).to.be.true;
  expect(streamMerger.isStopping).to.be.true;
});


it('should handle publisherAdaptorCallback correctly', function() {

  sinon.stub(streamMerger, 'startMerger');
  sinon.stub(streamMerger, 'streamStartedCallback');
  sinon.stub(streamMerger, 'streamFinishedCallback');
  sinon.stub(streamMerger, 'processPublisherMessageAndUpdateLayout');

  // Test "initialized" case
  streamMerger.headless = true;
  streamMerger.publisherAdaptorCallback('initialized');
  expect(streamMerger.startMerger.calledOnce).to.be.true;

  // Test "publish_started" case
  streamMerger.publisherAdaptorCallback('publish_started');
  expect(streamMerger.streamStartedCallback.calledOnce).to.be.true;

  // Test "publish_finished" case
  streamMerger.publisherAdaptorCallback('publish_finished');
  expect(streamMerger.streamFinishedCallback.calledOnce).to.be.true;

  // Test "data_received" case
  const dataObj = { data: 'test_data' };
  streamMerger.publisherAdaptorCallback('data_received', dataObj);
  expect(streamMerger.processPublisherMessageAndUpdateLayout.calledOnceWith('test_data')).to.be.true;
});


it('should handle playerAdaptorCallback correctly', function() {

  const playSpy = sinon.spy();
  const requestVideoTrackAssignmentsSpy = sinon.spy();
  streamMerger.webRTCAdaptorPlayer = {play: playSpy, requestVideoTrackAssignments: requestVideoTrackAssignmentsSpy};
  sinon.stub(streamMerger, 'playVideo');
  sinon.stub(streamMerger, 'processPlayerNotificationEvent');

  // Test "initialized" case
  streamMerger.headless = true;
  streamMerger.roomName = 'testRoom';
  streamMerger.playerAdaptorCallback('initialized');
  expect(playSpy.calledOnceWith('testRoom')).to.be.true;

  // Test "newStreamAvailable" case
  const obj = { stream: 'testStream' };
  streamMerger.playerAdaptorCallback('newStreamAvailable', obj);
  expect(requestVideoTrackAssignmentsSpy.calledOnceWith('testRoom')).to.be.true;
  expect(streamMerger.playVideo.calledOnceWith(obj)).to.be.true;

  // Test "data_received" case
  const dataObj = { data: 'test_data' };
  streamMerger.playerAdaptorCallback('data_received', dataObj);
  expect(streamMerger.processPlayerNotificationEvent.calledOnceWith('test_data')).to.be.true;
});
  
  
});