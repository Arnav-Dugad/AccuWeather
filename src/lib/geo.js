/**
 * Best-effort reverse geocoding for raw coordinates (the browser Geolocation API
 * returns no place name). Uses BigDataCloud's free, keyless, browser-CORS client
 * endpoint. Always resolves — falls back to null fields so callers can degrade to
 * a coordinate label without ever blocking the UI.
 */
const URL_BASE = 'https://api.bigdatacloud.net/data/reverse-geocode-client';

export async function reverseGeocode(lat, lon, signal) {
  try {
    const p = new URLSearchParams({
      latitude: lat.toFixed(4),
      longitude: lon.toFixed(4),
      localityLanguage: 'en',
    });
    const res = await fetch(`${URL_BASE}?${p.toString()}`, { signal });
    if (!res.ok) return null;
    const j = await res.json();
    const name = j.city || j.locality || j.principalSubdivision || null;
    if (!name) return null;
    return {
      name,
      admin1: j.principalSubdivision || '',
      country: j.countryName || '',
      countryCode: j.countryCode || '',
    };
  } catch {
    return null;
  }
}
