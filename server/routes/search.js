const express = require("express");
const router = express.Router();
const Message = require("../models/Message");
const Channel = require("../models/Channel");
const User = require("../models/User");
const { protect } = require("../middleware/auth");

// ── GET /api/search?q=keyword&type=messages ─────────────
// Search messages and users
router.get("/", protect, async (req, res) => {
  try {
    const { q, type } = req.query;

    // Validate query
    if (!q || q.trim().length < 2) {
      return res.status(400).json({
        success: false,
        message: "Search query must be at least 2 characters.",
      });
    }

    const results = {};

    // ── Search messages using text index ────────────────
    if (!type || type === "messages") {
      const messages = await Message.find({
        $text: { $search: q }, // Uses the text index we created
        deleted: false,
      })
        .populate("sender", "name avatar")
        .populate("channel", "name")
        .sort({ score: { $meta: "textScore" } }) // Sort by relevance
        .limit(20);

      results.messages = messages;
    }

    // ── Search channels by name ──────────────────────────
    if (!type || type === "channels") {
      const channels = await Channel.find({
        name: { $regex: q, $options: "i" },
        type: "public",
      })
        .select("name description type members")
        .limit(10);

      results.channels = channels;
    }

    // ── Search users by name or email ────────────────────
    if (!type || type === "users") {
      const users = await User.find({
        $or: [
          { name: { $regex: q, $options: "i" } },
          { email: { $regex: q, $options: "i" } },
        ],
        _id: { $ne: req.user._id },
      })
        .select("name email avatar status")
        .limit(10);

      results.users = users;
    }

    res.status(200).json({
      success: true,
      query: q,
      results,
    });
  } catch (error) {
    console.error("Search error:", error.message);
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;