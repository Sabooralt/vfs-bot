var locateChrome = require("locate-chrome");
const { connect } = require("puppeteer-real-browser");
const path = require("path");
const fs = require('fs');

require("dotenv").config();


const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const newBrowser = async (user, bot, chatId) => {
  const executablePath = await new Promise(resolve => locateChrome((arg) => resolve(arg))) || '/usr/bin/google-chrome';
  const screenshotPath = path.join(__dirname, 'screenshot.png');
  let shouldExit = false;
  const { browser, page } = await connect({
    headless: false,
    executablePath,
    ignoreDefaultArgs: ['--disable-extensions'],
    args: [
      '--no-sandbox', '--disable-setuid-sandbox', '--disable-blink-features=AutomationControlled',
    ],

    customConfig: {},

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
    await page.setUserAgent("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0.0.0 Safari/537.3");
    await page.setViewport({ width: 1920, height: 1080 });

    page.setDefaultNavigationTimeout(0)
    page.setDefaultTimeout(0)
    console.log("started!")
    await page.goto(url, {
      waitUntil: "networkidle2",
    });


    console.log("Navigated to VFS Login form page");


    console.log(await page.url());



    const cookiesPromise = await page.waitForSelector("button#onetrust-reject-all-handler",);


    if (cookiesPromise) {
      await cookiesPromise.click();
    } else {
      console.log("Button not found within the timeout period.");
    }

    console.log("loggin in!")

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
        await page.waitForNavigation();
        console.log("Successfully clicked the submit button");
        break;
      } catch (error) {
        attempts++;
        console.log(`Attempt ${attempts} failed. Retrying...`);
        if (attempts >= maxRetries) {
          console.log("Max retries reached. Returning error.");
          delay(4000);

          await page.screenshot({ path: screenshotPath, fullPage: true, captureBeyondViewport: true });
          if (fs.existsSync(screenshotPath)) {
            bot.sendPhoto(chatId, screenshotPath)
              .then(() => {
                console.log("Photo sent!");
                fs.unlinkSync(screenshotPath);
              })
              .catch((err) => {
                console.error(err);
              });
          } else {
            console.error('File does not exist:', screenshotPath);
          }
          await browser.close();
          console.log(`Failed to login on ${urlName} with the account: ${user.email}`)
          return { success: false, message: `Failed to login on ${urlName} with the account: ${user.email}` };
        }
      }
    }


    await page.waitForNavigation();


    await delay(4000);


    await page.evaluate(() => {
      document.querySelector('button.mat-raised-button').click();
    });





    console.log("navigated!");



    await delay(2000);

    console.log("selecting the inputs!");






    await delay(7000)

    try {
      const visaCenterSelect = await page.$('mat-select[formcontrolname="centerCode"]');
      await visaCenterSelect.click();
      await page.waitForSelector('mat-option');
      const visaCenterOptions = await page.$$('mat-option');
      await visaCenterOptions[user.applicationCenter].click();

      console.log("selected 1");


      await delay(7000);



      const visaCategorySelect = await page.$('mat-select[formcontrolname="visaCategoryCode"]');
      await visaCategorySelect.click();

      await page.waitForSelector('mat-option');

      const visaCategoryOptions = await page.$$('mat-option');




      await visaCategoryOptions[user.appointmentCategory].click();


      console.log("selected 2");


      await delay(7000);


      const visaSubCategorySelect = await page.$('mat-select[formcontrolname="selectedSubvisaCategory"]');
      await visaSubCategorySelect.click();

      await page.waitForSelector('mat-option');

      const visaSubCategoryOptions = await page.$$('mat-option');

      await visaSubCategoryOptions[user.subCategory].click();


      console.log("selected 3");

    } catch (err) {

      return { success: false, message: err }

    }


    await delay(4000)
    const continueBtn = await page.$("button.mat-focus-indicator.btn.mat-btn-lg.btn-block.btn-brand-orange.mat-raised-button.mat-button-base.mat-button-disabled");



    const pageurl = await page.url();

    if (pageurl.includes("/application-detail") &&

      !continueBtn) {


      await page.evaluate(() => {
        document.querySelector('button.mat-focus-indicator').click();
      });





      await delay(7000);

      console.log("filling the application!")




      page.waitForSelector("input", { visible: true }),



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

      await page.waitForSelector('mat-option', { visible: true });

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

      await page.waitForSelector('mat-option', { visible: true });

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

      delay(4000);






      bot.sendMessage(chatId, "Application filled! Please review the application and complete the payment manually. Do not close the browser manually. Type 'done' when you've finished.");
      await page.screenshot({ path: screenshotPath, fullPage: true, captureBeyondViewport: true });


      if (fs.existsSync(screenshotPath)) {
        bot.sendPhoto(chatId, screenshotPath)
          .then(() => {
            console.log("Photo sent!");
            fs.unlinkSync(screenshotPath);
          })
          .catch((err) => {
            console.error(err);
          });


      } else {
        console.error('File does not exist:', screenshotPath);
      }


      bot.once("message", async (msg) => {
        if (msg.text.toLowerCase() === "done") {

          await browser.close();

          bot.sendMessage(chatId, "Payment completed. Thank you!");

          shouldExit = true;
        } else {
          bot.sendMessage(chatId, "Please type 'done' when you've completed the payment.");
        }
      })

      await new Promise((resolve) => {
        bot.once("message", (msg) => resolve(msg));
      });

      if (shouldExit) {
        return;
      }
      /*   while (attempts < maxRetries) {
          try {
            const submitButton = await page.waitForSelector("button.mat-focus-indicator.mat-stroked-button.mat-button-base.btn.btn-block.btn-brand-orange.mat-btn-lg", { visible: true });
  
            delay(2000);
            await submitButton.click();
            console.log("Application submitted!");
            break;
          } catch (error) {
            attempts++;
            console.log(`Attempt ${attempts} failed. Retrying...`);
            if (attempts >= maxRetries) {
              console.log("Max retries reached. Returning error.");
  
              await browser.close();
              console.log(`Failed to submit application on ${urlName} with the account: ${user.email}`)
              return { success: false, message: `Failed to submit application on ${urlName} with the account: ${user.email}` };
            }
          }
        } */


    } else {

      await browser.close();
      return { success: false, message: `No slots available for ${user.email} on ${urlName}` }
    }


  } catch (err) {
    console.log(err);

    if (browser) {
      await browser.close();
    }
    page.screenshot({ path: screenshotPath, fullPage: true, captureBeyondViewport: true })
    if (fs.existsSync(screenshotPath)) {
      bot.sendPhoto(chatId, screenshotPath)
        .then(() => {
          console.log("Photo sent!");
          fs.unlinkSync(screenshotPath);
        })
        .catch((err) => {
          console.error(err);
        });
    } else {
      console.error('File does not exist:', screenshotPath);
    }
    return { success: false, message: `There was an error please send this error to the developer: \n ${err}` }
  }

}

module.exports = { newBrowser }
