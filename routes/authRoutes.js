// routes/authRoutes.js
const express = require("express");
const router = express.Router();
const authController = require("../controllers/authController");

// ✅ Auth
router.post("/register", authController.register);
router.post("/login", authController.login);
router.post("/verify", authController.verifyCode);
router.post("/resend-code", authController.resendCode);

// ✅ Forgot / Reset password
router.post("/forgot-password", authController.forgotPassword);
router.get("/reset-password/:token", authController.renderResetPasswordPage);
router.post("/reset-password/:token", authController.resetPassword);

module.exports = router;
