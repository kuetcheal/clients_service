// models/authModel.js
const db = require('../services/db');
const bcrypt = require('bcrypt');

const AuthModel = {
  // ✅ Inscription
  register: async ({ nom, mail, numero_telephone, password }, callback) => {
    try {
      const hashedPassword = await bcrypt.hash(password, 10);

      db.query(
        'INSERT INTO client (nom, mail, numero_telephone, password) VALUES (?, ?, ?, ?)',
        [nom, mail, numero_telephone, hashedPassword],
        (err, result) => {
          if (err) return callback(err);
          return callback(null, result); 
        }
      );
    } catch (err) {
      return callback(err);
    }
  },

  // ✅ Recherche par mail (pour la connexion)
  findByEmail: (mail, callback) => {
    db.query(
      'SELECT * FROM client WHERE mail = ? LIMIT 1',
      [mail],
      (err, rows) => {
        if (err) return callback(err);
        return callback(null, rows); 
      }
    );
  },
};

module.exports = AuthModel;
