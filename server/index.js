const express = require("express");
const http = require("http");
const cors = require("cors");
const dotenv = require("dotenv");
const { Server } = require("socket.io"); // ← NEW
const connectDB = require("./config/db");
const initSocket = require("./socket/index"); // ← NEW

dotenv.config();
connectDB();

const app = express();
const server = http.createServer(app);

// ── NEW: Create Socket.io server ─────────────────────────
const io = new Server(server, {
  cors: {
    origin: [
      "http://localhost:5173",
      process.env.CLIENT_URL,
    ].filter(Boolean),
    methods: ["GET", "POST"],
    credentials: true,
  },
});

// ── NEW: Initialize all socket event handlers ────────────
initSocket(io);

// ── Middleware ────────────────────────────────────────────
app.use(cors({
  origin: [
    "http://localhost:5173",           // Local development
    process.env.CLIENT_URL,            // Production frontend URL
  ].filter(Boolean),
  credentials: true,
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ── REST Routes ───────────────────────────────────────────
app.use("/api/auth", require("./routes/auth"));
app.use("/api/users", require("./routes/users"));
app.use("/api/channels", require("./routes/channels")); // ← NEW
app.use("/api/messages", require("./routes/messages")); // ← NEW
app.use("/api/upload", require("./routes/upload"));
app.use("/api/workspaces", require("./routes/workspaces")); // ← NEW
app.use("/api/search",     require("./routes/search"));     // ← NEW
app.use("/api/admin",      require("./routes/admin"));      // ← NEW
app.use("/api/ai",    require("./routes/ai"));    // ← NEW
app.use("/api/calls", require("./routes/calls")); // ← NEW

// ── Health check ──────────────────────────────────────────
app.get("/", (req, res) => {
  res.json({ message: "Server is running ✅", socketio: "enabled" });
});

// ── Error handler ─────────────────────────────────────────
app.use((err, req, res, next) => {
  console.error("ERROR:", err.message);
  res.status(500).json({ success: false, message: err.message });
});

// ── Start server ──────────────────────────────────────────
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`🚀 Server on http://localhost:${PORT}`);
  console.log(`⚡ Socket.io ready`);
});