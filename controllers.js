const { connect } = require("puppeteer-real-browser");
require("dotenv").config();
const User = require("./models/user");
const Account = require("./models/vfs_account")
const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const { links } = require("./links")

async function Apply(userId) {

  const user = await User.findOne({ userId }).populate("accounts");

  if (!user) {
    return { success: false, message: "No user found. please restart the bot to register a new account!" }
  }

  if (user.accounts && !user.accounts.length > 0) {
    return { success: false, message: "No accounts added please add an account to apply for the visa!" }
  }

  const vfs_accounts = user.accounts;
  for (let user of vfs_accounts) {
    for (let link of links) {
      const response = await newBrowser(user, link);
    }
  }




}

const newBrowser = async (user, url) => {
  const { browser, page } = await connect({
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

  const client = await page.createCDPSession();
  await client.send('Network.clearBrowserCookies');

  await client.send('Network.clearBrowserCache');

  await page.setDefaultTimeout(0);
  await page.setDefaultNavigationTimeout(0);

  await page.goto(url.link, {
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

  await page.waitForSelector("input[formcontrolname='username']");
  await page.waitForSelector("input[formcontrolname='password']");


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
      }

      await typeWithDelay("input[formcontrolname='username']", email, 100);
      await typeWithDelay("input[formcontrolname='password']", password, 100);
    },
    user.email,
    user.password
  );

  await page.click("input[formcontrolname='username']");
  await page.keyboard.press("Backspace");
  await page.keyboard.down("Control");
  await page.keyboard.press("z");
  await page.keyboard.up("Control");

  await page.click("input[formcontrolname='password']");

  await page.keyboard.press("Backspace");

  await page.keyboard.down("Control");
  await page.keyboard.press("z");
  await page.keyboard.up("Control");

  await delay(2000);

  let attempts = 0;
  const maxRetries = 5;

  while (attempts < maxRetries) {
    try {
      const submitButton = await page.waitForSelector("button.mat-focus-indicator");
      await submitButton.click();
      await page.waitForNavigation({ timeout: 7000 });
      console.log("Successfully clicked the submit button");
      break;
    } catch (error) {
      attempts++;
      console.log(`Attempt ${attempts} failed. Retrying...`);
      if (attempts >= maxRetries) {
        console.log("Max retries reached. Returning error.");

        await browser.close();
        console.log(`Failed to login on ${url.name} with the account: ${user.email}`)
        return { success: false, message: `Failed to login on ${url.name} with the account: ${user.email}` };
      }
    }
  }


  await page.waitForNavigation();


  await delay(2000);


  await page.evaluate(() => {
    document.querySelector('button.mat-raised-button').click();
  });





  console.log("navigated!");



  await delay(2000);

  console.log("selecting the inputs!");






  await delay(10000)

  // Select the visa center
  const visaCenterSelect = await page.$('mat-select[formcontrolname="centerCode"]');
  await visaCenterSelect.click();
  await page.waitForSelector('mat-option');
  const visaCenterOptions = await page.$$('mat-option');
  await visaCenterOptions[0].click(); // Selects the first option


  await delay(10000);


  const visaCategorySelect = await page.$('mat-select[formcontrolname="selectedSubvisaCategory"]');
  await visaCategorySelect.click();
  await page.waitForSelector('mat-option');
  const visaCategoryOptions = await page.$$('mat-option');
  await visaCategoryOptions[1].click();



  await delay(10000);


  const visaSubCategorySelect = await page.$('mat-select[formcontrolname="visaCategoryCode"]');
  await visaSubCategorySelect.click();
  await page.waitForSelector('mat-option');
  const visaSubCategoryOptions = await page.$$('mat-option');
  await visaSubCategoryOptions[1].click();


  await delay(4000)
  const continueBtn = await page.$("mat-focus-indicator.btn.mat-btn-lg.btn-block.btn-brand-orange.mat-raised-button.mat-button-base.mat-button-disabled");

  const htmlEl = await page.$("html");

  const pageurl = await page.url();

  const htmlText = await page.evaluate(el => el.innerText, htmlEl); // Extract innerText from htmlEl

  if (pageurl.includes("/application-detail") &&
    !htmlText.includes('No appointment slots are currently available') &&
    !continueBtn) {


    await page.evaluate(() => {
      document.querySelector('button.mat-focus-indicator').click();
    });

    await delay(7000);





    await page.waitForSelector("input#mat-input-5", { visible: true });
    await page.waitForSelector("input#mat-input-6", { visible: true });
    await page.waitForSelector("input#mat-input-7", { visible: true });
    await page.waitForSelector("input#mat-input-8", { visible: true });
    await page.waitForSelector("input#mat-input-9", { visible: true });
    await page.waitForSelector("input#mat-input-10", { visible: true });
    await page.waitForSelector("input#passportExpirtyDate", { visible: true });
    await page.waitForSelector("input#dateOfBirth", { visible: true });
    await page.waitForSelector("input#dateOfDeparture", { visible: true });


    await page.evaluate(
      async (user) => {
        const typeWithDelay = async (selector, text, delay) => {
          const element = document.querySelector(selector);
          if (!element) return;

          element.dispatchEvent(new MouseEvent("click", { bubbles: true }));

          for (const char of text) {
            element.value += char;
            await new Promise((resolve) => setTimeout(resolve, delay));
          }
        }

        await typeWithDelay("input#mat-input-5", 'Saboor', 100);
        await typeWithDelay("input#mat-input-6", 'Ahmed', 100);
        await typeWithDelay("input#dateOfBirth", '11/01/2003', 100);
        await typeWithDelay("input#mat-input-7", '99111999', 100);
        await typeWithDelay("input#passportExpirtyDate", '09/10/2026', 100);
        await typeWithDelay("input#dateOfDeparture", '11/01/2025', 100);
        await typeWithDelay("input#mat-input-8", '44', 100);
        await typeWithDelay("input#mat-input-9", '034801807502', 100);
        await typeWithDelay("input#mat-input-10", user.email, 100);
      },
      user
    );
    await page.waitForSelector("input")
    await page.click("input#mat-input-5", { delay: 100 });
    await page.keyboard.press("Backspace");
    await page.keyboard.down("Control");
    await page.keyboard.press("z");
    await page.keyboard.up("Control");

    await page.click("input#mat-input-6", { delay: 100 });
    await page.keyboard.press("Backspace");
    await page.keyboard.down("Control");
    await page.keyboard.press("z");
    await page.keyboard.up("Control");

    await page.click("input#mat-input-7", { delay: 100 });
    await page.keyboard.press("Backspace");
    await page.keyboard.down("Control");
    await page.keyboard.press("z");
    await page.keyboard.up("Control");

    await page.click("input#mat-input-8", { delay: 100 });
    await page.keyboard.press("Backspace");
    await page.keyboard.down("Control");
    await page.keyboard.press("z");
    await page.keyboard.up("Control");

    await page.click("input#mat-input-9", { delay: 100 });
    await page.keyboard.press("Backspace");
    await page.keyboard.down("Control");
    await page.keyboard.press("z");
    await page.keyboard.up("Control");

    await page.click("input#mat-input-10", { delay: 100 });
    await page.keyboard.press("Backspace");
    await page.keyboard.down("Control");
    await page.keyboard.press("z");
    await page.keyboard.up("Control");

    await page.click("input#passportExpirtyDate", { delay: 100 });
    await page.keyboard.press("Backspace");
    await page.keyboard.down("Control");
    await page.keyboard.press("z");
    await page.keyboard.up("Control");

    await page.click("input#dateOfBirth", { delay: 100 });
    await page.keyboard.press("Backspace");
    await page.keyboard.down("Control");
    await page.keyboard.press("z");
    await page.keyboard.up("Control");

    await page.click("input#dateOfDeparture", { delay: 100 });


    const country = await page.$('mat-select#mat-select-8');
    await country.click();

    await page.waitForSelector('mat-option');

    const countryOptions = await page.$$('mat-option');

    if (countryOptions.length) {
      for (let option of countryOptions) {
        const text = await option.evaluate(el => el.textContent.toLowerCase());
        if (text.includes('united states')) {
          await option.click();
          break;
        }
      }
    }
  } else {
    console.log("no slots available!");
  }




}

module.exports = { Apply }
