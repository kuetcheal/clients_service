// routes/eventRoutes.js
const express = require("express");
const router = express.Router();
const eventController = require("../controllers/eventController");
const multer = require("multer");
const path = require("path");

router.get("/nearby/by-user", eventController.getNearbyEventsForUser);

//  Configuration du stockage des fichiers uploadés
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "uploads/events/"); // dossier où stocker les images
  },
  filename: (req, file, cb) => {
    const uniqueName = Date.now() + "-" + file.originalname.replace(/\s+/g, "_");
    cb(null, uniqueName);
  }
});

const upload = multer({ storage });
// Routes événements
router.get("/", eventController.getAllEvents);
router.get("/:id", eventController.getEventById);
router.post("/", upload.single("image"), eventController.createEvent);
router.put("/:id", upload.single("image"), eventController.updateEvent);
router.delete("/:id", eventController.deleteEvent);


module.exports = router;
