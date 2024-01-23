import "@babel/polyfill";
import chrome from "selenium-webdriver/chrome";
import { Builder, By, Key, Capabilities, until } from "selenium-webdriver";
import assert from "assert";
import { path } from "chromedriver";
import { ExpectedConditions as EC } from 'protractor'
let driver = null;
const chromeOptions = new chrome.Options().addArguments("use-fake-ui-for-media-stream", "--use-fake-device-for-media-stream").headless();
const URL = "http://localhost:5080/LiveApp/conference.html";

describe("Selenium", () => {
  beforeEach(async () => {
    driver = await new Builder(path)
    .forBrowser("chrome")
    .setChromeOptions(chromeOptions)
    .build();
    await driver.get(URL);
  });

  afterEach(async () => {
    await driver.quit();
  });

  it("should render audio mute status", async () => {

    let micMuted = false;
    let changeToScreen = false;

    var startPublishingButton = await driver.findElement(By.id("join_publish_button"));
    assert.notStrictEqual(startPublishingButton, null);

    startPublishingButton = driver.wait(until.elementIsEnabled(startPublishingButton), 10000);
    assert.strictEqual(await startPublishingButton.isEnabled(), true);

    await startPublishingButton.click();
    startPublishingButton = driver.wait(until.elementIsDisabled(startPublishingButton), 10000);

    await driver.executeScript("return console.log('localStream audio track status:' + document.getElementById(\'localVideo\').srcObject.getAudioTracks()[0].enabled)");

    const cdpConnection = await driver.createCDPConnection('page');
    
    await driver.onLogEvent(cdpConnection, function (event) {
      let log = event['args'][0]['value'];

      // Call audio track status after the changeToScreen clicked && 
      if(typeof log != "undefined" && changeToScreen  && log.includes('audio destination add track')){ 
        driver.executeScript("return console.log('localStream audio track status:' + document.getElementById(\'localVideo\').srcObject.getAudioTracks()[0].enabled)");
      }

     if(typeof log != "undefined" && !micMuted && log.includes("localStream")){
        console.log("localStream audio track enabled by default");
        assert.strictEqual(log.includes("localStream audio track status:true"),true);
     }

      if(typeof log != "undefined" && micMuted && log.includes("localStream")){
        console.log("localStream audio track disabled after mic muted clicked");
        assert.strictEqual(log.includes("localStream audio track status:false"),true);
      }

    if(typeof log != "undefined" && changeToScreen && log.includes("localStream")){
      console.log("localStream audio track should disabled after the micMuted and changeToScreen");
      assert.strictEqual(log.includes("localStream audio track status:false"),true);
    }
  });

    var muteMicButton = await driver.findElement(By.id("mute_mic_button"));
    await muteMicButton.click();
    micMuted = true;

    var changeToScreenButton = await driver.findElement(By.id("screen_share_checkbox"));
    await changeToScreenButton.click();
    changeToScreen = true;

  });

});