<div align="center">

# 🧑💼 FaceHR

**Smart HR Management with Face-Based Attendance**

A full-stack **PERN** (PostgreSQL · Express · React · Node) Human Resources management system featuring **real face recognition check-in / check-out** in the browser, role-based dashboards, leave management, departments, reports and exports, dark mode, and a fully responsive UI.

</div>

---

## ✨ Features

### Authentication & Roles
- **Admin** — full control: employees, attendance, departments/designations, leaves, reports, settings.
- **Employee** — self check-in/out, attendance history, leave requests, own profile.
- JWT-based login with "remember me", protected routes (401 auto-logout), change-password flow, forgot-password that alerts admins.

### 👤 Face Recognition Attendance
- **Registration:** Admin captures a photo of each employee via the browser camera. Only a single photo and a one-time 128‑dimension **biometric descriptor** are stored — **no raw video or full face-vector history is retained**.
- **Check-in / Check-out:** The employee looks at the camera; the app auto-captures 3 stable good frames, computes the descriptor **entirely in the browser** (private by design), and the server matches it against the stored profile using **Euclidean distance** vs. a configurable threshold.
- Status is decided automatically: **Present / Late** (vs. office start time), **Half Day** (at check-out vs. half-day threshold), **Absent / On Leave** (computed at read time).
- Every verification stores the check-in/check-out photo, match distance, and device info for audit — viewable in the photo gallery.

### 🏢 HR Management
- Employees (CRUD + soft-deactivate, auto-created login account, generated password shown once).
- Departments (with department head) and Designations.
- Leave requests (apply / approve / reject with admin note + notifications) and annual leave balance.
- Smart notifications bell (unread counts live).

### 📊 Reports & Exports
- Interactive dashboard with today's live board.
- Attendance trend line chart, status breakdown pie, per-department bars (Recharts).
- CSV & PDF export (jspdf + autotable) for report and record views.
- Monthly attendance matrix + per-employee calendar view (History).

### 🎨 UX
- Fully responsive, mobile-friendly (drawer nav, card fallbacks).
- **Dark mode** toggle (persisted).
- Debounced search, server-side pagination, skeleton loading, empty states, toasts.

---

## 🛠 Tech Stack

| Layer     | Technology |
|-----------|-----------|
| Frontend  | React 18, Vite 6, Tailwind CSS 3, React Router 6, react-hook-form, axios, lucide-react, Recharts, jsPDF |
| Face AI   | face-api.js 0.22 (tinyFaceDetector + faceLandmark68 + faceRecognitionNet) — descriptors computed client-side |
| Backend   | Node.js, Express |
| Database  | PostgreSQL 14+ via Prisma ORM |
| Auth      | JWT + bcrypt (rate-limited login/register endpoints) |
| Build     | npm workspaces (`client/` + `server/`) |

---

## 📁 Project Structure

```
facehr/
├── package.json              # npm workspaces root
├── render.yaml               # Render blueprint (API service config)
├── server/
│   ├── .env                  # local backend config (dev only)
│   ├── server.js             # express entry (mounts /api routes, seeds)
│   ├── prisma/               # schema.prisma + seed script
│   ├── config/               # config, prisma client, db (connect), seed (default admin)
│   ├── middleware/           # auth, upload, rateLimiter, validate, error, mongoCompat
│   ├── services/             # faceService, faceVerification, attendanceService,
│   │                         # notificationService, attendanceSettingsService
│   ├── controllers/          # auth, employee, face, attendance, report, leave,
│   │                         # department, designation, notification, setting, dashboard
│   ├── routes/
│   └── face-models/          # downloaded face-api weights (server side, optional)
└── client/
    ├── .env                  # VITE_API_BASE_URL / VITE_UPLOAD_BASE_URL
    ├── vite.config.js        # dev proxy /api + /uploads -> :5000
    ├── public/models/        # face-api weights served to the browser (REQUIRED)
    └── src/
        ├── App.jsx           # route tree
        ├── main.jsx          # providers + BrowserRouter
        ├── layouts/          # Admin / Employee / Auth layouts
        ├── pages/admin/ …    # Dashboard, Employees, Attendance, etc.
        ├── pages/employee/ … # Dashboard, FaceAttendance, History, MyLeaves, Profile
        ├── components/       # FaceCapture, PageHeader, ui/*, etc.
        ├── context/          # Auth, Theme, Toast
        ├── hooks/            # useApi, usePolling, useDebounce
        └── services/         # api, format, export, faceRecognition, static
```

---

## 🚀 Getting Started (Local)

### Prerequisites
- **Node.js ≥ 18** (tested on v22/v24)
- **PostgreSQL 14+** running locally, or a hosted PostgreSQL URL (Neon, Supabase, Render).

### 1. Clone & install
```bash
git clone <your-repo-url>
cd facehr
npm install --workspaces
```

### 2. Configure environment
Create `server/.env` with the backend variables listed under [Environment Variables](#environment-variables) (`DATABASE_URL`, `JWT_SECRET`, etc.).

Then create the database schema (from the repo root):
```bash
# Option A (recommended): versioned migration
npm run db:migrate --workspace server

# Option B: quick sync for local prototyping
npm run db:push --workspace server
```
Default departments, locations, designations, settings and the admin account are seeded automatically on first server start (or run `npm run db:seed --workspace server`).

```bash
# Frontend
# client/.env already ships with sensible dev defaults; VITE_UPLOAD_BASE_URL
# is only needed when the client is hosted separately from the backend.
```

### 3. Download the face models
The browser needs three models under `client/public/models/`. The repo already ships them, but to re-download / verify:
```bash
npm run dev:server   # models are verified on boot
# or run the server-side downloader:
node server/scripts/download-face-models.js
```

### 4. Run
```bash
npm run dev
```
This starts **both** the API (`http://localhost:5000`) and the Vite client (`http://localhost:5173`) via `concurrently`. The Vite dev server proxies `/api` and `/uploads` to the backend.

### Default admin
| Email | Password | Role |
|-------|----------|------|
| `admin@facehr.com` | `Admin@123` | Admin |

> Change these before deploying to production (set via `ADMIN_*` env vars; the seeded values are only applied on first start).

---

## 🌐 Environment Variables

**Server (`server/.env` — locally; Render dashboard — production)**
| Variable | Purpose | Default |
|----------|---------|---------|
| `PORT` | API port | `5000` |
| `NODE_ENV` | `development` / `production` | `development` |
| `DATABASE_URL` | PostgreSQL connection string (`postgresql://user:password@host:5432/facehr?schema=public`) | — |
| `JWT_SECRET` | JWT signing secret (use a long random string) | — |
| `JWT_EXPIRES_IN` | Token lifetime | `7d` |
| `CLIENT_URL` | Allowed CORS origin(s) | `http://localhost:5173` |
| `UPLOAD_BASE_URL` | Public base for uploaded photos | `http://localhost:5000` |
| `FACE_MATCH_THRESHOLD` | Euclidean distance threshold (lower = stricter) | `0.6` |
| `FACE_MODELS_PATH` | (Optional) server-side model dir | `face-models` |
| `OFFICE_START_TIME` | Late cutoff (24h) | `09:30` |
| `HALF_DAY_THRESHOLD_HOURS` | Hours below which = Half Day | `4` |
| `ADMIN_EMAIL` / `ADMIN_NAME` / `ADMIN_PASSWORD` | Seeded default admin | — |

**Client (`client/.env`)**
| Variable | Purpose | Default |
|----------|---------|---------|
| `VITE_API_BASE_URL` | API base (use full URL only if not proxied/same-origin) | `/api` |
| `VITE_UPLOAD_BASE_URL` | Public base of backend uploads when frontend is hosted separately | *(empty)* |

---

## 📄 API Overview

Base path: `/api` — responses follow `{ success, message, data?, meta? }`; errors return friendly `message` (status codes 400/401/403/404/409).

### Auth
| Method | Endpoint | Access |
|--------|----------|--------|
| POST | `/auth/login` | Public |
| POST | `/auth/register` | Public (rate-limited) |
| GET | `/auth/me` | Any authenticated |
| POST | `/auth/change-password` | Any authenticated |
| POST | `/auth/forgot-password` | Public |

### Employees
`GET /employees` (search, department, status, noFace, pagination) · `GET/PUT/DELETE /employees/:id` · `POST /employees` (creates linked login) · `GET /employees/:id/attendance`

### Face
`POST /face/register` (admin, multipart `image` + `descriptor`) · `POST /face/verify` · `GET/DELETE /face/:employeeId`

### Attendance
`POST /attendance/check-in` · `POST /attendance/check-out` (multipart `image` + `descriptor`) · `GET /attendance/today` · `GET /attendance` (admin, filters) · `GET /attendance/:employeeId?month=&year=` · `GET /attendance/report?from=&to=&department=&employee=&detail=`

### Leaves / Departments / Designations / Notifications / Settings
Leaf CRUD (+ `approve`/`reject`), Department & Designation CRUD, `GET /leaves/mine`, `GET /leaves/balance`, notification read/unread, and `GET/PUT /settings`.

> **Face recognition detail:** `verifyAgainstProfile` prefers a server-computed descriptor when the optional native TensorFlow backend (`@tensorflow/tfjs-node`) is installed. By default that native backend is **not** installed (it requires native compilation), so matching uses the **browser-computed descriptor** sent as a JSON-string form field — the server still validates shape/presence and enforces the threshold. This is fully functional; enabling the native backend is purely an optimization, never a requirement.

---

## ☁️ Deployment

A proven, low-cost setup: **Vercel (frontend)** + **Render (API)** + **Neon / Supabase / Render PostgreSQL (database)**.

The repo ships a **`render.yaml`** blueprint at the root — Render picks it up automatically on first connect.

### PostgreSQL
1. Create a database (Neon, Supabase, Render Postgres, or self-hosted) and copy its connection string into `DATABASE_URL`.
2. Migrations run automatically on every deploy via the blueprint's **release command** (`npm run db:deploy` → `prisma migrate deploy`). No manual step needed.

### API (Render)
1. New service: **New → Web Service → connect this repo**. Render detects `render.yaml` and fills root directory, build, start, release and health-check settings.
2. Existing service (the one configured manually): fix it in the dashboard:
   - **Root Directory:** `server`
   - **Build Command:** `npm install`
   - **Start Command:** `npm start`   ← do **NOT** use `--workspace` flags; the service root is already `server/`
   - **Release Command:** `npm run db:deploy`
   - **Health Check Path:** `/api/health`
3. Environment variables (render.yaml lists them; set the `sync: false` ones in the dashboard):
   - `DATABASE_URL` — production Postgres connection string
   - `JWT_SECRET` — long random string (auto-generated by the blueprint if left alone)
   - `CLIENT_URL` — your Vercel URL (enables CORS), e.g. `https://facehr.vercel.app`
   - `UPLOAD_BASE_URL` — this API's public URL, e.g. `https://facehr-api.onrender.com`
   - `ADMIN_PASSWORD` — strong password for the seeded admin (default `Admin@123` is refused in production via env)
4. **Uploads are lost on every redeploy** unless you attach a Render Persistent Disk:
   - Disks → Add Disk → mount path `/var/data/uploads`
   - Set `UPLOAD_DIR=/var/data/uploads`
5. The server fails fast at boot if `DATABASE_URL` or `JWT_SECRET` is missing in production — check the logs if the deploy crashes immediately.

### Frontend (Vercel)
1. **New → Project → import this repo.**
2. Settings:
   - **Root Directory:** `client`   ← required (monorepo)
   - Build/output defaults are auto-detected (`vite build` → `client/dist`)
3. Environment variables (build-time — set before the first deploy, then **Redeploy**):
   - `VITE_API_BASE_URL` → `https://<your-api>.onrender.com/api`
   - `VITE_UPLOAD_BASE_URL` → `https://<your-api>.onrender.com` (origin only, no `/api`)
   > These are inlined at build time. If unset the app silently calls `/api` on Vercel and every request returns the HTML shell — always verify after changing them.
4. The `client/public/models/` folder is committed so face models deploy automatically.

### Production notes
- `NODE_ENV=production` is set by the blueprint; the server refuses to boot without `JWT_SECRET`/`DATABASE_URL`.
- Keep uploads behind the API origin (same origin recommended).
- After first login, change the seeded admin password.

---

## 🔒 Security & Privacy

- **Biometric privacy:** face descriptors are computed **client-side** and only the embedding (plus a single audit photo) is transmitted/stored. No continuous video or raw capture is recorded or retained.
- Rate limiting on auth and face endpoints; server-side duplicate check-in protection (unique index).
- JWT auth with per-route `authorize('admin'/'employee')` guards; passwords hashed with bcrypt.
- Soft-delete employees instead of hard removal to preserve audit history.

---

## 🧪 Testing

There is no bundled automated test suite. Verify a local setup end-to-end:

1. `GET /api/health` returns `{ success: true }`.
2. Log in with the seeded admin account.
3. Create an employee, then check in/out and review the dashboard/report views.

Use a real webcam (`localhost` or HTTPS) for face flows — browsers block `getUserMedia` on insecure origins except `localhost`.

---

## 🤝 Contributing

1. Fork the repository.
2. Create a feature branch: `git checkout -b feature/your-feature`.
3. Commit your changes and open a pull request.

---

## 📄 License

MIT © FaceHR
#   F a c e H R  
 #   F a c e H R  
 