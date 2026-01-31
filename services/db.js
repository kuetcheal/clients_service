const mysql = require("mysql2");
require("dotenv").config(); // charge les variables d’environnement

const useSSL = String(process.env.DB_SSL).toLowerCase() === "true";

const db = mysql.createConnection({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  port: Number(process.env.DB_PORT || 3306),

  // OVH Cloud Databases: SSL requis
  ...(useSSL
    ? {
        ssl: {
          // Pour éviter les erreurs de CA/cert sur Windows
          rejectUnauthorized: false,
        },
      }
    : {}),
});

// Connexion + logs utiles
db.connect((err) => {
  if (err) {
    console.error("❌ Erreur de connexion à MySQL :", err.code, err.message);
    console.error("ℹ️ Vérifie DB_HOST/PORT/USER/PASSWORD/DB_NAME + IP autorisée sur OVH");
    process.exit(1);
  }
  console.log("✅ Connecté à MySQL !");
});

// Bonus: log si ça se coupe
db.on("error", (err) => {
  console.error("⚠️ MySQL error :", err.code, err.message);
});

module.exports = db;
