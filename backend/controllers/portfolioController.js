/* ============================================================
   controllers/portfolioController.js
   Business logic for reading/writing the portfolio and uploading images.
   ============================================================ */
"use strict";

const Portfolio = require("../models/Portfolio");
const { uploadBuffer } = require("../config/cloudinary");
const { DEFAULT_DATA } = require("../data/defaultData");

const SINGLETON = "main";

/**
 * Returns the single portfolio document, creating (seeding) it from the
 * résumé defaults the first time the API is hit against an empty database.
 */
async function getOrSeedPortfolio() {
  let doc = await Portfolio.findOne({ singleton: SINGLETON });
  if (!doc) {
    doc = await Portfolio.create({ singleton: SINGLETON, ...DEFAULT_DATA });
    console.log("[portfolio] Seeded default portfolio document.");
  }
  return doc;
}

/* ------------------------------------------------------------------
   GET /api/portfolio
   ------------------------------------------------------------------ */
async function getPortfolio(req, res, next) {
  try {
    const doc = await getOrSeedPortfolio();
    return res.status(200).json({ success: true, data: doc });
  } catch (err) {
    return next(err);
  }
}

/* ------------------------------------------------------------------
   PUT /api/portfolio   (admin only)
   Updates whichever sections are present in the request body.
   ------------------------------------------------------------------ */
async function updatePortfolio(req, res, next) {
  try {
    const body = req.body;
    const doc = await getOrSeedPortfolio();

    // Merge: only overwrite sections explicitly provided.
    if (body.profile !== undefined) {
      // Merge profile field-by-field so a partial profile update is safe.
      doc.profile = { ...doc.profile.toObject(), ...body.profile };
    }
    ["experience", "projects", "skills", "education", "certifications"].forEach(
      (key) => {
        if (body[key] !== undefined) doc[key] = body[key];
      }
    );

    const saved = await doc.save();
    return res.status(200).json({
      success: true,
      message: "Portfolio updated successfully.",
      data: saved,
    });
  } catch (err) {
    return next(err);
  }
}

/* ------------------------------------------------------------------
   POST /api/upload-image   (admin only)
   Streams the uploaded file to Cloudinary and returns the secure_url.
   Does NOT store the image in MongoDB — the frontend saves the URL via PUT.
   ------------------------------------------------------------------ */
async function uploadImage(req, res, next) {
  try {
    if (!req.file || !req.file.buffer) {
      return res.status(400).json({
        success: false,
        error: 'No image file provided. Send a file under the "image" field.',
      });
    }

    const result = await uploadBuffer(req.file.buffer, "portfolio");

    if (!result || !result.secure_url) {
      return res.status(502).json({
        success: false,
        error: "Cloudinary did not return a secure URL.",
      });
    }

    return res.status(201).json({
      success: true,
      url: result.secure_url,
      public_id: result.public_id,
      width: result.width,
      height: result.height,
    });
  } catch (err) {
    // Distinguish Cloudinary failures from generic errors.
    console.error("[upload] Cloudinary upload failed:", err.message);
    return res.status(502).json({
      success: false,
      error: "Image upload failed. Please try again.",
      detail: process.env.NODE_ENV === "production" ? undefined : err.message,
    });
  }
}

module.exports = { getPortfolio, updatePortfolio, uploadImage };
