const mongoose = require("mongoose");

const channelSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Channel name is required"],
      trim: true,
      minlength: [2, "Channel name must be at least 2 characters"],
      maxlength: [50, "Channel name cannot exceed 50 characters"],
    },
    description: {
      type: String,
      default: "",
      maxlength: 200,
    },
    type: {
      type: String,
      enum: ["public", "private", "dm"],
      default: "public",
    },
    // Who created this channel
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    // All members in this channel
    members: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    ],
  },
  { timestamps: true }
);

module.exports = mongoose.model("Channel", channelSchema);