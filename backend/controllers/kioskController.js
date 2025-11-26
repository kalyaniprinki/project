const Kiosk = require("../models/Kiosk");
const User = require("../models/User");
const jwt = require("jsonwebtoken");
const QRCode = require("qrcode");
const PrintJob = require("../models/PrintJob");
const path = require("path");
const fs = require("fs");

// ------------------ LOGIN ---------------------
exports.login = async (req, res) => {
  const { kioskId, password } = req.body;

  const kiosk = await Kiosk.findOne({ kioskId });
  if (!kiosk) return res.status(404).json({ message: "Kiosk not found" });

  if (kiosk.password !== password)
    return res.status(401).json({ message: "Invalid credentials" });

  const token = jwt.sign({ kioskId }, process.env.JWT_SECRET);

  kiosk.status = "online";
  await kiosk.save();

  res.json({ message: "Login successful", token, kioskId });
};

// ------------------ REGISTER ---------------------
exports.register = async (req, res) => {
  const { kioskName, location, password } = req.body;

  const kioskId = "KIOSK" + Math.floor(1000 + Math.random() * 9000);

  const newKiosk = new Kiosk({
    kioskId,
    kioskName,
    location,
    password,
    connectedUser: null,
    status: "offline",
  });

  await newKiosk.save();

  res.json({ message: "Kiosk registered successfully", kioskId });
};

// ------------------ CONNECT USER ---------------------
exports.connectUser = async (req, res) => {
  const { kioskId, userId } = req.body;

  const kiosk = await Kiosk.findOne({ kioskId });
  if (!kiosk) return res.status(404).json({ message: "Kiosk not found" });

  kiosk.connectedUser = userId;
  await kiosk.save();

  res.json({
    message: "User connected",
    connectedUser: kiosk.connectedUser
  });
};

// ------------------ DISCONNECT USER ---------------------
exports.disconnect = async (req, res) => {
  const { kioskId } = req.body;

  if (!kioskId)
    return res.status(400).json({ message: "kioskId missing" });

  await Kiosk.updateOne({ kioskId }, { connectedUser: null });

  res.json({ message: "Disconnected" });
};

// const User = require("../models/User");
// const PrintJob = require("../models/PrintJob");
// const Kiosk = require("../models/Kiosk");
// -----------------------status-------------
exports.getStatus = async (req, res) => {
  const { kioskId } = req.params;

  const kiosk = await Kiosk.findOne({ kioskId }).populate("connectedUser");
  if (!kiosk) return res.status(404).json({ message: "Kiosk not found" });

  let uploadedFiles = [];
  let pendingFiles = [];

  if (kiosk.connectedUser) {
    const userId = kiosk.connectedUser._id;

    // 1️⃣ All uploaded files by user
    uploadedFiles = await PrintJob.find({ userId });

    // 2️⃣ Only print jobs that were sent to this kiosk
    pendingFiles = await PrintJob.find({ kioskId, status: "pending" });
  }

  res.json({
    kioskId: kiosk.kioskId,
    connectedUser: kiosk.connectedUser || null,
    uploadedFiles,
    pendingFiles,
  });
};

// ------------------to get file for printing
// exports.getFile = async (req, res) => {
//   try {
//     const fileId = req.params.fileId;

//     const job = await PrintJob.findById(fileId);
//     if (!job) {
//       return res.status(404).json({ message: "Print job not found" });
//     }

//     if (!job.filePath || !fs.existsSync(job.filePath)) {
//       return res.status(404).json({ message: "File path not found" });
//     }

//     return res.download(job.filePath, job.fileName);
//   } catch (err) {
//     console.error("Error sending file:", err);
//     return res.status(500).json({ message: "Server error" });
//   }
// };

// ==========================================================
//                🔥 KIOSK AGENT INTEGRATION 🔥
// ==========================================================


// --------- 1️⃣ AGENT CONNECTS TO BACKEND -------------------
exports.agentConnect = async (req, res) => {
  try {
    const { kioskId, agentUrl } = req.body;

    if (!kioskId || !agentUrl)
      return res.status(400).json({ message: "kioskId & agentUrl required" });

    const kiosk = await Kiosk.findOne({ kioskId });
    if (!kiosk) return res.status(404).json({ message: "Kiosk not found" });

    kiosk.status = "online";
    kiosk.agentUrl = agentUrl;
    await kiosk.save();

    res.json({ message: "Kiosk Agent Connected", kiosk });
  } catch (err) {
    console.log(err);
    res.status(500).json({ message: "Agent connect error" });
  }
};



// --------- 2️⃣ CHECK PRINTER STATUS -------------------------
exports.getPrinterStatus = async (req, res) => {
  try {
    const { kioskId } = req.params;

    const kiosk = await Kiosk.findOne({ kioskId });
    if (!kiosk) return res.status(404).json({ message: "Kiosk not found" });

    if (!kiosk.agentUrl)
      return res.status(400).json({ message: "Kiosk agent not connected" });

    const response = await axios.get(`${kiosk.agentUrl}/status`);

    kiosk.printerConnected = response.data.printer === "connected";
    await kiosk.save();

    res.json({
      printer: kiosk.printerConnected ? "connected" : "disconnected",
    });

  } catch (err) {
    console.log(err);
    res.status(500).json({ message: "Failed to get printer status" });
  }
};



// --------- 3️⃣ SEND PRINT TO KIOSK AGENT --------------------
exports.sendPrint = async (req, res) => {
  try {
    const { kioskId } = req.params;
    const { fileUrl, pages, copies } = req.body;

    const kiosk = await Kiosk.findOne({ kioskId });
    if (!kiosk || !kiosk.agentUrl)
      return res.status(404).json({ message: "Kiosk agent offline" });

    const agentRes = await axios.post(`${kiosk.agentUrl}/print`, {
      fileUrl,
      pages,
      copies,
    });

    res.json({ message: "Print command sent", agentResponse: agentRes.data });

  } catch (err) {
    console.log(err);
    res.status(500).json({ message: "Failed to send print job" });
  }
};