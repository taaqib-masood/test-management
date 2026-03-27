// server/config/cloudinary.js - COMPLETE FILE (NEW)

const cloudinary = require('cloudinary').v2;

// Only configure if credentials are provided
if (process.env.CLOUDINARY_CLOUD_NAME && 
    process.env.CLOUDINARY_API_KEY && 
    process.env.CLOUDINARY_API_SECRET) {
  
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
  });
  
  console.log('✓ Cloudinary configured');
} else {
  console.log('⚠️ Cloudinary credentials not found - using local storage');
}

module.exports = cloudinary;
