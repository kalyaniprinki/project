const Admin = require("../models/Admin");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

// REGISTER
exports.registerAdmin = async (req, res) => {
  try {
    const { username, email, password } = req.body;

    let exists = await Admin.findOne({ email });
    if (exists)
      return res.json({ success: false, message: "Email already registered" });

    const hashedPass = await bcrypt.hash(password, 10);

    const admin = await Admin.create({
      username,
      email,
      password: hashedPass,
    });

    res.json({
      success: true,
      message: "Admin registered successfully",
      admin: { id: admin._id, username: admin.username },
    });
  } catch (error) {
    console.log("Register Error:", error);
    res.json({ success: false, message: "Server Error" });
  }
};

// LOGIN
exports.loginAdmin = async (req, res) => {
  try {
    const { username, password } = req.body;

    let admin = await Admin.findOne({ username });
    if (!admin)
      return res.json({ success: false, message: "Admin not found" });

    const isMatch = await bcrypt.compare(password, admin.password);
    if (!isMatch)
      return res.json({ success: false, message: "Incorrect password" });

    const token = jwt.sign(
      { id: admin._id },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    res.json({
      success: true,
      message: "Login successful",
      token,
      admin: { id: admin._id, username: admin.username },
    });
  } catch (error) {
    console.log("Login Error:", error);
    res.json({ success: false, message: "Server Error" });
  }
};
