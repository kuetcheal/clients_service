const express = require("express");
const router = express.Router();

const eventController = require("../controllers/eventController");
const upload = require("../middlewares/uploadEventImage");


// Events proches par user (mail)  => /api/events/nearby/by-user?mail=...&radiusKm=25
router.get("/nearby/by-user", eventController.getNearbyEventsForUser);

// Events proches par coords        => /api/events/nearby/by-coords?lat=...&lng=...&radiusKm=25
router.get("/nearby/by-coords", eventController.getNearbyEventsByCoords);

// Nouveaux events depuis une date => /api/events/updates?since=ISO_DATE&limit=50
router.get("/updates", eventController.getNewEventsSince);


// CRUD events
router.get("/", eventController.getAllEvents);
router.get("/:id", eventController.getEventById);

router.post("/", upload.single("image"), eventController.createEvent);
router.put("/:id", upload.single("image"), eventController.updateEvent);

router.delete("/:id", eventController.deleteEvent);

module.exports = router;