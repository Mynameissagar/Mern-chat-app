const { verifyToken } = require("../utils/jwt");
const User = require("../models/User");
const Message = require("../models/Message");
const {
  setUserOnline,
  setUserOffline,
  getOnlineCount,
} = require("../config/redis");

const initSocket = (io) => {

  // ── Middleware: Authenticate every socket connection ──
  // This runs BEFORE the connection event
  // Rejects connection if token is invalid
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth.token;
      if (!token) {
        return next(new Error("Authentication error: No token"));
      }
      const decoded = verifyToken(token);
      const user = await User.findById(decoded.id);
      if (!user) {
        return next(new Error("Authentication error: User not found"));
      }
      // Attach user to socket object — available in all events
      socket.user = user;
      next();
    } catch (error) {
      next(new Error("Authentication error: Invalid token"));
    }
  });

  // ── Connection event — runs when user connects ────────
  io.on("connection", async (socket) => {
    const user = socket.user;
    console.log(`✅ Socket connected: ${user.name} (${socket.id})`);

    // Add user to online list
    await setUserOnline(user._id);
    const onlineCount = await getOnlineCount();

    // Update user status in DB
    await User.findByIdAndUpdate(user._id, { status: "online" });

    // Tell ALL connected users this user is now online
    io.emit("user_status", {
      userId: user._id,
      status: "online",
      name: user.name,
    });

    // Send the list of online users to the newly connected user
    socket.emit("online_count", onlineCount);

    // ── Event: Join a channel room ──────────────────────
    socket.on("join_channel", ({ channelId }) => {
      socket.join(channelId);
      console.log(`${user.name} joined channel: ${channelId}`);
    });

    // ── Event: Leave a channel room ─────────────────────
    socket.on("leave_channel", ({ channelId }) => {
      socket.leave(channelId);
      console.log(`${user.name} left channel: ${channelId}`);
    });

    // ── Event: Send a message ───────────────────────────
    socket.on("send_message", async ({ channelId, content }) => {
      try {
        // Validate content
        if (!content || !content.trim()) return;

        // Save message to MongoDB
        const message = await Message.create({
          channel: channelId,
          sender: user._id,
          content: content.trim(),
          type: "text",
        });

        // Populate sender info so frontend gets name + avatar
        const populatedMessage = await Message.findById(message._id)
          .populate("sender", "name avatar status");

        // Send message to ALL users in this channel (including sender)
        io.to(channelId).emit("receive_message", populatedMessage);

        console.log(`Message from ${user.name} in channel ${channelId}`);
      } catch (error) {
        console.error("send_message error:", error.message);
        socket.emit("message_error", { error: "Failed to send message" });
      }
    });

    // ── Event: Typing started ───────────────────────────
    socket.on("typing_start", ({ channelId }) => {
      // Tell everyone EXCEPT the sender that this user is typing
      socket.to(channelId).emit("user_typing", {
        userId: user._id,
        name: user.name,
        channelId,
        isTyping: true,
      });
    });

    // ── Event: Typing stopped ───────────────────────────
    socket.on("typing_stop", ({ channelId }) => {
      socket.to(channelId).emit("user_typing", {
        userId: user._id,
        name: user.name,
        channelId,
        isTyping: false,
      });
    });
    // ── Event: Message edited ────────────────────────────
socket.on("message_edited", ({ messageId, channelId, newContent }) => {
  // Broadcast to everyone in channel that message was edited
  io.to(channelId).emit("message_updated", {
    messageId,
    content: newContent,
    edited: true,
  });
});

// ── Event: Message deleted ───────────────────────────
socket.on("message_deleted", ({ messageId, channelId }) => {
  // Broadcast to everyone in channel that message was deleted
  io.to(channelId).emit("message_removed", { messageId });
});

// ── Event: File message sent ─────────────────────────
// When user uploads a file and sends it as message
socket.on("send_file_message", async ({ channelId, fileUrl, fileName, fileSize, fileType }) => {
  try {
    const messageType = fileType && fileType.startsWith("image/") ? "image" : "file";

    const message = await Message.create({
      channel: channelId,
      sender: user._id,
      content: fileName || "Shared a file",
      type: messageType,
      fileUrl,
      fileName,
      fileSize,
    });

    const populated = await Message.findById(message._id)
      .populate("sender", "name avatar status");

    io.to(channelId).emit("receive_message", populated);
  } catch (error) {
    console.error("File message error:", error.message);
    socket.emit("message_error", { error: "Failed to send file message" });
  }
});

    // ── Event: Disconnect ───────────────────────────────
    socket.on("disconnect", async () => {
      console.log(`❌ Socket disconnected: ${user.name}`);

      // Remove from online list
      await setUserOffline(user._id);

      // Update status in DB
      await User.findByIdAndUpdate(user._id, {
        status: "offline",
        lastSeen: new Date(),
      });

      // Tell all connected users this user went offline
      io.emit("user_status", {
        userId: user._id,
        status: "offline",
        name: user.name,
      });
    });
  });
};

module.exports = initSocket;