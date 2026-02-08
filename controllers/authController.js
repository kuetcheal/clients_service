// controllers/authController.js
const jwt = require("jsonwebtoken");
const bcrypt = require("bcrypt");
const AuthModel = require("../models/authModel");
const { sendMail } = require("../services/mailer");
const { geocodeAdresse } = require("../services/geocode");

const SECRET = process.env.JWT_SECRET;

// petite sécurité
function assertJwtSecret() {
  if (!SECRET) {
    throw new Error("JWT_SECRET manquant dans les variables d'environnement.");
  }
}

// ✅ INSCRIPTION
exports.register = async (req, res) => {
  try {
    assertJwtSecret();

    const { nom, mail, numero_telephone, password, Adresse, code_postal } =
      req.body;

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
  try {
    assertJwtSecret();

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

      const token = jwt.sign({ userId: user.id, mail: user.mail }, SECRET, {
        expiresIn: "7d",
      });

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
  } catch (err) {
    console.error("Erreur login:", err);
    return res.status(500).json({ error: "Erreur serveur" });
  }
};

// ✅ MOT DE PASSE OUBLIÉ (lien PUBLIC Render)
exports.forgotPassword = async (req, res) => {
  const { mail } = req.body;
  if (!mail) return res.status(400).json({ error: "L'adresse e-mail est requise" });

  // Toujours le même message (anti-enum)
  const messageUtilisateur =
    "Si cet e-mail est associé à un compte, vous recevrez un lien pour réinitialiser votre mot de passe.";

  try {
    assertJwtSecret();

    AuthModel.findByEmail(mail, async (err, results) => {
      if (err) return res.status(500).json({ error: "Erreur serveur MySQL" });

      if (!results.length) {
        return res.status(200).json({ message: messageUtilisateur });
      }

      const user = results[0];

      // token 15 min
      const resetToken = jwt.sign(
        { mail: user.mail, purpose: "reset_password" },
        SECRET,
        { expiresIn: "15m" }
      );

      // ✅ URL de ton backend PUBLIC (Render)
      // Mets APP_URL sur Render => https://site-evenement.onrender.com
      const appUrl = (process.env.APP_URL || "").replace(/\/$/, "");
      if (!appUrl) {
        console.warn("⚠️ APP_URL manquant. Ajoute APP_URL dans Render.");
      }

      const resetLink = `${appUrl}/api/auth/reset-password/${resetToken}`;

      const subject = "Réinitialisation de votre mot de passe";
      const html = `
        <h2>Bonjour ${user.nom || ""},</h2>
        <p>Vous avez demandé à réinitialiser votre mot de passe.</p>
        <p>Cliquez sur le lien ci-dessous pour continuer :</p>
        <a href="${resetLink}" target="_blank"
           style="background:#007BFF;color:white;padding:10px 15px;text-decoration:none;border-radius:5px;display:inline-block">
           Réinitialiser mon mot de passe
        </a>
        <p style="margin-top:12px">Ce lien expirera dans 15 minutes ⏳</p>
        <p>Si vous n'êtes pas à l'origine de cette demande, ignorez simplement ce message.</p>
        <br/>
        <p>L'équipe <b>EventGo</b></p>
      `;

      try {
        await sendMail(mail, subject, html);
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

// ✅ PAGE HTML (2 champs) SERVIE PAR LE BACKEND
exports.renderResetPasswordPage = (req, res) => {
  const { token } = req.params;

  // On vérifie juste que le token est valide pour afficher la page
  try {
    assertJwtSecret();

    const payload = jwt.verify(token, SECRET);
    if (!payload || payload.purpose !== "reset_password") {
      return res.status(400).send("Lien invalide.");
    }

    // Petite page simple
    const html = `<!doctype html>
<html lang="fr">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1" />
  <title>Réinitialisation du mot de passe</title>
  <style>
    body{font-family:system-ui,-apple-system,Segoe UI,Roboto,Arial;margin:0;background:#f6f7fb}
    .wrap{max-width:420px;margin:40px auto;background:#fff;padding:22px;border-radius:14px;box-shadow:0 10px 30px rgba(0,0,0,.08)}
    h1{font-size:20px;margin:0 0 14px}
    label{display:block;margin:12px 0 6px;font-weight:600}
    input{width:100%;padding:12px 12px;border:1px solid #dcdfe6;border-radius:10px;font-size:14px}
    button{width:100%;margin-top:16px;padding:12px;border:0;border-radius:10px;background:#111;color:#fff;font-weight:700;cursor:pointer}
    button:disabled{opacity:.6;cursor:not-allowed}
    .msg{margin-top:14px;padding:10px;border-radius:10px;display:none}
    .ok{background:#e9fff0;color:#126b2e;display:block}
    .err{background:#ffecec;color:#9b1c1c;display:block}
    .muted{color:#667085;font-size:13px;margin-top:10px}
  </style>
</head>
<body>
  <div class="wrap">
    <h1>Réinitialiser votre mot de passe</h1>

    <label>Nouveau mot de passe</label>
    <input id="p1" type="password" placeholder="Nouveau mot de passe" />

    <label>Confirmer le mot de passe</label>
    <input id="p2" type="password" placeholder="Confirmer le mot de passe" />

    <button id="btn">Valider</button>
    <div id="msg" class="msg"></div>

    <div class="muted">
      Le lien expire après 15 minutes.
    </div>
  </div>

<script>
  const btn = document.getElementById('btn');
  const msg = document.getElementById('msg');
  const p1 = document.getElementById('p1');
  const p2 = document.getElementById('p2');

  function show(text, ok){
    msg.textContent = text;
    msg.className = 'msg ' + (ok ? 'ok' : 'err');
  }

  btn.addEventListener('click', async () => {
    msg.style.display = 'none';
    const a = p1.value.trim();
    const b = p2.value.trim();

    if (!a || !b) return show("Veuillez remplir les deux champs.", false);
    if (a.length < 6) return show("Mot de passe trop court (min 6 caractères).", false);
    if (a !== b) return show("Les mots de passe ne correspondent pas.", false);

    btn.disabled = true;
    try {
      const r = await fetch(location.pathname, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: a, confirmPassword: b })
      });
      const data = await r.json().catch(() => ({}));

      if (r.ok) {
        show(data.message || "Mot de passe mis à jour ✅", true);
        return;
      }
      show(data.error || "Erreur lors de la réinitialisation.", false);
    } catch(e){
      show("Erreur réseau.", false);
    } finally {
      btn.disabled = false;
    }
  });
</script>
</body>
</html>`;

    res.setHeader("Content-Type", "text/html; charset=utf-8");
    return res.status(200).send(html);
  } catch (e) {
    return res.status(400).send("Lien expiré ou invalide.");
  }
};

// ✅ ACTION RESET : compare ancien mot de passe, refuse si identique
exports.resetPassword = async (req, res) => {
  const { token } = req.params;
  const { password, confirmPassword } = req.body;

  if (!password || !confirmPassword) {
    return res.status(400).json({ error: "Veuillez remplir les deux champs." });
  }
  if (password !== confirmPassword) {
    return res.status(400).json({ error: "Les mots de passe ne correspondent pas." });
  }
  if (password.length < 6) {
    return res.status(400).json({ error: "Mot de passe trop court (min 6 caractères)." });
  }

  try {
    assertJwtSecret();

    const payload = jwt.verify(token, SECRET);
    if (!payload || payload.purpose !== "reset_password" || !payload.mail) {
      return res.status(400).json({ error: "Lien invalide." });
    }

    const mail = payload.mail;

    AuthModel.findByEmail(mail, async (err, results) => {
      if (err) return res.status(500).json({ error: "Erreur serveur MySQL" });
      if (!results.length) return res.status(400).json({ error: "Utilisateur introuvable." });

      const user = results[0];

      // ✅ Refuser si même mot de passe qu'avant
      const sameAsOld = await bcrypt.compare(password, user.password);
      if (sameAsOld) {
        return res.status(400).json({ error: "Mot de passe déjà utilisé. Choisissez-en un autre." });
      }

      const hashed = await bcrypt.hash(password, 10);

      // update en DB
      AuthModel.updatePasswordByEmail(mail, hashed, (err2) => {
        if (err2) return res.status(500).json({ error: "Impossible de mettre à jour le mot de passe." });

        return res.status(200).json({ message: "Mot de passe modifié avec succès ✅" });
      });
    });
  } catch (e) {
    return res.status(400).json({ error: "Lien expiré ou invalide." });
  }
};
