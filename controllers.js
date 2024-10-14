const { connect } = require("puppeteer-real-browser");

require("dotenv").config();

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
let browser;
const newBrowser = async (user, url) => {
  try {
    const { browser, page } = await connect({
      headless: true,
      browserWSEndpoint: process.env.BROWSER_WS_ENDPOINT,
      executablePath:
        process.env.NODE_ENV === "production"
        && "/usr/bin/google-chrome-stable",

      ignoreDefaultArgs: ['--disable-extensions'],
      args: [
        '--no-sandbox', '--disable-setuid-sandbox'
      ],

      customConfig: {},

      turnstile: true,

      connectOption: {},
      fingerprint: true,

      disableXvfb: true,
      ignoreAllFlags: false,
      timeout: 0,
    });

    await page.setDefaultTimeout(0);
    await page.setDefaultNavigationTimeout(0);

    await page.setUserAgent("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/66.0.3359.181 Safari/537.36");
    await page.setViewport({ width: 1920, height: 1080 });

    await page.goto(url.link, {
      waitUntil: "networkidle2",
    });


    console.log("Navigated to VFS Login form page");


    console.log(await page.url());

    console.log(await page.$('html'))




    const cookiesPromise = await page.waitForSelector("button#onetrust-reject-all-handler",);


    if (cookiesPromise) {
      await cookiesPromise.click();
    } else {
      console.log("Button not found within the timeout period.");
    }

    await page.waitForSelector("input[formcontrolname='username']");
    await page.waitForSelector("input[formcontrolname='password']");


    await page.evaluate(
      async (user) => {
        const typeWithDelay = async (selector, text, delay) => {
          const element = document.querySelector(selector);

          element.focus();
          for (const char of text) {
            element.value += char;
            element.dispatchEvent(new Event('input', { bubbles: true }));
            await new Promise((resolve) => setTimeout(resolve, delay));
          }
          element.dispatchEvent(new Event('change', { bubbles: true }));
        }

        await typeWithDelay("input[formcontrolname='username']", user.email, 100);
        await typeWithDelay("input[formcontrolname='password']", user.password, 100);
      },
      user
    );


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






    await delay(7000)

    const visaCenterSelect = await page.$('mat-select[formcontrolname="centerCode"]');
    await visaCenterSelect.click();
    await page.waitForSelector('mat-option');
    const visaCenterOptions = await page.$$('mat-option');
    await visaCenterOptions[0].click();


    await delay(7000);


    const visaCategorySelect = await page.$('mat-select[formcontrolname="selectedSubvisaCategory"]');
    await visaCategorySelect.click();
    await page.waitForSelector('mat-option');
    const visaCategoryOptions = await page.$$('mat-option');
    await visaCategoryOptions[1].click();



    await delay(7000);


    const visaSubCategorySelect = await page.$('mat-select[formcontrolname="visaCategoryCode"]');
    await visaSubCategorySelect.click();
    await page.waitForSelector('mat-option');
    const visaSubCategoryOptions = await page.$$('mat-option');
    await visaSubCategoryOptions[1].click();


    await delay(4000)
    const continueBtn = await page.$("mat-focus-indicator.btn.mat-btn-lg.btn-block.btn-brand-orange.mat-raised-button.mat-button-base.mat-button-disabled");

    const htmlEl = await page.$("html");

    const pageurl = await page.url();

    const htmlText = await page.evaluate(el => el.innerText, htmlEl);
    if (pageurl.includes("/application-detail") &&
      !htmlText.includes('No appointment slots are currently available') &&
      !continueBtn) {


      await page.evaluate(() => {
        document.querySelector('button.mat-focus-indicator').click();
      });





      await delay(7000);




      await Promise.all([
        page.waitForSelector("input#mat-input-5", { visible: true }),
        page.waitForSelector("input#mat-input-6", { visible: true }),
        page.waitForSelector("input#mat-input-7", { visible: true }),
        page.waitForSelector("input#mat-input-8", { visible: true }),
        page.waitForSelector("input#mat-input-9", { visible: true }),
        page.waitForSelector("input#mat-input-10", { visible: true }),
        page.waitForSelector("input#passportExpirtyDate", { visible: true }),
        page.waitForSelector("input#dateOfBirth", { visible: true }),
        page.waitForSelector("input#dateOfDeparture", { visible: true })
      ]);

      await page.evaluate(
        async (user) => {
          const typeWithDelay = async (selector, text, delay) => {
            const element = document.querySelector(selector);
            if (!element) return;

            element.focus();
            for (const char of text) {
              element.value += char;
              element.dispatchEvent(new Event('input', { bubbles: true }));
              await new Promise((resolve) => setTimeout(resolve, delay));
            }
            element.dispatchEvent(new Event('change', { bubbles: true }));
          };

          await typeWithDelay("input#mat-input-5", user.firstName, 100);
          await typeWithDelay("input#mat-input-6", user.lastName, 100);
          await typeWithDelay("input#dateOfBirth", user.dob, 100);
          await typeWithDelay("input#mat-input-7", user.passportNumber, 100);
          await typeWithDelay("input#passportExpirtyDate", user.passportExpiry, 100);
          await typeWithDelay("input#dateOfDeparture", user.departureDate, 100);
          await typeWithDelay("input#mat-input-8", user.countryCode, 100);
          await typeWithDelay("input#mat-input-9", user.contactNumber, 100);
          await typeWithDelay("input#mat-input-10", user.email, 100);
        },
        user
      );

      await delay(2000)


      await page.evaluate(() => {
        const selectElement = document.querySelector('mat-select#mat-select-6');
        if (selectElement) {
          selectElement.blur();
        }
      });

      await delay(4000)

      const country = await page.$('mat-select#mat-select-8');
      await country.click();

      await page.waitForSelector('mat-option');

      const countryOptions = await page.$$('mat-option');

      if (countryOptions.length) {
        for (let option of countryOptions) {
          const text = await option.$eval('span.mat-option-text', el => el.textContent.toLowerCase());
          const userNationality = user.nationality.toLowerCase();
          if (text.includes(userNationality)) {
            await option.click();
            break;
          }
        }
      } else {

        return { success: false, message: `Invalid nationality '${user.nationality}' of ${user.email}!` }
      }


      await delay(4000)


      const genderSelect = await page.$('mat-select#mat-select-6');
      await genderSelect.click();

      await page.waitForSelector('mat-option');

      const genderOptions = await page.$$('mat-option');

      if (genderOptions.length) {
        for (let option of genderOptions) {

          const text = await option.$eval('span.mat-option-text', el => el.textContent.toLowerCase());
          const userGender = user.gender.toLowerCase();
          if (text.includes(userGender)) {
            await option.click();
            break;
          }
        }
      } else {
        return { success: false, message: `Invalid gender '${user.gender}' of ${user.email}!` }

      }

      await page.evaluate(() => {
        const selectElement = document.querySelector('mat-select#mat-select-6');
        if (selectElement) {
          const clone = selectElement.cloneNode(true);
          selectElement.parentNode.replaceChild(clone, selectElement);
        }
      });



      console.log("Application saved!")



      while (attempts < maxRetries) {
        try {
          const submitButton = await page.waitForSelector("button.mat-focus-indicator.mat-stroked-button.mat-button-base.btn.btn-block.btn-brand-orange.mat-btn-lg", { visible: true });
          await submitButton.click();
          await page.waitForNavigation({ timeout: 10000 });
          console.log("Application submitted!");
          break;
        } catch (error) {
          attempts++;
          console.log(`Attempt ${attempts} failed. Retrying...`);
          if (attempts >= maxRetries) {
            console.log("Max retries reached. Returning error.");

            await browser.close();
            console.log(`Failed to submit application on ${url.name} with the account: ${user.email}`)
            return { success: false, message: `Failed to submit application on ${url.name} with the account: ${user.email}` };
          }
        }
      }

      await browser.close();
      return { success: true, message: `Application submitted for ${user.email} on ${url.name}. Please review the application by logging in to the account.` }

    } else {

      await browser.close();
      return { success: false, message: `No slots available for ${user.email} on ${url.name}` }
    }


  } catch (err) {
    console.log(err);

    if (browser) {
      await browser.close();
    }
    return { success: false, message: `There was an error please send this error to the developer: \n ${err}` }
  }



}

module.exports = { newBrowser }
