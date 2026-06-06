# Manzar Abbas — Portfolio (Full-Stack CMS)

A production portfolio website with a no-code admin panel. Content lives in
**MongoDB Atlas**, images live in **Cloudinary**, the API is **Node + Express**,
and the static frontend is the original HTML/CSS/JS — **unchanged in design,
animation, styling and responsiveness**. Only the data layer moved from
`localStorage` to a real backend.

```
Admin Panel ─┐
             ├─▶  Express API (Render)  ─▶  MongoDB Atlas   (text content + image URLs)
Portfolio  ──┘                          └─▶  Cloudinary      (image binaries)
Frontend hosted on Vercel
```

## What changed in the migration

| Before                                   | After                                                  |
| ---------------------------------------- | ------------------------------------------------------ |
| `assets/js/store.js` + `localStorage`    | **Removed.** New `assets/js/api.js` calls the backend  |
| Data only on one browser                 | Centralized in MongoDB Atlas — visible everywhere       |
| Images as base64 in `localStorage`       | Uploaded to Cloudinary; only the **secure URL** stored |
| Client-side password in `localStorage`   | Server-side `ADMIN_PASSWORD`, verified per request     |
| `Store.getData()` (sync)                 | `API.getPortfolio()` (async fetch)                     |
| `Store.saveData()`                       | `API.savePortfolio()` → `PUT /api/portfolio`           |

The hero, animations, theme toggle, scroll reveals, tilt/parallax, preloader,
and all section markup are **byte-for-byte the same** apart from the data source.

---

## Project structure

```
Manzar-Abbas-Portfolio/
├── index.html              # Portfolio (unchanged markup; loads config.js + api.js + main.js)
├── admin.html              # Admin panel (unchanged markup; loads config.js + api.js + admin.js)
├── assets/
│   ├── css/                # Unchanged
│   └── js/
│       ├── config.js       # NEW — set your backend URL here for production
│       ├── api.js          # NEW — frontend API layer (replaces store.js)
│       ├── main.js         # UPDATED — async fetch + render
│       └── admin.js        # UPDATED — API + Cloudinary + server auth
├── vercel.json             # Frontend hosting config
├── .vercelignore
└── backend/
    ├── server.js
    ├── package.json
    ├── render.yaml         # Render Blueprint
    ├── .env.example
    ├── config/{db.js,cloudinary.js}
    ├── controllers/portfolioController.js
    ├── middleware/{auth.js,upload.js,validatePortfolio.js,errorHandler.js}
    ├── models/Portfolio.js
    ├── routes/portfolioRoutes.js
    ├── data/defaultData.js # Résumé seed (auto-seeds an empty DB)
    ├── uploads/.gitkeep
    └── test/               # integration / frontend / e2e / cloudinary tests
```

---

## API

| Method | Endpoint            | Auth          | Purpose                                   |
| ------ | ------------------- | ------------- | ----------------------------------------- |
| GET    | `/api/portfolio`    | public        | Fetch the whole portfolio (auto-seeds)    |
| PUT    | `/api/portfolio`    | `x-admin-key` | Update any sections                       |
| POST   | `/api/upload-image` | `x-admin-key` | Upload image → returns Cloudinary `url`   |
| POST   | `/api/login`        | password      | Validate admin password for the panel     |
| GET    | `/health`           | public        | Health check (used by Render)             |

Responses are JSON: `{ success, data }` or `{ success: false, error }`.

---

## 1) Local development

### Backend

```bash
cd backend
npm install
cp .env.example .env        # then edit .env with your real values
npm run dev                 # http://localhost:5000
```

Required `.env` values (see `.env.example`):

```
PORT=5000
NODE_ENV=development
MONGODB_URI=mongodb+srv://USER:URL_ENCODED_PASSWORD@CLUSTER.mongodb.net/portfolio?retryWrites=true&w=majority
CLOUDINARY_CLOUD_NAME=dt0cofvln
CLOUDINARY_API_KEY=...
CLOUDINARY_API_SECRET=...
ADMIN_PASSWORD=your_strong_secret
CORS_ORIGINS=http://localhost:5500,http://127.0.0.1:5500
```

> ⚠️ **MongoDB password encoding:** special characters in the password must be
> URL-encoded. `@` → `%40`, `:` → `%3A`, `/` → `%2F`. e.g. `ManzarAbbas@512`
> becomes `ManzarAbbas%40512`. Also replace the `xxxxx` placeholder cluster host
> in your connection string with your real Atlas cluster, and whitelist your IP
> (or `0.0.0.0/0`) under Atlas → Network Access.

### Frontend

`assets/js/config.js` auto-detects `localhost` and talks to
`http://localhost:5000`, so just serve the static files:

```bash
# from the project root (Manzar-Abbas-Portfolio/)
npx serve .          # or VS Code "Live Server", or: python -m http.server 5500
```

Open `index.html` (portfolio) and `admin.html` (log in with `ADMIN_PASSWORD`).

---

## 2) Deploy the backend → Render

**Option A — Blueprint (uses `backend/render.yaml`):**

1. Push this repo to GitHub.
2. Render → **New + → Blueprint** → select the repo.
3. Render reads `backend/render.yaml` and creates the web service.
4. Add the secret env vars in the dashboard (they're marked `sync:false`):
   `MONGODB_URI`, `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`,
   `CLOUDINARY_API_SECRET`, `ADMIN_PASSWORD`, `CORS_ORIGINS`.

**Option B — Manual web service:**

1. Render → **New + → Web Service** → connect the repo.
2. **Root Directory:** `backend`
3. **Build Command:** `npm install`
4. **Start Command:** `npm start`
5. **Health Check Path:** `/health`
6. Add all env vars above. Set `NODE_ENV=production`.
7. Set `CORS_ORIGINS` to your Vercel URL once you have it, e.g.
   `https://manzar-portfolio.vercel.app` (comma-separate multiples, no slash).

Render gives you a URL like `https://manzar-portfolio-backend.onrender.com`.
Verify: open `…/health` → `{"success":true,"status":"healthy"}`.

> Render's free tier sleeps after inactivity; the first request after idle may
> take ~30–50s to wake. This is expected on free plans.

---

## 3) Deploy the frontend → Vercel

1. **Edit `assets/js/config.js`** and set your Render URL:

   ```js
   window.PORTFOLIO_CONFIG = {
     API_BASE_URL: "https://manzar-portfolio-backend.onrender.com",
   };
   ```

   Commit and push this change.

2. Vercel → **Add New → Project** → import the repo.
3. **Framework Preset:** Other. **Root Directory:** the project folder
   (the one containing `index.html`). No build command (static site).
   `.vercelignore` already excludes `backend/`.
4. Deploy. You'll get `https://<project>.vercel.app`.

5. **Back on Render**, set `CORS_ORIGINS` to include that Vercel URL, then
   redeploy the backend so the browser is allowed to call the API.

---

## 4) Tests

```bash
cd backend
npm test                 # integration + frontend (jsdom) + full e2e journey
npm run test:cloudinary  # live Cloudinary upload+delete smoke test (needs .env)
```

- `test:integration` — real Express + in-memory MongoDB: GET/PUT/auth/validation/persistence
- `test:frontend` — JSDOM renders `index.html`/`admin.html` from the API
- `test:e2e` — real frontend → real server → real DB full user journey
- `test:cloudinary` — uploads a 1×1 PNG to the `portfolio` folder, then deletes it

The first test run downloads a MongoDB binary for the in-memory server (~one time).

---

## Security notes

- No secrets in code — everything via environment variables.
- `ADMIN_PASSWORD` checked server-side with constant-time comparison.
- `helmet` security headers, configurable CORS allow-list, and rate limiting on
  write/upload/login routes.
- Image type + size validation (JPG/PNG/WEBP/GIF/AVIF, ≤ 8 MB).
- Centralized error handling returns proper HTTP status codes and never leaks
  stack traces in production.
