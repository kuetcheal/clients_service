// controllers/eventController.js
const EventModel = require("../models/eventModel");
const AuthModel = require("../models/authModel");
const pool = require("../services/db"); // ✅ pool mysql2/promise
const { geocodeAdresse } = require("../services/geocode");

const BASE_URL = "http://localhost:3000";

// ✅ Récupérer tous les événements
exports.getAllEvents = (req, res) => {
  EventModel.getAll((err, results) => {
    if (err) return res.status(500).json({ error: err.message });

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
    if (results.length === 0) return res.status(404).json({ message: "Événement non trouvé" });

    res.status(200).json(results[0]);
  });
};

// ✅ Créer un événement (avec géocodage)
exports.createEvent = async (req, res) => {
  try {
    const data = { ...req.body };

    if (req.file) {
      data.image_url = `${BASE_URL}/uploads/events/${req.file.filename}`;
    }

    const location = data.location || "";
    const city = data.city || "";
    const adresseComplete = `${location}, ${city}, France`;

    let latitude = null;
    let longitude = null;

    try {
      const coords = await geocodeAdresse(adresseComplete);
      if (coords) {
        latitude = coords.latitude;
        longitude = coords.longitude;
      }
    } catch (e) {
      console.error("Erreur géocodage event :", e.message);
    }

    data.latitude = latitude;
    data.longitude = longitude;

    EventModel.create(data, (err, result) => {
      if (err) return res.status(500).json({ error: err.message });

      res.status(201).json({
        message: "Événement créé avec succès",
        id: result.insertId,
        image_url: data.image_url || null,
        latitude,
        longitude,
      });
    });
  } catch (err) {
    console.error("Erreur création event:", err);
    res.status(500).json({ error: "Erreur interne lors de la création" });
  }
};

// ✅ Mettre à jour un événement
exports.updateEvent = async (req, res) => {
  try {
    const { id } = req.params;
    const data = { ...req.body };

    if (req.file) {
      data.image_url = `${BASE_URL}/uploads/events/${req.file.filename}`;
    }

    if (data.location || data.city) {
      const location = data.location || "";
      const city = data.city || "";
      const adresseComplete = `${location}, ${city}, France`;

      let latitude = null;
      let longitude = null;

      try {
        const coords = await geocodeAdresse(adresseComplete);
        if (coords) {
          latitude = coords.latitude;
          longitude = coords.longitude;
        }
      } catch (e) {
        console.error("Erreur géocodage event (update):", e.message);
      }

      data.latitude = latitude;
      data.longitude = longitude;
    }

    EventModel.update(id, data, (err, result) => {
      if (err) return res.status(500).json({ error: err.message });
      if (result.affectedRows === 0) {
        return res.status(404).json({ message: "Événement non trouvé" });
      }

      res.json({
        message: "Événement mis à jour avec succès",
        image_url: data.image_url || null,
        latitude: data.latitude || null,
        longitude: data.longitude || null,
      });
    });
  } catch (err) {
    console.error("Erreur update event:", err);
    res.status(500).json({ error: "Erreur interne lors de la mise à jour" });
  }
};

// ✅ Supprimer un événement
exports.deleteEvent = (req, res) => {
  const { id } = req.params;

  EventModel.delete(id, (err, result) => {
    if (err) return res.status(500).json({ error: err.message });
    if (result.affectedRows === 0) return res.status(404).json({ message: "Événement non trouvé" });

    res.json({ message: "Événement supprimé avec succès" });
  });
};

// ✅ Récupérer les 10 événements les plus proches d'un utilisateur
exports.getNearbyEventsForUser = (req, res) => {
  const mail =
    (req.query && req.query.mail) ||
    (req.params && req.params.mail) ||
    (req.body && req.body.mail);

  if (!mail || mail.trim() === "") {
    return res.status(400).json({
      error: "Le mail de l'utilisateur est requis",
      debug: { query: req.query, params: req.params },
    });
  }

  AuthModel.findByEmail(mail, async (err, users) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!users.length) return res.status(404).json({ error: "Utilisateur introuvable" });

    const user = users[0];

    if (!user.latitude || !user.longitude) {
      return res.status(400).json({
        error: "Aucune coordonnée géographique pour cet utilisateur",
      });
    }

    const { latitude, longitude } = user;

    const sql = `
      SELECT 
        id, title, description, date_event, time_event,
        location, city, image_url, ticket_url, event_type,
        latitude, longitude,
        (6371 * acos(
          cos(radians(?)) * cos(radians(latitude)) *
          cos(radians(longitude) - radians(?)) +
          sin(radians(?)) * sin(radians(latitude))
        )) AS distance
      FROM event
      WHERE latitude IS NOT NULL AND longitude IS NOT NULL
      HAVING distance IS NOT NULL
      ORDER BY distance
      LIMIT 10;
    `;

    try {
      const [rows] = await pool.query(sql, [latitude, longitude, latitude]);
      return res.json(rows);
    } catch (err2) {
      return res.status(500).json({ error: err2.message });
    }
  });
};
