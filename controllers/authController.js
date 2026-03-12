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

// helper URL (Render)
function getAppUrl() {
  const appUrl = (process.env.APP_URL || "").trim().replace(/\/$/, "");
  return appUrl;
}

//  INSCRIPTION
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

// VÉRIFICATION DU CODE
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

//  RÉENVOYER LE CODE
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

//  CONNEXION
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

//  MOT DE PASSE OUBLIÉ
exports.forgotPassword = async (req, res) => {
  const { mail } = req.body;
  if (!mail) return res.status(400).json({ error: "L'adresse e-mail est requise" });

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

      const resetToken = jwt.sign(
        { mail: user.mail, purpose: "reset_password" },
        SECRET,
        { expiresIn: "15m" }
      );

      const appUrl = getAppUrl();
      if (!appUrl) {
        console.warn(" APP_URL manquant. Ajoute APP_URL dans Render.");
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

// ✅ PAGE HTML (2 champs + alert + afficher/masquer mot de passe)
exports.renderResetPasswordPage = (req, res) => {
  const { token } = req.params;

  try {
    assertJwtSecret();

    const payload = jwt.verify(token, SECRET);
    if (!payload || payload.purpose !== "reset_password") {
      return res.status(400).send("Lien invalide.");
    }

    const appUrl = getAppUrl() || "";
    const postUrl = appUrl
      ? `${appUrl}/api/auth/reset-password/${token}`
      : `/api/auth/reset-password/${token}`;

    const html = `<!doctype html>
<html lang="fr">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1" />
  <title>Réinitialisation du mot de passe</title>
  <style>
    * {
      box-sizing: border-box;
    }

    body {
      font-family: system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif;
      margin: 0;
      background: #f6f7fb;
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 20px;
    }

    .wrap {
      width: 100%;
      max-width: 460px;
      background: #fff;
      padding: 28px;
      border-radius: 18px;
      box-shadow: 0 10px 30px rgba(0,0,0,.08);
    }

    h1 {
      font-size: 20px;
      margin: 0 0 18px;
      color: #111827;
    }

    label {
      display: block;
      margin: 14px 0 8px;
      font-weight: 600;
      color: #111827;
    }

    .input-wrap {
      position: relative;
      margin-bottom: 8px;
    }

    input {
      width: 100%;
      padding: 14px 46px 14px 14px;
      border: 1px solid #d1d5db;
      border-radius: 12px;
      font-size: 15px;
      outline: none;
      transition: 0.2s ease;
    }

    input:focus {
      border-color: #111;
      box-shadow: 0 0 0 2px rgba(0,0,0,.05);
    }

    .toggle-password {
      position: absolute;
      top: 50%;
      right: 14px;
      transform: translateY(-50%);
      background: transparent;
      border: none;
      cursor: pointer;
      font-size: 18px;
      padding: 0;
      width: auto;
      margin: 0;
      color: #555;
    }

    .hint {
      font-size: 13px;
      color: #6b7280;
      margin-top: 6px;
      line-height: 1.4;
    }

    .match-text {
      font-size: 13px;
      margin-top: 8px;
      min-height: 18px;
      font-weight: 500;
    }

    .match-ok {
      color: #15803d;
    }

    .match-error {
      color: #b91c1c;
    }

    button.submit-btn {
      width: 100%;
      margin-top: 18px;
      padding: 14px;
      border: 0;
      border-radius: 12px;
      background: #111;
      color: #fff;
      font-weight: 700;
      font-size: 15px;
      cursor: pointer;
      transition: 0.2s ease;
    }

    button.submit-btn:hover {
      opacity: 0.95;
    }

    button.submit-btn:disabled {
      opacity: .6;
      cursor: not-allowed;
    }

    .msg {
      margin-top: 14px;
      padding: 12px;
      border-radius: 12px;
      display: none;
      font-size: 14px;
      line-height: 1.4;
    }

    .ok {
      background: #e9fff0;
      color: #126b2e;
      display: block;
    }

    .err {
      background: #ffecec;
      color: #9b1c1c;
      display: block;
    }

    .muted {
      color: #667085;
      font-size: 13px;
      margin-top: 12px;
    }
  </style>
</head>
<body>
  <div class="wrap">
    <h1>Réinitialiser votre mot de passe</h1>

    <label for="p1">Nouveau mot de passe</label>
    <div class="input-wrap">
      <input id="p1" type="password" placeholder="Nouveau mot de passe" />
      <button type="button" class="toggle-password" onclick="togglePassword('p1', this)">👁️</button>
    </div>

    <label for="p2">Confirmer le mot de passe</label>
    <div class="input-wrap">
      <input id="p2" type="password" placeholder="Confirmer le mot de passe" />
      <button type="button" class="toggle-password" onclick="togglePassword('p2', this)">👁️</button>
    </div>

    <div class="hint">
      Les deux champs doivent être strictement identiques.
    </div>

    <div id="matchText" class="match-text"></div>

    <button id="btn" class="submit-btn">Valider</button>
    <div id="msg" class="msg"></div>

    <div class="muted">Le lien expire après 15 minutes.</div>
  </div>

<script>
  const POST_URL = ${JSON.stringify(postUrl)};
  const btn = document.getElementById('btn');
  const msg = document.getElementById('msg');
  const p1 = document.getElementById('p1');
  const p2 = document.getElementById('p2');
  const matchText = document.getElementById('matchText');

  function show(text, ok) {
    msg.textContent = text;
    msg.className = 'msg ' + (ok ? 'ok' : 'err');
    msg.style.display = 'block';
  }

  function togglePassword(inputId, el) {
    const input = document.getElementById(inputId);
    if (input.type === 'password') {
      input.type = 'text';
      el.textContent = '🙈';
    } else {
      input.type = 'password';
      el.textContent = '👁️';
    }
  }

  function checkPasswordsLive() {
    const a = p1.value;
    const b = p2.value;

    if (!a && !b) {
      matchText.textContent = '';
      matchText.className = 'match-text';
      return;
    }

    if (!a || !b) {
      matchText.textContent = 'Les deux champs doivent être remplis.';
      matchText.className = 'match-text match-error';
      return;
    }

    if (a === b) {
      matchText.textContent = 'Les mots de passe correspondent.';
      matchText.className = 'match-text match-ok';
    } else {
      matchText.textContent = 'Les mots de passe ne correspondent pas.';
      matchText.className = 'match-text match-error';
    }
  }

  p1.addEventListener('input', checkPasswordsLive);
  p2.addEventListener('input', checkPasswordsLive);

  btn.addEventListener('click', async () => {
    msg.style.display = 'none';

    const a = p1.value.trim();
    const b = p2.value.trim();

    if (!a || !b) {
      show("Veuillez remplir les deux champs.", false);
      return;
    }

    if (a.length < 6) {
      show("Mot de passe trop court (min 6 caractères).", false);
      return;
    }

    if (a !== b) {
      show("Les mots de passe ne correspondent pas.", false);
      return;
    }

    btn.disabled = true;

    try {
      const r = await fetch(POST_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          password: a,
          confirmPassword: b
        })
      });

      const data = await r.json().catch(() => ({}));

      if (r.ok) {
        show(data.message || "Mot de passe mis à jour ✅", true);

        // ✅ Popup de confirmation
        alert(data.message || "Mot de passe modifié avec succès ✅");

        // Optionnel : vider les champs
        p1.value = '';
        p2.value = '';
        matchText.textContent = '';
        matchText.className = 'match-text';

        return;
      }

      show(data.error || "Erreur lors de la réinitialisation.", false);
    } catch (e) {
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


// ✅ ACTION RESET
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

      // ✅ refuser si même mot de passe
      const sameAsOld = await bcrypt.compare(password, user.password);
      if (sameAsOld) {
        return res.status(400).json({ error: "Mot de passe déjà utilisé. Choisissez-en un autre." });
      }

      const hashed = await bcrypt.hash(password, 10);

      AuthModel.updatePasswordByEmail(mail, hashed, (err2) => {
        if (err2) {
          return res.status(500).json({ error: "Impossible de mettre à jour le mot de passe." });
        }
        return res.status(200).json({ message: "Mot de passe modifié avec succès ✅" });
      });
    });
  } catch (e) {
    return res.status(400).json({ error: "Lien expiré ou invalide." });
  }
};
