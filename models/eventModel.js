// models/eventModel.js
const pool = require("../services/db");

const EventModel = {
  getAll: (callback) => {
    pool
      .query("SELECT * FROM event ORDER BY date_event ASC")
      .then(([rows]) => callback(null, rows))
      .catch((err) => callback(err));
  },

  getById: (id, callback) => {
    pool
      .query("SELECT * FROM event WHERE id = ?", [id])
      .then(([rows]) => callback(null, rows))
      .catch((err) => callback(err));
  },

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

    const sql = `
      INSERT INTO event (
        title, description, date_event, time_event,
        location, city, image_url, ticket_url, event_type,
        latitude, longitude
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    pool
      .query(sql, [
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
      ])
      .then(([result]) => callback(null, result))
      .catch((err) => callback(err));
  },

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

    const sql = `
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
    `;

    pool
      .query(sql, [
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
        id,
      ])
      .then(([result]) => callback(null, result))
      .catch((err) => callback(err));
  },

  delete: (id, callback) => {
    pool
      .query("DELETE FROM event WHERE id = ?", [id])
      .then(([result]) => callback(null, result))
      .catch((err) => callback(err));
  },
};

module.exports = EventModel;
