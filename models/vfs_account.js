const mongoose = require("mongoose");

const VfsSchema = new mongoose.Schema({
  email: { type: String, required: true },
  password: { type: String, required: true },
  user: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
});

module.exports = mongoose.model("VFS_account", VfsSchema);
