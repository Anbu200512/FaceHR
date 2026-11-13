require('dotenv').config({ path: require('path').join(__dirname, '.env') });

const path = require('path');
const express = require('express');
const cors = require('cors');
const compression = require('compression');
const connectDB = require('./config/db');
const config = require('./config/config');
const mongoCompat = require('./middleware/mongoCompat');
const faceService = require('./services/faceService');
const {
  seedDefaultDepartments,
  seedDefaultLocations,
  seedDefaultDesignations,
  seedAdmin,
  seedSettings,
} = require('./config/seed');
const { seedDefaultPolicies } = require('./services/leavePolicyService');

const app = express();

// ---- middlewares ----
// Behind a reverse proxy (Render), trust the proxy hop(s) so the real client IP
// is used for rate limiting. TRUST_PROXY=1 for Render, 2 for Cloudflare -> Render.
if (!config.isDev) app.set('trust proxy', Number.isFinite(config.trustProxy) ? config.trustProxy : 1);

// gzip JSON/HTML responses — big win for the dashboard payload on slow links.
app.use(compression());

app.use(
  cors({
    origin: (origin, cb) => {
      // Requests without an Origin header (health checks, curl, server-to-server)
      // are allowed; browser origins must be explicitly whitelisted.
      if (!origin) return cb(null, true);
      if (config.corsOrigins.includes(origin)) return cb(null, true);
      return cb(null, false);
    },
    credentials: true,
  })
);
app.use(express.json({ limit: '5mb' }));
app.use(express.urlencoded({ extended: true, limit: '5mb' }));
app.use(mongoCompat);

// Read-through caches are invalidated whenever data changes, so a write from any
// screen is reflected immediately everywhere.
const responseCacheStore = require('./utils/cache');
const MUTATION_CACHE_PREFIXES = ['/api/dashboard', '/api/activity', '/api/departments', '/api/locations'];
app.use((req, res, next) => {
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    for (const prefix of MUTATION_CACHE_PREFIXES) responseCacheStore.delByPrefix(prefix);
  }
  next();
});

// Uploaded files have unique names, so they can be cached aggressively by the browser.
app.use('/uploads', express.static(config.uploadsDir, { maxAge: '7d', immutable: true }));

// ---- optional: serve built client in production ----
const clientDist = path.join(__dirname, '..', 'client', 'dist');
try {
  if (require('fs').existsSync(clientDist)) {
    app.use(express.static(clientDist));
  }
} catch (e) {
  /* noop */
}

// ---- routes ----
app.get('/api/health', async (req, res) => {
  let db = 'up';
  try {
    await require('./config/prisma').$queryRaw`SELECT 1`;
  } catch (e) {
    db = 'down';
  }
  res.status(db === 'down' ? 503 : 200).json({
    success: db === 'up',
    message: db === 'up' ? 'FaceHR API is running' : 'Database unreachable',
    timestamp: new Date().toISOString(),
    db,
    face: faceService.status(),
  });
});

app.use('/api/auth', require('./routes/authRoutes'));
app.use('/api/employees', require('./routes/employeeRoutes'));
app.use('/api/face', require('./routes/faceRoutes'));
app.use('/api/attendance', require('./routes/attendanceRoutes'));
app.use('/api/leaves', require('./routes/leaveRoutes'));
app.use('/api/leave-policies', require('./routes/leavePolicyRoutes'));
app.use('/api/holidays', require('./routes/holidayRoutes'));
app.use('/api/regularizations', require('./routes/regularizationRoutes'));
app.use('/api/announcements', require('./routes/announcementRoutes'));
app.use('/api/payroll', require('./routes/payrollRoutes'));
app.use('/api/resignations', require('./routes/resignationRoutes'));
app.use('/api/departments', require('./routes/departmentRoutes'));
app.use('/api/locations', require('./routes/locationRoutes'));
app.use('/api/designations', require('./routes/designationRoutes'));
app.use('/api/notifications', require('./routes/notificationRoutes'));
app.use('/api/activity', require('./routes/activityRoutes'));
app.use('/api/dashboard', require('./routes/dashboardRoutes'));
app.use('/api/settings', require('./routes/settingRoutes'));

const { notFound, errorHandler } = require('./middleware/error');
app.use(notFound);
app.use(errorHandler);

// ---- start ----
const start = async () => {
  try {
    await connectDB();
    // Seeds touch independent tables, so run them together to cut cold-start time.
    await Promise.all([
      seedDefaultDepartments(),
      seedDefaultLocations(),
      seedDefaultDesignations(),
      seedAdmin(),
      seedSettings(),
      seedDefaultPolicies(),
    ]);

    // Initialize face service in the background (non-blocking, graceful).
    if (config.faceServerEnabled) {
      faceService.init().catch((err) => console.warn('[FaceService] init error:', err.message));
    } else {
      console.log('[FaceService] Server-side face recognition disabled (client-side descriptors are used).');
    }

    const server = app.listen(config.port, () => {
      console.log(`[FaceHR] API running on http://localhost:${config.port}`);
    });

    server.on('error', (err) => {
      if (err.code === 'EADDRINUSE') {
        console.error(`[FaceHR] Port ${config.port} is already in use — an API server is already running.`);
        console.error('[FaceHR] Reuse the running instance (client: http://localhost:5173) instead of starting a second one.');
        process.exit(0);
      }
      console.error('[FaceHR] Server error:', err);
      process.exit(1);
    });

    let shuttingDown = false;
    const shutdown = async (signal) => {
      if (shuttingDown) return;
      shuttingDown = true;
      console.log(`[FaceHR] ${signal} received, shutting down...`);
      // Give in-flight requests up to 10s to finish before force-exit.
      const forceExit = setTimeout(() => process.exit(1), 10000);
      forceExit.unref();
      await new Promise((resolve) => server.close(resolve));
      await connectDB.disconnectDB();
      process.exit(0);
    };
    process.on('SIGINT', () => shutdown('SIGINT'));
    process.on('SIGTERM', () => shutdown('SIGTERM'));

    // Last-resort handlers: log instead of dying silently (Render restarts the process).
    process.on('unhandledRejection', (reason) => {
      console.error('[FaceHR] Unhandled promise rejection:', reason);
    });
    process.on('uncaughtException', (err) => {
      console.error('[FaceHR] Uncaught exception:', err);
      process.exit(1);
    });
  } catch (err) {
    console.error('[FaceHR] Failed to start server:', err.message);
    process.exit(1);
  }
};

start();
