const prisma = require('../config/prisma');
const config = require('../config/config');

const DEFAULTS = {
  officeStartTime: config.officeStartTime,
  halfDayThresholdHours: config.halfDayThresholdHours,
  lateEnabled: true,
};

async function getSettings() {
  const rows = await prisma.setting.findMany();
  const map = {};
  rows.forEach((r) => {
    map[r.key] = r.value;
  });
  return {
    officeStartTime: map.officeStartTime || DEFAULTS.officeStartTime,
    halfDayThresholdHours: Number(map.halfDayThresholdHours ?? DEFAULTS.halfDayThresholdHours),
    lateEnabled: map.lateEnabled !== undefined ? !!map.lateEnabled : DEFAULTS.lateEnabled,
  };
}

async function updateSetting(key, value) {
  const allowed = Object.keys(DEFAULTS);
  if (!allowed.includes(key)) {
    const err = new Error('Unknown setting key');
    err.statusCode = 400;
    throw err;
  }
  return prisma.setting.upsert({
    where: { key },
    update: { value },
    create: { key, value },
  });
}

/**
 * Computes the attendance "late" status for a check-in date/time based on
 * the configured office start time.
 */
async function evaluateCheckInStatus(date, checkInDate) {
  const settings = await getSettings();
  if (!settings.lateEnabled) return { status: 'Present', lateMinutes: 0 };

  const start = new Date(date);
  const [h, m] = settings.officeStartTime.split(':').map((p) => parseInt(p, 10));
  start.setHours(h || 9, m || 30, 0, 0);

  const checkIn = checkInDate instanceof Date ? checkInDate : new Date(checkInDate);
  if (checkIn > start) {
    const lateMinutes = Math.round((checkIn - start) / 60000);
    return { status: 'Late', lateMinutes };
  }
  return { status: 'Present', lateMinutes: 0 };
}

async function computeFinalStatus(checkInDate, checkOutDate, status) {
  const settings = await getSettings();
  if (!checkInDate || !checkOutDate) return status;
  const hours = (checkOutDate - checkInDate) / 3600000;
  if (hours < settings.halfDayThresholdHours) return 'Half Day';
  return status;
}

module.exports = { getSettings, updateSetting, evaluateCheckInStatus, computeFinalStatus, DEFAULTS };
