const express = require("express");
const router = express.Router();

const eventController = require("../controllers/eventController");
const upload = require("../middlewares/uploadEventImage");

// Nearby
router.get("/nearby/by-user", eventController.getNearbyEventsForUser);

// CRUD events
router.get("/", eventController.getAllEvents);
router.get("/:id", eventController.getEventById);

router.post("/", upload.single("image"), eventController.createEvent); 
router.put("/:id", upload.single("image"), eventController.updateEvent); 

router.delete("/:id", eventController.deleteEvent);

module.exports = router;
