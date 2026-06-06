/* ============================================================
   middleware/upload.js — multer (in-memory) for image uploads
   Files are held in memory and streamed to Cloudinary; nothing is
   written to disk and base64 is never persisted.
   ============================================================ */
"use strict";

const multer = require("multer");

const ALLOWED_MIME = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "image/avif",
]);

const storage = multer.memoryStorage();

const upload = multer({
  storage,
  limits: {
    fileSize: 8 * 1024 * 1024, // 8 MB hard cap
    files: 1,
  },
  fileFilter(req, file, cb) {
    if (ALLOWED_MIME.has(file.mimetype)) return cb(null, true);
    // Surface a typed error the central handler maps to 415.
    cb(new Error("UNSUPPORTED_FILE_TYPE"));
  },
});

// Accept a single file under the field name "image".
const uploadSingleImage = upload.single("image");

module.exports = { uploadSingleImage };
