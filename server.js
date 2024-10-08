require("dotenv").config();
const TelegramBot = require("node-telegram-bot-api");

const mongoose = require("mongoose");
const { getVFSAccounts } = require("./controller");
const token = process.env.TELEGRAM_TOKEN;
const mongoUri = process.env.MONGO_URI;

const User = require("./models/user");
const VFS_account = require("./models/vfs_account");

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
      [{ text: "Button 3", callback_data: "button3" }],
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
  }
});

const addAccount = async (chatId, userId) => {
  bot.sendMessage(
    chatId,
    "Please provide the email and password of your VFS accounts in the following format:\n\n`email1:password1`\n`email2:password2`\n\nSeparate multiple entries by new lines."
  );

  // Wait for user's response for email and password
  bot.once("message", async (msg) => {
    const text = msg.text;
    const username = msg.from.first_name;
    const entries = text.split("\n");

    let invalidEntries = [];
    let validEntries = [];
    let existingAccount = [];

    // Parse and validate entries
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

bot.on("polling_error", (error) => {
  console.log(`Polling error: ${error.code}: ${error.message}`);
});
