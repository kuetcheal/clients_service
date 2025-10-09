const mysql = require('mysql2');
require('dotenv').config(); // Charge les variables d’environnement

const db = mysql.createConnection({
  host: process.env.DB_HOST,       
  user: process.env.DB_USER,       
  password: process.env.DB_PASSWORD, 
  database: process.env.DB_NAME,   
  port: process.env.DB_PORT || 3306 
});

// Connexion à la base de données
db.connect((err) => {
  if (err) {
    console.error('❌ Erreur de connexion à MySQL :', err.message);
    process.exit(1); // Stoppe l'application si échec
  }
  console.log('✅ Connecté à la base de données MySQL !');
});

module.exports = db;

