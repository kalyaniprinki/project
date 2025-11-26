const mongoose = require("mongoose");

const PrintJobSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  kioskId: { type: String, default: null },
  fileName: String,
  filePath: String,
  fileSize: Number,
  status: { type: String, default: "uploaded" }, 
  createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model("PrintJob", PrintJobSchema);
