
const express = require("express");
const router = express.Router();
const fileController = require("../controllers/fileController");

// Get/Download file by ID
router.get("/:fileId", fileController.getFile);

// Delete file (optional)
// router.delete("/:fileId", fileController.deleteFile);

module.exports = router;
