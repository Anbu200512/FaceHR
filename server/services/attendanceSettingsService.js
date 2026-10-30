const prisma = require('../config/prisma');
const config = require('../config/config');

const FACE_KEY = 'attendanceFaceEnabled';
const GEO_KEY = 'attendanceGeoEnabled';
const LOCATION_KEY = 'attendanceCompanyLocation';

const DEFAULTS = {
  faceEnabled: true,
  geoEnabled: true,
  location: {
    name: config.attendanceLocation.name,
    latitude: config.attendanceLocation.latitude,
    longitude: config.attendanceLocation.longitude,
    allowedRadius: 100,
  },
};

function sanitizeLocation(raw) {
  const loc = raw && typeof raw === 'object' && !Array.isArray(raw) ? raw : {};
  const latitude = Number(loc.latitude);
  const longitude = Number(loc.longitude);
  const allowedRadius = Number(loc.allowedRadius);
  return {
    name: String(loc.name || '').trim() || DEFAULTS.location.name,
    latitude: Number.isFinite(latitude) ? latitude : DEFAULTS.location.latitude,
    longitude: Number.isFinite(longitude) ? longitude : DEFAULTS.location.longitude,
    allowedRadius: Number.isFinite(allowedRadius) && allowedRadius > 0 ? allowedRadius : DEFAULTS.location.allowedRadius,
  };
}

async function getAttendanceSettings() {
  const rows = await prisma.setting.findMany({
    where: { key: { in: [FACE_KEY, GEO_KEY, LOCATION_KEY] } },
  });
  const map = {};
  rows.forEach((r) => {
    map[r.key] = r.value;
  });

  return {
    faceEnabled: map[FACE_KEY] !== undefined ? map[FACE_KEY] === true || map[FACE_KEY] === 'true' : DEFAULTS.faceEnabled,
    geoEnabled: map[GEO_KEY] !== undefined ? map[GEO_KEY] === true || map[GEO_KEY] === 'true' : DEFAULTS.geoEnabled,
    location: sanitizeLocation(map[LOCATION_KEY]),
  };
}

async function updateAttendanceSettings(payload = {}) {
  const current = await getAttendanceSettings();

  const faceEnabled =
    payload.faceEnabled !== undefined ? payload.faceEnabled === true || payload.faceEnabled === 'true' : current.faceEnabled;
  const geoEnabled =
    payload.geoEnabled !== undefined ? payload.geoEnabled === true || payload.geoEnabled === 'true' : current.geoEnabled;

  const incoming = payload.location && typeof payload.location === 'object' && !Array.isArray(payload.location) ? payload.location : {};
  const merged = sanitizeLocation({
    name: incoming.name !== undefined ? incoming.name : current.location.name,
    latitude: incoming.latitude !== undefined && incoming.latitude !== null && incoming.latitude !== '' ? incoming.latitude : current.location.latitude,
    longitude: incoming.longitude !== undefined && incoming.longitude !== null && incoming.longitude !== '' ? incoming.longitude : current.location.longitude,
    allowedRadius: incoming.allowedRadius !== undefined && incoming.allowedRadius !== null && incoming.allowedRadius !== '' ? incoming.allowedRadius : current.location.allowedRadius,
  });

  if (!Number.isFinite(merged.latitude) || merged.latitude < -90 || merged.latitude > 90) {
    const err = new Error('Latitude must be a number between -90 and 90');
    err.statusCode = 400;
    throw err;
  }
  if (!Number.isFinite(merged.longitude) || merged.longitude < -180 || merged.longitude > 180) {
    const err = new Error('Longitude must be a number between -180 and 180');
    err.statusCode = 400;
    throw err;
  }
  if (!Number.isFinite(merged.allowedRadius) || merged.allowedRadius <= 0 || merged.allowedRadius > 10000) {
    const err = new Error('Allowed radius must be between 1 and 10,000 meters');
    err.statusCode = 400;
    throw err;
  }

  merged.latitude = Math.round(merged.latitude * 1e6) / 1e6;
  merged.longitude = Math.round(merged.longitude * 1e6) / 1e6;
  merged.allowedRadius = Math.round(merged.allowedRadius);

  await prisma.$transaction([
    prisma.setting.upsert({
      where: { key: FACE_KEY },
      update: { value: faceEnabled },
      create: { key: FACE_KEY, value: faceEnabled },
    }),
    prisma.setting.upsert({
      where: { key: GEO_KEY },
      update: { value: geoEnabled },
      create: { key: GEO_KEY, value: geoEnabled },
    }),
    prisma.setting.upsert({
      where: { key: LOCATION_KEY },
      update: { value: merged },
      create: { key: LOCATION_KEY, value: merged },
    }),
  ]);

  return { faceEnabled, geoEnabled, location: merged };
}

module.exports = { getAttendanceSettings, updateAttendanceSettings, DEFAULTS };
