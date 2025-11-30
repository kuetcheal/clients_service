// models/eventModel.js
const db = require('../services/db');

const EventModel = {
  // ✅ Récupérer tous les événements
  getAll: (callback) => {
    db.query('SELECT * FROM event ORDER BY date_event ASC', callback);
  },

  // ✅ Récupérer un seul événement
  getById: (id, callback) => {
    db.query('SELECT * FROM event WHERE id = ?', [id], callback);
  },

  // ✅ Créer un événement
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
    } = data;

    db.query(
      `INSERT INTO event (title, description, date_event, time_event, location, city, image_url, ticket_url, event_type)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        title,
        description,
        date_event,
        time_event,
        location,
        city,
        image_url,
        ticket_url,
        event_type,
      ],
      callback
    );
  },

  // ✅ Mettre à jour un événement
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
    } = data;

    db.query(
      `UPDATE event
       SET title = ?, description = ?, date_event = ?, time_event = ?, location = ?, city = ?, image_url = ?, ticket_url = ?, event_type = ?
       WHERE id = ?`,
      [
        title,
        description,
        date_event,
        time_event,
        location,
        city,
        image_url,
        ticket_url,
        event_type,
        id,
      ],
      callback
    );
  },

  // ✅ Supprimer un événement
  delete: (id, callback) => {
    db.query('DELETE FROM event WHERE id = ?', [id], callback);
  },
};

module.exports = EventModel;
