const express = require("express");
const router = express.Router();
const Message = require("../models/Message");
const { protect } = require("../middleware/auth");

// GET /api/messages/:channelId
// Get last 50 messages for a channel (pagination ready)
router.get("/:channelId", protect, async (req, res) => {
  try {
    const { page = 1 } = req.query;
    const limit = 50;
    const skip = (page - 1) * limit;

    const messages = await Message.find({
      channel: req.params.channelId,
      deleted: false,
    })
      .populate("sender", "name avatar status")
      .sort({ createdAt: -1 }) // Latest first
      .skip(skip)
      .limit(limit);

    // Reverse so oldest message shows at top
    const orderedMessages = messages.reverse();

    res.status(200).json({
      success: true,
      messages: orderedMessages,
      page: Number(page),
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;