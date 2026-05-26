const express = require("express");
const router = express.Router();
const Workspace = require("../models/Workspace");
const Channel = require("../models/Channel");
const Message = require("../models/Message");
const User = require("../models/User");
const { protect } = require("../middleware/auth");

// ── Middleware: Check if user is workspace admin ────────
const isWorkspaceAdmin = async (req, res, next) => {
  try {
    const workspace = await Workspace.findById(req.params.workspaceId);
    if (!workspace) {
      return res.status(404).json({ success: false, message: "Workspace not found." });
    }
    const member = workspace.members.find(
      (m) => m.user.toString() === req.user._id.toString()
    );
    if (!member || member.role !== "admin") {
      return res.status(403).json({
        success: false,
        message: "Admin access required.",
      });
    }
    req.workspace = workspace;
    next();
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ── GET /api/admin/:workspaceId/stats ───────────────────
// Get workspace statistics
router.get("/:workspaceId/stats", protect, isWorkspaceAdmin,
  async (req, res) => {
    try {
      const workspaceId = req.params.workspaceId;

      // Get channel IDs in this workspace
      const channels = await Channel.find({ workspace: workspaceId });
      const channelIds = channels.map((c) => c._id);

      // Count total messages across all channels
      const totalMessages = await Message.countDocuments({
        channel: { $in: channelIds },
      });

      res.status(200).json({
        success: true,
        stats: {
          totalMembers: req.workspace.members.length,
          totalChannels: channels.length,
          totalMessages,
          workspaceName: req.workspace.name,
          createdAt: req.workspace.createdAt,
        },
      });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  }
);

// ── DELETE /api/admin/:workspaceId/members/:userId ──────
// Remove a member from workspace
router.delete("/:workspaceId/members/:userId", protect,
  isWorkspaceAdmin, async (req, res) => {
    try {
      const workspace = req.workspace;

      // Cannot remove the owner
      if (workspace.owner.toString() === req.params.userId) {
        return res.status(400).json({
          success: false,
          message: "Cannot remove the workspace owner.",
        });
      }

      // Remove member from workspace
      workspace.members = workspace.members.filter(
        (m) => m.user.toString() !== req.params.userId
      );
      await workspace.save();

      // Remove workspace from user's list
      await User.findByIdAndUpdate(req.params.userId, {
        $pull: { workspaces: workspace._id },
      });

      res.status(200).json({
        success: true,
        message: "Member removed from workspace.",
      });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  }
);

// ── PATCH /api/admin/:workspaceId/members/:userId/role ──
// Change a member's role (admin/member)
router.patch("/:workspaceId/members/:userId/role", protect,
  isWorkspaceAdmin, async (req, res) => {
    try {
      const { role } = req.body;
      if (!["admin", "member"].includes(role)) {
        return res.status(400).json({
          success: false,
          message: "Role must be admin or member.",
        });
      }

      const workspace = req.workspace;
      const member = workspace.members.find(
        (m) => m.user.toString() === req.params.userId
      );

      if (!member) {
        return res.status(404).json({
          success: false,
          message: "Member not found in workspace.",
        });
      }

      member.role = role;
      await workspace.save();

      res.status(200).json({
        success: true,
        message: `Role updated to ${role}.`,
      });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  }
);

module.exports = router;