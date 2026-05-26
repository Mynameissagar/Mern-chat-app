const express = require("express");
const router = express.Router();
const cloudinary = require("../utils/cloudinary");
const upload = require("../middleware/upload");
const { protect } = require("../middleware/auth");

// POST /api/upload
// Upload a file or image to Cloudinary
// Returns the file URL to use in a message
router.post("/", protect, upload.single("file"), async (req, res) => {
  try {
    // Check file was actually provided
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "No file provided.",
      });
    }

    // Convert file buffer to base64 string for Cloudinary
    const fileStr = `data:${req.file.mimetype};base64,${
      req.file.buffer.toString("base64")
    }`;

    // Determine resource type for Cloudinary
    const resourceType = req.file.mimetype.startsWith("image/")
      ? "image"
      : "raw";

    // Upload to Cloudinary
    const uploadResult = await cloudinary.uploader.upload(fileStr, {
      folder: "mern-chat",          // Organise in a folder
      resource_type: resourceType,
      use_filename: true,
    });

    // Send back the file URL and details
    res.status(200).json({
      success: true,
      fileUrl: uploadResult.secure_url,   // HTTPS URL
      fileName: req.file.originalname,
      fileSize: req.file.size,
      fileType: req.file.mimetype,
      publicId: uploadResult.public_id,   // Cloudinary ID (for deletion)
    });

  } catch (error) {
    console.error("Upload error:", error.message);
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;