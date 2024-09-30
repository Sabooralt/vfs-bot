const TelegramBot = require("node-telegram-bot-api");
const { SocksProxyAgent } = require("socks-proxy-agent");
const puppeteer = require("puppeteer-extra");
const StealthPlugin = require("puppeteer-extra-plugin-stealth");
const https = require("https");
const axios = require("axios");
const cheerio = require("cheerio");

// Your Telegram bot token
const token = "7002248474:AAGNYwj7Sjr1UQkhUiOhD9B4lvvp1VVVa8k"; // Replace with your bot token

const bot = new TelegramBot(token, {
  polling: true,
});

const url = "https://www.vfsglobal.com/en/individuals/index.html";
async function getCountries() {
  try {
    puppeteer.use(StealthPlugin());

    const browser = await puppeteer.launch({ headless: true });
    const page = await browser.newPage();

    await page.goto("https://www.vfsglobal.com/en/individuals/index.html", {
      waitUntil: "networkidle2", // Wait until the network is idle (page fully loaded)
    });

   

    const countryOptions = await page.$$eval("li[data-index]", (elements) =>
      elements.map((el) => el.innerText.trim())
    );

    console.log("Countries found:", countryOptions);

    await browser.close();
    return countryOptions
  } catch (err) {
    console.log(err);
  }
}

let userEmail = "";
let userPassword = "";

// Handle /start command to begin the interaction
bot.onText(/\/start/, async (msg) => {
  const chatId = msg.chat.id;
  const response = await getCountries();

  console.log(response);

  // Ask for the email
  bot.sendMessage(chatId, "Please provide your email address:");

  // Listen for the next message from the user (email input)
  bot.once("message", (msg) => {
    userEmail = msg.text; // Capture the email input

    // Ask for the password
    bot.sendMessage(chatId, "Please provide your password:");

    // Listen for the password input
    bot.once("message", async (msg) => {
      userPassword = msg.text; // Capture the password input

      // Inform the user that the process is starting
      bot.sendMessage(chatId, "Thank you! Applying for your visa now...");

      // Call the function to apply for the visa using Puppeteer
      try {
        await applyForVisa(userEmail, userPassword);
        bot.sendMessage(chatId, "Visa application completed successfully!");
      } catch (error) {
        bot.sendMessage(
          chatId,
          "An error occurred while applying for the visa: " + error.message
        );
      }
    });
  });
});

// Function to automate the visa application process
async function applyForVisa(email, password) {
  const browser = await puppeteer.launch({ headless: true }); // Open the browser in visible mode
  const page = await browser.newPage();

  await page.goto("https://www.vfsglobal.com/en/individuals/index.html", {
    waitUntil: "networkidle2",
  });

  await page.type("#mat-input-0", email, { delay: 100 }); // Input email with delay
  await page.type("#mat-input-1", password, { delay: 100 }); // Input password with delay

  await page.click('button[type="submit"]');
  await page.waitForNavigation({ waitUntil: "networkidle2" });

  await browser.close();
}

// Handle polling errors
bot.on("polling_error", (error) => {
  console.log(`Polling error: ${error.code}: ${error.message}`);
});
