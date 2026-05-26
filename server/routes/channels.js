const express = require("express");
const router = express.Router();
const Channel = require("../models/Channel");
const { protect } = require("../middleware/auth");

// POST /api/channels — Create a new channel
router.post("/", protect, async (req, res) => {
  try {
    const { name, description, type } = req.body;
    if (!name) {
      return res.status(400).json({
        success: false,
        message: "Channel name is required.",
      });
    }
    const channel = await Channel.create({
      name,
      description: description || "",
      type: type || "public",
      createdBy: req.user._id,
      members: [req.user._id], // Creator is first member
    });
    res.status(201).json({ success: true, channel });
  } catch (error) {
    console.error("Create channel error:", error.message);
    res.status(500).json({ success: false, message: error.message });
  }
});

// GET /api/channels — Get all public channels
router.get("/", protect, async (req, res) => {
  try {
    const channels = await Channel.find({ type: "public" })
      .populate("createdBy", "name avatar")
      .sort({ createdAt: -1 });
    res.status(200).json({ success: true, channels });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// GET /api/channels/:id — Get single channel
router.get("/:id", protect, async (req, res) => {
  try {
    const channel = await Channel.findById(req.params.id)
      .populate("members", "name avatar status");
    if (!channel) {
      return res.status(404).json({ success: false, message: "Channel not found." });
    }
    res.status(200).json({ success: true, channel });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// PATCH /api/channels/:id/join — Join a channel
router.patch("/:id/join", protect, async (req, res) => {
  try {
    const channel = await Channel.findById(req.params.id);
    if (!channel) {
      return res.status(404).json({ success: false, message: "Channel not found." });
    }
    // Add user to members if not already in
    if (!channel.members.includes(req.user._id)) {
      channel.members.push(req.user._id);
      await channel.save();
    }
    res.status(200).json({ success: true, message: "Joined channel.", channel });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});
// POST /api/channels/dm/:userId
// Start or get existing DM conversation with another user
router.post("/dm/:userId", protect, async (req, res) => {
  try {
    const currentUser = req.user._id;
    const targetUser = req.params.userId;

    // Check if DM already exists between these 2 users
    const existingDM = await Channel.findOne({
      type: "dm",
      members: { $all: [currentUser, targetUser] }, // Both must be members
    });

    if (existingDM) {
      // DM already exists — return it
      return res.status(200).json({ success: true, channel: existingDM });
    }

    // DM does not exist — create new one
    const newDM = await Channel.create({
      name: `dm_${currentUser.toString().slice(-6)}_${targetUser.toString().slice(-6)}`,
      type: "dm",
      createdBy: currentUser,
      members: [currentUser, targetUser],
    });

    res.status(201).json({ success: true, channel: newDM });
  } catch (error) {
    console.error("DM error:", error.message);
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;