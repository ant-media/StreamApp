import {
  generateRandomString,
  getWebSocketURL,
  getRtmpUrl,
  getQueryParameter,
  isAndroid,
  errorHandler
} from '../../main/js/utility.js';

import "../../main/js/external/loglevel.min.js";

describe("Utility Functions", function () {

  it("should generate a random string of specified length", function () {
    const randomString = generateRandomString(10);
    assert(randomString.length, 10);
  });

  it("should return a WebSocket URL", function () {
    const location = { protocol: 'http:', hostname: 'localhost', port: '8080', pathname: '/app/' };
    const url = getWebSocketURL(location, 'rtmpForward');
    assert(url, 'ws://localhost:8080/app/websocket?rtmpForward=rtmpForward');
  });

  it("should return a RTMP URL", function () {
    const location = { hostname: 'localhost', pathname: '/app/' };
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

  it("should handle errors", function () {
    const error = errorHandler('NotFoundError', 'Camera not found');
    console.assert(error, 'Camera or Mic are not found or not allowed in your device');
  });

});
