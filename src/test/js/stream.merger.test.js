import { StreamMerger } from '../../main/js/stream_merger.js';

describe("StreamMerger", function () {
  let clock;
  let sandbox;
  let streamMerger

  
  beforeEach(function () {
    clock = sinon.useFakeTimers();
    sandbox = sinon.createSandbox();
    const initialValues = {
      websocketURL: "ws://example.com",
    };
    streamMerger = new StreamMerger(initialValues);
  });

  afterEach(() => {
    // Restore the default sandbox and timers
    sinon.restore();
    clock.restore();
    sandbox.restore();
  });

  it("should throw an error if no options are provided", async function () {
    try {
      let merger = new StreamMerger();
      expect.fail("It should throw an exception because options are mandatory");
    } catch (err) {
      // Assert that an error was thrown
      expect(err).to.be.an('error');
      // Optionally, check the error message or type
    }
  });

  it("should initialize the audio context and create audio destination", async function () {
    streamMerger.initAudioContext();

    expect(streamMerger.audioCtx).to.be.an.instanceOf(AudioContext);
    expect(streamMerger.audioDestination).to.be.an.instanceOf(MediaStreamAudioDestinationNode);
    expect(streamMerger.videoSyncDelayNode).to.be.an.instanceOf(AudioNode);
  });


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

  /*
  it("should add a stream to the streams array", async function () {
    streamMerger.initAudioContext();

    const audioSource = {
      connect: () => {return {connect: sinon.stub()} },
    };
    
    sinon.stub(streamMerger.audioCtx, "createMediaStreamSource").returns(audioSource);

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
    
    streamMerger.initAudioContext();
    streamMerger.resizeAndSortV2 = () => {};
    streamMerger.pwidth = 100;
    streamMerger.pheight = 200;
    
    const audioSource = {
      connect: () => {return {connect: sinon.stub()} },
    };
    
    sinon.stub(streamMerger.audioCtx, "createMediaStreamSource").returns(audioSource);
    
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
    streamMerger.initAudioContext();
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

  */
  
  
});