// models/authModel.js
const pool = require("../services/db");
const bcrypt = require("bcrypt");

const AuthModel = {
  register: async (
    {
      nom,
      mail,
      numero_telephone,
      password,
      verification_code,
      Adresse,
      code_postal,
      latitude,
      longitude,
    },
    callback
  ) => {
    try {
      const hashedPassword = await bcrypt.hash(password, 10);

      const sql = `
        INSERT INTO client
        (nom, mail, numero_telephone, password, verification_code, verified, Adresse, code_postal, latitude, longitude)
        VALUES (?, ?, ?, ?, ?, false, ?, ?, ?, ?)
      `;

      const values = [
        nom,
        mail,
        numero_telephone,
        hashedPassword,
        verification_code,
        Adresse,
        code_postal,
        latitude,
        longitude,
      ];

      pool
        .query(sql, values)
        .then(([result]) => callback(null, result))
        .catch((err) => callback(err));
    } catch (err) {
      return callback(err);
    }
  },

  findByEmail: (mail, callback) => {
    const sql = `
      SELECT *
      FROM client
      WHERE LOWER(TRIM(mail)) = LOWER(TRIM(?))
      LIMIT 1
    `;

    pool
      .query(sql, [mail])
      .then(([rows]) => callback(null, rows))
      .catch((err) => callback(err));
  },

  markAsVerified: (mail, callback) => {
    const sql =
      "UPDATE client SET verified = true, verification_code = NULL WHERE mail = ?";
    pool
      .query(sql, [mail])
      .then(([result]) => callback(null, result))
      .catch((err) => callback(err));
  },

  updateVerificationCode: (mail, newCode, callback) => {
    const sql = "UPDATE client SET verification_code = ? WHERE mail = ?";
    pool
      .query(sql, [newCode, mail])
      .then(([result]) => callback(null, result))
      .catch((err) => callback(err));
  },

  // ✅ IMPORTANT : pour reset password
  updatePasswordByEmail: (mail, hashedPassword, callback) => {
    const sql = "UPDATE client SET password = ? WHERE mail = ?";
    pool
      .query(sql, [hashedPassword, mail])
      .then(([result]) => callback(null, result))
      .catch((err) => callback(err));
  },
};

module.exports = AuthModel;
