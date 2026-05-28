const express = require("express");
const router = express.Router();
const CallLog = require("../models/CallLog");
const { protect } = require("../middleware/auth");

// ── GET /api/calls/history ───────────────────────────────
// Get call history for the logged-in user
router.get("/history", protect, async (req, res) => {
  try {
    const calls = await CallLog.find({
      $or: [
        { caller: req.user._id },
        { receiver: req.user._id },
      ],
    })
      .populate("caller", "name avatar")
      .populate("receiver", "name avatar")
      .sort({ createdAt: -1 })
      .limit(20);

    res.status(200).json({ success: true, calls });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// ── GET /api/calls/:callId ────────────────────────────────
// Get details of a specific call
router.get("/:callId", protect, async (req, res) => {
  try {
    const call = await CallLog.findById(req.params.callId)
      .populate("caller", "name avatar")
      .populate("receiver", "name avatar");

    if (!call) {
      return res.status(404).json({ success: false, message: "Call not found." });
    }

    res.status(200).json({ success: true, call });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;