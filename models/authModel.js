// models/authModel.js
const db = require("../services/db");
const bcrypt = require("bcrypt");

const AuthModel = {
  // ✅ Inscription avec code de vérification
  register: async ({ nom, mail, numero_telephone, password, verification_code }, callback) => {
    try {
      const hashedPassword = await bcrypt.hash(password, 10);

      db.query(
        `INSERT INTO client (nom, mail, numero_telephone, password, verification_code, verified)
         VALUES (?, ?, ?, ?, ?, false)`,
        [nom, mail, numero_telephone, hashedPassword, verification_code],
        (err, result) => {
          if (err) return callback(err);
          return callback(null, result);
        }
      );
    } catch (err) {
      return callback(err);
    }
  },

  // ✅ Recherche par mail (pour connexion ou vérification)
  findByEmail: (mail, callback) => {
    db.query(
      "SELECT * FROM client WHERE mail = ? LIMIT 1",
      [mail],
      (err, rows) => {
        if (err) return callback(err);
        return callback(null, rows);
      }
    );
  },

  // ✅ Marquer un compte comme vérifié
  markAsVerified: (mail, callback) => {
    db.query(
      "UPDATE client SET verified = true, verification_code = NULL WHERE mail = ?",
      [mail],
      (err, result) => {
        if (err) return callback(err);
        return callback(null, result);
      }
    );
  },
};

module.exports = AuthModel;
