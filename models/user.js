const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({
  userId: { type: String, required: true, unique: true },
  name: String,
  accounts: [
    { type: mongoose.Schema.Types.ObjectId, ref: "VFS_account" },
  ],
});

module.exports = mongoose.model("User", userSchema);
