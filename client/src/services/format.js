const pad = (n) => String(n).padStart(2, '0');

/** Resolve a backend-relative asset path into a usable URL. */
export function resolveAsset(url) {
  if (!url) return null;
  if (/^https?:\/\//.test(url)) return url;
  if (url.startsWith('/uploads/')) {
    const base = import.meta.env.VITE_UPLOAD_BASE_URL || '';
    return `${base}${url}`;
  }
  if (url.startsWith('data:')) return url;
  return url;
}

export function formatDate(iso, opts = {}) {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return String(iso);
  return d.toLocaleDateString(undefined, { day: '2-digit', month: 'short', year: 'numeric', ...opts });
}

export function formatDateTime(iso) {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return `${d.toLocaleDateString(undefined, { day: '2-digit', month: 'short' })} · ${d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
}

export function formatTime(iso) {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

export function formatDuration(minutes) {
  if (minutes === null || minutes === undefined || minutes < 0) return '—';
  const total = Math.round(minutes);
  const h = Math.floor(total / 60);
  const m = total % 60;
  if (h === 0) return `${m}m`;
  return `${h}h ${pad(m)}m`;
}

/**
 * Turn a stored location ({ latitude, longitude, address }) into readable text.
 * Returns null when no usable location was captured.
 */
export function formatLocation(loc) {
  if (!loc) return null;
  if (typeof loc.address === 'string' && loc.address.trim()) return loc.address.trim();
  const lat = Number(loc.latitude);
  const lng = Number(loc.longitude);
  const hasLat = loc.latitude !== null && loc.latitude !== undefined && loc.latitude !== '' && !Number.isNaN(lat);
  const hasLng = loc.longitude !== null && loc.longitude !== undefined && loc.longitude !== '' && !Number.isNaN(lng);
  if (hasLat && hasLng) return `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
  return null;
}

export function greeting() {
  const h = new Date().getHours();
  if (h < 12) return 'Good Morning';
  if (h < 17) return 'Good Afternoon';
  return 'Good Evening';
}

export function toDateKey(date = new Date()) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

export function monthDays(year, month) {
  return new Date(year, month + 1, 0).getDate();
}

/** yyyy-mm-dd value for <input type="date"> */
export function toInputDate(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function initials(name = '') {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((s) => s[0])
    .join('')
    .toUpperCase();
}

export const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];