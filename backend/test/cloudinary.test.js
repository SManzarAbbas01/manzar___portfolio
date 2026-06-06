/* ============================================================
   test/cloudinary.test.js — live Cloudinary upload smoke test
   Uploads a tiny in-memory PNG to the "portfolio" folder, verifies a
   secure_url is returned, then deletes the asset so nothing is left behind.
   Reads credentials from CLOUDINARY_* env vars (loaded via dotenv).
   Run: node test/cloudinary.test.js
   ============================================================ */
"use strict";

const path = require("path");
// Load env from backend/.env if present.
require("dotenv").config({ path: path.join(__dirname, "..", ".env") });

const { cloudinary, uploadBuffer } = require("../config/cloudinary");

// A valid 1x1 transparent PNG.
const PNG_1x1_BASE64 =
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==";

async function main() {
  if (
    !process.env.CLOUDINARY_CLOUD_NAME ||
    !process.env.CLOUDINARY_API_KEY ||
    !process.env.CLOUDINARY_API_SECRET
  ) {
    console.error(
      "SKIP: Cloudinary env vars not set. Create backend/.env from .env.example first."
    );
    process.exit(2);
  }

  const buf = Buffer.from(PNG_1x1_BASE64, "base64");

  console.log("[cloudinary] Uploading test image to folder 'portfolio'…");
  const result = await uploadBuffer(buf, "portfolio");

  let ok = true;
  function check(c, label) {
    console.log((c ? "  ✓ " : "  ✗ FAIL: ") + label);
    if (!c) ok = false;
  }

  check(!!result.secure_url, "secure_url returned: " + result.secure_url);
  check(/^https:\/\//.test(result.secure_url || ""), "secure_url is HTTPS");
  check(
    (result.public_id || "").startsWith("portfolio/"),
    "stored in 'portfolio' folder (public_id: " + result.public_id + ")"
  );

  // Cleanup — delete the test asset.
  console.log("[cloudinary] Deleting test asset…");
  const del = await cloudinary.uploader.destroy(result.public_id);
  check(del.result === "ok", "test asset deleted (cleanup)");

  console.log(ok ? "\n==== Cloudinary: PASS ====" : "\n==== Cloudinary: FAIL ====");
  process.exit(ok ? 0 : 1);
}

main().catch((err) => {
  console.error("Cloudinary test error:", err.message);
  process.exit(1);
});
