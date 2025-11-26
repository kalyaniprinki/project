const PrintJob = require("../models/PrintJob");
const fs = require("fs");
const path = require("path");

exports.getFile = async (req, res) => {
  try {
    const fileId = req.params.fileId;
    console.log("REQUESTED FILE ID:", req.params.fileId);

    const job = await PrintJob.findById(fileId);
    if (!job) {
      return res.status(404).json({ message: "Print job not found" });
    }

    // FIX: Correct absolute file path
    const absolutePath = path.join(__dirname, "..", "uploads", job.filePath);

    if (!fs.existsSync(absolutePath)) {
      return res.status(404).json({ message: "File not found on server", path: absolutePath });
    }

    // Return file path for kiosk to print
    res.json({
      success: true,
      localFilePath: absolutePath,
      fileName: job.fileName,
    });
  } catch (error) {
    console.error("FILE FETCH ERROR:", error);
    res.status(500).json({ message: "Server error while getting file" });
  }
};
