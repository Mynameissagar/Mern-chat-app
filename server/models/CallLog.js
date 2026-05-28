const mongoose = require("mongoose");

const callLogSchema = new mongoose.Schema(
  {
    // Who initiated the call
    caller: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    // Who received the call
    receiver: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    // Which DM channel this call was in
    channel: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Channel",
    },
    // Call status tracking
    status: {
      type: String,
      enum: ["initiated", "accepted", "rejected", "missed", "ended"],
      default: "initiated",
    },
    // Call type
    type: {
      type: String,
      enum: ["video", "audio"],
      default: "video",
    },
    // How long the call lasted in seconds
    duration: {
      type: Number,
      default: 0,
    },
    // When call started
    startedAt: {
      type: Date,
      default: null,
    },
    // When call ended
    endedAt: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("CallLog", callLogSchema);