const db = require('../services/db');

const ClientModel = {
  getAll: (callback) => {
    db.query('SELECT * FROM client', callback);
  },

  getById: (id, callback) => {
    db.query('SELECT * FROM client WHERE id = ?', [id], callback);
  },

  create: (data, callback) => {
    // ⚠️ Vérifie que data contient bien {nom, mail, numero_telephone, password}
    db.query('INSERT INTO client SET ?', data, callback);
  },

  update: (id, data, callback) => {
    db.query('UPDATE client SET ? WHERE id = ?', [data, id], callback);
  },

  delete: (id, callback) => {
    db.query('DELETE FROM client WHERE id = ?', [id], callback);
  }
};

module.exports = ClientModel;
