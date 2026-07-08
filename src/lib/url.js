/**
 * Deep-link helpers: encode/decode the active location in the URL query string
 * so a city can be shared via a plain link.
 */

export function locationFromUrl() {
  try {
    const p = new URLSearchParams(window.location.search);
    const lat = parseFloat(p.get('lat'));
    const lon = parseFloat(p.get('lon'));
    if (!Number.isFinite(lat) || !Number.isFinite(lon)) return null;
    return {
      latitude: lat,
      longitude: lon,
      name: p.get('name') || 'Shared location',
      admin1: p.get('admin1') || '',
      country: p.get('country') || '',
      source: 'url',
    };
  } catch {
    return null;
  }
}

export function syncUrl(loc) {
  if (!loc) return;
  try {
    const p = new URLSearchParams();
    p.set('lat', loc.latitude.toFixed(4));
    p.set('lon', loc.longitude.toFixed(4));
    if (loc.name) p.set('name', loc.name);
    if (loc.admin1) p.set('admin1', loc.admin1);
    if (loc.country) p.set('country', loc.country);
    window.history.replaceState(null, '', `?${p.toString()}`);
  } catch {
    /* ignore */
  }
}

export function shareUrlFor(loc) {
  const p = new URLSearchParams();
  p.set('lat', loc.latitude.toFixed(4));
  p.set('lon', loc.longitude.toFixed(4));
  if (loc.name) p.set('name', loc.name);
  if (loc.admin1) p.set('admin1', loc.admin1);
  if (loc.country) p.set('country', loc.country);
  return `${window.location.origin}${window.location.pathname}?${p.toString()}`;
}
