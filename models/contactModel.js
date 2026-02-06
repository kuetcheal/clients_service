// models/contactModel.js
const pool = require("../services/db");

// Récupérer tous les messages
exports.getAll = (callback) => {
  const sql = "SELECT * FROM contact ORDER BY id DESC";
  pool
    .query(sql)
    .then(([rows]) => callback(null, rows))
    .catch((err) => callback(err));
};

// Créer un message de contact
exports.create = (data, callback) => {
  const sql = "INSERT INTO contact (nom, email, message) VALUES (?, ?, ?)";
  pool
    .query(sql, [data.nom, data.email, data.message])
    .then(([result]) => callback(null, result))
    .catch((err) => callback(err));
};
