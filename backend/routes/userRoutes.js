
const express = require("express");
const router = express.Router();
const userController = require("../controllers/userController");
const auth = require("../middleware/auth");

// Auth routes
router.post("/login", userController.login);
router.post("/register", userController.register);

// Protected routes
router.get("/dashboard", auth, userController.getDashboard);
router.post("/wallet/add", auth, userController.addWalletBalance);
router.post("/kiosk/connect", auth, userController.connectKiosk);
router.post("/kiosk/disconnect", auth, userController.disconnectKiosk);
router.get("/files", auth, userController.getFiles);
router.post("/upload",
  auth,
  userController.upload,      // multer middleware
  userController.uploadFile   // controller function
);
router.post("/print", auth, userController.printFile);

module.exports = router;

