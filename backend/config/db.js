/* ============================================================
   config/db.js — MongoDB Atlas connection (Mongoose)
   ------------------------------------------------------------
   Works in two environments:
   • Long-running server (local dev / containers): connectDB() — fails
     fast (process.exit) if the DB is unreachable.
   • Serverless (Vercel functions): ensureDB() — connects lazily and
     CACHES the connection across warm invocations; never exits the
     process (a crash would take down the whole function).
   ============================================================ */
"use strict";

const mongoose = require("mongoose");

mongoose.set("strictQuery", true);

// Surface connection lifecycle events (helpful in logs). Registered once.
mongoose.connection.on("connected", () => console.log("[db] MongoDB connected"));
mongoose.connection.on("error", (err) => console.error("[db] MongoDB connection error:", err.message));
mongoose.connection.on("disconnected", () => console.warn("[db] MongoDB disconnected"));

// Cache the connection promise on the global object so a warm serverless
// invocation reuses the existing connection instead of opening a new pool.
let cached = global.__mongooseConn;
if (!cached) cached = global.__mongooseConn = { promise: null };

/**
 * Ensure a live MongoDB connection, reusing a cached one when present.
 * Throws (does NOT exit) on failure so callers/middleware can handle it.
 */
async function ensureDB() {
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error("MONGODB_URI is not set");

  // 1 = connected. Reuse it.
  if (mongoose.connection.readyState === 1) return mongoose.connection;

  if (!cached.promise) {
    cached.promise = mongoose
      .connect(uri, {
        serverSelectionTimeoutMS: 15000, // fail fast instead of hanging
        socketTimeoutMS: 45000,
      })
      .then((m) => m.connection)
      .catch((err) => {
        cached.promise = null; // allow a retry on the next request
        throw err;
      });
  }
  return cached.promise;
}

/**
 * Long-running-server connect: fail fast if the DB is unreachable —
 * there is no point serving traffic without a database.
 */
async function connectDB() {
  try {
    return await ensureDB();
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

module.exports = { connectDB, ensureDB, closeDB };
