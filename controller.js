const User = require("./models/user");
const Account = require("./models/vfs_account");

async function getVFSAccounts(userId) {
  try {
    const user = await User.findOne({ userId }).populate("accounts");

    if (!user) {
      console.log("Users not found");
    }

    return user.accounts;
  } catch (err) {
    console.error("Error fetching email-passwords:", err);
  }
}
const createUserAccount = async (userId, name) => {
  try {
    if (!userId || !name) {
      return null;
    }
    const user = new User({ userId, name });

    await user.save();

    return user;
  } catch (err) {}
};

module.exports = { getVFSAccounts, createUserAccount };
