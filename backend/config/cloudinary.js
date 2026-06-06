/* ============================================================
   config/cloudinary.js — Cloudinary SDK configuration + upload helper
   ============================================================ */
"use strict";

const { v2: cloudinary } = require("cloudinary");
const streamifier = require("streamifier");

const CLOUD_NAME = process.env.CLOUDINARY_CLOUD_NAME;
const API_KEY = process.env.CLOUDINARY_API_KEY;
const API_SECRET = process.env.CLOUDINARY_API_SECRET;

// Warn loudly at boot if credentials are missing — uploads will fail otherwise.
if (!CLOUD_NAME || !API_KEY || !API_SECRET) {
  console.warn(
    "[cloudinary] WARNING: one or more Cloudinary env vars are missing " +
      "(CLOUDINARY_CLOUD_NAME / CLOUDINARY_API_KEY / CLOUDINARY_API_SECRET). " +
      "Image uploads will fail until they are set."
  );
}

cloudinary.config({
  cloud_name: CLOUD_NAME,
  api_key: API_KEY,
  api_secret: API_SECRET,
  secure: true,
});

/**
 * Streams an in-memory file buffer straight to Cloudinary (no disk writes,
 * no base64 stored anywhere). Resolves with the upload result, from which we
 * read `secure_url`.
 *
 * @param {Buffer} buffer  Raw image bytes (from multer memoryStorage).
 * @param {string} folder  Cloudinary folder to store the asset in.
 * @returns {Promise<object>} Cloudinary upload result.
 */
function uploadBuffer(buffer, folder = "portfolio") {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        folder,
        resource_type: "image",
        // Keep originals sane: cap dimensions, auto format/quality.
        transformation: [
          { width: 1200, height: 1200, crop: "limit" },
          { quality: "auto", fetch_format: "auto" },
        ],
      },
      (error, result) => {
        if (error) return reject(error);
        resolve(result);
      }
    );

    streamifier.createReadStream(buffer).pipe(stream);
  });
}

module.exports = { cloudinary, uploadBuffer };
