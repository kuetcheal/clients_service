const EventModel = require('../models/eventModel');

// ✅ Récupérer tous les événements
exports.getAllEvents = (req, res) => {
  EventModel.getAll((err, results) => {
    if (err) return res.status(500).json({ error: err.message });

    // 👉 Ajout des headers pour React Admin
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
    if (results.length === 0) return res.status(404).json({ message: 'Événement non trouvé' });
    res.status(200).json(results[0]);
  });
};

// ✅ Créer un événement
exports.createEvent = (req, res) => {
  EventModel.create(req.body, (err, result) => {
    if (err) return res.status(500).json({ error: err.message });
    res.status(201).json({ message: 'Événement créé avec succès', id: result.insertId });
  });
};

// ✅ Mettre à jour un événement
exports.updateEvent = (req, res) => {
  const { id } = req.params;
  EventModel.update(id, req.body, (err, result) => {
    if (err) return res.status(500).json({ error: err.message });
    if (result.affectedRows === 0) return res.status(404).json({ message: 'Événement non trouvé' });
    res.json({ message: 'Événement mis à jour avec succès' });
  });
};

// ✅ Supprimer un événement
exports.deleteEvent = (req, res) => {
  const { id } = req.params;
  EventModel.delete(id, (err, result) => {
    if (err) return res.status(500).json({ error: err.message });
    if (result.affectedRows === 0) return res.status(404).json({ message: 'Événement non trouvé' });
    res.json({ message: 'Événement supprimé avec succès' });
  });
};
