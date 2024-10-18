var locateChrome = require("locate-chrome");
const { connect } = require("puppeteer-real-browser");
const path = require("path");
const fs = require('fs');

require("dotenv").config();


const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const newBrowser = async (user) => {
  const executablePath = await new Promise(resolve => locateChrome((arg) => resolve(arg))) || '/usr/bin/google-chrome';
  const { browser, page } = await connect({
    headless: true,
    executablePath,
    ignoreDefaultArgs: ['--disable-extensions'],
    args: [
      '--no-sandbox', '--disable-setuid-sandbox', '--disable-blink-features=AutomationControlled',
    ],

    customConfig: {},
    plugins: [
      require("puppeteer-extra-plugin-portal")({
        webPortalConfig: {
          listenOpts: {
            port: 3001,
          },
          baseUrl: 'https://vfs-bot-production.up.railway.app/',
        },
      })
    ],
    turnstile: true,

    connectOption: {},
    fingerprint: true,

    disableXvfb: true,
    ignoreAllFlags: false,
    timeout: 0,
  });
  try {

    const url = user.visaLink;
    const urlName = user.visaLinkName;
    await page.setViewport({ width: 1920, height: 1080 });

    page.setDefaultNavigationTimeout(0)
    page.setDefaultTimeout(0)
    console.log("started!")
    await page.goto(url, {
      waitUntil: "networkidle2",
    });


    console.log("Navigated to VFS Login form page");


    console.log(await page.url());

    const portalUrl = await page.openPortal();
    console.log('Portal URL:', portalUrl);




  } catch (err) {
    console.log(err);

    if (browser) {
      await browser.close();
    }
    page.screenshot({ path: 'error.png', fullPage: true, captureBeyondViewport: true })
    return { success: false, message: `There was an error please send this error to the developer: \n ${err}` }
  }

}

module.exports = { newBrowser }
