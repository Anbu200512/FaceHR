const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

const pad = (n) => String(n).padStart(2, '0');

function normalizeTimezone(value, fallback = '') {
  if (typeof value !== 'string') return fallback;
  const tz = value.trim();
  if (!tz) return fallback;
  try {
    Intl.DateTimeFormat('en-US', { timeZone: tz }).format(new Date());
    return tz;
  } catch {
    return fallback;
  }
}

function getZonedParts(date, timeZone) {
  const d = date instanceof Date ? date : new Date(date);
  const fmt = new Intl.DateTimeFormat('en-US', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    weekday: 'short',
    hour12: false,
  });
  const parts = fmt.formatToParts(d);
  const map = {};
  parts.forEach((p) => {
    map[p.type] = p.value;
  });
  return {
    year: Number(map.year),
    month: Number(map.month),
    day: Number(map.day),
    hour: map.hour === '24' ? 0 : Number(map.hour),
    minute: Number(map.minute),
    second: Number(map.second),
    weekday: map.weekday,
  };
}

function zonedTimeToUtc({ year, month, day, hour = 0, minute = 0, second = 0 }, timeZone) {
  let utc = Date.UTC(year, month - 1, day, hour, minute, second);
  for (let i = 0; i < 3; i++) {
    const p = getZonedParts(new Date(utc), timeZone);
    const asUtc = Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second);
    const want = Date.UTC(year, month - 1, day, hour, minute, second);
    const diff = want - asUtc;
    utc += diff;
    if (diff === 0) break;
  }
  return new Date(utc);
}

function startOfDay(date, tz) {
  const timeZone = normalizeTimezone(tz, '');
  if (timeZone) {
    const p = getZonedParts(date, timeZone);
    return zonedTimeToUtc({ year: p.year, month: p.month, day: p.day }, timeZone);
  }
  const d = date instanceof Date ? new Date(date) : new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

function endOfDay(date, tz) {
  const timeZone = normalizeTimezone(tz, '');
  if (timeZone) {
    const start = startOfDay(date, timeZone);
    // advance by ~1 day and floor in zone to handle DST boundaries
    return startOfDay(new Date(start.getTime() + 36 * 3600000), timeZone);
  }
  const d = startOfDay(date);
  d.setDate(d.getDate() + 1);
  return d;
}

function toDateKey(date, tz) {
  const timeZone = normalizeTimezone(tz, '');
  if (timeZone) {
    const p = getZonedParts(date, timeZone);
    return `${p.year}-${pad(p.month)}-${pad(p.day)}`;
  }
  const d = date instanceof Date ? date : new Date(date);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function parseDateKey(key, tz) {
  const [y, m, d] = String(key || '').split('-').map(Number);
  if (!y || !m || !d) return new Date(NaN);
  const timeZone = normalizeTimezone(tz, '');
  if (timeZone) return zonedTimeToUtc({ year: y, month: m, day: d }, timeZone);
  return new Date(y, m - 1, d, 0, 0, 0, 0);
}

function getDayName(date, tz) {
  const timeZone = normalizeTimezone(tz, '');
  if (timeZone) {
    const key = toDateKey(date, timeZone);
    const d = new Date(`${key}T12:00:00Z`);
    const day = d.getUTCDay();
    return DAY_NAMES[day];
  }
  return DAY_NAMES[new Date(date).getDay()];
}

function parseTimeToMinutes(timeStr) {
  const parts = String(timeStr || '').split(':').map((p) => parseInt(p, 10));
  if (parts.length < 2 || Number.isNaN(parts[0])) return null;
  const [h, m] = parts;
  return h * 60 + m;
}

function minutesToTime(minutes) {
  const m = ((Math.round(minutes) % 1440) + 1440) % 1440;
  const hours = Math.floor(m / 60);
  const mins = m % 60;
  const ampm = hours >= 12 ? 'PM' : 'AM';
  const h12 = hours % 12 === 0 ? 12 : hours % 12;
  return `${pad(h12)}:${pad(mins)} ${ampm}`;
}

function combineDateWithMinutes(date, minutes, tz) {
  const mins = Number(minutes) || 0;
  const timeZone = normalizeTimezone(tz, '');
  if (timeZone) {
    const p = getZonedParts(date, timeZone);
    return zonedTimeToUtc({ year: p.year, month: p.month, day: p.day, hour: Math.floor(mins / 60) % 24, minute: mins % 60 }, timeZone);
  }
  const d = startOfDay(date);
  d.setMinutes((d.getMinutes() + mins) % 1440);
  return d;
}

function nowMinutesInZone(date, tz) {
  const d = date instanceof Date ? date : new Date(date);
  const timeZone = normalizeTimezone(tz, '');
  if (timeZone) {
    const p = getZonedParts(d, timeZone);
    return p.hour * 60 + p.minute;
  }
  return d.getHours() * 60 + d.getMinutes();
}

function formatDuration(minutes) {
  if (!minutes || minutes < 0) return '-';
  const total = Math.round(minutes);
  const h = Math.floor(total / 60);
  const m = total % 60;
  if (h === 0) return `${m}m`;
  return `${h}h ${pad(m)}m`;
}

function monthRange(year, monthIndex) {
  const start = new Date(year, monthIndex, 1, 0, 0, 0, 0);
  const end = new Date(year, monthIndex + 1, 1, 0, 0, 0, 0);
  return { start, end };
}

function diffDays(a, b, tz) {
  const timeZone = normalizeTimezone(tz, '');
  if (timeZone) {
    const ak = toDateKey(a, timeZone);
    const bk = toDateKey(b, timeZone);
    const ad = new Date(`${ak}T00:00:00Z`);
    const bd = new Date(`${bk}T00:00:00Z`);
    return Math.round((bd - ad) / 86400000) + 1;
  }
  const msDay = 24 * 60 * 60 * 1000;
  return Math.round((startOfDay(b) - startOfDay(a)) / msDay) + 1;
}

function isSunday(date, tz) {
  const timeZone = normalizeTimezone(tz, '');
  if (timeZone) {
    const p = getZonedParts(date, timeZone);
    const map = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
    const day = map[p.weekday] ?? new Date(`${toDateKey(date, timeZone)}T12:00:00Z`).getUTCDay();
    return day === 0;
  }
  return new Date(date).getDay() === 0;
}

function isWeekend(date, tz) {
  return isSunday(date, tz);
}

module.exports = {
  DAY_NAMES,
  pad,
  normalizeTimezone,
  getZonedParts,
  zonedTimeToUtc,
  startOfDay,
  endOfDay,
  toDateKey,
  parseDateKey,
  getDayName,
  parseTimeToMinutes,
  minutesToTime,
  combineDateWithMinutes,
  nowMinutesInZone,
  formatDuration,
  monthRange,
  diffDays,
  isSunday,
  isWeekend,
};