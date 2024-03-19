import {
  generateRandomString,
  getWebSocketURL,
  getRtmpUrl,
  getQueryParameter,
  isAndroid,
  errorHandler,
  getSrtURL
} from '../../main/js/utility.js';

import "../../main/js/external/loglevel.min.js";

describe("Utility Functions", function () {

  it("should generate a random string of specified length", function () {
    const randomString = generateRandomString(10);
    assert(randomString.length, 10);
  });

  it("should return a WebSocket URL", function () {
    const location = {protocol: 'http:', hostname: 'localhost', port: '8080', pathname: '/app/'};
    const url = getWebSocketURL(location, 'rtmpForward');
    assert(url, 'ws://localhost:8080/app/websocket?rtmpForward=rtmpForward');
  });

  it("should return a RTMP URL", function () {
    const location = {hostname: 'localhost', pathname: '/app/'};
    const url = getRtmpUrl(location, 'streamId');
    assert(url, 'rtmp://localhost/appstreamId');
  });

  it("should return a query parameter", function () {
    const paramName = 'param';
    // mock the window.location.search
    const url = getQueryParameter(paramName);
    console.log(url);
    assert.notEqual(url, '&param=undefined');
  });

  it("should check if the device is Android", function () {
    const isDeviceAndroid = isAndroid();
    console.assert(isDeviceAndroid, false);
  });

  it("should return correct SRT URL when port is provided", function () {
    const location = {hostname: 'localhost', pathname: '/app/'};
    const url = getSrtURL(location, 'streamId', 8080);
    assert(url, 'srt://localhost:8080?streamid=appstreamId');
  });

  it("should return correct SRT URL when port is not provided", function () {
    const location = {hostname: 'localhost', pathname: '/app/'};
    const url = getSrtURL(location, 'streamId');
    assert(url, 'srt://localhost:undefined?streamid=appstreamId');
  });

  it("should return correct SRT URL when pathname has no trailing slash", function () {
    const location = {hostname: 'localhost', pathname: '/app'};
    const url = getSrtURL(location, 'streamId', 8080);
    assert(url, 'srt://localhost:8080?streamid=appstreamId');
  });

  it("should return correct SRT URL when pathname has multiple segments", function () {
    const location = {hostname: 'localhost', pathname: '/app/extra'};
    const url = getSrtURL(location, 'streamId', 8080);
    assert(url, 'srt://localhost:8080?streamid=appstreamId');
  });

  it("should return WebSocket disconnected message when error is WebSocketNotConnected", function () {
    const error = errorHandler('WebSocketNotConnected', 'WebSocket disconnected');
    assert(error, 'WebSocket is disconnected.');
  });

  it("should return server initialization message when error is not_initialized_yet", function () {
    const error = errorHandler('not_initialized_yet', 'Server is initializing');
    assert(error, 'Server is getting initialized.');
  });

  it("should return data store not available message when error is data_store_not_available", function () {
    const error = errorHandler('data_store_not_available', 'Data store not available');
    assert(error, 'Data store is not available. It\'s likely that server is initialized or getting closed');
  });

  it("should return camera or mic not found message when error is NotFoundError", function () {
    const error = errorHandler('NotFoundError', 'Camera or Mic not found');
    assert(error, 'Camera or Mic are not found or not allowed in your device');
  });

  it("should return camera or mic in use message when error is NotReadableError", function () {
    const error = errorHandler('NotReadableError', 'Camera or Mic in use');
    assert(error, 'Camera or Mic are already in use and they cannot be opened. Choose another video/audio source if you have on the page below ');
  });

  it("should return no device found message when error is OverconstrainedError", function () {
    const error = errorHandler('OverconstrainedError', 'No device found');
    assert(error, 'There is no device found that fits your video and audio constraints. You may change video and audio constraints');
  });

  it("should return not allowed to access camera and mic message when error is NotAllowedError", function () {
    const error = errorHandler('NotAllowedError', 'Not allowed to access camera and mic');
    assert(error, 'You are not allowed to access camera and mic.');
  });

  it("should return video/audio is required message when error is TypeError", function () {
    const error = errorHandler('TypeError', 'Video/Audio is required');
    assert(error, 'Video/Audio is required');
  });

  it("should return not allowed to reach devices from an insecure origin message when error is getUserMediaIsNotAllowed", function () {
    const error = errorHandler('getUserMediaIsNotAllowed', 'Not allowed to reach devices from an insecure origin');
    assert(error, 'You are not allowed to reach devices from an insecure origin, please enable ssl');
  });

  it("should return install SSL message when error is UnsecureContext", function () {
    const error = errorHandler('UnsecureContext', 'Install SSL');
    assert(error, 'Please Install SSL(https). Camera and mic cannot be opened because of unsecure context. ');
  });

  it("should return no active live stream with this id to play message when error is no_stream_exist", function () {
    const error = errorHandler('no_stream_exist', 'No active live stream with this id to play');
    assert(error, 'There is no active live stream with this id to play');
  });

  it("should return the error message when error is not any of the predefined ones", function () {
    const error = errorHandler('randomError', 'Random error');
    assert(error, 'randomError');
  });

});
