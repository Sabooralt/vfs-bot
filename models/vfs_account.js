const mongoose = require("mongoose");

const VfsSchema = new mongoose.Schema({
  firstName: { type: String, required: true },
  lastName: { type: String, required: true },
  gender: { type: String, required: true },
  dob: { type: String, required: true },
  nationality: { type: String, required: true },
  passportNumber: { type: String, required: true },
  passportExpiry: { type: String, required: true },
  departureDate: { type: String, required: true },
  countryCode: { type: String, required: true },
  contactNumber: { type: String, required: true },
  email: { type: String, required: true },
  password: { type: String, required: true },
  user: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  visaLinkName: { type: String, required: true },
  visaLink: { type: String, required: true },
  applicationCenter: { type: Number, required: true },
  appointmentCategory: { type: Number, required: true },
  subCategory: { type: Number, required: true },
  disabled: { type: Boolean, default: false }
}, { timestamps: true });

module.exports = mongoose.model("Account", VfsSchema);
