// models/eventModel.js
const db = require('../services/db');

const EventModel = {
  //  Récupérer tous les événements
  getAll: (callback) => {
    db.query('SELECT * FROM event ORDER BY date_event ASC', callback);
  },

  //  Récupérer un seul événement
  getById: (id, callback) => {
    db.query('SELECT * FROM event WHERE id = ?', [id], callback);
  },

  //  Créer un événement (ENREGISTRE latitude + longitude)
  create: (data, callback) => {
    const {
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
    } = data;

    db.query(
      `
      INSERT INTO event (
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
        longitude
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `,
      [
        title || null,
        description || null,
        date_event || null,
        time_event || null,
        location || null,
        city || null,
        image_url || null,
        ticket_url || null,
        event_type || null,
        latitude || null,
        longitude || null
      ],
      callback
    );
  },

  //  Mettre à jour un événement (INCLUT latitude + longitude)
  update: (id, data, callback) => {
    const {
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
    } = data;

    db.query(
      `
      UPDATE event
      SET 
        title = ?, 
        description = ?, 
        date_event = ?, 
        time_event = ?, 
        location = ?, 
        city = ?, 
        image_url = ?, 
        ticket_url = ?, 
        event_type = ?,
        latitude = ?,
        longitude = ?
      WHERE id = ?
      `,
      [
        title || null,
        description || null,
        date_event || null,
        time_event || null,
        location || null,
        city || null,
        image_url || null,
        ticket_url || null,
        event_type || null,
        latitude || null,
        longitude || null,
        id
      ],
      callback
    );
  },

  //  Supprimer un événement
  delete: (id, callback) => {
    db.query('DELETE FROM event WHERE id = ?', [id], callback);
  },
};

module.exports = EventModel;
