
const express = require("express");
const cors = require("cors");
const { print } = require("pdf-to-printer");
const fs = require("fs");
const path = require("path");

const app = express();
app.use(cors());
app.use(express.json());

// List printers
app.get("/status", async (req, res) => {
  try {
    const { getPrinters } = require("pdf-to-printer");
    const printers = await getPrinters();
    res.json({
      printerConnected: printers.length > 0,
      printers
    });
  } catch (err) {
    res.json({ printerConnected: false, printers: [] });
  }
});

// Print endpoint
app.post("/print", async (req, res) => {
  const { filePath } = req.body;

  if (!filePath || !fs.existsSync(filePath)) {
    return res.status(400).json({ error: "File not found on kiosk" });
  }

  try {
    await print(filePath);
    res.json({ message: "Print started" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Auto-download from backend
app.post("/download-and-print", async (req, res) => {
  const { url } = req.body;
  if (!url) return res.status(400).json({ error: "Missing URL" });

  const localPath = path.join(__dirname, "downloads", Date.now() + ".pdf");
  fs.mkdirSync(path.dirname(localPath), { recursive: true });

  const https = require("https");
  const file = fs.createWriteStream(localPath);

  https.get(url, response => {
    response.pipe(file);
    file.on("finish", async () => {
      file.close();
      try {
        await print(localPath);
        res.json({ message: "Downloaded & printed" });
      } catch (err) {
        res.status(500).json({ error: err.message });
      }
    });
  });
});

app.listen(9100, () => console.log("Kiosk Agent running on port 9100"));
