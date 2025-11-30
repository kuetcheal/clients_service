// routes/contactRoutes.js
const express = require("express");
const router = express.Router();
const contactController = require("../controllers/contactController");

// POST /api/contact
router.post("/", contactController.createContact);

// GET /api/contact (optionnel pour voir tous les messages)
router.get("/", contactController.getAllContacts);

module.exports = router;
