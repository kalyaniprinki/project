const mongoose = require("mongoose");

const UserSchema = new mongoose.Schema({
  name: String,
  email: { type: String, unique: true },
  password: String,
  wallet: { type: Number, default: 0 },
  connectedKiosk: { type: String, default: null }
});

module.exports = mongoose.model("User", UserSchema);
