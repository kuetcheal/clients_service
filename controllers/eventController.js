// controllers/eventController.js
const EventModel = require("../models/eventModel");
const AuthModel = require("../models/authModel");
const pool = require("../services/db");
const { geocodeAdresse } = require("../services/geocode");


const emptyToNull = (v) => {
  if (v === undefined || v === null) return null;
  if (typeof v === "string" && v.trim() === "") return null;
  return v;
};

const toNumberOrNull = (v) => {
  const cleaned = emptyToNull(v);
  if (cleaned === null) return null;
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : null;
};

const normalizeEventPayload = (body) => {
  const data = { ...body };

  // Strings / nullable strings
  data.title = emptyToNull(data.title);
  data.description = emptyToNull(data.description);
  data.location = emptyToNull(data.location);
  data.city = emptyToNull(data.city);
  data.ticket_url = emptyToNull(data.ticket_url);
  data.event_type = emptyToNull(data.event_type);

  // Date & time (si vide -> null)
  data.date_event = emptyToNull(data.date_event);
  data.time_event = emptyToNull(data.time_event);

  // Doubles ("" -> null / "43.6" -> 43.6)
  data.latitude = toNumberOrNull(data.latitude);
  data.longitude = toNumberOrNull(data.longitude);

  return data;
};

//  Récupérer tous les événements
exports.getAllEvents = (req, res) => {
  EventModel.getAll((err, results) => {
    if (err) return res.status(500).json({ error: err.message });

    res.setHeader("Access-Control-Expose-Headers", "Content-Range");
    res.setHeader(
      "Content-Range",
      `events 0-${results.length}/${results.length}`
    );

    res.status(200).json(results);
  });
};

//  Récupérer un seul événement
exports.getEventById = (req, res) => {
  const { id } = req.params;

  EventModel.getById(id, (err, results) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!results.length)
      return res.status(404).json({ message: "Événement non trouvé" });

    res.status(200).json(results[0]);
  });
};

//  Créer un événement (Cloudinary + géocodage)
exports.createEvent = async (req, res) => {
  try {
    const data = normalizeEventPayload(req.body);

    //  image Cloudinary (multer-storage-cloudinary)
    if (req.file) {
      data.image_url = req.file.path || req.file.secure_url || null;
    } else {
      data.image_url = emptyToNull(data.image_url);
    }

    //  Validation minimale (car en DB : NOT NULL sur title/date/time/location)
    if (!data.title || !data.date_event || !data.time_event || !data.location) {
      return res.status(400).json({
        error: "Champs obligatoires: title, date_event, time_event, location",
      });
    }

    //  Géocodage seulement si coords pas fournies
    if (data.latitude == null || data.longitude == null) {
      const location = data.location || "";
      const city = data.city || "";
      const adresseComplete = `${location}, ${city}, France`;

      try {
        const coords = await geocodeAdresse(adresseComplete);
        if (coords) {
          data.latitude = coords.latitude ?? data.latitude;
          data.longitude = coords.longitude ?? data.longitude;
        }
      } catch (e) {
        console.error("Erreur géocodage event :", e.message);
      }
    }

    EventModel.create(data, (err, result) => {
      if (err) return res.status(500).json({ error: err.message });

      res.status(201).json({
        message: "Événement créé avec succès",
        id: result.insertId,
        image_url: data.image_url || null,
        latitude: data.latitude ?? null,
        longitude: data.longitude ?? null,
      });
    });
  } catch (err) {
    console.error("Erreur création event:", err);
    res.status(500).json({ error: "Erreur interne lors de la création" });
  }
};

// Mettre à jour un événement (Cloudinary + géocodage si besoin)
exports.updateEvent = async (req, res) => {
  try {
    const { id } = req.params;
    const data = normalizeEventPayload(req.body);

    //  image Cloudinary
    if (req.file) {
      data.image_url = req.file.path || req.file.secure_url || null;
    } else {
      data.image_url = emptyToNull(data.image_url);
    }

    // Regéocoder seulement si location/city changent ET coords absentes/inutilisables
    if (
      (data.location || data.city) &&
      (data.latitude == null || data.longitude == null)
    ) {
      const location = data.location || "";
      const city = data.city || "";
      const adresseComplete = `${location}, ${city}, France`;

      try {
        const coords = await geocodeAdresse(adresseComplete);
        if (coords) {
          data.latitude = coords.latitude ?? data.latitude;
          data.longitude = coords.longitude ?? data.longitude;
        }
      } catch (e) {
        console.error("Erreur géocodage event (update):", e.message);
      }
    }

    EventModel.update(id, data, (err, result) => {
      if (err) return res.status(500).json({ error: err.message });
      if (result.affectedRows === 0) {
        return res.status(404).json({ message: "Événement non trouvé" });
      }

      res.json({
        message: "Événement mis à jour avec succès",
        image_url: data.image_url || null,
        latitude: data.latitude ?? null,
        longitude: data.longitude ?? null,
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

//  Récupérer les 10 événements les plus proches d'un utilisateur (<= 25km)
exports.getNearbyEventsForUser = (req, res) => {
  const mail =
    (req.query && req.query.mail) ||
    (req.params && req.params.mail) ||
    (req.body && req.body.mail);

  //  rayon paramétrable, par défaut 25km
  const radiusKmRaw = (req.query && req.query.radiusKm) || "25";
  const radiusKm = Number(radiusKmRaw);
  const maxRadiusKm = Number.isFinite(radiusKm) ? radiusKm : 25;

  if (!mail || mail.trim() === "") {
    return res.status(400).json({
      error: "Le mail de l'utilisateur est requis",
      debug: { query: req.query, params: req.params },
    });
  }

  AuthModel.findByEmail(mail, async (err, users) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!users.length)
      return res.status(404).json({ error: "Utilisateur introuvable" });

    const user = users[0];

    const latitude = Number(user.latitude);
    const longitude = Number(user.longitude);

    if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
      return res.status(400).json({
        error: "Aucune coordonnée géographique valide pour cet utilisateur",
      });
    }

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
      HAVING distance IS NOT NULL AND distance <= ?
      ORDER BY distance
      LIMIT 10;
    `;

    try {
      const [rows] = await pool.query(sql, [
        latitude,
        longitude,
        latitude,
        maxRadiusKm,
      ]);
      return res.json(rows);
    } catch (err2) {
      return res.status(500).json({ error: err2.message });
    }
  });
};


// ✅ Récupérer les events proches à partir de coordonnées (lat/lng) (<= radiusKm)
exports.getNearbyEventsByCoords = async (req, res) => {
  const latRaw = req.query?.lat;
  const lngRaw = req.query?.lng;

  // rayon paramétrable, par défaut 25km
  const radiusKmRaw = req.query?.radiusKm || "25";
  const radiusKm = Number(radiusKmRaw);
  const maxRadiusKm = Number.isFinite(radiusKm) ? radiusKm : 25;

  const latitude = Number(latRaw);
  const longitude = Number(lngRaw);

  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
    return res.status(400).json({
      error: "lat et lng requis (numériques)",
      debug: { lat: latRaw, lng: lngRaw },
    });
  }

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
    HAVING distance IS NOT NULL AND distance <= ?
    ORDER BY distance
    LIMIT 10;
  `;

  try {
    const [rows] = await pool.query(sql, [latitude, longitude, latitude, maxRadiusKm]);
    return res.json(rows);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};
