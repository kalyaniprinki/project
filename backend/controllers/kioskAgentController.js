const axios = require("axios");
const Kiosk = require("../models/Kiosk");

// Agent connects → backend stores its URL
exports.connectAgent = async (req, res) => {
  try {
    const { kioskId, agentUrl } = req.body;

    if (!kioskId || !agentUrl)
      return res.status(400).json({ message: "kioskId & agentUrl required" });

    const kiosk = await Kiosk.findOne({ kioskId });
    if (!kiosk) return res.status(404).json({ message: "Kiosk not found" });

    kiosk.status = "online";
    kiosk.agentUrl = agentUrl;
    await kiosk.save();

    res.json({ message: "Agent Connected", kiosk });
  } catch (err) {
    console.log(err);
    res.status(500).json({ message: "Agent connect error" });
  }
};

// Get printer status from agent
exports.getPrinterStatus = async (req, res) => {
  try {
    const { kioskId } = req.params;

    const kiosk = await Kiosk.findOne({ kioskId });
    if (!kiosk || !kiosk.agentUrl)
      return res.status(404).json({ message: "Kiosk agent offline" });

    const result = await axios.get(`${kiosk.agentUrl}/status`);

    // Update DB
    kiosk.printerConnected = result.data.printer === "connected";
    await kiosk.save();

    res.json({
      printer: kiosk.printerConnected ? "connected" : "disconnected",
    });
  } catch (err) {
    console.log(err);
    res.status(500).json({ message: "Failed to get printer status" });
  }
};

// Send print job to kiosk-agent
exports.sendPrint = async (req, res) => {
  try {
    const { kioskId } = req.params;
    const { fileUrl, pages, copies } = req.body;

    const kiosk = await Kiosk.findOne({ kioskId });
    if (!kiosk || !kiosk.agentUrl)
      return res.status(404).json({ message: "Kiosk agent offline" });

    const response = await axios.post(`${kiosk.agentUrl}/print`, {
      fileUrl,
      pages,
      copies,
    });

    res.json({ message: "Print sent", response: response.data });
  } catch (err) {
    console.log(err);
    res.status(500).json({ message: "Failed to send print job" });
  }
};
