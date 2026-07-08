/**
 * Display formatting helpers (°C default, metric units).
 */

export const round = (v, d = 0) =>
  typeof v === 'number' && Number.isFinite(v) ? Number(v.toFixed(d)) : null;

const isNum = (v) => typeof v === 'number' && Number.isFinite(v);

// ---- unit conversion (API is always metric; we convert client-side) ----
export const cToF = (c) => (isNum(c) ? (c * 9) / 5 + 32 : c);
export const kmhToMph = (k) => (isNum(k) ? k * 0.621371 : k);
export const mmToIn = (mm) => (isNum(mm) ? mm * 0.0393701 : mm);

export function temp(v) {
  const r = round(v);
  return r === null ? '—' : `${r}°`;
}

export function tempC(v) {
  const r = round(v);
  return r === null ? '—' : `${r}°C`;
}

export function pct(v) {
  const r = round(v);
  return r === null ? '—' : `${r}%`;
}

export function num(v, d = 0, unit = '') {
  const r = round(v, d);
  return r === null ? '—' : `${r}${unit}`;
}

const COMPASS = ['N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE', 'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW'];
export function compass(deg) {
  if (!Number.isFinite(deg)) return '';
  const normalized = ((deg % 360) + 360) % 360;
  return COMPASS[Math.round(normalized / 22.5) % 16];
}

/** Hour label like "2 PM" / "Now" from a local ISO string. */
export function hourLabel(iso, isNow = false) {
  if (isNow) return 'Now';
  const d = new Date(`${iso}Z`);
  let h = d.getUTCHours();
  const ampm = h >= 12 ? 'PM' : 'AM';
  h = h % 12 || 12;
  return `${h} ${ampm}`;
}

/** Short weekday like "Mon" from a local ISO date, "Today" for index 0. */
export function dayLabel(isoDate, index = 1) {
  if (index === 0) return 'Today';
  const d = new Date(`${isoDate}T00:00:00Z`);
  return ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][d.getUTCDay()];
}

/** Local clock string from utc offset seconds, e.g. "2:35 PM". */
export function localClock(utcOffsetSeconds = 0) {
  const local = new Date(Date.now() + utcOffsetSeconds * 1000);
  let h = local.getUTCHours();
  const m = local.getUTCMinutes().toString().padStart(2, '0');
  const ampm = h >= 12 ? 'PM' : 'AM';
  h = h % 12 || 12;
  return `${h}:${m} ${ampm}`;
}

/** Clock string from a local wall-clock ISO (e.g. sunrise "2026-06-23T05:42") -> "5:42 AM". */
export function clockFromISO(iso) {
  if (!iso) return '—';
  const d = new Date(`${iso}Z`);
  if (Number.isNaN(d.getTime())) return '—';
  let h = d.getUTCHours();
  const m = d.getUTCMinutes().toString().padStart(2, '0');
  const ampm = h >= 12 ? 'PM' : 'AM';
  h = h % 12 || 12;
  return `${h}:${m} ${ampm}`;
}

// WHO UV Index severity categories.
export function uvCategory(uv) {
  if (!Number.isFinite(uv) || uv < 0) return { label: 'N/A', color: '#94a3b8', severity: 0 };
  if (uv < 3) return { label: 'Low', color: '#34d399', severity: 1 };
  if (uv < 6) return { label: 'Moderate', color: '#fbbf24', severity: 2 };
  if (uv < 8) return { label: 'High', color: '#fb923c', severity: 3 };
  if (uv < 11) return { label: 'Very High', color: '#f87171', severity: 4 };
  return { label: 'Extreme', color: '#c084fc', severity: 5 };
}

// Dew-point comfort categories (°C).
export function dewPointComfort(dewC) {
  if (!Number.isFinite(dewC)) return '';
  if (dewC < 10) return 'Dry';
  if (dewC < 16) return 'Comfortable';
  if (dewC < 18) return 'Slightly humid';
  if (dewC < 21) return 'Humid';
  if (dewC < 24) return 'Oppressive';
  return 'Dangerous';
}

// Visibility categories (input in meters).
export function visibilityLabel(meters) {
  if (!Number.isFinite(meters)) return '';
  if (meters < 200) return 'Dense fog';
  if (meters < 1000) return 'Fog';
  if (meters < 4000) return 'Poor';
  if (meters < 10000) return 'Moderate';
  return 'Good';
}

export function placeLabel(loc) {
  if (!loc) return '';
  const parts = [loc.name];
  if (loc.admin1 && loc.admin1 !== loc.name) parts.push(loc.admin1);
  if (loc.country) parts.push(loc.country);
  return parts.filter(Boolean).join(', ');
}
