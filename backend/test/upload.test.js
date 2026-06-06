/* ============================================================
   test/upload.test.js — live POST /api/upload-image through the API
   Boots the real server (in-memory Mongo) and posts a real multipart
   image, exercising multer -> controller -> Cloudinary. Cleans up the
   uploaded asset. Requires CLOUDINARY_* in backend/.env.
   Run: node test/upload.test.js
   ============================================================ */
"use strict";

const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "..", ".env") });

const { MongoMemoryServer } = require("mongodb-memory-server");
const { cloudinary } = require("../config/cloudinary");

let passed = 0, failed = 0;
function assert(c, l) { if (c) { passed++; console.log("  ✓ " + l); } else { failed++; console.error("  ✗ FAIL: " + l); } }
const tick = (ms) => new Promise((r) => setTimeout(r, ms));

const BASE = "http://127.0.0.1:5097";
const ADMIN_PASSWORD = "upload-test-pass";
const PNG_1x1 =
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==";

async function waitForReady(tries = 100) {
  for (let i = 0; i < tries; i++) {
    try { const r = await fetch(BASE + "/health"); if (r.ok) return; } catch (_) {}
    await tick(200);
  }
  throw new Error("server not ready");
}

async function main() {
  if (!process.env.CLOUDINARY_API_KEY) {
    console.error("SKIP: Cloudinary env vars not set (create backend/.env).");
    process.exit(2);
  }

  const mongod = await MongoMemoryServer.create();
  process.env.MONGODB_URI = mongod.getUri();
  process.env.ADMIN_PASSWORD = ADMIN_PASSWORD;
  process.env.NODE_ENV = "test";
  process.env.PORT = "5097";
  process.env.CORS_ORIGINS = "";
  require("../server");
  await waitForReady();

  const bytes = Buffer.from(PNG_1x1, "base64");
  const blob = new Blob([bytes], { type: "image/png" });

  console.log("\n[upload] reject without auth");
  {
    const fd = new FormData();
    fd.append("image", blob, "p.png");
    const r = await fetch(BASE + "/api/upload-image", { method: "POST", body: fd });
    assert(r.status === 401, "401 without admin key");
  }

  console.log("\n[upload] authorized multipart upload");
  let publicId = null;
  {
    const fd = new FormData();
    fd.append("image", blob, "p.png");
    const r = await fetch(BASE + "/api/upload-image", {
      method: "POST",
      headers: { "x-admin-key": ADMIN_PASSWORD },
      body: fd,
    });
    const j = await r.json();
    assert(r.status === 201, "201 Created");
    assert(j.success === true, "success:true");
    assert(/^https:\/\/res\.cloudinary\.com\//.test(j.url || ""), "returns Cloudinary secure_url: " + j.url);
    assert((j.public_id || "").startsWith("portfolio/"), "stored in 'portfolio' folder");
    publicId = j.public_id;
  }

  console.log("\n[upload] reject non-image file type");
  {
    const txt = new Blob([Buffer.from("hello")], { type: "text/plain" });
    const fd = new FormData();
    fd.append("image", txt, "x.txt");
    const r = await fetch(BASE + "/api/upload-image", {
      method: "POST",
      headers: { "x-admin-key": ADMIN_PASSWORD },
      body: fd,
    });
    assert(r.status === 415, "415 Unsupported Media Type");
  }

  // Cleanup.
  if (publicId) {
    const del = await cloudinary.uploader.destroy(publicId);
    assert(del.result === "ok", "uploaded asset cleaned up");
  }

  console.log(`\n==== UPLOAD RESULT: ${passed} passed, ${failed} failed ====`);
  await mongod.stop();
  process.exit(failed === 0 ? 0 : 1);
}

main().catch((err) => { console.error("Upload test error:", err); process.exit(1); });
