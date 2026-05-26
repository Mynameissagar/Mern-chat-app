const mongoose = require("mongoose");

const messageSchema = new mongoose.Schema(
  {
    channel: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Channel",
      required: true,
    },
    sender: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    content: {
      type: String,
      required: [true, "Message content is required"],
      trim: true,
      maxlength: [2000, "Message cannot exceed 2000 characters"],
    },
    type: {
      type: String,
      enum: ["text", "image", "file"],
      default: "text",
    },

    // ── Sprint 3: File upload fields ─────────────────────
    fileUrl: { type: String, default: "" },
    fileName: { type: String, default: "" },
    fileSize: { type: Number, default: 0 },

    // ── Sprint 3: Thread reply support ───────────────────
    // If this message is a reply, threadParent points to parent message
    threadParent: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Message",
      default: null,
    },

    // ── Sprint 3: Emoji reactions ─────────────────────────
    // Array of { emoji: "👍", users: [userId1, userId2] }
    reactions: [
      {
        emoji: { type: String, required: true },
        users: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
      },
    ],

    // ── Sprint 3: Edit tracking ───────────────────────────
    edited: { type: Boolean, default: false },
    editedAt: { type: Date, default: null },

    // ── Sprint 3: @Mention tracking ───────────────────────
    // Stores IDs of users mentioned with @username
    mentions: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],

    // Soft delete
    deleted: { type: Boolean, default: false },
  },
  { timestamps: true }
);
messageSchema.index({ content: "text" });

module.exports = mongoose.model("Message", messageSchema);