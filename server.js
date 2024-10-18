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
const fs = require("fs")
const path = require("path")


mongoose
  .connect(mongoUri, {
    serverSelectionTimeoutMS: 20000,
    socketTimeoutMS: 45000,
  })
  .then(() => console.log("MongoDb Connected!"))
  .catch((err) => console.error("MongoDB connection error:", err));

const bot = new TelegramBot(token, {
  polling: true,
});

let applyInterval;
const options = {
  reply_markup: {
    inline_keyboard: [
      [
        { text: "Add an account", callback_data: "add_account" },
        { text: "View added accounts", callback_data: "view_accounts" },
        { text: "Remove an account", callback_data: "remove_account" },
      ],
      [{ text: "Apply for Visa", callback_data: "apply" }],
      [{ text: 'Stop Applying', callback_data: 'stop_apply' }],
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
      `Welcome ${username}! Your account has been created. \n Choose an option:`, options
    );
  } else {
    bot.sendMessage(chatId, `Welcome back, ${username}! \n Choose an option:`, options);
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
            `${index + 1}. Id: ${account._id} \n Email: ${account.email} - Password: ${account.password} \n Gender: ${account.gender} - DOB: ${account.dob} \n Nationality: ${account.nationality} \n Passport Number: ${account.passportNumber} - Passport Expiry: ${account.passportExpiry} \n Departure Date: ${account.departureDate} \n Country Code: ${account.countryCode} - Contact Number: ${account.contactNumber}`
        )
        .join("\n");
      bot.sendMessage(chatId, `Your added VFS accounts:\n${accountList}`);
    } else {
      bot.sendMessage(chatId, "You have no added accounts.", options);
    }
  } else if (data === "apply") {
    bot.sendMessage(chatId, 'Bot started! applying for applications...');
    const response = await Apply(userId, chatId);


    if (response && response.message) {

      bot.sendMessage(chatId, response.message);
    }



    applyInterval = setInterval(async () => {
      const intervalResponse = await Apply(userId, chatId);
      if (intervalResponse && intervalResponse.message) {
        bot.sendMessage(chatId, intervalResponse.message);
      }

    }, 2 * 60 * 60 * 1000);
  }
  else if (data === "stop_apply") {
    if (applyInterval) {
      clearInterval(applyInterval);
      bot.sendMessage(chatId, 'Application process stopped.');
      console.log('Interval cleared.');
    } else {
      bot.sendMessage(chatId, 'No active application process.');
    }
  } else if (data === "remove_account") {
    await removeAccount(chatId, userId)
  }
});

async function Apply(userId, chatId) {
  try {

    const user = await User.findOne({ userId }).populate("accounts");

    if (!user) {

      bot.sendMessage(chatId, "No user found. please restart the bot to register a new account!")
      return { success: false, message: "No user found. please restart the bot to register a new account!" }
    }

    if (user.accounts && !user.accounts.length > 0) {
      bot.sendMessage(chatId, "No vfs accounts added please add an account to apply for the visa!")
      return { success: false, message: "No accounts added please add an account to apply for the visa!" }
    }

    const vfs_accounts = user.accounts;
    for (let user of vfs_accounts) {

      const response = await newBrowser(user);

      const screenshotPath = path.join(__dirname, 'screenshot.png');
      const ErrorscreenshotPath = path.join(__dirname, 'error.png');

      if (response && response.message) {
        bot.sendMessage(chatId, response.message);

      }

      if (response && response.success && response.screenshot) {
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
      }
      if (response && !response.success && response.screenshot) {
        if (fs.existsSync(ErrorscreenshotPath)) {
          bot.sendPhoto(chatId, ErrorscreenshotPath)
            .then(() => {
              console.log("Photo sent!");
              fs.unlinkSync(ErrorscreenshotPath);
            })
            .catch((err) => {
              console.error(err);
            });
        } else {
          console.error('File does not exist:', ErrorscreenshotPath);
        }
      }

    }
    return;
  } catch (err) {
    console.log(err)
    bot.sendMessage(chatId, `An error occured: ${err}`)
    return;
  }
}
const addAccount = async (chatId, userId) => {
  bot.sendMessage(
    chatId,
    `Please provide your details in the following format:\n
    first_name:last_name:gender:DOB:current_nationality:passport_number:passport_expiry:date_of_departure:country_code:contact_number:email:password\n\n
    Example:\nJohn:Doe:Male:26/01/1993:United States:A123456789:26/01/2025:26/01/2024:92:1234567890:john.doe@example.com:welcome123`
  );

  bot.once("message", async (msg) => {
    const text = msg.text;
    const username = msg.from.first_name;
    const entry = text.trim();

    // Split the entry by ":" to separate fields
    const fields = entry.split(":");

    // Validation for exactly 12 fields
    if (fields.length === 12) {
      const [
        firstName,
        lastName,
        gender,
        dob,
        nationality,
        passportNumber,
        passportExpiry,
        departureDate,
        countryCode,
        contactNumber,
        email,
        password
      ] = fields.map(field => field.trim());

      // Validate input fields with regex
      const genderRegex = /^(Male|Female|Other)$/i;
      const dateRegex = /^\d{2}\/\d{2}\/\d{4}$/;
      const countryCodeRegex = /^\d{2}$/;
      const contactNumberRegex = /^\d{7,}$/;
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

      if (!genderRegex.test(gender) || !dateRegex.test(dob) || !dateRegex.test(departureDate) || !countryCodeRegex.test(countryCode) || !contactNumberRegex.test(contactNumber) || !emailRegex.test(email)) {
        bot.sendMessage(chatId, "There was an error with your entry. Please ensure the data is in the correct format.");
        return;
      }

      // Check if the user already exists in the database
      let user = await User.findOne({ userId });
      if (!user) {
        user = await User.create({ userId, name: username });
      }

      // Check if the account already exists for this user
      const existingAccount = await VFS_account.findOne({ email, user: user._id });

      if (existingAccount) {
        bot.sendMessage(chatId, `The account with email ${email} already exists.`);
      } else {
        // Ask the user to select the visa link
        const buttons = links.map((link, index) => {
          return [{ text: link.name, callback_data: String(index) }];
        });

        bot.sendMessage(chatId, "Please select the country you want to link with this account:", {
          reply_markup: {
            inline_keyboard: buttons
          }
        });

        bot.once("callback_query", async (callbackQuery) => {
          const index = parseInt(callbackQuery.data, 10);
          const destination = links[index];

          try {
            // Create the new account
            const newAccount = await VFS_account.create({
              firstName,
              lastName,
              gender,
              dob,
              nationality,
              passportNumber,
              passportExpiry,
              departureDate,
              countryCode,
              contactNumber,
              email,
              password,
              user: user._id,
              visaLinkName: destination.name,
              visaLink: destination.link
            });

            // Add the account to the user's list
            user.accounts.push(newAccount._id);
            await user.save();

            bot.sendMessage(chatId, `Successfully added the account for ${email} with the visa route: ${destination.name}`);
          } catch (error) {
            console.error("Error saving account:", error);
            bot.sendMessage(chatId, "There was an error saving your account.");
          }
        });
      }
    } else {
      bot.sendMessage(chatId, "Invalid format. Please ensure your entry follows the specified format.");
    }
  });
};





const removeAccount = async (chatId, userId) => {
  bot.sendMessage(chatId, "Please provide the ID of the account you wish to remove.");

  bot.once("message", async (msg) => {
    const accountId = msg.text;

    if (!accountId) {
      bot.sendMessage(chatId, "Invalid input. Please provide a valid account ID.");
      return;
    }

    try {
      const user = await User.findOne({ userId });

      if (!user) {
        bot.sendMessage(chatId, "User not found. Please try again.");
        return;
      }

      const account = await VFS_account.findOne({ _id: accountId, user: user._id });

      if (!account) {
        bot.sendMessage(chatId, "Account not found or it doesn't belong to you.");
        return;
      }

      await VFS_account.deleteOne({ _id: accountId });

      user.accounts = user.accounts.filter(accId => accId.toString() !== accountId);
      await user.save();

      bot.sendMessage(chatId, `Successfully removed account with ID: ${accountId}`);
    } catch (error) {
      console.error("Error removing account:", error);
      bot.sendMessage(chatId, "There was an error removing the account. Please try again.");
    }
  });
};



bot.on("polling_error", (error) => {
  console.log(`Polling error: ${error.code}: ${error.message}`);
});
