/* ============================================================
   middleware/validatePortfolio.js — request body validation for PUT
   Ensures the incoming portfolio payload is well-formed before it ever
   reaches the controller / database.
   ============================================================ */
"use strict";

function isObject(v) {
  return v !== null && typeof v === "object" && !Array.isArray(v);
}

function validatePortfolioBody(req, res, next) {
  const body = req.body;

  if (!isObject(body)) {
    return res.status(400).json({
      success: false,
      error: "Request body must be a JSON object.",
    });
  }

  // Each section, when present, must be the expected type.
  const arrayKeys = ["experience", "projects", "skills", "education", "certifications"];
  for (const key of arrayKeys) {
    if (body[key] !== undefined && !Array.isArray(body[key])) {
      return res.status(400).json({
        success: false,
        error: `Field "${key}" must be an array.`,
      });
    }
  }

  if (body.profile !== undefined && !isObject(body.profile)) {
    return res.status(400).json({
      success: false,
      error: 'Field "profile" must be an object.',
    });
  }

  // Require at least one recognized section so empty PUTs don't wipe data silently.
  const recognized = ["profile", ...arrayKeys];
  const hasAny = recognized.some((k) => body[k] !== undefined);
  if (!hasAny) {
    return res.status(400).json({
      success: false,
      error:
        "Request body must include at least one of: profile, experience, projects, skills, education, certifications.",
    });
  }

  // Basic email sanity check (only if provided & non-empty).
  if (isObject(body.profile) && body.profile.email) {
    const email = String(body.profile.email).trim();
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({
        success: false,
        error: "profile.email is not a valid email address.",
      });
    }
  }

  next();
}

module.exports = { validatePortfolioBody };
