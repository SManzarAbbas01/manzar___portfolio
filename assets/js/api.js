/* ============================================================
   api.js — Frontend API layer (replaces store.js / localStorage)
   Talks to the Express backend: GET/PUT /api/portfolio,
   POST /api/upload-image, POST /api/login.
   No portfolio data ever touches localStorage anymore.
   ============================================================ */
(function (global) {
  "use strict";

  /* ---------- Resolve backend base URL ---------- */
  function resolveBaseURL() {
    var cfg = global.PORTFOLIO_CONFIG || {};
    if (cfg.API_BASE_URL) return cfg.API_BASE_URL.replace(/\/+$/, "");
    var host = location.hostname;
    if (host === "localhost" || host === "127.0.0.1" || host === "") {
      return "http://localhost:5000";
    }
    // Same-origin fallback (only works if frontend + backend share a host).
    return "";
  }

  var BASE = resolveBaseURL();
  var ADMIN_KEY_STORE = "manzar_admin_key"; // sessionStorage (NOT localStorage, NOT portfolio data)

  /* ---------- Default avatar (UI asset, mirrors backend seed) ---------- */
  var DEFAULT_AVATAR =
    "data:image/svg+xml;utf8," +
    encodeURIComponent(
      '<svg xmlns="http://www.w3.org/2000/svg" width="600" height="720" viewBox="0 0 600 720">' +
        '<defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1">' +
        '<stop offset="0" stop-color="#1b1f26"/><stop offset="1" stop-color="#0d0f13"/>' +
        "</linearGradient></defs>" +
        '<rect width="600" height="720" fill="url(#g)"/>' +
        '<circle cx="300" cy="290" r="120" fill="none" stroke="#f5c451" stroke-width="3" opacity="0.5"/>' +
        '<text x="300" y="330" font-family="Syne, sans-serif" font-size="160" font-weight="800" ' +
        'fill="#f5c451" text-anchor="middle">MA</text>' +
        '<text x="300" y="470" font-family="JetBrains Mono, monospace" font-size="26" ' +
        'fill="#8b9099" text-anchor="middle" letter-spacing="6">UPLOAD PHOTO</text>' +
        "</svg>"
    );

  /* ---------- Admin session key helpers (sessionStorage) ---------- */
  function getAdminKey() {
    try {
      return sessionStorage.getItem(ADMIN_KEY_STORE) || "";
    } catch (e) {
      return "";
    }
  }
  function setAdminKey(key) {
    try {
      if (key) sessionStorage.setItem(ADMIN_KEY_STORE, key);
      else sessionStorage.removeItem(ADMIN_KEY_STORE);
    } catch (e) {
      /* ignore */
    }
  }

  /* ---------- Low-level request helper ---------- */
  function request(path, options) {
    options = options || {};
    var url = BASE + path;
    return fetch(url, options).then(function (res) {
      return res
        .json()
        .catch(function () {
          return {};
        })
        .then(function (body) {
          if (!res.ok) {
            var msg =
              (body && body.error) ||
              "Request failed (" + res.status + " " + res.statusText + ")";
            var err = new Error(msg);
            err.status = res.status;
            throw err;
          }
          return body;
        });
    });
  }

  /* ---------- Public API ---------- */

  // GET /api/portfolio -> full portfolio object
  function getPortfolio() {
    return request("/api/portfolio", { method: "GET" }).then(function (body) {
      return body.data;
    });
  }

  // PUT /api/portfolio (admin) -> updated portfolio object
  function savePortfolio(data) {
    return request("/api/portfolio", {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        "x-admin-key": getAdminKey(),
      },
      body: JSON.stringify(data),
    }).then(function (body) {
      return body.data;
    });
  }

  // POST /api/upload-image (admin) -> secure_url string
  function uploadImage(file) {
    var fd = new FormData();
    fd.append("image", file);
    return request("/api/upload-image", {
      method: "POST",
      headers: { "x-admin-key": getAdminKey() }, // do NOT set Content-Type; browser sets multipart boundary
      body: fd,
    }).then(function (body) {
      return body.url;
    });
  }

  // POST /api/login — validates password; on success stores key for the session.
  function login(password) {
    return request("/api/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password: password }),
    }).then(function (body) {
      setAdminKey(password);
      return body;
    });
  }

  function logout() {
    setAdminKey("");
  }

  function isAuthed() {
    return !!getAdminKey();
  }

  global.API = {
    BASE_URL: BASE,
    DEFAULT_AVATAR: DEFAULT_AVATAR,
    getPortfolio: getPortfolio,
    savePortfolio: savePortfolio,
    uploadImage: uploadImage,
    login: login,
    logout: logout,
    isAuthed: isAuthed,
  };
})(window);
