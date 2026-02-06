const mysql = require("mysql2/promise");
require("dotenv").config();

const useSSL = String(process.env.DB_SSL).toLowerCase() === "true";
const pool = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  port: Number(process.env.DB_PORT || 3306),

  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  enableKeepAlive: true,
  keepAliveInitialDelay: 0,

  ...(useSSL
    ? {
        ssl: {
          rejectUnauthorized: false,
        },
      }
    : {}),
});
(async () => {
  try {
    const conn = await pool.getConnection();
    await conn.ping();
    conn.release();
    console.log("✅ Pool MySQL connecté !");
  } catch (err) {
    console.error("❌ Erreur connexion MySQL :", err.code, err.message);
  }
})();

module.exports = pool;
