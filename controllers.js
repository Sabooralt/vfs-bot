const { connect, puppeteer } = require("puppeteer-real-browser");

require("dotenv").config();

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const newBrowser = async (user, url) => {
  try {

    const { browser, page } = await connect({
      headless: true,
      executablePath:
        process.env.NODE_ENV === "production"
        && process.env.PUPPETEER_EXECUTABLE_PATH,

      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-gpu',
      ],

      customConfig: {},

      turnstile: true,

      connectOption: {},
      fingerprint: true,

      disableXvfb: true,
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


    console.log(page.url);

    console.log(page.$('html'))
    const timeout = 5000;

    const cookiesPromise = page.waitForSelector("button#onetrust-reject-all-handler", { timeout });

    const cookies = await Promise.race([
      cookiesPromise,
      delay(timeout).then(() => null),
    ]);

    if (cookies) {
      await cookies.click();
    } else {
      console.log("Button not found within the timeout period.");
    }

    await page.waitForSelector("input[formcontrolname='username']");
    await page.waitForSelector("input[formcontrolname='password']");


    await page.evaluate(
      async (email, password) => {
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

        await typeWithDelay("input[formcontrolname='username']", email, 100);
        await typeWithDelay("input[formcontrolname='password']", password, 100);
      },
      user.email,
      user.password
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
      return { success: true, message: `Application submitted for ${user.email} on ${url.name}. Please review the application by logging in to the account.` }

    } else {
      return { success: false, message: `No slots available for ${user.email} on ${url.name}` }
    }


  } catch (err) {
    console.log(err);
    return { success: false, message: `There was an error please send this error to the developer: \n ${err}` }
  }




}

module.exports = { newBrowser }
