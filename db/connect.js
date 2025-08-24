const mongoose = require("mongoose");

exports.connectDB = async () => {
  await mongoose.connect(
    process.env.MONGODB_URI || "mongodb://localhost:27017/Internship"
  );
  console.log("MongoDB connected");
};
