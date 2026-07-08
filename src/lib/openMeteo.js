/**
 * Open-Meteo API layer (no API key required).
 *
 * Two endpoints:
 *  - Geocoding (place search)  -> https://geocoding-api.open-meteo.com/v1/search
 *  - Forecast (multi-model)    -> https://api.open-meteo.com/v1/forecast
 *
 * IMPORTANT: when multiple models are requested, Open-Meteo suffixes every
 * variable per model in `hourly`/`daily` (e.g. `temperature_2m_ecmwf_ifs025`).
 * The `current` block does NOT support multi-model, so we deliberately do not
 * use it — the engine reads the hourly arrays and indexes the current hour.
 */

const FORECAST_URL = 'https://api.open-meteo.com/v1/forecast';
const GEOCODE_URL = 'https://geocoding-api.open-meteo.com/v1/search';

// Per-model hourly variables we request (suffixed per model in the response).
export const HOURLY_VARS = [
  'temperature_2m',
  'apparent_temperature',
  'relative_humidity_2m',
  'dew_point_2m',
  'precipitation',
  'precipitation_probability',
  'weather_code',
  'wind_speed_10m',
  'wind_gusts_10m',
  'wind_direction_10m',
  'cloud_cover',
  'pressure_msl',
  'visibility',
  'uv_index',
  'is_day',
];

export const DAILY_VARS = [
  'temperature_2m_max',
  'temperature_2m_min',
  'apparent_temperature_max',
  'apparent_temperature_min',
  'precipitation_sum',
  'precipitation_probability_max',
  'precipitation_hours',
  'weather_code',
  'wind_speed_10m_max',
  'sunrise',
  'sunset',
  'sunshine_duration',
  'uv_index_max',
];

/**
 * Build a multi-model forecast request URL.
 * @param {{latitude:number, longitude:number}} loc
 * @param {string[]} modelIds
 */
export function buildForecastUrl({ latitude, longitude }, modelIds) {
  const p = new URLSearchParams({
    latitude: latitude.toFixed(4),
    longitude: longitude.toFixed(4),
    hourly: HOURLY_VARS.join(','),
    daily: DAILY_VARS.join(','),
    models: modelIds.join(','),
    timezone: 'auto',
    forecast_days: '16',
    past_days: '1', // yesterday's hours, for the "vs yesterday" comparison
    wind_speed_unit: 'kmh',
    timeformat: 'iso8601',
  });
  return `${FORECAST_URL}?${p.toString()}`;
}

export async function fetchForecast(loc, modelIds, signal) {
  const res = await fetch(buildForecastUrl(loc, modelIds), { signal });
  if (!res.ok) {
    let reason = `HTTP ${res.status}`;
    try {
      const body = await res.json();
      if (body?.reason) reason = body.reason;
    } catch {
      /* ignore parse error */
    }
    throw new Error(`Open-Meteo forecast failed: ${reason}`);
  }
  return res.json();
}

/**
 * Geocoding search for the location box.
 * @param {string} query
 * @param {AbortSignal} [signal]
 * @returns {Promise<Array>} normalized place results
 */
export async function geocodeSearch(query, signal) {
  const q = query.trim();
  if (q.length < 2) return [];
  const p = new URLSearchParams({ name: q, count: '6', language: 'en', format: 'json' });
  const res = await fetch(`${GEOCODE_URL}?${p.toString()}`, { signal });
  if (!res.ok) throw new Error(`Geocoding failed: HTTP ${res.status}`);
  const data = await res.json();
  return (data.results ?? []).map((r) => ({
    id: r.id,
    name: r.name,
    admin1: r.admin1 ?? '',
    country: r.country ?? '',
    countryCode: r.country_code ?? '',
    latitude: r.latitude,
    longitude: r.longitude,
    timezone: r.timezone,
    population: r.population,
  }));
}

/**
 * Reverse-geocode-ish label for raw coordinates (geolocation has no place name).
 * Open-Meteo has no reverse endpoint, so we present a coordinate label and let the
 * forecast's resolved timezone enrich context.
 */
export function coordLabel(lat, lon) {
  const ns = lat >= 0 ? 'N' : 'S';
  const ew = lon >= 0 ? 'E' : 'W';
  return `${Math.abs(lat).toFixed(2)}°${ns}, ${Math.abs(lon).toFixed(2)}°${ew}`;
}
