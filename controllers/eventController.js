// controllers/eventController.js
const EventModel = require("../models/eventModel");
const path = require("path");
const BASE_URL = "http://localhost:3000";

// ✅ Récupérer tous les événements
exports.getAllEvents = (req, res) => {
  EventModel.getAll((err, results) => {
    if (err) return res.status(500).json({ error: err.message });

    //  Headers pour React-Admin
    res.setHeader("Access-Control-Expose-Headers", "Content-Range");
    res.setHeader("Content-Range", `events 0-${results.length}/${results.length}`);

    res.status(200).json(results);
  });
};

// ✅ Récupérer un seul événement
exports.getEventById = (req, res) => {
  const { id } = req.params;
  EventModel.getById(id, (err, results) => {
    if (err) return res.status(500).json({ error: err.message });
    if (results.length === 0)
      return res.status(404).json({ message: "Événement non trouvé" });
    res.status(200).json(results[0]);
  });
};

// ✅ Créer un événement (avec gestion image uploadée)
exports.createEvent = (req, res) => {
  try {
    const data = { ...req.body };

    //  Cas fichier uploadé
if (req.file) {
  data.image_url = `${BASE_URL}/uploads/events/${req.file.filename}`;
}

    EventModel.create(data, (err, result) => {
      if (err) return res.status(500).json({ error: err.message });

      res.status(201).json({
        message: "Événement créé avec succès",
        id: result.insertId,
        image_url: data.image_url || null,
      });
    });
  } catch (err) {
    console.error("Erreur création event:", err);
    res.status(500).json({ error: "Erreur interne lors de la création" });
  }
};

// ✅ Mettre à jour un événement (avec gestion image uploadée)
exports.updateEvent = (req, res) => {
  try {
    const { id } = req.params;
    const data = { ...req.body };

    //  Cas fichier uploadé
    if (req.file) {
      data.image_url = `/uploads/events/${req.file.filename}`;
    }

    EventModel.update(id, data, (err, result) => {
      if (err) return res.status(500).json({ error: err.message });
      if (result.affectedRows === 0)
        return res.status(404).json({ message: "Événement non trouvé" });

      res.json({
        message: "Événement mis à jour avec succès",
        image_url: data.image_url || null,
      });
    });
  } catch (err) {
    console.error("Erreur update event:", err);
    res.status(500).json({ error: "Erreur interne lors de la mise à jour" });
  }
};

// Supprimer un événement
exports.deleteEvent = (req, res) => {
  const { id } = req.params;
  EventModel.delete(id, (err, result) => {
    if (err) return res.status(500).json({ error: err.message });
    if (result.affectedRows === 0)
      return res.status(404).json({ message: "Événement non trouvé" });
    res.json({ message: "Événement supprimé avec succès" });
  });
};
