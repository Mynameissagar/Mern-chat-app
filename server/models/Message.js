const mongoose = require("mongoose");

const messageSchema = new mongoose.Schema(
  {
    // Which channel this message belongs to
    channel: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Channel",
      required: true,
    },
    // Who sent this message
    sender: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    // The actual message text
    content: {
      type: String,
      required: [true, "Message content is required"],
      trim: true,
      maxlength: [2000, "Message cannot exceed 2000 characters"],
    },
    // Type of message
    type: {
      type: String,
      enum: ["text", "image", "file"],
      default: "text",
    },
    // For file/image messages (Sprint 3)
    fileUrl: {
      type: String,
      default: "",
    },
    // For thread replies (Sprint 3)
    threadParent: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Message",
      default: null,
    },
    // Soft delete — message marked deleted but kept in DB
    deleted: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Message", messageSchema);