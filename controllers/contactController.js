// controllers/contactController.js
const ContactModel = require("../models/contactModel");

// ✅ Récupérer tous les messages (optionnel, pour admin)
exports.getAllContacts = (req, res) => {
  ContactModel.getAll((err, results) => {
    if (err) return res.status(500).json({ error: err.message });
    res.status(200).json(results);
  });
};

// ✅ Créer un message de contact (appelé par Flutter)
exports.createContact = (req, res) => {
  const { nom, email, message } = req.body;

  if (!nom || !email || !message) {
    return res.status(400).json({ message: "Champs manquants" });
  }

  const data = { nom, email, message };

  ContactModel.create(data, (err, result) => {
    if (err) return res.status(500).json({ error: err.message });

    res.status(201).json({
      message: "Message enregistré avec succès",
      contactId: result.insertId,
    });
  });
};
