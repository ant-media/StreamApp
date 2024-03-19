import {
  isMobile,
  getURL
} from '../../main/js/fetch.stream.js';

describe("Fetch Stream", function () {
  describe("getURL function", function () {

    it("should return correct URL when all parameters are provided", function () {
      const url = getURL('testName', 'testType', 'testToken', 'testId', 'testCode');
      assert(url, 'streams/testName.testType?&token=testToken&subscriberId=testId&subscriberCode=testCode');
    });

    it("should return correct URL when playType is not provided", function () {
      const url = getURL('testName', null, 'testToken', 'testId', 'testCode');
      assert(url, 'streams/testName?&token=testToken&subscriberId=testId&subscriberCode=testCode');
    });

    it("should return correct URL when token is not provided", function () {
      const url = getURL('testName', 'testType', undefined, 'testId', 'testCode');
      assert(url, 'streams/testName.testType?&subscriberId=testId&subscriberCode=testCode');
    });

    it("should return correct URL when subscriberId is not provided", function () {
      const url = getURL('testName', 'testType', 'testToken', undefined, 'testCode');
      assert(url, 'streams/testName.testType?&token=testToken&subscriberCode=testCode');
    });

    it("should return correct URL when subscriberCode is not provided", function () {
      const url = getURL('testName', 'testType', 'testToken', 'testId', undefined);
      assert(url, 'streams/testName.testType?&token=testToken&subscriberId=testId');
    });

    it("should return correct URL when no parameters are provided", function () {
      const url = getURL('testName');
      assert(url, 'streams/testName?');
    });

  });

describe("isMobile function", function () {

  it("should return true when user agent is Android", function () {
    Object.defineProperty(navigator, 'userAgent', {
      value: 'Android',
      writable: true
    });
    const result = isMobile();
    assert(result, true);
  });

  it("should return true when user agent is iPhone", function () {
    Object.defineProperty(navigator, 'userAgent', {
      value: 'iPhone',
      writable: true
    });
    const result = isMobile();
    assert(result, true);
  });

  it("should return true when user agent is BlackBerry", function () {
    Object.defineProperty(navigator, 'userAgent', {
      value: 'BlackBerry',
      writable: true
    });
    const result = isMobile();
    assert(result, true);
  });

});


});
