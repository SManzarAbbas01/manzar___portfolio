/* ============================================================
   test/e2e.test.js — FULL stack journey
   Real Express server + real MongoDB (in-memory) + real frontend code
   (config/api/main/admin) running in JSDOM and hitting the live server
   over HTTP. Mirrors the required QA user journey end-to-end.
   Run: node test/e2e.test.js
   ============================================================ */
"use strict";

const fs = require("fs");
const path = require("path");
const { JSDOM } = require("jsdom");
const { MongoMemoryServer } = require("mongodb-memory-server");

const ROOT = path.join(__dirname, "..", "..");
const read = (p) => fs.readFileSync(path.join(ROOT, p), "utf8");

let passed = 0, failed = 0;
function assert(cond, label) {
  if (cond) { passed++; console.log("  ✓ " + label); }
  else { failed++; console.error("  ✗ FAIL: " + label); }
}
const tick = (ms) => new Promise((r) => setTimeout(r, ms));

const BASE = "http://127.0.0.1:5098";
const ADMIN_PASSWORD = "journey-admin-pass";

function buildDom(htmlFile) {
  const dom = new JSDOM(read(htmlFile), {
    url: "http://localhost:5500/" + htmlFile,
    pretendToBeVisual: true,
    runScripts: "outside-only",
  });
  const { window } = dom;
  window.matchMedia = () => ({ matches: false, addListener() {}, removeListener() {}, addEventListener() {}, removeEventListener() {} });
  window.IntersectionObserver = class { observe() {} unobserve() {} disconnect() {} };
  window.requestAnimationFrame = (cb) => setTimeout(() => cb(Date.now()), 0);
  window.cancelAnimationFrame = (id) => clearTimeout(id);
  window.scrollTo = () => {};
  // Route the frontend's fetch to the REAL server using Node's global fetch.
  window.fetch = (url, opts) => globalThis.fetch(url, opts);
  return window;
}
// Load config.js, then point it at the live backend (simulating production
// config), then load the remaining frontend scripts.
function runFront(window, files) {
  window.eval(read("assets/js/config.js"));
  window.PORTFOLIO_CONFIG.API_BASE_URL = BASE;
  files.forEach((f) => window.eval(read(f)));
}

// Poll a DB-backed endpoint so we only proceed once Mongo is actually connected.
async function waitForReady(tries = 100) {
  for (let i = 0; i < tries; i++) {
    try {
      const r = await fetch(BASE + "/api/portfolio");
      if (r.ok) { const j = await r.json(); if (j && j.data && j.data.profile) return; }
    } catch (_) {}
    await tick(200);
  }
  throw new Error("server/DB not ready");
}

async function main() {
  const mongod = await MongoMemoryServer.create();
  process.env.MONGODB_URI = mongod.getUri();
  process.env.ADMIN_PASSWORD = ADMIN_PASSWORD;
  process.env.NODE_ENV = "test";
  process.env.PORT = "5098";
  process.env.CORS_ORIGINS = "";
  require("../server");
  await waitForReady();

  /* ---- Journey 1-2: open portfolio, data loads from MongoDB ---- */
  console.log("\n[1-2] Visitor opens portfolio -> data loads from MongoDB");
  let win = buildDom("index.html");
  runFront(win, ["assets/js/api.js", "assets/js/main.js"]);
  await tick(400);
  assert(/Manzar/.test(win.document.getElementById("heroName").textContent), "hero name rendered from DB");
  assert(win.document.getElementById("projectsMount").querySelectorAll(".proj-card").length === 8, "8 projects from DB");

  /* ---- Journey 3-5: admin logs in, updates profile, saves ---- */
  console.log("\n[3-5] Admin logs in, updates profile, saves to MongoDB");
  const admin = buildDom("admin.html");
  runFront(admin, ["assets/js/api.js", "assets/js/admin.js"]);
  const ad = admin.document;
  ad.getElementById("gatePass").value = ADMIN_PASSWORD;
  ad.getElementById("gateBtn").click();
  await tick(400);
  assert(ad.getElementById("gate").style.display === "none", "admin authenticated against server");
  assert(ad.getElementById("f_name").value === "Manzar Abbas", "admin form loaded from DB");

  const NEW_TAGLINE = "Updated tagline via E2E journey " + Math.floor(passed * 7 + 1);
  ad.getElementById("f_tagline").value = NEW_TAGLINE;
  ad.getElementById("f_name").value = "Manzar Abbas (E2E)";
  ad.getElementById("saveProfile").click();
  await tick(400);

  /* ---- Journey 6-7: refresh browser, verify persistence ---- */
  console.log("\n[6-7] Refresh portfolio -> verify persistence");
  win = buildDom("index.html");
  runFront(win, ["assets/js/api.js", "assets/js/main.js"]);
  await tick(400);
  assert(/E2E/.test(win.document.getElementById("heroName").textContent), "updated name persisted across refresh");
  assert(win.document.getElementById("heroTagline").textContent === NEW_TAGLINE, "updated tagline persisted across refresh");

  /* ---- Direct DB-truth check via raw API ---- */
  console.log("\n[verify] Raw GET reflects the saved change");
  const raw = await (await fetch(BASE + "/api/portfolio")).json();
  assert(raw.data.profile.tagline === NEW_TAGLINE, "MongoDB document holds the new tagline");
  assert(raw.data.profile.name === "Manzar Abbas (E2E)", "MongoDB document holds the new name");

  /* ---- Image-URL storage check (simulating post-upload save) ---- */
  console.log("\n[8-10] Image URL (Cloudinary) is stored as a URL, never base64");
  const imgUrl = "https://res.cloudinary.com/dt0cofvln/image/upload/v1/portfolio/test.jpg";
  await fetch(BASE + "/api/portfolio", {
    method: "PUT",
    headers: { "Content-Type": "application/json", "x-admin-key": ADMIN_PASSWORD },
    body: JSON.stringify({ profile: { image: imgUrl } }),
  });
  const raw2 = await (await fetch(BASE + "/api/portfolio")).json();
  assert(raw2.data.profile.image === imgUrl, "image stored as Cloudinary URL");
  assert(!/^data:/.test(raw2.data.profile.image), "image is NOT a base64 data-URI");

  console.log(`\n==== E2E RESULT: ${passed} passed, ${failed} failed ====`);
  await mongod.stop();
  process.exit(failed === 0 ? 0 : 1);
}

main().catch((err) => { console.error("E2E harness error:", err); process.exit(1); });
