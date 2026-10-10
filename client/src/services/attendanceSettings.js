import api from './api';
import { getCurrentLocation, isWithinRadiusMeters, COMPANY_LOCATION, DEFAULT_ALLOWED_RADIUS_METERS } from './geo';

export const FALLBACK_ATTENDANCE_SETTINGS = {
  faceEnabled: true,
  geoEnabled: true,
  location: {
    name: COMPANY_LOCATION.name,
    latitude: COMPANY_LOCATION.latitude,
    longitude: COMPANY_LOCATION.longitude,
    allowedRadius: DEFAULT_ALLOWED_RADIUS_METERS,
  },
};

export function normalizeAttendanceSettings(raw) {
  const loc = raw?.location && typeof raw.location === 'object' && !Array.isArray(raw.location) ? raw.location : {};
  return {
    faceEnabled: raw?.faceEnabled !== undefined ? raw.faceEnabled === true || raw.faceEnabled === 'true' : FALLBACK_ATTENDANCE_SETTINGS.faceEnabled,
    geoEnabled: raw?.geoEnabled !== undefined ? raw.geoEnabled === true || raw.geoEnabled === 'true' : FALLBACK_ATTENDANCE_SETTINGS.geoEnabled,
    location: {
      name: loc.name || FALLBACK_ATTENDANCE_SETTINGS.location.name,
      latitude: Number.isFinite(Number(loc.latitude)) ? Number(loc.latitude) : FALLBACK_ATTENDANCE_SETTINGS.location.latitude,
      longitude: Number.isFinite(Number(loc.longitude)) ? Number(loc.longitude) : FALLBACK_ATTENDANCE_SETTINGS.location.longitude,
      allowedRadius:
        Number.isFinite(Number(loc.allowedRadius)) && Number(loc.allowedRadius) > 0
          ? Number(loc.allowedRadius)
          : FALLBACK_ATTENDANCE_SETTINGS.location.allowedRadius,
    },
  };
}

export async function fetchAttendanceSettings() {
  const { data } = await api.get('/settings/attendance');
  return normalizeAttendanceSettings(data?.data?.attendance);
}

export async function saveAttendanceSettings(payload) {
  const { data } = await api.put('/settings/attendance', payload);
  return { message: data?.message, attendance: normalizeAttendanceSettings(data?.data?.attendance) };
}

/**
 * Resolve the geofence gate for a set of global settings.
 * Returns { ok: true, location } when GPS is (not required or) within the allowed radius,
 * or { ok: false, code, message, distance?, allowed? } when blocked.
 */
export async function resolveGeoGate(settings) {
  const config = normalizeAttendanceSettings(settings);
  if (!config.geoEnabled) return { ok: true, location: null };

  const res = await getCurrentLocation();
  if (!res.ok) return { ok: false, code: res.code, message: res.message };

  const check = isWithinRadiusMeters(res.location.latitude, res.location.longitude, config.location.allowedRadius, config.location);
  if (!check || !check.within) {
    return {
      ok: false,
      code: 'OUTSIDE_ALLOWED_AREA',
      message: `You are outside the authorized attendance area. Current distance: ${check ? `${check.distance} m` : 'unknown'} · Allowed distance: ${Math.round(config.location.allowedRadius)} m`,
      distance: check ? check.distance : null,
      allowed: Math.round(config.location.allowedRadius),
    };
  }

  return {
    ok: true,
    location: { latitude: res.location.latitude, longitude: res.location.longitude, accuracy: res.location.accuracy ?? null },
  };
}