// models/contactModel.js
const db = require("../services/db");

// Récupérer tous les messages
exports.getAll = (callback) => {
  const sql = "SELECT * FROM contact ORDER BY id DESC";
  db.query(sql, callback);
};

// Créer un message de contact
exports.create = (data, callback) => {
  const sql = "INSERT INTO contact (nom, email, message) VALUES (?, ?, ?)";
  db.query(sql, [data.nom, data.email, data.message], callback);
};
