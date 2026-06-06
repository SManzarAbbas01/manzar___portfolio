/* ============================================================
   routes/portfolioRoutes.js — API route definitions
   ============================================================ */
"use strict";

const express = require("express");
const router = express.Router();

const {
  getPortfolio,
  updatePortfolio,
  uploadImage,
} = require("../controllers/portfolioController");
const { requireAdmin } = require("../middleware/auth");
const { uploadSingleImage } = require("../middleware/upload");
const { validatePortfolioBody } = require("../middleware/validatePortfolio");

// Public read.
router.get("/portfolio", getPortfolio);

// Protected write.
router.put("/portfolio", requireAdmin, validatePortfolioBody, updatePortfolio);

// Protected image upload (multer runs first to populate req.file before auth?).
// Auth first to reject unauthenticated uploads before buffering the file.
router.post("/upload-image", requireAdmin, uploadSingleImage, uploadImage);

// Lightweight credential check used by the Admin login gate.
router.post("/login", requireAdmin, (req, res) => {
  res.status(200).json({ success: true, message: "Authenticated." });
});

module.exports = router;
