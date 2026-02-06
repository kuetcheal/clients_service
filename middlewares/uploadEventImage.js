const multer = require("multer");
const { CloudinaryStorage } = require("multer-storage-cloudinary");
const cloudinary = require("../services/cloudinary");

const storage = new CloudinaryStorage({
  cloudinary,
  params: async (req, file) => ({
    folder: "eventgo/events",
    resource_type: "image",
    public_id: `event_${Date.now()}`, //  FIX
    transformation: [
      { width: 800, height: 800, crop: "limit" },
      { quality: "auto" },
      { fetch_format: "auto" },
    ],
  }),
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
  fileFilter: (req, file, cb) => {
    const ok = ["image/jpeg", "image/jpg", "image/png", "image/webp"].includes(file.mimetype);
    cb(ok ? null : new Error("Format image non supporté"), ok);
  },
});

module.exports = upload;
