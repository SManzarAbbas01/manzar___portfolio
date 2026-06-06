/* ============================================================
   server.js — Express application entry point
   Wires together security middleware, CORS, routes, error handling,
   the MongoDB connection and graceful shutdown.
   ============================================================ */
"use strict";

require("dotenv").config();

const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");

const { connectDB, closeDB } = require("./config/db");
const portfolioRoutes = require("./routes/portfolioRoutes");
const { notFound, errorHandler } = require("./middleware/errorHandler");

const app = express();
const PORT = process.env.PORT || 5000;

/* ---------- Trust proxy (Render/Vercel sit behind a proxy) ---------- */
app.set("trust proxy", 1);

/* ---------- Security headers ---------- */
// crossOriginResourcePolicy disabled so the API can be consumed cross-origin.
app.use(
  helmet({
    crossOriginResourcePolicy: false,
  })
);

/* ---------- CORS ---------- */
const rawOrigins = (process.env.CORS_ORIGINS || "")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);

const corsOptions = {
  origin(origin, callback) {
    // Allow non-browser clients (curl/Postman) with no Origin header.
    if (!origin) return callback(null, true);
    // If no allow-list configured, allow all (dev convenience — set CORS_ORIGINS in prod).
    if (rawOrigins.length === 0) return callback(null, true);
    if (rawOrigins.includes(origin)) return callback(null, true);
    return callback(new Error(`CORS: origin not allowed: ${origin}`));
  },
  methods: ["GET", "PUT", "POST", "OPTIONS"],
  allowedHeaders: ["Content-Type", "x-admin-key"],
  credentials: false,
};
app.use(cors(corsOptions));

/* ---------- Body parsing ---------- */
// Generous JSON limit because the profile may carry a default SVG data-URI,
// but real photos go to Cloudinary as URLs (kept well under this).
app.use(express.json({ limit: "2mb" }));
app.use(express.urlencoded({ extended: true, limit: "2mb" }));

/* ---------- Rate limiting (protects write + upload endpoints) ---------- */
const writeLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, error: "Too many requests. Please slow down." },
});
app.use("/api/portfolio", (req, res, next) => {
  if (req.method === "GET") return next();
  return writeLimiter(req, res, next);
});
app.use("/api/upload-image", writeLimiter);
app.use("/api/login", writeLimiter);

/* ---------- Health check ---------- */
app.get("/", (req, res) => {
  res.status(200).json({
    success: true,
    service: "manzar-portfolio-backend",
    status: "ok",
    endpoints: ["GET /api/portfolio", "PUT /api/portfolio", "POST /api/upload-image"],
  });
});
app.get("/health", (req, res) => res.status(200).json({ success: true, status: "healthy" }));

/* ---------- API routes ---------- */
app.use("/api", portfolioRoutes);

/* ---------- 404 + error handling (must be last) ---------- */
app.use(notFound);
app.use(errorHandler);

/* ---------- Boot ---------- */
let server;
async function start() {
  await connectDB();
  server = app.listen(PORT, () => {
    console.log(`[server] Listening on port ${PORT} (${process.env.NODE_ENV || "development"})`);
  });
}

/* ---------- Graceful shutdown ---------- */
async function shutdown(signal) {
  console.log(`\n[server] ${signal} received — shutting down gracefully…`);
  if (server) {
    await new Promise((resolve) => server.close(resolve));
  }
  await closeDB();
  process.exit(0);
}
["SIGINT", "SIGTERM"].forEach((sig) => process.on(sig, () => shutdown(sig)));

process.on("unhandledRejection", (reason) => {
  console.error("[server] Unhandled promise rejection:", reason);
});

start();

module.exports = app;
