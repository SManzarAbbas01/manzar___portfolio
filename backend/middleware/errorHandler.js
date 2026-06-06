/* ============================================================
   middleware/errorHandler.js — 404 + centralized error handling
   ============================================================ */
"use strict";

/** 404 for any unmatched route. */
function notFound(req, res, next) {
  res.status(404).json({
    success: false,
    error: `Route not found: ${req.method} ${req.originalUrl}`,
  });
}

/**
 * Centralized error handler. Express recognizes it by its 4 args.
 * Maps common error types to sensible HTTP status codes and never leaks
 * stack traces in production.
 */
function errorHandler(err, req, res, next) {
  // Multer file-related errors.
  if (err && err.code === "LIMIT_FILE_SIZE") {
    return res.status(413).json({
      success: false,
      error: "Image too large. Maximum allowed size is 8 MB.",
    });
  }
  if (err && err.message === "UNSUPPORTED_FILE_TYPE") {
    return res.status(415).json({
      success: false,
      error: "Unsupported file type. Please upload a JPG, PNG, WEBP, GIF or AVIF image.",
    });
  }

  // Mongoose validation / cast errors -> 400.
  if (err && (err.name === "ValidationError" || err.name === "CastError")) {
    return res.status(400).json({
      success: false,
      error: "Invalid data: " + err.message,
    });
  }

  // JSON body parse error from express.json().
  if (err && err.type === "entity.parse.failed") {
    return res.status(400).json({
      success: false,
      error: "Malformed JSON in request body.",
    });
  }
  if (err && err.type === "entity.too.large") {
    return res.status(413).json({
      success: false,
      error: "Request body too large.",
    });
  }

  const status = err.status || err.statusCode || 500;
  console.error("[error]", status, err.message);
  if (status >= 500) console.error(err.stack);

  res.status(status).json({
    success: false,
    error:
      status >= 500 && process.env.NODE_ENV === "production"
        ? "Internal server error."
        : err.message || "Internal server error.",
  });
}

module.exports = { notFound, errorHandler };
