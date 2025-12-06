// controllers/eventController.js
const EventModel = require("../models/eventModel");
const AuthModel = require("../models/authModel");        
const db = require("../services/db");                  
const { geocodeAdresse } = require("../services/geocode"); 
const path = require("path");

const BASE_URL = "http://localhost:3000";

//  Récupérer tous les événements
exports.getAllEvents = (req, res) => {
  EventModel.getAll((err, results) => {
    if (err) return res.status(500).json({ error: err.message });

    // Headers pour React-Admin
    res.setHeader("Access-Control-Expose-Headers", "Content-Range");
    res.setHeader("Content-Range", `events 0-${results.length}/${results.length}`);

    res.status(200).json(results);
  });
};

//  Récupérer un seul événement
exports.getEventById = (req, res) => {
  const { id } = req.params;
  EventModel.getById(id, (err, results) => {
    if (err) return res.status(500).json({ error: err.message });
    if (results.length === 0)
      return res.status(404).json({ message: "Événement non trouvé" });
    res.status(200).json(results[0]);
  });
};

//  Créer un événement (avec géocodage de location + city)
exports.createEvent = async (req, res) => {
  try {
    const data = { ...req.body };

    // Gestion image uploadée
    if (req.file) {
      data.image_url = `${BASE_URL}/uploads/events/${req.file.filename}`;
    }

    // On s'assure que location et city existent au moins
    const location = data.location || "";
    const city = data.city || "";

    // Adresse complète pour le géocodage
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
      // On ne bloque pas la création si le géocodage échoue
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

//  Mettre à jour un événement (en régénérant éventuellement les coordonnées)
exports.updateEvent = async (req, res) => {
  try {
    const { id } = req.params;
    const data = { ...req.body };

    if (req.file) {
      data.image_url = `${BASE_URL}/uploads/events/${req.file.filename}`;
    }

    // Si location ou city ont changé, on peut regéocoder
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
      if (result.affectedRows === 0)
        return res.status(404).json({ message: "Événement non trouvé" });

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

//  Supprimer un événement
exports.deleteEvent = (req, res) => {
  const { id } = req.params;
  EventModel.delete(id, (err, result) => {
    if (err) return res.status(500).json({ error: err.message });
    if (result.affectedRows === 0)
      return res.status(404).json({ message: "Événement non trouvé" });
    res.json({ message: "Événement supprimé avec succès" });
  });
};


// ✅ Récupérer les 10 événements les plus proches d'un utilisateur
exports.getNearbyEventsForUser = (req, res) => {
  // On accepte mail en query, params ou body pour être safe
  const mail =
    (req.query && req.query.mail) ||
    (req.params && req.params.mail) ||
    (req.body && req.body.mail);

  if (!mail || mail.trim() === "") {
    return res.status(400).json({
      error: "Le mail de l'utilisateur est requis",
      debug: {
        query: req.query,
        params: req.params,
      },
    });
  }

  // 1️⃣ Récupérer l'utilisateur pour avoir latitude / longitude
  AuthModel.findByEmail(mail, (err, users) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!users.length) {
      return res.status(404).json({ error: "Utilisateur introuvable" });
    }

    const user = users[0];

    if (!user.latitude || !user.longitude) {
      return res.status(400).json({
        error: "Aucune coordonnée géographique pour cet utilisateur",
      });
    }

    const { latitude, longitude } = user;

    // 2️⃣ Requête SQL pour récupérer les 10 events les plus proches
    const sql = `
      SELECT 
        id,
        title,
        description,
        date_event,
        time_event,
        location,
        city,
        image_url,
        ticket_url,
        event_type,
        latitude,
        longitude,
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

    db.query(sql, [latitude, longitude, latitude], (err2, events) => {
      if (err2) return res.status(500).json({ error: err2.message });
      return res.json(events);
    });
  });
};
