const express = require("express");
const router = express.Router();
const Message = require("../models/Message");
const { protect } = require("../middleware/auth");

// GET /api/messages/:channelId?page=1&limit=50
router.get("/:channelId", protect, async (req, res) => {
  try {
    const { page = 1, limit = 50 } = req.query;
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;

    // Get total count for pagination info
    const totalMessages = await Message.countDocuments({
      channel: req.params.channelId,
      deleted: false,
    });

    const messages = await Message.find({
      channel: req.params.channelId,
      deleted: false,
      threadParent: null, // Only main messages, not thread replies
    })
      .populate("sender", "name avatar status")
      .sort({ createdAt: -1 }) // Latest first
      .skip(skip)
      .limit(limitNum);

    // Reverse so oldest shows at top in chat
    const orderedMessages = messages.reverse();

    res.status(200).json({
      success: true,
      messages: orderedMessages,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total: totalMessages,
        totalPages: Math.ceil(totalMessages / limitNum),
        hasMore: pageNum < Math.ceil(totalMessages / limitNum),
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// PATCH /api/messages/:messageId/react
// Toggle emoji reaction on a message
router.patch("/:messageId/react", protect, async (req, res) => {
  try {
    const { emoji } = req.body;
    const userId = req.user._id;

    if (!emoji) {
      return res.status(400).json({ success: false, message: "Emoji is required." });
    }

    const message = await Message.findById(req.params.messageId);
    if (!message) {
      return res.status(404).json({ success: false, message: "Message not found." });
    }

    // Find if this emoji reaction already exists on the message
    const existingReaction = message.reactions.find((r) => r.emoji === emoji);

    if (existingReaction) {
      const userIndex = existingReaction.users.indexOf(userId.toString());

      if (userIndex > -1) {
        // User already reacted → REMOVE their reaction (toggle off)
        existingReaction.users.splice(userIndex, 1);

        // If no users left for this emoji → remove the reaction entirely
        if (existingReaction.users.length === 0) {
          message.reactions = message.reactions.filter((r) => r.emoji !== emoji);
        }
      } else {
        // User has not reacted yet → ADD their reaction (toggle on)
        existingReaction.users.push(userId);
      }
    } else {
      // This emoji has never been used → create new reaction
      message.reactions.push({ emoji, users: [userId] });
    }

    await message.save();

    // Return updated message with populated sender
    const updated = await Message.findById(message._id)
      .populate("sender", "name avatar");

    res.status(200).json({ success: true, message: updated });
  } catch (error) {
    console.error("React error:", error.message);
    res.status(500).json({ success: false, message: error.message });
  }
});
// GET /api/messages/:messageId/thread
// Get all replies to a specific message
router.get("/:messageId/thread", protect, async (req, res) => {
  try {
    const replies = await Message.find({
      threadParent: req.params.messageId,
      deleted: false,
    })
      .populate("sender", "name avatar status")
      .sort({ createdAt: 1 }); // Oldest first in thread

    res.status(200).json({ success: true, replies });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// POST /api/messages/:messageId/reply
// Send a reply to a specific message (creates thread)
router.post("/:messageId/reply", protect, async (req, res) => {
  try {
    const { content, channelId } = req.body;

    if (!content || !channelId) {
      return res.status(400).json({
        success: false,
        message: "Content and channelId are required.",
      });
    }

    // Create reply with threadParent pointing to original message
    const reply = await Message.create({
      channel: channelId,
      sender: req.user._id,
      content,
      threadParent: req.params.messageId, // ← This makes it a reply
    });

    const populated = await Message.findById(reply._id)
      .populate("sender", "name avatar");

    res.status(201).json({ success: true, reply: populated });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});
// PATCH /api/messages/:messageId
// Edit a message — only sender can edit
router.patch("/:messageId", protect, async (req, res) => {
  try {
    const { content } = req.body;

    if (!content || !content.trim()) {
      return res.status(400).json({
        success: false,
        message: "New message content is required.",
      });
    }

    const message = await Message.findById(req.params.messageId);

    if (!message) {
      return res.status(404).json({ success: false, message: "Message not found." });
    }

    // Security check: only the sender can edit
    if (message.sender.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: "You can only edit your own messages.",
      });
    }

    // Update content and mark as edited
    message.content = content.trim();
    message.edited = true;
    message.editedAt = new Date();
    await message.save();

    const updated = await Message.findById(message._id)
      .populate("sender", "name avatar");

    res.status(200).json({ success: true, message: updated });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// DELETE /api/messages/:messageId
// Soft-delete a message — only sender can delete
router.delete("/:messageId", protect, async (req, res) => {
  try {
    const message = await Message.findById(req.params.messageId);

    if (!message) {
      return res.status(404).json({ success: false, message: "Message not found." });
    }

    // Security check: only the sender can delete
    if (message.sender.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: "You can only delete your own messages.",
      });
    }

    // Soft delete — mark deleted:true, keep in DB
    message.deleted = true;
    await message.save();

    res.status(200).json({
      success: true,
      message: "Message deleted.",
      messageId: message._id,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;