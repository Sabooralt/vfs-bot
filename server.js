require("dotenv").config();
const TelegramBot = require("node-telegram-bot-api");
const mongoose = require("mongoose");
const { getVFSAccounts } = require("./controller");
const token = process.env.TELEGRAM_TOKEN;
const mongoUri = process.env.MONGO_URI;
const User = require("./models/user");
const VFS_account = require("./models/vfs_account");
const { links } = require("./links");
const { newBrowser } = require("./controllers");


const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

console.log("working");


const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

mongoose
  .connect(mongoUri, {
    serverSelectionTimeoutMS: 20000, // Increase timeout to 20 seconds
    socketTimeoutMS: 45000,
  })
  .then(() => console.log("MongoDb Connected!"))
  .catch((err) => console.error("MongoDB connection error:", err));

const bot = new TelegramBot(token, {
  polling: true,
});

const options = {
  reply_markup: {
    inline_keyboard: [
      [
        { text: "Add an account", callback_data: "add_account" },
        { text: "View added accounts", callback_data: "view_accounts" },
      ],
      [{ text: "Apply for Visa", callback_data: "apply" }],
    ],
  },
};

bot.onText(/\/start/, async (msg) => {
  const chatId = msg.chat.id;
  const userId = msg.from.id;
  const username = msg.from.first_name;

  let user = await User.findOne({ userId });

  if (!user) {
    user = new User({ userId, name: username });
    await user.save();
    bot.sendMessage(
      chatId,
      `Welcome ${username}! Your account has been created.`
    );
    bot.sendMessage(chatId, "Choose an option:", options);
  } else {
    bot.sendMessage(chatId, `Welcome back, ${username}!`);
    bot.sendMessage(chatId, "Choose an option:", options);
  }
});

bot.on("callback_query", async (callbackQuery) => {
  const chatId = callbackQuery.message.chat.id;
  const userId = callbackQuery.from.id;
  const data = callbackQuery.data;

  if (data === "add_account") {
    await addAccount(chatId, userId);
  } else if (data === "view_accounts") {
    bot.sendMessage(
      chatId,
      "Getting your accounts from the database please wait..."
    );
    const accounts = await getVFSAccounts(userId);
    if (accounts && accounts.length > 0) {
      const accountList = accounts
        .map(
          (account, index) =>
            `${index + 1}. ${account.email} - ${account.password}`
        )
        .join("\n");
      bot.sendMessage(chatId, `Your added VFS accounts:\n${accountList}`);
    } else {
      bot.sendMessage(chatId, "You have no added accounts.", options);
    }
  } else if (data === "apply") {
    const response = await Apply(userId, chatId);

    bot.sendMessage(chatId, response.message)
  }
});

async function Apply(userId, chatId) {

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

      if (response && !response.success) {
        bot.sendMessage(chatId, response.message)
      }
    }
  }




}

const addAccount = async (chatId, userId) => {
  bot.sendMessage(
    chatId,
    "Please provide the email and password of your VFS accounts in the following format:\n\n`email1:password1`\n`email2:password2`\n\nSeparate multiple entries by new lines."
  );

  bot.once("message", async (msg) => {
    const text = msg.text;
    const username = msg.from.first_name;
    const entries = text.split("\n");

    let invalidEntries = [];
    let validEntries = [];
    let existingAccount = [];

    for (let entry of entries) {
      if (entry.includes(":")) {
        const [email, password] = entry.split(":");

        // Validate email format
        if (emailRegex.test(email.trim())) {
          validEntries.push({ email: email.trim(), password: password.trim() });
        } else {
          invalidEntries.push(entry);
        }
      } else {
        invalidEntries.push(entry);
      }
    }

    if (validEntries.length > 0) {
      try {
        // Find the user in the database
        let user = await User.findOne({ userId });
        if (!user) {
          // Create a new user if they don't exist
          user = await User.create({ userId, name: username });
        }

        // Process each valid email-password pair and create VFS accounts
        const newAccounts = [];
        for (const entry of validEntries) {
          // Check if this account already exists for the user
          existingAccount = await VFS_account.findOne({
            email: entry.email,
            user: user._id,
          });

          if (existingAccount) {
            // Notify the user that the account already exists
            bot.sendMessage(
              chatId,
              `The account ${entry.email} already exists for your user ID ${userId}.`
            );
          } else {
            // Create the new VFS account and add it to the user
            const newAccount = await VFS_account.create({
              email: entry.email,
              password: entry.password,
              user: user._id,
            });
            newAccounts.push(newAccount._id); // Store the account ID
          }
        }

        // Add the new accounts to the user's account list if any were added
        if (newAccounts.length > 0) {
          user.accounts.push(...newAccounts);
          await user.save(); // Save the updated user document
        }

        // Send confirmation message to the user for added accounts
        if (newAccounts.length > 0) {
          bot.sendMessage(
            chatId,
            `Successfully added the following accounts:\n${validEntries
              .filter(
                (entry) =>
                  !existingAccount || entry.email !== existingAccount.email
              )
              .map((entry) => `- ${entry.email}`)
              .join("\n")}`
          );
        }
      } catch (error) {
        console.error("Error saving accounts:", error);
        bot.sendMessage(chatId, "There was an error saving your accounts.");
      }
    }

    if (invalidEntries.length > 0) {
      bot.sendMessage(
        chatId,
        `The following entries were invalid and were not added:\n${invalidEntries.join(
          "\n"
        )}\nPlease ensure each entry follows the 'email:password' format and that the email is valid.`
      );
    }

    bot.sendMessage(chatId, "Would you like to add more accounts? (y/n)");
    bot.once("message", async (response) => {
      if (
        response.text.toLowerCase() === "yes" ||
        response.text.toLowerCase() === "y"
      ) {
        addAccount(chatId, userId);
      } else {
        bot.sendMessage(
          chatId,
          "Okay, let me know if you need anything else!",
          options
        );
      }
    });
  });
};


const newBrowser = async (user, url) => {
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

    await delay(10000);

    await page.locator("#mat-input-5").fill("John doe")
  } else {
    console.log("no slots available!");
  }
}

bot.on("polling_error", (error) => {
  console.log(`Polling error: ${error.code}: ${error.message}`);
});
