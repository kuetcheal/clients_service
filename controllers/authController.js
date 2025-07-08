const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const AuthModel = require('../models/authModel');

const SECRET = 'votre_secret_ici'; // à stocker dans .env ensuite

exports.register = (req, res) => {
  const { email, password } = req.body;

  AuthModel.register({ email, password }, (err, result) => {
    if (err) return res.status(500).json({ error: err.message });
    res.status(201).json({ message: 'Utilisateur créé' });
  });
};

exports.login = (req, res) => {
  const { email, password } = req.body;

  AuthModel.findByEmail(email, async (err, results) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!results.length) return res.status(401).json({ message: 'Email invalide' });

    const user = results[0];
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(401).json({ message: 'Mot de passe invalide' });

    const token = jwt.sign({ userId: user.id }, SECRET, { expiresIn: '1h' });
    res.json({ token });
  });
};
