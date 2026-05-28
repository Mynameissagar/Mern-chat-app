const express = require("express");
const router = express.Router();
const Message = require("../models/Message");
const { protect } = require("../middleware/auth");
const {
  summarizeThread,
  generateReplySuggestions,
} = require("../utils/gemini");

// ── Rate limiting map (simple in-memory) ────────────────
// Prevents users from spamming the AI API
// Key: userId, Value: timestamp of last request
const rateLimitMap = new Map();
const RATE_LIMIT_MS = 10000; // 10 seconds between requests

const checkRateLimit = (userId) => {
  const lastRequest = rateLimitMap.get(userId.toString());
  if (lastRequest) {
    const timePassed = Date.now() - lastRequest;
    if (timePassed < RATE_LIMIT_MS) {
      const waitSeconds = Math.ceil((RATE_LIMIT_MS - timePassed) / 1000);
      return { limited: true, waitSeconds };
    }
  }
  rateLimitMap.set(userId.toString(), Date.now());
  return { limited: false };
};

// ── POST /api/ai/summarize ───────────────────────────────
// Summarize last N messages in a channel using Gemini AI
router.post("/summarize", protect, async (req, res) => {
  try {
    const { channelId, messageCount = 50 } = req.body;

    if (!channelId) {
      return res.status(400).json({
        success: false,
        message: "channelId is required.",
      });
    }

    // Check rate limit — prevent spam
    const rateCheck = checkRateLimit(req.user._id);
    if (rateCheck.limited) {
      return res.status(429).json({
        success: false,
        message: `Please wait ${rateCheck.waitSeconds} seconds before summarizing again.`,
      });
    }

    // Fetch last N messages from this channel
    const messages = await Message.find({
      channel: channelId,
      deleted: false,
      threadParent: null, // Only main messages
    })
      .populate("sender", "name")
      .sort({ createdAt: -1 })
      .limit(Math.min(messageCount, 100)) // Max 100 messages
      .lean(); // lean() returns plain JS objects (faster)

    if (messages.length === 0) {
      return res.status(400).json({
        success: false,
        message: "No messages found in this channel to summarize.",
      });
    }

    if (messages.length < 3) {
      return res.status(400).json({
        success: false,
        message: "Need at least 3 messages to generate a summary.",
      });
    }

    // Reverse so oldest message is first (chronological order)
    const orderedMessages = messages.reverse();

    // Call Gemini AI
    console.log(`🤖 Summarizing ${orderedMessages.length} messages for channel ${channelId}`);
    const summary = await summarizeThread(orderedMessages);

    res.status(200).json({
      success: true,
      summary,
      messageCount: orderedMessages.length,
      channelId,
    });

  } catch (error) {
    console.error("AI summarize route error:", error.message);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

// ── POST /api/ai/suggestions ─────────────────────────────
// Get smart reply suggestions based on recent messages
router.post("/suggestions", protect, async (req, res) => {
  try {
    const { channelId } = req.body;

    if (!channelId) {
      return res.status(400).json({
        success: false,
        message: "channelId is required.",
      });
    }

    // Fetch last 5 messages for context
    const messages = await Message.find({
      channel: channelId,
      deleted: false,
    })
      .populate("sender", "name")
      .sort({ createdAt: -1 })
      .limit(5)
      .lean();

    if (messages.length === 0) {
      return res.status(200).json({
        success: true,
        suggestions: ["Hello!", "Sounds good!", "Let me check."],
      });
    }

    const orderedMessages = messages.reverse();
    const suggestions = await generateReplySuggestions(orderedMessages);

    res.status(200).json({
      success: true,
      suggestions,
    });

  } catch (error) {
    console.error("AI suggestions error:", error.message);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

module.exports = router;