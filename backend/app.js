/* ============================================================
   app.js — Express application (no server.listen)
   Wires together security middleware, CORS, routes and error
   handling. Exported so it can run either as a long-running server
   (server.js) or as a serverless function (../api/index.js on Vercel).
   ============================================================ */
"use strict";

require("dotenv").config();

const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");

const { ensureDB } = require("./config/db");
const portfolioRoutes = require("./routes/portfolioRoutes");
const { notFound, errorHandler } = require("./middleware/errorHandler");

const app = express();

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

/* ---------- Health check (kept DB-independent for liveness) ---------- */
app.get("/", (req, res) => {
  res.status(200).json({
    success: true,
    service: "manzar-portfolio-backend",
    status: "ok",
    endpoints: ["GET /api/portfolio", "PUT /api/portfolio", "POST /api/upload-image"],
  });
});
app.get("/health", (req, res) => res.status(200).json({ success: true, status: "healthy" }));

/* ---------- Ensure DB connection for API routes (serverless-friendly) ---------- */
// On a long-running server the connection is already open (server.js calls
// connectDB at boot), so this resolves immediately. On serverless it connects
// lazily and reuses the cached connection on warm invocations.
app.use("/api", async (req, res, next) => {
  try {
    await ensureDB();
    next();
  } catch (err) {
    next(err);
  }
});

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

/* ---------- API routes ---------- */
app.use("/api", portfolioRoutes);

/* ---------- 404 + error handling (must be last) ---------- */
app.use(notFound);
app.use(errorHandler);

module.exports = app;
