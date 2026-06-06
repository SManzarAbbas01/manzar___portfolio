/* ============================================================
   test/frontend.test.js — JSDOM render validation for the frontend
   Loads index.html + admin.html into JSDOM, stubs the network, executes
   config.js/api.js/main.js (and admin.js), and asserts the DOM is
   populated correctly from API data. Verifies no Store/localStorage path.
   Run: node test/frontend.test.js
   ============================================================ */
"use strict";

const fs = require("fs");
const path = require("path");
const { JSDOM } = require("jsdom");

const ROOT = path.join(__dirname, "..", "..");
const read = (p) => fs.readFileSync(path.join(ROOT, p), "utf8");

const { DEFAULT_DATA } = require("../data/defaultData");

let passed = 0;
let failed = 0;
function assert(cond, label) {
  if (cond) { passed++; console.log("  ✓ " + label); }
  else { failed++; console.error("  ✗ FAIL: " + label); }
}

// Seeded portfolio payload the stubbed backend "returns".
const PORTFOLIO = JSON.parse(JSON.stringify(DEFAULT_DATA));
PORTFOLIO.profile.image = "https://res.cloudinary.com/dt0cofvln/image/upload/portfolio/photo.jpg";

function buildDom(htmlFile) {
  const html = read(htmlFile);
  const dom = new JSDOM(html, {
    url: "http://localhost:5500/" + htmlFile,
    pretendToBeVisual: true,
    runScripts: "outside-only",
  });
  const { window } = dom;

  // --- Polyfills for browser APIs JSDOM lacks ---
  window.matchMedia = window.matchMedia || function () {
    return { matches: false, addListener() {}, removeListener() {}, addEventListener() {}, removeEventListener() {} };
  };
  window.IntersectionObserver = class {
    constructor(cb) { this.cb = cb; }
    observe() {}
    unobserve() {}
    disconnect() {}
  };
  window.requestAnimationFrame = (cb) => setTimeout(() => cb(Date.now()), 0);
  window.cancelAnimationFrame = (id) => clearTimeout(id);
  window.scrollTo = () => {};

  return { dom, window };
}

// Execute project JS files inside the JSDOM window's global scope.
function evalInWindow(window, files) {
  for (const f of files) {
    window.eval(read(f));
  }
}

async function tick(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

/* ============================================================
   TEST 1 — index.html renders portfolio from the API
   ============================================================ */
async function testIndex() {
  console.log("\n[index.html] renders from GET /api/portfolio");
  const { window } = buildDom("index.html");

  // Stub fetch: GET /api/portfolio -> seeded data.
  let getCalled = false;
  window.fetch = async (url, opts) => {
    if (String(url).endsWith("/api/portfolio") && (!opts || !opts.method || opts.method === "GET")) {
      getCalled = true;
      return { ok: true, status: 200, statusText: "OK", json: async () => ({ success: true, data: PORTFOLIO }) };
    }
    return { ok: false, status: 404, statusText: "Not Found", json: async () => ({ success: false, error: "nope" }) };
  };

  evalInWindow(window, ["assets/js/config.js", "assets/js/api.js", "assets/js/main.js"]);
  await tick(150);

  const d = window.document;
  assert(getCalled, "called GET /api/portfolio");
  assert(/Manzar/.test(d.getElementById("heroName").textContent), "hero name rendered");
  assert(d.getElementById("heroTagline").textContent === PORTFOLIO.profile.tagline, "tagline rendered");
  assert(d.getElementById("heroImg").getAttribute("src").includes("cloudinary"), "hero image uses Cloudinary URL");
  assert(d.getElementById("projectsMount").querySelectorAll(".proj-card").length === 8, "8 project cards rendered");
  assert(d.getElementById("skillsMount").querySelectorAll(".skill-cat").length === 7, "7 skill categories rendered");
  assert(d.getElementById("certMount").querySelectorAll(".cert-card").length === 13, "13 certifications rendered");
  assert(d.getElementById("timelineMount").querySelectorAll(".tl-item").length === 3, "3 experience items rendered");
  assert(d.getElementById("eduMount").querySelectorAll(".edu-card").length === 1, "1 education entry rendered");
  assert(typeof window.Store === "undefined", "window.Store is NOT defined (store.js removed)");
  assert(typeof window.API === "object", "window.API layer present");
}

/* ============================================================
   TEST 2 — index.html shows a graceful error if backend is down
   ============================================================ */
async function testIndexError() {
  console.log("\n[index.html] graceful failure when backend unreachable");
  const { window } = buildDom("index.html");
  window.fetch = async () => { throw new Error("network down"); };

  evalInWindow(window, ["assets/js/config.js", "assets/js/api.js", "assets/js/main.js"]);
  await tick(450); // preloader dismisses on a 250ms timer after the data promise settles

  const d = window.document;
  assert(/server/i.test(d.getElementById("heroTagline").textContent), "shows friendly error message");
  assert(d.getElementById("preloader").classList.contains("done"), "preloader is dismissed even on error");
}

/* ============================================================
   TEST 3 — admin.html login -> load -> render
   ============================================================ */
async function testAdmin() {
  console.log("\n[admin.html] login + load + render + save");
  const { window } = buildDom("admin.html");

  const calls = { login: 0, get: 0, put: 0 };
  let putBody = null;
  window.fetch = async (url, opts) => {
    url = String(url);
    const method = (opts && opts.method) || "GET";
    if (url.endsWith("/api/login")) {
      calls.login++;
      const body = JSON.parse(opts.body);
      if (body.password === "secret") return { ok: true, status: 200, json: async () => ({ success: true }) };
      return { ok: false, status: 401, statusText: "Unauthorized", json: async () => ({ success: false, error: "bad" }) };
    }
    if (url.endsWith("/api/portfolio") && method === "GET") {
      calls.get++;
      return { ok: true, status: 200, json: async () => ({ success: true, data: PORTFOLIO }) };
    }
    if (url.endsWith("/api/portfolio") && method === "PUT") {
      calls.put++;
      putBody = JSON.parse(opts.body);
      // Echo back merged data.
      return { ok: true, status: 200, json: async () => ({ success: true, data: Object.assign({}, PORTFOLIO, putBody) }) };
    }
    return { ok: false, status: 404, statusText: "Not Found", json: async () => ({}) };
  };

  evalInWindow(window, ["assets/js/config.js", "assets/js/api.js", "assets/js/admin.js"]);
  const d = window.document;

  // Initially gated.
  assert(d.getElementById("shell").style.display === "none", "admin shell hidden before login");

  // Wrong password.
  d.getElementById("gatePass").value = "wrong";
  d.getElementById("gateBtn").click();
  await tick(80);
  assert(calls.login === 1, "login attempted");
  assert(d.getElementById("shell").style.display === "none", "still gated after wrong password");

  // Correct password.
  d.getElementById("gatePass").value = "secret";
  d.getElementById("gateBtn").click();
  await tick(120);
  assert(d.getElementById("gate").style.display === "none", "gate hidden after correct login");
  assert(calls.get === 1, "fetched portfolio after login");
  assert(d.getElementById("f_name").value === "Manzar Abbas", "profile form populated from API");
  assert(d.getElementById("projList").querySelectorAll(".item").length === 8, "8 projects listed in admin");
  assert(d.getElementById("certList").querySelectorAll(".item").length === 13, "13 certs listed in admin");

  // Edit profile + save -> PUT.
  d.getElementById("f_name").value = "Manzar Abbas Edited";
  d.getElementById("saveProfile").click();
  await tick(80);
  assert(calls.put === 1, "PUT /api/portfolio called on save");
  assert(putBody && putBody.profile.name === "Manzar Abbas Edited", "edited name sent in PUT body");
  assert(typeof window.Store === "undefined", "window.Store is NOT defined in admin (store.js removed)");
}

async function main() {
  await testIndex();
  await testIndexError();
  await testAdmin();
  console.log(`\n==== FRONTEND RESULT: ${passed} passed, ${failed} failed ====`);
  process.exit(failed === 0 ? 0 : 1);
}

main().catch((err) => {
  console.error("Frontend test harness error:", err);
  process.exit(1);
});
