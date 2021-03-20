import "@babel/polyfill";
import chrome from "selenium-webdriver/chrome";
import { Builder, By, Key, Capabilities, until } from "selenium-webdriver";
import assert from "assert";
import { path } from "chromedriver";
import { ExpectedConditions as EC } from 'protractor'
let driver = null;
const chromeOptions = new chrome.Options().addArguments("use-fake-ui-for-media-stream").headless();
const URL = "http://localhost:5080/WebRTCAppEE/index.html";

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

  it("should render audioDeviceSource", async () => {

    var startPublishingButton = await driver.findElement(By.id("start_publish_button"));
    assert.notStrictEqual(startPublishingButton, null);
    assert.strictEqual(await startPublishingButton.isEnabled(), false);
    
   startPublishingButton = driver.wait(until.elementIsEnabled(startPublishingButton), 10000);
    assert.strictEqual(await startPublishingButton.isEnabled(), true);

    //const optionsButton = await driver.findElement(By.id("options"));
    //await optionsButton.click();

    const element = await driver.findElement(By.name("audioDeviceSource"));
    assert.notStrictEqual(element, null);

  });
});
