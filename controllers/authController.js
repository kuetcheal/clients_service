// controllers/authController.js
const jwt = require("jsonwebtoken");
const bcrypt = require("bcrypt");
const AuthModel = require("../models/authModel");
const { sendMail } = require("../services/mailer");
const { geocodeAdresse } = require("../services/geocode");

const SECRET = process.env.JWT_SECRET;

// ✅ INSCRIPTION AVEC CODE + GÉOCODAGE
exports.register = async (req, res) => {
  try {
    const { nom, mail, numero_telephone, password, Adresse, code_postal } = req.body;

    if (!nom || !mail || !numero_telephone || !password || !Adresse || !code_postal) {
      return res.status(400).json({ error: "Tous les champs sont requis" });
    }

    const verificationCode = Math.floor(100000 + Math.random() * 900000);

    const adresseComplete = `${Adresse}, ${code_postal}, France`;

    let latitude = null;
    let longitude = null;

    try {
      const coords = await geocodeAdresse(adresseComplete);
      if (coords) {
        latitude = coords.latitude;
        longitude = coords.longitude;
      }
    } catch (e) {
      console.error("Erreur lors du géocodage :", e.message);
    }

    AuthModel.register(
      {
        nom,
        mail,
        Adresse,
        code_postal,
        numero_telephone,
        password,
        verification_code: verificationCode,
        latitude,
        longitude,
      },
      async (err, result) => {
        if (err) return res.status(500).json({ error: err.message });

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
          console.log("📨 Code envoyé à :", mail);
        } catch (e) {
          console.error("Erreur envoi mail :", e);
        }

        return res.status(201).json({
          message: "Utilisateur créé, code de vérification envoyé.",
          id: result.insertId,
        });
      }
    );
  } catch (err) {
    console.error("Erreur register:", err);
    return res.status(500).json({ error: "Erreur serveur" });
  }
};

// ✅ VÉRIFICATION DU CODE
exports.verifyCode = (req, res) => {
  const { mail, code } = req.body;

  if (!mail || code === undefined || code === null) {
    return res.status(400).json({ error: "Mail et code requis" });
  }

  AuthModel.findByEmail(mail, (err, results) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!results.length) return res.status(404).json({ error: "Utilisateur introuvable" });

    const user = results[0];

    // ⚠️ Compare en string pour éviter le souci number/string
    if (String(user.verification_code) === String(code)) {
      AuthModel.markAsVerified(mail, (err2) => {
        if (err2) return res.status(500).json({ error: err2.message });
        return res.json({ message: "Compte vérifié avec succès 🎉" });
      });
    } else {
      return res.status(400).json({ error: "Code incorrect ❌" });
    }
  });
};

// ✅ RÉENVOYER LE CODE
exports.resendCode = (req, res) => {
  const { mail } = req.body;

  if (!mail) return res.status(400).json({ error: "L'adresse e-mail est requise" });

  AuthModel.findByEmail(mail, async (err, results) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!results.length) return res.status(404).json({ error: "Utilisateur introuvable" });

    const user = results[0];

    if (user.verified) {
      return res.status(400).json({ error: "Ce compte est déjà vérifié ✅" });
    }

    const newCode = Math.floor(100000 + Math.random() * 900000);

    AuthModel.updateVerificationCode(mail, newCode, async (err2) => {
      if (err2) return res.status(500).json({ error: err2.message });

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
        return res.json({ message: "Nouveau code envoyé avec succès ✅" });
      } catch (e) {
        console.error("Erreur d'envoi du mail :", e);
        return res.status(500).json({ error: "Impossible d'envoyer l'e-mail" });
      }
    });
  });
};

// ✅ CONNEXION
exports.login = (req, res) => {
  const { mail, password } = req.body;

  if (!mail || !password) {
    return res.status(400).json({ error: "Mail et mot de passe requis" });
  }

  AuthModel.findByEmail(mail, async (err, results) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!results.length) return res.status(401).json({ message: "Mail invalide" });

    const user = results[0];

    if (!user.verified) {
      return res.status(401).json({ error: "Veuillez d'abord vérifier votre compte." });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(401).json({ message: "Mot de passe invalide" });

    const token = jwt.sign({ userId: user.id, mail: user.mail }, SECRET, { expiresIn: "7d" });

    return res.json({
      token,
      user: {
        id: user.id,
        nom: user.nom,
        mail: user.mail,
        Adresse: user.Adresse,
        code_postal: user.code_postal,
        numero_telephone: user.numero_telephone,
        latitude: user.latitude,
        longitude: user.longitude,
      },
    });
  });
};

// ✅ MOT DE PASSE OUBLIÉ
exports.forgotPassword = async (req, res) => {
  const { mail } = req.body;

  if (!mail) return res.status(400).json({ error: "L'adresse e-mail est requise" });

  try {
    AuthModel.findByEmail(mail, async (err, results) => {
      if (err) return res.status(500).json({ error: "Erreur serveur MySQL" });

      const messageUtilisateur =
        "Si cet e-mail est associé à un compte, vous recevrez un lien pour réinitialiser votre mot de passe.";

      if (!results.length) {
        return res.status(200).json({ message: messageUtilisateur });
      }

      const user = results[0];
      const resetToken = jwt.sign({ mail: user.mail }, process.env.JWT_SECRET, { expiresIn: "15m" });

      const resetLink = `http://192.168.1.53:3000/api/auth/reset-password/${resetToken}`;

      const subject = "Réinitialisation de votre mot de passe ";
      const html = `
        <h2>Bonjour ${user.nom || ""},</h2>
        <p>Vous avez demandé à réinitialiser votre mot de passe.</p>
        <p>Cliquez sur le lien ci-dessous pour continuer :</p>
        <a href="${resetLink}" target="_blank"
           style="background:#007BFF;color:white;padding:10px 15px;text-decoration:none;border-radius:5px;">Réinitialiser mon mot de passe</a>
        <p>Ce lien expirera dans 15 minutes ⏳</p>
        <p>Si vous n'êtes pas à l'origine de cette demande, ignorez simplement ce message.</p>
        <br>
        <p>L'équipe <b>EventGo</b></p>
      `;

      try {
        await sendMail(mail, subject, html);
        console.log("Mail reset envoyé à :", mail);
      } catch (e) {
        console.error("Erreur d'envoi du mail :", e);
      }

      return res.status(200).json({ message: messageUtilisateur });
    });
  } catch (err) {
    console.error("Erreur forgotPassword:", err);
    return res.status(500).json({ error: "Erreur interne du serveur" });
  }
};
