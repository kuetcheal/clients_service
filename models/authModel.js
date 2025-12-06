
const db = require("../services/db");
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
      longitude
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
        longitude
      ];

      db.query(sql, values, (err, result) => {
        if (err) return callback(err);
        return callback(null, result);
      });

    } catch (err) {
      return callback(err);
    }
  },


  /**
   * ✅ RECHERCHER UN UTILISATEUR PAR EMAIL
   */
// ✅ Recherche d’un utilisateur par adresse e-mail
findByEmail: (mail, callback) => {
  // Log pour debug
  console.log("🔍 findByEmail mail reçu :", `"${mail}"`);

  const sql = `
    SELECT * 
    FROM client 
    WHERE LOWER(TRIM(mail)) = LOWER(TRIM(?))
    LIMIT 1
  `;

  db.query(sql, [mail], (err, rows) => {
    if (err) {
      console.error("❌ Erreur SQL findByEmail :", err);
      return callback(err);
    }
    console.log("✅ findByEmail nb de lignes :", rows.length);
    return callback(null, rows);
  });
},



  /**
   * ✅ MARQUER L'UTILISATEUR COMME VÉRIFIÉ
   */
  markAsVerified: (mail, callback) => {
    const sql = "UPDATE client SET verified = true, verification_code = NULL WHERE mail = ?";
    db.query(sql, [mail], (err, result) => {
      if (err) return callback(err);
      return callback(null, result);
    });
  },


  /**
   * ✅ METTRE À JOUR LE CODE DE VÉRIFICATION
   */
  updateVerificationCode: (mail, newCode, callback) => {
    const sql = "UPDATE client SET verification_code = ? WHERE mail = ?";
    db.query(sql, [newCode, mail], (err, result) => {
      if (err) return callback(err);
      return callback(null, result);
    });
  }

};

module.exports = AuthModel;
