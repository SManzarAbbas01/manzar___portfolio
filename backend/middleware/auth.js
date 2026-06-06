/* ============================================================
   middleware/auth.js — admin authentication guard
   Protects write endpoints (PUT /api/portfolio, POST /api/upload-image).
   The frontend sends the admin password in the "x-admin-key" header; we
   compare it (in constant time) to the ADMIN_PASSWORD env var.
   ============================================================ */
"use strict";

const crypto = require("crypto");

/** Constant-time string comparison to avoid timing attacks. */
function safeEqual(a, b) {
  const bufA = Buffer.from(String(a));
  const bufB = Buffer.from(String(b));
  if (bufA.length !== bufB.length) return false;
  return crypto.timingSafeEqual(bufA, bufB);
}

function requireAdmin(req, res, next) {
  const expected = process.env.ADMIN_PASSWORD;

  // Misconfiguration guard: refuse to run unprotected.
  if (!expected) {
    return res.status(500).json({
      success: false,
      error: "Server is misconfigured: ADMIN_PASSWORD is not set.",
    });
  }

  const provided =
    req.get("x-admin-key") ||
    (req.body && req.body.password) ||
    "";

  if (!provided || !safeEqual(provided, expected)) {
    return res.status(401).json({
      success: false,
      error: "Unauthorized: invalid or missing admin credentials.",
    });
  }

  next();
}

module.exports = { requireAdmin, safeEqual };
