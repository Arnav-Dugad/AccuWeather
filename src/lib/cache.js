/**
 * Simple in-memory forecast cache with a 5-minute TTL.
 * Keyed by rounded lat/lon + data type so switching between saved locations
 * doesn't trigger redundant API calls within the TTL window.
 */
const CACHE_TTL = 5 * 60 * 1000;
const MAX_ENTRIES = 50;
const store = new Map();

function key(lat, lon, type) {
  return `${lat.toFixed(2)},${lon.toFixed(2)}:${type}`;
}

export function getCached(lat, lon, type) {
  const k = key(lat, lon, type);
  const entry = store.get(k);
  if (!entry) return null;
  if (Date.now() - entry.ts > CACHE_TTL) {
    store.delete(k);
    return null;
  }
  return entry.data;
}

export function setCache(lat, lon, type, data) {
  const k = key(lat, lon, type);
  store.set(k, { data, ts: Date.now() });
  if (store.size > MAX_ENTRIES) {
    const oldest = store.keys().next().value;
    store.delete(oldest);
  }
}
