/* ============================================================
   api/index.js — Vercel serverless entry point
   Vercel routes /api/* and /health here (see vercel.json) and invokes
   the exported Express app as the request handler. The app connects to
   MongoDB lazily and reuses the connection across warm invocations.
   ============================================================ */
"use strict";

module.exports = require("../backend/app");
