const CallLog = require("../models/CallLog");
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
// ═══════════════════════════════════════════════════
// VIDEO CALL SIGNALING EVENTS
// These events pass WebRTC data between 2 users
// Server just forwards — does NOT process video data
// ═══════════════════════════════════════════════════

// ── Event: Initiate a call ─────────────────────────
socket.on("call_user", async ({ targetUserId, offer, callType, channelId }) => {
  try {
    // Create call log record in MongoDB
    const callLog = await CallLog.create({
      caller: user._id,
      receiver: targetUserId,
      channel: channelId,
      type: callType || "video",
      status: "initiated",
    });

    // Forward incoming call notification to target user
    // We emit to the specific socket of target user
    io.to(targetUserId).emit("incoming_call", {
      callId: callLog._id,
      from: {
        _id: user._id,
        name: user.name,
        avatar: user.avatar,
      },
      offer,       // WebRTC offer (connection proposal)
      callType,
      channelId,
    });

    // Confirm to caller that call was sent
    socket.emit("call_initiated", {
      callId: callLog._id,
      targetUserId,
    });

    console.log(`📹 Call from ${user.name} to user ${targetUserId}`);
  } catch (error) {
    console.error("call_user error:", error.message);
  }
});

// ── Event: Accept call ─────────────────────────────
socket.on("call_accepted", async ({ callId, answer, targetUserId }) => {
  try {
    // Update call log status
    await CallLog.findByIdAndUpdate(callId, {
      status: "accepted",
      startedAt: new Date(),
    });

    // Send WebRTC answer back to the caller
    io.to(targetUserId).emit("call_answered", {
      callId,
      answer,  // WebRTC answer (acceptance)
    });

    console.log(`✅ Call ${callId} accepted`);
  } catch (error) {
    console.error("call_accepted error:", error.message);
  }
});

// ── Event: Reject call ─────────────────────────────
socket.on("call_rejected", async ({ callId, targetUserId }) => {
  try {
    await CallLog.findByIdAndUpdate(callId, { status: "rejected" });

    // Notify caller that call was rejected
    io.to(targetUserId).emit("call_rejected", { callId });

    console.log(`❌ Call ${callId} rejected`);
  } catch (error) {
    console.error("call_rejected error:", error.message);
  }
});

// ── Event: ICE Candidate exchange ──────────────────
// ICE candidates = network routing information
// Must be exchanged for WebRTC connection to work
socket.on("ice_candidate", ({ targetUserId, candidate }) => {
  // Forward ICE candidate to other peer
  io.to(targetUserId).emit("ice_candidate", {
    candidate,
    from: user._id,
  });
});

// ── Event: End call ────────────────────────────────
socket.on("call_ended", async ({ callId, targetUserId }) => {
  try {
    // Find call log and calculate duration
    const callLog = await CallLog.findById(callId);
    if (callLog && callLog.startedAt) {
      const duration = Math.floor(
        (new Date() - callLog.startedAt) / 1000
      );
      await CallLog.findByIdAndUpdate(callId, {
        status: "ended",
        endedAt: new Date(),
        duration,
      });
    }

    // Notify other user that call ended
    io.to(targetUserId).emit("call_ended", { callId });

    console.log(`📴 Call ${callId} ended`);
  } catch (error) {
    console.error("call_ended error:", error.message);
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