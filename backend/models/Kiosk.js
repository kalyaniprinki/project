const mongoose = require("mongoose");

const kioskSchema = new mongoose.Schema({
  kioskId: {
    type: String,
    required: true,
    unique: true,
  },
  location: String,

  password: {
    type: String,
    required: true,
  },

  connectedUser: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    default: null,
  },

  status: {
    type: String,
    enum: ["online", "offline"],
    default: "offline",
  },

  // NEW: kiosk-agent local server URL (ex: http://192.168.1.10:9000)
  agentUrl: {
    type: String,
    default: null,
  },

  // NEW: printer connected or not
  printerConnected: {
    type: Boolean,
    default: false,
  },

  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model("Kiosk", kioskSchema);
