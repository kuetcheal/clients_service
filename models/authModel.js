// models/authModel.js
const db = require("../services/db");
const bcrypt = require("bcrypt");

const AuthModel = {
  /**
   * ✅ Inscription avec code de vérification
   */
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

  /**
   * ✅ Recherche d’un utilisateur par adresse e-mail
   */
  findByEmail: (mail, callback) => {
    const sql = "SELECT * FROM client WHERE mail = ? LIMIT 1";
    db.query(sql, [mail], (err, rows) => {
      if (err) return callback(err);
      return callback(null, rows);
    });
  },

  /**
   * ✅ Marquer un utilisateur comme vérifié
   */
  markAsVerified: (mail, callback) => {
    const sql = "UPDATE client SET verified = true, verification_code = NULL WHERE mail = ?";
    db.query(sql, [mail], (err, result) => {
      if (err) return callback(err);
      return callback(null, result);
    });
  },

  /**
   * ✅ Mettre à jour le code de vérification (pour resendCode)
   */
  updateVerificationCode: (mail, newCode, callback) => {
    const sql = "UPDATE client SET verification_code = ? WHERE mail = ?";
    db.query(sql, [newCode, mail], (err, result) => {
      if (err) return callback(err);
      return callback(null, result);
    });
  },
};

module.exports = AuthModel;
