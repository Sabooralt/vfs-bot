
const mongoose = require("mongoose");
require("dotenv").config();
const { Apply } = require("./controllers");

mongoose
  .connect(process.env.MONGO_URI, {
    serverSelectionTimeoutMS: 20000,
    socketTimeoutMS: 45000,
  })
  .then(() => console.log("MongoDb Connected!"))
  .catch((err) => console.error("MongoDB connection error:", err));

Apply("1477468084");

