const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

const pad = (n) => String(n).padStart(2, '0');

function startOfDay(date) {
  const d = date instanceof Date ? new Date(date) : new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

function endOfDay(date) {
  const d = startOfDay(date);
  d.setDate(d.getDate() + 1);
  return d;
}

function toDateKey(date) {
  const d = date instanceof Date ? date : new Date(date);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function parseDateKey(key) {
  const [y, m, d] = key.split('-').map(Number);
  return new Date(y, m - 1, d, 0, 0, 0, 0);
}

function getDayName(date) {
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

function combineDateWithMinutes(date, minutes) {
  const d = startOfDay(date);
  d.setMinutes((d.getMinutes() + minutes) % 1440);
  return d;
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

function diffDays(a, b) {
  const msDay = 24 * 60 * 60 * 1000;
  return Math.round((startOfDay(b) - startOfDay(a)) / msDay) + 1;
}

function isWeekend(date) {
  const day = new Date(date).getDay();
  return day === 0 || day === 6;
}

module.exports = {
  DAY_NAMES,
  startOfDay,
  endOfDay,
  toDateKey,
  parseDateKey,
  getDayName,
  parseTimeToMinutes,
  minutesToTime,
  combineDateWithMinutes,
  formatDuration,
  monthRange,
  diffDays,
  isWeekend,
  pad,
};