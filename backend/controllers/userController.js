const User = require("../models/User");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const PrintJob = require("../models/PrintJob");
const Kiosk = require("../models/Kiosk");

exports.register = async (req, res) => {
  try {
    const { name, email, password } = req.body;

    const exists = await User.findOne({ email });
    if (exists) return res.status(400).json({ msg: "User already exists" });

    const hash = await bcrypt.hash(password, 10);

    const user = await User.create({ name, email, password: hash });

    res.json({ msg: "Account created", user });
  } catch (err) {
    res.status(500).json({ msg: "Server error" });
  }
};

exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email });
    if (!user) return res.status(400).json({ msg: "Invalid credentials" });

    const match = await bcrypt.compare(password, user.password);
    if (!match) return res.status(400).json({ msg: "Wrong password" });

    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET);

    res.json({ token, user });
  } catch (err) {
    res.status(500).json({ msg: "Server error" });
  }
};

// ---------------- DASHBOARD -----------------
exports.getDashboard = async (req, res) => {
  const userId = req.userId;

  try {
    const user = await User.findById(userId);
    const kiosk = await Kiosk.findOne({ connectedUser: userId });
    const files = await PrintJob.find({ userId });

    res.json({
      walletBalance: user.wallet,
      connectedKiosk: kiosk ? { kioskId: kiosk.kioskId, location: kiosk.location } : null,
      uploadedFiles: files.map(f => ({
        _id: f._id,
        fileName: f.fileName,
        fileSize: f.fileSize,
        createdAt: f.createdAt
      }))
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
};


// ---------------- WALLET -----------------
exports.addWalletBalance = async (req, res) => {
  const userId = req.userId;
  const { amount } = req.body;

  try {
    const user = await User.findById(userId);
    user.wallet += amount;
    await user.save();

    res.json({ walletBalance: user.wallet, message: "Balance added successfully" });
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
};

// ---------------- CONNECT KIOSK -----------------
exports.connectKiosk = async (req, res) => {
  const userId = req.userId;
  const { kioskId } = req.body;
// const { kioskId } = "KIOSK7100";

  try {
    const kiosk = await Kiosk.findOne({ kioskId });
    if (!kiosk) return res.status(404).json({ message: "Kiosk not found" });

    kiosk.connectedUser = userId;
    await kiosk.save();

    res.json({ message: "Connected to kiosk", kioskId: kiosk.kioskId });
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
};

// ------------disconnect----------------
exports.disconnectKiosk = async (req, res) => {
  try {
    const { kioskId } = req.body;
    const userId = req.userId;

    if (!kioskId) {
      return res.status(400).json({ msg: "kioskId missing" });
    }

    // FIND BY kioskId FIELD, NOT _id
    const kiosk = await Kiosk.findOne({ kioskId });
    if (!kiosk) {
      return res.status(404).json({ msg: "Kiosk not found" });
    }

    kiosk.connectedUser = null;
    await kiosk.save();

    await User.findByIdAndUpdate(userId, { connectedKiosk: null });

    res.json({ msg: "Disconnected successfully" });

  } catch (err) {
    console.error("DISCONNECT ERROR:", err);
    res.status(500).json({ msg: "Server error", error: err.message });
  }
};




// ---------------- FILES -----------------
exports.getFiles = async (req, res) => {
  const userId = req.userId;

  try {
    const files = await PrintJob.find({ userId });
    res.json(files);
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
};

// ---------------- UPLOAD --------------------------------
const multer = require("multer");
const path = require("path");

// ---- Storage config ----
const storage = multer.diskStorage({
  destination: "./uploads/",
  filename: (req, file, cb) => {
    cb(null, Date.now() + path.extname(file.originalname));
  }
});

exports.upload = multer({ storage }).single("file");

// ---- Upload API ----
exports.uploadFile = async (req, res) => {
  try {
    const userId = req.userId;

    if (!req.file)
      return res.status(400).json({ message: "No file uploaded" });

    const newJob = await PrintJob.create({
      userId,
      fileName: req.file.originalname,
      filePath: req.file.filename,
      fileSize: req.file.size,
      status: "uploaded",
      kioskId: null,
    });

    res.json({
      message: "File uploaded",
      file: newJob,
    });
  } catch (err) {
    res.status(500).json({ message: "Upload failed", error: err.message });
  }
};


// ---------------- PRINT -----------------
exports.printFile = async (req, res) => {
  const userId = req.userId;
  const { fileId } = req.body;

  if (!fileId) return res.status(400).json({ message: "File ID required" });

  try {
    const file = await PrintJob.findOne({ _id: fileId, userId });
    if (!file) return res.status(404).json({ message: "File not found" });

    // mark as pending for kiosk
    file.status = "pending";
    await file.save();

    // optionally, you can notify the connected kiosk via socket
    // io.to(file.kioskId).emit('newPrintJob', file);

    res.json({ message: `Print request sent for ${file.fileName}` });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
};
