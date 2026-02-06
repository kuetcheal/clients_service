// models/clientModel.js
const pool = require("../services/db");

const ClientModel = {
  getAll: (callback) => {
    pool
      .query("SELECT * FROM client")
      .then(([rows]) => callback(null, rows))
      .catch((err) => callback(err));
  },

  getById: (id, callback) => {
    pool
      .query("SELECT * FROM client WHERE id = ?", [id])
      .then(([rows]) => callback(null, rows))
      .catch((err) => callback(err));
  },

  create: (data, callback) => {
    // data = {nom, mail, numero_telephone, password, ...}
    pool
      .query("INSERT INTO client SET ?", [data])
      .then(([result]) => callback(null, result))
      .catch((err) => callback(err));
  },

  update: (id, data, callback) => {
    pool
      .query("UPDATE client SET ? WHERE id = ?", [data, id])
      .then(([result]) => callback(null, result))
      .catch((err) => callback(err));
  },

  delete: (id, callback) => {
    pool
      .query("DELETE FROM client WHERE id = ?", [id])
      .then(([result]) => callback(null, result))
      .catch((err) => callback(err));
  },
};

module.exports = ClientModel;
