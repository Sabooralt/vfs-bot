const { connect } = require("puppeteer-real-browser");
require("dotenv").config();

const buttonSelector = "button.mat-stroked-button";
let isDisabled = true;
const maxRetries = 10;
const retryInterval = 6000;
const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function test() {
  const { browser } = await connect({
    headless: false,

    args: [],

    customConfig: {},

    turnstile: true,

    connectOption: {},
    fingerprint: true,

    disableXvfb: false,
    ignoreAllFlags: false,
    timeout: 0,
  });
  const page = await browser.newPage();

  await page.setDefaultTimeout(0);
  await page.setDefaultNavigationTimeout(0);

  await page.goto("https://visa.vfsglobal.com/SAU/en/PRT/login", {
    waitUntil: "networkidle2",
  });
  console.log("Navigated to VFS Login form page");

  const cookies = await page.waitForSelector(
    "button#onetrust-reject-all-handler"
  );
  await delay(2000);

  if (cookies) {
    await cookies.click();
  }

  const emailInput = await page.waitForSelector("div.mat-form-field-infix");
  await page.keyboard.press("Tab");
  await delay(1000);
  await page.keyboard.press("Tab");
  await delay(1000);
  await page.keyboard.press("Tab");
  await delay(1000);

  delay(2000);

  await page.evaluate(
    async (email, password) => {
      const typeWithDelay = async (selector, text, delay) => {
        const element = document.querySelector(selector);
        if (!element) return;

        // Trigger click event
        element.dispatchEvent(new MouseEvent("click", { bubbles: true }));

        for (const char of text) {
          element.value += char;
          await new Promise((resolve) => setTimeout(resolve, delay));
        }
      };

      await typeWithDelay("input[formcontrolname='username']", email, 500);
      await typeWithDelay("input[formcontrolname='password']", password, 880);
    },
    process.env.EMAIL,
    process.env.PASSWORD
  );

  await page.click("input[formcontrolname='username']");
  await page.keyboard.press("Backspace");
  await page.keyboard.type("m");

  await page.click("input[formcontrolname='password']");

  await page.keyboard.press("Backspace");

  await page.keyboard.down("Control");
  await page.keyboard.press("z");
  await page.keyboard.up("Control");

  await page.waitForNavigation();
}

test();
