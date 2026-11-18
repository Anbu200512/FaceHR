const prisma = require('../config/prisma');
const config = require('../config/config');

const DEFAULTS = {
  officeStartTime: config.officeStartTime || '09:30',
  officeEndTime: config.officeEndTime || '18:00',
  halfDayThresholdHours: config.halfDayThresholdHours ?? 4,
  graceMinutes: 0,
  lateEnabled: true,
};

function normalizeTime(value, fallback) {
  if (typeof value !== 'string') return fallback;
  const m = value.trim().match(/^(\d{1,2}):(\d{2})$/);
  if (!m) return fallback;
  const h = Number(m[1]);
  const min = Number(m[2]);
  if (!Number.isInteger(h) || !Number.isInteger(min) || h < 0 || h > 23 || min < 0 || min > 59) return fallback;
  return `${String(h).padStart(2, '0')}:${String(min).padStart(2, '0')}`;
}

async function getSettings() {
  const rows = await prisma.setting.findMany();
  const map = {};
  rows.forEach((r) => {
    map[r.key] = r.value;
  });
  const lateVal = map.lateEnabled;
  const lateEnabled = lateVal === undefined
    ? DEFAULTS.lateEnabled
    : !(lateVal === false || lateVal === 'false' || lateVal === 0 || lateVal === '0');
  const threshold = Number(map.halfDayThresholdHours ?? DEFAULTS.halfDayThresholdHours);
  const grace = Number(map.graceMinutes ?? DEFAULTS.graceMinutes);
  return {
    officeStartTime: normalizeTime(map.officeStartTime, DEFAULTS.officeStartTime),
    officeEndTime: normalizeTime(map.officeEndTime, DEFAULTS.officeEndTime),
    halfDayThresholdHours: Number.isFinite(threshold) && threshold > 0 ? threshold : DEFAULTS.halfDayThresholdHours,
    graceMinutes: Number.isFinite(grace) ? Math.max(0, Math.min(240, Math.round(grace))) : DEFAULTS.graceMinutes,
    lateEnabled,
  };
}

async function updateSetting(key, value) {
  const allowed = Object.keys(DEFAULTS);
  if (!allowed.includes(key)) {
    const err = new Error('Unknown setting key');
    err.statusCode = 400;
    throw err;
  }
  let parsed = value;
  if (key === 'halfDayThresholdHours') parsed = Number(value);
  if (key === 'graceMinutes') parsed = Math.max(0, Math.min(240, Math.round(Number(value) || 0)));
  if (key === 'lateEnabled') parsed = value === true || value === 'true';
  if (key === 'officeStartTime' || key === 'officeEndTime') parsed = normalizeTime(value, DEFAULTS[key]);

  return prisma.setting.upsert({
    where: { key },
    update: { value: parsed },
    create: { key, value: parsed },
  });
}

function getOfficeOverrides(employee) {
  const ov = employee && employee.attendanceSettings && typeof employee.attendanceSettings === 'object' && !Array.isArray(employee.attendanceSettings)
    ? employee.attendanceSettings
    : null;
  if (!ov) return {};
  const out = {};
  if (typeof ov.officeStartTime === 'string') out.officeStartTime = normalizeTime(ov.officeStartTime, null);
  if (typeof ov.officeEndTime === 'string') out.officeEndTime = normalizeTime(ov.officeEndTime, null);
  if (typeof ov.lateEnabled === 'boolean') out.lateEnabled = ov.lateEnabled;
  if (ov.graceMinutes !== undefined && ov.graceMinutes !== null && ov.graceMinutes !== '') {
    const g = Number(ov.graceMinutes);
    if (Number.isFinite(g) && g >= 0) out.graceMinutes = Math.round(g);
  }
  if (ov.officeStartTime === null) out.officeStartTime = null;
  if (ov.officeEndTime === null) out.officeEndTime = null;
  if (ov.lateEnabled === null) out.lateEnabled = null;
  Object.keys(out).forEach((k) => out[k] == null && delete out[k]);
  return out;
}

async function getEffectiveOfficeSettings(employee) {
  const global = await getSettings();
  const ov = getOfficeOverrides(employee);
  return {
    officeStartTime: ov.officeStartTime || global.officeStartTime,
    officeEndTime: ov.officeEndTime || global.officeEndTime,
    halfDayThresholdHours: global.halfDayThresholdHours,
    graceMinutes: Number.isFinite(Number(ov.graceMinutes)) ? Number(ov.graceMinutes) : global.graceMinutes,
    lateEnabled: typeof ov.lateEnabled === 'boolean' ? ov.lateEnabled : global.lateEnabled,
  };
}

/**
 * Computes the attendance "late" status for a check-in date/time based on
 * the configured office start time + grace (global or per-employee override).
 */
async function evaluateCheckInStatus(date, checkInDate, employee = null) {
  const settings = await getEffectiveOfficeSettings(employee);
  if (!settings.lateEnabled) return { status: 'Present', lateMinutes: 0, settings };

  const start = new Date(date);
  const [h, m] = settings.officeStartTime.split(':').map((p) => parseInt(p, 10));
  start.setHours(h, m, 0, 0);
  const graceCutoff = new Date(start.getTime() + (Number(settings.graceMinutes) || 0) * 60000);

  const checkIn = checkInDate instanceof Date ? checkInDate : new Date(checkInDate);
  if (checkIn > graceCutoff) {
    const lateMinutes = Math.max(1, Math.round((checkIn - graceCutoff) / 60000));
    return { status: 'Late', lateMinutes, settings };
  }
  return { status: 'Present', lateMinutes: 0, settings };
}

async function computeFinalStatus(checkInDate, checkOutDate, status, employee = null) {
  const settings = await getEffectiveOfficeSettings(employee);
  if (!checkInDate || !checkOutDate) return status;
  const hours = (checkOutDate - checkInDate) / 3600000;
  if (hours < settings.halfDayThresholdHours) return 'Half Day';
  return status;
}

module.exports = { getSettings, updateSetting, evaluateCheckInStatus, computeFinalStatus, getEffectiveOfficeSettings, normalizeTime, DEFAULTS };
