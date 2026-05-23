const express = require("express");
const http = require("http");
const cors = require("cors");
const dotenv = require("dotenv");
const connectDB = require("./config/db");

dotenv.config();    // Load .env variables FIRST
connectDB();        // Connect to MongoDB

const app = express();
const server = http.createServer(app);
// Note: we use http.createServer so Socket.io
// can attach to it in Sprint 2

// Middleware
app.use(cors({ origin: process.env.CLIENT_URL, credentials: true }));
app.use(express.json());        // Parse JSON request bodies

// Routes
app.use("/api/auth", require("./routes/auth"));
app.use("/api/users", require("./routes/users"));

// Health check
app.get("/", (req, res) => {
  res.json({ message: "Server running ✅" });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ success: false, message: err.message });
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`🚀 Server on http://localhost:${PORT}`);
});