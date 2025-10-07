// routes/authRoutes.js
const express = require("express");
const router = express.Router();
const authController = require("../controllers/authController");

// Authentification
router.post("/register", authController.register);
router.post("/login", authController.login);
router.post("/verify", authController.verifyCode); 
router.post("/resend-code", authController.resendCode);

module.exports = router;
