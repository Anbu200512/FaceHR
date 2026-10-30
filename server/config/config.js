const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const env = process.env.NODE_ENV || 'development';
const isDev = env !== 'production';

// Allowed frontend origins. In production only the configured CLIENT_URL(s) are
// allowed; local dev origins are appended automatically outside production.
const clientUrls = (process.env.CLIENT_URL || 'http://localhost:5173')
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean);
const devOrigins = ['http://localhost:5173', 'http://localhost:3000'];
const corsOrigins = isDev ? [...new Set([...clientUrls, ...devOrigins])] : clientUrls;

const config = {
  env,
  isDev,
  port: parseInt(process.env.PORT, 10) || 5000,
  databaseUrl: process.env.DATABASE_URL || 'postgresql://postgres:postgres@127.0.0.1:5432/facehr?schema=public',
  jwtSecret: process.env.JWT_SECRET || 'facehr-dev-secret-change-me',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '7d',
  clientUrls,
  corsOrigins,
  uploadBaseUrl: process.env.UPLOAD_BASE_URL || `http://localhost:${process.env.PORT || 5000}`,
  // Directory where uploaded photos/documents are stored. Point this at a
  // persistent disk mount on Render (e.g. UPLOAD_DIR=/var/data/uploads).
  uploadsDir: process.env.UPLOAD_DIR
    ? path.resolve(process.env.UPLOAD_DIR)
    : path.join(__dirname, '..', 'uploads'),
  faceMatchThreshold: parseFloat(process.env.FACE_MATCH_THRESHOLD) || 0.6,
  faceModelsPath: process.env.FACE_MODELS_PATH || 'face-models',
  officeStartTime: process.env.OFFICE_START_TIME || '09:30',
  halfDayThresholdHours: parseFloat(process.env.HALF_DAY_THRESHOLD_HOURS) || 4,
  adminEmail: process.env.ADMIN_EMAIL || 'admin@facehr.com',
  adminName: process.env.ADMIN_NAME || 'Super Admin',
  adminPassword: process.env.ADMIN_PASSWORD || 'Admin@123',
  maxImageSizeMb: 5,
  companyName: process.env.COMPANY_NAME || 'FaceHR',
  attendanceLocation: {
    name: process.env.ATTENDANCE_LOCATION_NAME || 'Nuvox Technologies',
    latitude: parseFloat(process.env.ATTENDANCE_LOCATION_LATITUDE) || 13.0866182,
    longitude: parseFloat(process.env.ATTENDANCE_LOCATION_LONGITUDE) || 80.1916159,
  },
  loginUrl: `${clientUrls[0] || 'http://localhost:5173'}/login`,
  smtp: {
    host: process.env.SMTP_HOST || '',
    port: parseInt(process.env.SMTP_PORT, 10) || 587,
    secure: process.env.SMTP_SECURE === 'true',
    user: process.env.SMTP_USER || '',
    pass: process.env.SMTP_PASS || '',
    from: process.env.SMTP_FROM || process.env.SMTP_USER || '',
  },
};

module.exports = config;
