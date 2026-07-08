/**
 * Open-Meteo Marine API (no key). Coastal-only — inland coordinates return null
 * wave data, which the card uses to hide itself.
 * https://marine-api.open-meteo.com/v1/marine
 */

const MARINE_URL = 'https://marine-api.open-meteo.com/v1/marine';

const CURRENT_VARS = ['wave_height', 'wave_direction', 'wave_period', 'sea_surface_temperature'];

export async function fetchMarine({ latitude, longitude }, signal) {
  const p = new URLSearchParams({
    latitude: latitude.toFixed(4),
    longitude: longitude.toFixed(4),
    current: CURRENT_VARS.join(','),
    timezone: 'auto',
  });
  const res = await fetch(`${MARINE_URL}?${p.toString()}`, { signal });
  if (!res.ok) return { waveHeight: null }; // inland / unsupported → hide the card
  const data = await res.json();
  const c = data.current ?? {};
  return {
    waveHeight: c.wave_height ?? null,
    waveDirection: c.wave_direction ?? null,
    wavePeriod: c.wave_period ?? null,
    seaTemp: c.sea_surface_temperature ?? null,
    time: c.time ?? null,
  };
}

/** Douglas-ish sea-state label from significant wave height (m). */
export function seaState(waveHeight) {
  if (!Number.isFinite(waveHeight)) return { label: '—', color: '#94a3b8' };
  if (waveHeight < 0.1) return { label: 'Calm', color: '#34d399' };
  if (waveHeight < 0.5) return { label: 'Rippled', color: '#34d399' };
  if (waveHeight < 1.25) return { label: 'Slight', color: '#38bdf8' };
  if (waveHeight < 2.5) return { label: 'Moderate', color: '#fbbf24' };
  if (waveHeight < 4) return { label: 'Rough', color: '#fb923c' };
  return { label: 'Very rough', color: '#fb7185' };
}
