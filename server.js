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

const options = {
  reply_markup: {
    inline_keyboard: [
      [
        { text: "Add an account", callback_data: "add_account" },
        { text: "View added accounts", callback_data: "view_accounts" },
        { text: "Remove an account", callback_data: "remove_account" },
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

    setInterval(async () => {
      const intervalResponse = await Apply(userId, chatId);
      if (intervalResponse && intervalResponse.message) {

        bot.sendMessage(chatId, intervalResponse.message);
      }
    }, 2 * 60 * 60 * 1000);
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
      for (let link of links) {
        const response = await newBrowser(user, link);

        bot.sendMessage(chatId, response.message);
      }
    }
    return;
  } catch (err) {
    bot.sendMessage(chatId, `An error occured: ${err}`)
    return;
  }
}
const addAccount = async (chatId, userId) => {
  bot.sendMessage(
    chatId,
    `Please provide your details in the following format for each entry:\n\n
    first_name:last_name:gender:DOB:current_nationality:passport_number:passport_expiry:date_of_departure:country_code:contact_number:email:password\n\n
    Separate multiple entries by new lines.\n\nExample:\nJohn:Doe:male/other/female:26/01/1993:United States:A123456789:26/01/2025:26/01/2024:92:1234567890:john.doe@example.com:welcome123`
  );

  bot.once("message", async (msg) => {
    const text = msg.text;
    const username = msg.from.first_name;
    const entries = text.split("\n");

    let invalidEntries = [];
    let validEntries = [];
    let existingAccount = [];

    const genderRegex = /^(Male|Female|Other)$/i;
    const dateRegex = /^\d{2}\/\d{2}\/\d{4}$/;
    const countryCodeRegex = /^\d{2}$/;
    const contactNumberRegex = /^\d{7,}$/;
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;


    for (let entry of entries) {
      const fields = entry.split(":");

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

        if (!genderRegex.test(gender)) {
          invalidEntries.push(`Invalid gender in: ${entry}`);
          continue;
        }

        if (!dateRegex.test(dob)) {
          invalidEntries.push(`Invalid DOB format in: ${entry}`);
          continue;
        }

        if (!dateRegex.test(departureDate)) {
          invalidEntries.push(`Invalid departure date format in: ${entry}`);
          continue;
        }

        if (!countryCodeRegex.test(countryCode)) {
          invalidEntries.push(`Invalid country code in: ${entry}`);
          continue;
        }

        if (!contactNumberRegex.test(contactNumber)) {
          invalidEntries.push(`Invalid contact number in: ${entry}`);
          continue;
        }

        if (emailRegex.test(email)) {
          validEntries.push({
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
          });
        } else {
          invalidEntries.push(`Invalid email in: ${entry}`);
        }
      } else {
        invalidEntries.push(`Incorrect number of fields in: ${entry}`);
      }
    }

    if (validEntries.length > 0) {
      try {
        let user = await User.findOne({ userId });
        if (!user) {
          user = await User.create({ userId, name: username });
        }

        const newAccounts = [];
        for (const entry of validEntries) {
          existingAccount = await VFS_account.findOne({
            email: entry.email,
            user: user._id,
          });

          if (existingAccount) {
            bot.sendMessage(
              chatId,
              `The account ${entry.email} already exists for your user ID ${userId}.`
            );
          } else {
            const newAccount = await VFS_account.create({
              firstName: entry.firstName,
              lastName: entry.lastName,
              gender: entry.gender,
              dob: entry.dob,
              nationality: entry.nationality,
              passportNumber: entry.passportNumber,
              passportExpiry: entry.passportExpiry,
              departureDate: entry.departureDate,
              countryCode: entry.countryCode,
              contactNumber: entry.contactNumber,
              email: entry.email,
              password: entry.password,
              user: user._id,
            });

            newAccounts.push(newAccount._id);
          }
        }

        if (newAccounts.length > 0) {
          user.accounts.push(...newAccounts);
          await user.save();
        }

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
        bot.sendMessage(chatId, `There was an error saving your accounts: ${error}`);
        return;
      }
    }

    if (invalidEntries.length > 0) {
      bot.sendMessage(
        chatId,
        `The following entries were invalid and were not added:\n${invalidEntries.join(
          "\n"
        )}\nPlease ensure each entry follows the correct format and contains valid data.`
      );
    }

    bot.sendMessage(chatId, "Would you like to add more accounts? (y/n)");
    bot.once("message", async (response) => {
      if (
        response.text.toLowerCase() === "yes" ||
        response.text.toLowerCase() === "y"
      ) {
        await addAccount(chatId, userId);
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
