const mongoose = require("mongoose");

const workspaceSchema = new mongoose.Schema(
  {
    // Workspace name like "Google" or "My Team"
    name: {
      type: String,
      required: [true, "Workspace name is required"],
      trim: true,
      minlength: [2, "Name must be at least 2 characters"],
      maxlength: [50, "Name cannot exceed 50 characters"],
    },

    // Short unique URL-friendly identifier
    // Example: workspace name "My Team" → slug "my-team"
    slug: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },

    // Description of the workspace
    description: {
      type: String,
      default: "",
      maxlength: 200,
    },

    // Workspace logo/icon URL (Cloudinary)
    logo: {
      type: String,
      default: "",
    },

    // Who created this workspace — they become the admin
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    // All members with their roles
    members: [
      {
        user: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User",
        },
        role: {
          type: String,
          enum: ["admin", "member"],
          default: "member",
        },
        joinedAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],

    // Unique invite code — share this link to invite people
    // Generated automatically when workspace is created
    inviteCode: {
      type: String,
      unique: true,
      sparse: true, // allows null values
    },

    // Whether invite link is active or disabled
    inviteActive: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Workspace", workspaceSchema);