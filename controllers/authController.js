const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const AuthModel = require('../models/authModel');

const SECRET = process.env.JWT_SECRET; 

// ✅ Inscription
exports.register = async (req, res) => {
  try {
    const { nom, mail, numero_telephone, password } = req.body;

    if (!nom || !mail || !numero_telephone || !password) {
      return res.status(400).json({ error: "Tous les champs sont requis" });
    }

    AuthModel.register({ nom, mail, numero_telephone, password }, (err, result) => {
      if (err) return res.status(500).json({ error: err.message });

      res.status(201).json({ message: 'Utilisateur créé avec succès', id: result.insertId });
    });
  } catch (err) {
    res.status(500).json({ error: 'Erreur serveur' });
  }
};

// ✅ Connexion
exports.login = (req, res) => {
  const { mail, password } = req.body;

  if (!mail || !password) {
    return res.status(400).json({ error: "Mail et mot de passe requis" });
  }

  AuthModel.findByEmail(mail, async (err, results) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!results.length) return res.status(401).json({ message: 'Mail invalide' });

    const user = results[0];

    console.log("📩 Mail reçu du front:", mail);
    console.log("🔑 Mot de passe reçu du front:", password);
    console.log("🗄️ Utilisateur trouvé en DB:", user);

    // Vérification du mot de passe
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(401).json({ message: 'Mot de passe invalide' });

    // Générer un JWT
    const token = jwt.sign(
      { userId: user.id, mail: user.mail },  // ✅ remplacé email → mail
      SECRET,
      { expiresIn: '7d' } // Token valide 7 jours
    );

    res.json({
      token,
      user: {
        id: user.id,
        nom: user.nom,
        mail: user.mail,
        numero_telephone: user.numero_telephone
      }
    });
  });
};
