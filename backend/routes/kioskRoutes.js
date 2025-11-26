const express = require("express");
const router = express.Router();
const kioskController = require("../controllers/kioskController");
const kioskAgentController = require("../controllers/kioskAgentController");


router.post("/login", kioskController.login);
router.post("/register", kioskController.register);

router.post("/connect", kioskController.connectUser);
router.post("/disconnect", kioskController.disconnect);

// router.get("/file/:fileId", kioskController.getFile);


// NEW — dashboard polling
router.get("/status/:kioskId", kioskController.getStatus);

// FOR DASHBOARD
// router.get("/status/:kioskId", kioskController.getStatus);

// NEW — KIOSK AGENT
router.post("/agent/connect", kioskAgentController.connectAgent);
router.get("/:kioskId/printer-status", kioskAgentController.getPrinterStatus);
router.post("/:kioskId/print", kioskAgentController.sendPrint);

module.exports = router;
