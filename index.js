// index.js
const express = require("express");
const bodyParser = require("body-parser");
const cors = require("cors");
require("dotenv").config();
require("./services/db"); // ✅ initialise le pool + log "Pool connecté"
const authRoutes = require("./routes/authRoutes");
const clientRoutes = require("./routes/clientRoutes");
const eventRoutes = require("./routes/eventRoutes");
const contactRoutes = require("./routes/contactRoutes");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(bodyParser.json());

// Rendre les images accessibles publiquement
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// ✅ Route racine
app.get("/", (req, res) => {
  res.json({
    message: "Bienvenue sur l’API Clients Service",
    status: "API opérationnelle",
    endpoints: {
      clients: "/api/clients",
      events: "/api/events",
      auth: "/api/auth",
      contact: "/api/contact",
    },
  });
});

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/clients", clientRoutes);
app.use("/api/events", eventRoutes);
app.use("/api/contact", contactRoutes);

app.listen(PORT, "0.0.0.0", () => {
  console.log(`✅ Serveur démarré sur http://0.0.0.0:${PORT}`);
});
