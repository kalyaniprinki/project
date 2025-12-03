const express = require("express");
const cors = require("cors");
const fs = require("fs");
const path = require("path");
const https = require("https");
const os = require("os");
const { exec } = require("child_process");

const app = express();
app.use(cors());
app.use(express.json());

let detectedPrinter = null;

// ---------------------------------------------
// FUNCTION: Get USB printers using WMIC (CMD)
// ---------------------------------------------
function getUsbPrinters() {
  return new Promise((resolve, reject) => {
    exec('wmic printer get Name,PortName', (err, stdout) => {
      if (err) return reject(err);

      const lines = stdout.split("\n").slice(1);

      const printers = lines
        .map(line => line.trim().split(/\s{2,}/))
        .filter(arr => arr.length >= 2)
        .map(arr => ({
          Name: arr[0],
          PortName: arr[1]
        }))
        .filter(p =>
          p.PortName &&
          p.PortName.toUpperCase().startsWith("USB") &&
          !p.Name.toLowerCase().includes("pdf")
        );

      resolve(printers);
    });
  });
}

// ---------------------------------------------
// AUTO-DETECT PRINTER ON STARTUP
// ---------------------------------------------
async function detectPrinterOnStart() {
  try {
    const printers = await getUsbPrinters();

    if (printers.length === 0) {
      console.log("⚠ No USB printer detected at startup.");
      detectedPrinter = null;
      return;
    }

    detectedPrinter = printers[0].Name;

    console.log("🖨 Connected USB Printer Detected at Startup:");
    console.log("➡", detectedPrinter);

  } catch (err) {
    console.log("❌ Failed to detect printers:", err.message);
  }
}

// Call once on startup
detectPrinterOnStart();

// ---------------------------------------------
// STATUS: Check connected USB printers
// ---------------------------------------------
app.get("/status", async (req, res) => {
  try {
    const printers = await getUsbPrinters();
    const connected = printers.length > 0;

    if (connected) detectedPrinter = printers[0].Name;

    res.json({
      printerConnected: connected,
      printer: detectedPrinter,
      printers
    });
  } catch (err) {
    res.json({ printerConnected: false, error: err.message });
  }
});

// ---------------------------------------------
// PRINT — Direct Print w/out Popup
// ---------------------------------------------
app.post("/print", async (req, res) => {
  const { filePath } = req.body;

  if (!filePath)
    return res.status(400).json({ error: "PDF URL required" });

  try {
    const printers = await getUsbPrinters();
    if (printers.length === 0)
      return res.status(500).json({ error: "No USB printer detected" });

    const printerName = printers[0].Name;
    detectedPrinter = printerName;

    console.log("🖨 Using Printer:", printerName);

    const tempPath = path.join(os.tmpdir(), "kiosk-print");
    fs.mkdirSync(tempPath, { recursive: true });

    const localFile = path.join(tempPath, `${Date.now()}.pdf`);

    console.log("⬇ Downloading PDF:", filePath);

    await new Promise((resolve, reject) => {
      const file = fs.createWriteStream(localFile);
      https.get(filePath, response => {
        response.pipe(file);
        file.on("finish", () => file.close(resolve));
      }).on("error", reject);
    });

    // console.log("📄 Download completed. Sending to printer...");

    // Direct print — NO POPUP — NO POWERSELL — NO pdf-to-printer
    console.log("📄 Download completed. Sending to printer...");

// === SILENT CANON PRINT (GDI Method) ===
const printCmd = `powershell -command "Start-Process -FilePath '${localFile}' -Verb Print"`;

// Execute the print command
exec(printCmd, (err, stdout, stderr) => {
  if (err) {
    console.error("❌ PowerShell GDI Print Error:", err);
    return res.status(500).json({ error: "Print failed" });
  }

  console.log("✅ Canon GDI Print Triggered Successfully (NO popups)");
  return res.json({ success: true, message: "Print started" });
});



          } catch (err) {
            console.error("❌ Print Error:", err);
            res.status(500).json({ error: err.message });
          }
        });

// ---------------------------------------------
// START SERVER
// ---------------------------------------------
app.listen(9100, () => {
  console.log("🖨 Kiosk USB Agent running on port 9100");
  console.log("⏳ Detecting printer...");
});
