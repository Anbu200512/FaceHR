require('dotenv').config({ path: require('path').join(__dirname, '.env') });

const path = require('path');
const express = require('express');
const cors = require('cors');
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

const app = express();

// ---- middlewares ----
// Behind a reverse proxy (Render), trust the first proxy hop so the real client
// IP is used for rate limiting. Required by express-rate-limit v7 + X-Forwarded-For.
if (!config.isDev) app.set('trust proxy', 1);

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
app.use('/uploads', express.static(config.uploadsDir));

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
    await seedDefaultDepartments();
    await seedDefaultLocations();
    await seedDefaultDesignations();
    await seedAdmin();
    await seedSettings();

    // Initialize face service in the background (non-blocking, graceful)
    faceService.init().catch((err) => console.warn('[FaceService] init error:', err.message));

    const server = app.listen(config.port, () => {
      console.log(`[FaceHR] API running on http://localhost:${config.port}`);
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
