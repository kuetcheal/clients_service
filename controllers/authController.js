// controllers/authController.js
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const AuthModel = require('../models/authModel');
const { sendMail } = require('../services/mailer');

const SECRET = process.env.JWT_SECRET;

// ✅ INSCRIPTION AVEC CODE DE VÉRIFICATION
exports.register = async (req, res) => {
  try {
    const { nom, mail, numero_telephone, password } = req.body;

    if (!nom || !mail || !numero_telephone || !password)
      return res.status(400).json({ error: "Tous les champs sont requis" });

    // 1️⃣ Générer un code à 6 chiffres aléatoire
    const verificationCode = Math.floor(100000 + Math.random() * 900000);

    // 2️⃣ Enregistrer l'utilisateur + le code
    AuthModel.register(
      { nom, mail, numero_telephone, password, verification_code: verificationCode },
      async (err, result) => {
        if (err) return res.status(500).json({ error: err.message });

        // 3️⃣ Envoyer le code par e-mail
        const subject = "Vérification de votre compte 🎯";
        const html = `
          <h2>Bienvenue ${nom} !</h2>
          <p>Merci pour votre inscription sur notre plateforme.</p>
          <p>Voici votre code de vérification :</p>
          <h1 style="letter-spacing:5px;">${verificationCode}</h1>
          <p>Ce code expirera dans 10 minutes ⏳</p>
        `;

        try {
          await sendMail(mail, subject, html);
          console.log("📩 Code de vérification envoyé à :", mail);
        } catch (e) {
          console.error("Erreur d'envoi du mail :", e);
        }

        res.status(201).json({
          message: "Utilisateur créé, code de vérification envoyé.",
          id: result.insertId,
        });
      }
    );
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erreur serveur" });
  }
};

// ✅ VÉRIFICATION DU CODE
exports.verifyCode = (req, res) => {
  const { mail, code } = req.body;

  if (!mail || !code)
    return res.status(400).json({ error: "Mail et code requis" });

  AuthModel.findByEmail(mail, (err, results) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!results.length)
      return res.status(404).json({ error: "Utilisateur introuvable" });

    const user = results[0];

    if (user.verification_code === code) {
      // ✅ Marquer comme vérifié
      AuthModel.markAsVerified(mail, (err2) => {
        if (err2) return res.status(500).json({ error: err2.message });
        res.json({ message: "Compte vérifié avec succès 🎉" });
      });
    } else {
      res.status(400).json({ error: "Code incorrect ❌" });
    }
  });
};

// ✅ RÉENVOYER LE CODE DE VÉRIFICATION
exports.resendCode = (req, res) => {
  const { mail } = req.body;

  if (!mail)
    return res.status(400).json({ error: "L'adresse e-mail est requise" });

  AuthModel.findByEmail(mail, async (err, results) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!results.length)
      return res.status(404).json({ error: "Utilisateur introuvable" });

    const user = results[0];

    if (user.verified) {
      return res.status(400).json({ error: "Ce compte est déjà vérifié ✅" });
    }

    // 1️⃣ Nouveau code à 6 chiffres
    const newCode = Math.floor(100000 + Math.random() * 900000);

    // 2️⃣ Mettre à jour la base
    AuthModel.updateVerificationCode(mail, newCode, async (err2) => {
      if (err2) return res.status(500).json({ error: err2.message });

      // 3️⃣ Envoyer le nouveau code par e-mail
      const subject = "Nouveau code de vérification 🔁";
      const html = `
        <h2>Bonjour ${user.nom || ""},</h2>
        <p>Voici votre nouveau code de vérification :</p>
        <h1 style="letter-spacing:5px;">${newCode}</h1>
        <p>Ce code expirera dans 10 minutes ⏳</p>
      `;

      try {
        await sendMail(mail, subject, html);
        console.log("📨 Nouveau code envoyé à :", mail);
        res.json({ message: "Nouveau code envoyé avec succès ✅" });
      } catch (e) {
        console.error("Erreur d'envoi du mail :", e);
        res.status(500).json({ error: "Impossible d'envoyer l'e-mail" });
      }
    });
  });
};

// ✅ CONNEXION
exports.login = (req, res) => {
  const { mail, password } = req.body;

  if (!mail || !password)
    return res.status(400).json({ error: "Mail et mot de passe requis" });

  AuthModel.findByEmail(mail, async (err, results) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!results.length)
      return res.status(401).json({ message: "Mail invalide" });

    const user = results[0];

    // Vérifier si le compte est activé
    if (!user.verified)
      return res.status(401).json({ error: "Veuillez d'abord vérifier votre compte." });

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch)
      return res.status(401).json({ message: "Mot de passe invalide" });

    const token = jwt.sign(
      { userId: user.id, mail: user.mail },
      SECRET,
      { expiresIn: "7d" }
    );

    res.json({
      token,
      user: {
        id: user.id,
        nom: user.nom,
        mail: user.mail,
        numero_telephone: user.numero_telephone,
      },
    });
  });
};
