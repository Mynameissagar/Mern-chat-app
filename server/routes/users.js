const express = require("express");
const router = express.Router();
const User = require("../models/User");
const { protect } = require("../middleware/auth");

// GET /api/users/profile/:id
router.get("/profile/:id", protect, async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ success: false, message: "User not found." });
    res.status(200).json({ success: true, user: user.toPublicJSON() });
  } catch (error) {
    if (error.name === "CastError") {
      return res.status(400).json({ success: false, message: "Invalid user ID." });
    }
    res.status(500).json({ success: false, message: "Server error." });
  }
});

// PATCH /api/users/profile
router.patch("/profile", protect, async (req, res) => {
  try {
    const { name, bio, avatar } = req.body;
    const updates = {};
    if (name !== undefined) updates.name = name;
    if (bio !== undefined) updates.bio = bio;
    if (avatar !== undefined) updates.avatar = avatar;

    const updatedUser = await User.findByIdAndUpdate(
      req.user._id, updates,
      { new: true, runValidators: true }
    );
    res.status(200).json({ success: true, user: updatedUser.toPublicJSON() });
  } catch (error) {
    res.status(500).json({ success: false, message: "Server error." });
  }
});

// GET /api/users/search?q=name
router.get("/search", protect, async (req, res) => {
  try {
    const { q } = req.query;
    if (!q || q.trim().length < 2) {
      return res.status(400).json({
        success: false,
        message: "Search query must be at least 2 characters.",
      });
    }
    const users = await User.find({
      $or: [
        { name: { $regex: q, $options: "i" } },
        { email: { $regex: q, $options: "i" } },
      ],
      _id: { $ne: req.user._id },
    }).select("name email avatar status").limit(10);

    res.status(200).json({ success: true, users });
  } catch (error) {
    res.status(500).json({ success: false, message: "Server error." });
  }
});

// PATCH /api/users/status
router.patch("/status", protect, async (req, res) => {
  try {
    const { status } = req.body;
    const valid = ["online", "away", "offline"];
    if (!valid.includes(status)) {
      return res.status(400).json({ success: false, message: "Invalid status value." });
    }
    await User.findByIdAndUpdate(req.user._id, { status, lastSeen: new Date() });
    res.status(200).json({ success: true, message: `Status updated to ${status}.` });
  } catch (error) {
    res.status(500).json({ success: false, message: "Server error." });
  }
});

module.exports = router;