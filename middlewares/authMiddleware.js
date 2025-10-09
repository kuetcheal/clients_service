const jwt = require("jsonwebtoken");
const SECRET = process.env.JWT_SECRET;
const ADMIN_TOKEN = process.env.ADMIN_TOKEN; 

function authenticateToken(req, res, next) {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1]; // Format: "Bearer TOKEN"

  if (!token) {
    return res.status(401).json({ message: "Token manquant" });
  }

  // ⚡ Si le token correspond à l’ADMIN_TOKEN défini dans .env => bypass
  if (token === ADMIN_TOKEN) {
    req.user = { role: "admin" }; 
    return next();
  }

  // Sinon on vérifie avec JWT (utilisé par Flutter)
  jwt.verify(token, SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ message: "Token invalide" });
    }
    req.user = user;
    next();
  });
}

module.exports = authenticateToken;
