const cloudinary = require("cloudinary").v2;
// Cloudinary lit automatiquement CLOUDINARY_URL
cloudinary.config({
  secure: true,
});

module.exports = cloudinary;
