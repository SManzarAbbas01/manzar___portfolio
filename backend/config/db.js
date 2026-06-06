/* ============================================================
   config/db.js — MongoDB Atlas connection (Mongoose)
   ============================================================ */
"use strict";

const mongoose = require("mongoose");

/**
 * Establishes the MongoDB connection using the MONGODB_URI env var.
 * Fails fast (exits the process) if the URI is missing or the first
 * connection cannot be established — there is no point serving traffic
 * without a database.
 */
async function connectDB() {
  const uri = process.env.MONGODB_URI;

  if (!uri) {
    console.error(
      "[db] FATAL: MONGODB_URI is not set. Add it to your environment (.env / Render dashboard)."
    );
    process.exit(1);
  }

  // Surface connection lifecycle events (helpful in Render logs).
  mongoose.connection.on("connected", () => {
    console.log("[db] MongoDB connected");
  });
  mongoose.connection.on("error", (err) => {
    console.error("[db] MongoDB connection error:", err.message);
  });
  mongoose.connection.on("disconnected", () => {
    console.warn("[db] MongoDB disconnected");
  });

  try {
    // strictQuery true avoids silently dropping unknown query fields.
    mongoose.set("strictQuery", true);

    await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 15000, // fail fast instead of hanging
      socketTimeoutMS: 45000,
    });

    return mongoose.connection;
  } catch (err) {
    console.error("[db] FATAL: initial MongoDB connection failed:", err.message);
    console.error(
      "[db] Hint: verify the password is URL-encoded and your IP / 0.0.0.0/0 is whitelisted in Atlas."
    );
    process.exit(1);
  }
}

/** Graceful shutdown — close the pool on SIGINT/SIGTERM. */
async function closeDB() {
  try {
    await mongoose.connection.close();
    console.log("[db] MongoDB connection closed");
  } catch (err) {
    console.error("[db] Error closing MongoDB connection:", err.message);
  }
}

module.exports = { connectDB, closeDB };
