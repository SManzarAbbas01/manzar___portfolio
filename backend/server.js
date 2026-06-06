/* ============================================================
   server.js — Long-running server entry point (local dev / tests)
   Boots the Express app from app.js, opens the MongoDB connection
   up front (fail fast), and listens on PORT. On Vercel the app is
   served as a serverless function instead — see ../api/index.js.
   ============================================================ */
"use strict";

require("dotenv").config();

const app = require("./app");
const { connectDB, closeDB } = require("./config/db");

const PORT = process.env.PORT || 5000;

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
