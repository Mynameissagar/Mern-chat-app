const mongoose = require("mongoose");

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGO_URI);
    console.log(`✅ MongoDB Connected: ${conn.connection.host}`);
    // Add this BEFORE mongoose.connect()
console.log('Attempting to connect to:', process.env.MONGO_URI?.replace(/:([^@]+)@/, ':****@')); // hides password
  } catch (error) {
    console.error(`❌ MongoDB Error: ${error.message}`);
    process.exit(1); // Stop server if DB won't connect
  }
};

module.exports = connectDB;