/* ============================================================
   test/integration.test.js — end-to-end API validation
   Spins up an in-memory MongoDB, boots the real Express app, and
   exercises GET/PUT/upload/auth/validation paths. Run: node test/integration.test.js
   (Dev-only; requires devDependency mongodb-memory-server.)
   ============================================================ */
"use strict";

const { MongoMemoryServer } = require("mongodb-memory-server");

let passed = 0;
let failed = 0;
function assert(cond, label) {
  if (cond) {
    passed++;
    console.log("  ✓ " + label);
  } else {
    failed++;
    console.error("  ✗ FAIL: " + label);
  }
}

async function main() {
  const mongod = await MongoMemoryServer.create();
  const uri = mongod.getUri();

  // Configure env BEFORE requiring the app.
  process.env.MONGODB_URI = uri;
  process.env.ADMIN_PASSWORD = "test-admin-pass";
  process.env.NODE_ENV = "test";
  process.env.PORT = "5099";
  process.env.CORS_ORIGINS = ""; // allow all in test

  const app = require("../server");

  // Wait for the server to be listening + DB connected.
  const base = "http://127.0.0.1:5099";
  await waitForHealth(base);

  console.log("\n[1] GET /api/portfolio (seeds defaults)");
  {
    const r = await fetch(base + "/api/portfolio");
    const j = await r.json();
    assert(r.status === 200, "returns 200");
    assert(j.success === true, "success:true");
    assert(j.data && j.data.profile.name === "Manzar Abbas", "seeded profile name correct");
    assert(Array.isArray(j.data.projects) && j.data.projects.length === 8, "8 seeded projects");
    assert(j.data.certifications.length === 13, "13 seeded certifications");
  }

  console.log("\n[2] PUT /api/portfolio without auth -> 401");
  {
    const r = await fetch(base + "/api/portfolio", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ profile: { name: "Hacker" } }),
    });
    assert(r.status === 401, "rejected with 401");
  }

  console.log("\n[3] PUT /api/portfolio with wrong password -> 401");
  {
    const r = await fetch(base + "/api/portfolio", {
      method: "PUT",
      headers: { "Content-Type": "application/json", "x-admin-key": "wrong" },
      body: JSON.stringify({ profile: { name: "Hacker" } }),
    });
    assert(r.status === 401, "rejected with 401");
  }

  console.log("\n[4] PUT /api/portfolio with bad body shape -> 400");
  {
    const r = await fetch(base + "/api/portfolio", {
      method: "PUT",
      headers: { "Content-Type": "application/json", "x-admin-key": "test-admin-pass" },
      body: JSON.stringify({ projects: "not-an-array" }),
    });
    assert(r.status === 400, "rejected with 400");
  }

  console.log("\n[5] PUT /api/portfolio with invalid email -> 400");
  {
    const r = await fetch(base + "/api/portfolio", {
      method: "PUT",
      headers: { "Content-Type": "application/json", "x-admin-key": "test-admin-pass" },
      body: JSON.stringify({ profile: { email: "not-an-email" } }),
    });
    assert(r.status === 400, "rejected with 400");
  }

  console.log("\n[6] PUT /api/portfolio valid partial update + persistence");
  {
    const r = await fetch(base + "/api/portfolio", {
      method: "PUT",
      headers: { "Content-Type": "application/json", "x-admin-key": "test-admin-pass" },
      body: JSON.stringify({
        profile: { name: "Manzar A. Updated", image: "https://res.cloudinary.com/x/portfolio/p.jpg" },
        projects: [{ title: "New Project", desc: "d", tags: ["x"], link: "" }],
      }),
    });
    const j = await r.json();
    assert(r.status === 200, "returns 200");
    assert(j.data.profile.name === "Manzar A. Updated", "profile name updated");
    assert(j.data.profile.role === "Full Stack Developer & AI Engineer", "untouched profile field preserved (merge)");
    assert(j.data.profile.image.includes("cloudinary"), "image URL stored (not base64)");
    assert(j.data.projects.length === 1 && j.data.projects[0].title === "New Project", "projects replaced");

    // Re-fetch to confirm persistence.
    const r2 = await fetch(base + "/api/portfolio");
    const j2 = await r2.json();
    assert(j2.data.profile.name === "Manzar A. Updated", "persisted across requests");
    assert(j2.data.certifications.length === 13, "untouched section (certifications) preserved");
  }

  console.log("\n[7] POST /api/login");
  {
    const ok = await fetch(base + "/api/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password: "test-admin-pass" }),
    });
    assert(ok.status === 200, "correct password -> 200");
    const bad = await fetch(base + "/api/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password: "nope" }),
    });
    assert(bad.status === 401, "wrong password -> 401");
  }

  console.log("\n[8] POST /api/upload-image without auth -> 401");
  {
    const r = await fetch(base + "/api/upload-image", { method: "POST" });
    assert(r.status === 401, "rejected with 401");
  }

  console.log("\n[9] Unknown route -> 404");
  {
    const r = await fetch(base + "/api/does-not-exist");
    assert(r.status === 404, "returns 404");
  }

  console.log(`\n==== RESULT: ${passed} passed, ${failed} failed ====`);

  await mongod.stop();
  process.exit(failed === 0 ? 0 : 1);
}

async function waitForHealth(base, tries = 50) {
  for (let i = 0; i < tries; i++) {
    try {
      const r = await fetch(base + "/health");
      if (r.ok) return;
    } catch (_) {
      /* not up yet */
    }
    await new Promise((res) => setTimeout(res, 200));
  }
  throw new Error("Server did not become healthy in time.");
}

main().catch((err) => {
  console.error("Test harness error:", err);
  process.exit(1);
});
