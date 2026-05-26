const express = require("express");
const router = express.Router();
const { v4: uuidv4 } = require("uuid");
const Workspace = require("../models/Workspace");
const Channel = require("../models/Channel");
const User = require("../models/User");
const { protect } = require("../middleware/auth");

// ── POST /api/workspaces ────────────────────────────────
// Create a new workspace
router.post("/", protect, async (req, res) => {
  try {
    const { name, description } = req.body;

    if (!name) {
      return res.status(400).json({
        success: false,
        message: "Workspace name is required.",
      });
    }

    // Generate slug from name
    // "My Team" → "my-team-abc123" (with random suffix to avoid duplicates)
    const baseSlug = name.toLowerCase()
      .replace(/[^a-z0-9]/g, "-")  // replace special chars with -
      .replace(/-+/g, "-");         // remove multiple dashes
    const slug = `${baseSlug}-${uuidv4().slice(0, 6)}`;

    // Create workspace — creator becomes owner AND admin member
    const workspace = await Workspace.create({
      name,
      description: description || "",
      slug,
      owner: req.user._id,
      members: [{ user: req.user._id, role: "admin" }],
      inviteCode: uuidv4(), // Unique invite code
    });

    // Auto-create a #general channel for the new workspace
    await Channel.create({
      name: "general",
      description: "General discussion",
      type: "public",
      createdBy: req.user._id,
      workspace: workspace._id,
      members: [req.user._id],
    });

    // Add workspace to user's workspaces array
    await User.findByIdAndUpdate(req.user._id, {
      $push: { workspaces: workspace._id },
    });

    res.status(201).json({ success: true, workspace });
  } catch (error) {
    console.error("Create workspace error:", error.message);
    res.status(500).json({ success: false, message: error.message });
  }
});

// ── GET /api/workspaces ─────────────────────────────────
// Get all workspaces the logged-in user belongs to
router.get("/", protect, async (req, res) => {
  try {
    const workspaces = await Workspace.find({
      "members.user": req.user._id, // User must be a member
    }).populate("owner", "name avatar");

    res.status(200).json({ success: true, workspaces });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// ── GET /api/workspaces/:id ─────────────────────────────
// Get single workspace with all members and channels
router.get("/:id", protect, async (req, res) => {
  try {
    const workspace = await Workspace.findById(req.params.id)
      .populate("owner", "name avatar")
      .populate("members.user", "name avatar status");

    if (!workspace) {
      return res.status(404).json({
        success: false,
        message: "Workspace not found.",
      });
    }

    // Get all channels belonging to this workspace
    const channels = await Channel.find({
      workspace: workspace._id,
    }).select("name description type members");

    res.status(200).json({ success: true, workspace, channels });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// ── DELETE /api/workspaces/:id ──────────────────────────
// Delete a workspace — only owner can do this
router.delete("/:id", protect, async (req, res) => {
  try {
    const workspace = await Workspace.findById(req.params.id);

    if (!workspace) {
      return res.status(404).json({ success: false, message: "Not found." });
    }

    // Only owner can delete
    if (workspace.owner.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: "Only the workspace owner can delete it.",
      });
    }

    await Workspace.findByIdAndDelete(req.params.id);
    res.status(200).json({ success: true, message: "Workspace deleted." });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});
// ── GET /api/workspaces/invite/:inviteCode ──────────────
// Join a workspace using invite code
// Anyone with the invite code can join
router.get("/invite/:inviteCode", protect, async (req, res) => {
  try {
    const workspace = await Workspace.findOne({
      inviteCode: req.params.inviteCode,
      inviteActive: true, // Invite must be active
    });

    if (!workspace) {
      return res.status(404).json({
        success: false,
        message: "Invalid or expired invite link.",
      });
    }

    // Check if user is already a member
    const alreadyMember = workspace.members.some(
      (m) => m.user.toString() === req.user._id.toString()
    );

    if (alreadyMember) {
      return res.status(200).json({
        success: true,
        message: "You are already a member.",
        workspace,
      });
    }

    // Add user to workspace members
    workspace.members.push({
      user: req.user._id,
      role: "member",
      joinedAt: new Date(),
    });
    await workspace.save();

    // Add workspace to user's workspaces array
    await User.findByIdAndUpdate(req.user._id, {
      $push: { workspaces: workspace._id },
    });

    res.status(200).json({
      success: true,
      message: `Successfully joined ${workspace.name}!`,
      workspace,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// ── POST /api/workspaces/:id/regenerate-invite ──────────
// Generate a new invite code (admin only)
// Use this to invalidate old invite links
router.post("/:id/regenerate-invite", protect, async (req, res) => {
  try {
    const workspace = await Workspace.findById(req.params.id);

    if (!workspace) {
      return res.status(404).json({ success: false, message: "Not found." });
    }

    // Only admin/owner can regenerate invite
    const member = workspace.members.find(
      (m) => m.user.toString() === req.user._id.toString()
    );

    if (!member || member.role !== "admin") {
      return res.status(403).json({
        success: false,
        message: "Only admins can regenerate invite links.",
      });
    }

    // Generate new invite code — old one becomes invalid
    workspace.inviteCode = uuidv4();
    await workspace.save();

    res.status(200).json({
      success: true,
      message: "New invite code generated.",
      inviteCode: workspace.inviteCode,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});
module.exports = router;