/**
 * Open-Meteo Air Quality API (no key).
 * https://air-quality-api.open-meteo.com/v1/air-quality
 */

const AQ_URL = 'https://air-quality-api.open-meteo.com/v1/air-quality';

const CURRENT_VARS = [
  'us_aqi',
  'european_aqi',
  'pm2_5',
  'pm10',
  'ozone',
  'nitrogen_dioxide',
  'sulphur_dioxide',
  'carbon_monoxide',
];

export async function fetchAirQuality({ latitude, longitude }, signal) {
  const p = new URLSearchParams({
    latitude: latitude.toFixed(4),
    longitude: longitude.toFixed(4),
    current: CURRENT_VARS.join(','),
    timezone: 'auto',
  });
  const res = await fetch(`${AQ_URL}?${p.toString()}`, { signal });
  if (!res.ok) throw new Error(`Air quality failed: HTTP ${res.status}`);
  const data = await res.json();
  const c = data.current ?? {};
  return {
    usAqi: c.us_aqi ?? null,
    euAqi: c.european_aqi ?? null,
    pm2_5: c.pm2_5 ?? null,
    pm10: c.pm10 ?? null,
    ozone: c.ozone ?? null,
    no2: c.nitrogen_dioxide ?? null,
    so2: c.sulphur_dioxide ?? null,
    co: c.carbon_monoxide ?? null,
    time: c.time ?? null,
  };
}

/**
 * US EPA AQI category for a US AQI value.
 * @returns {{label, color, soft, advice}}
 */
export function aqiCategory(usAqi) {
  if (typeof usAqi !== 'number' || !Number.isFinite(usAqi)) {
    return { label: 'Unknown', color: '#94a3b8', soft: 'rgba(148,163,184,0.15)', advice: 'No data available.' };
  }
  if (usAqi <= 50)
    return { label: 'Good', color: '#34d399', soft: 'rgba(52,211,153,0.15)', advice: 'Air quality is satisfactory — enjoy the outdoors.' };
  if (usAqi <= 100)
    return { label: 'Moderate', color: '#fbbf24', soft: 'rgba(251,191,36,0.15)', advice: 'Acceptable; unusually sensitive people should limit prolonged exertion.' };
  if (usAqi <= 150)
    return { label: 'Unhealthy for Sensitive', color: '#fb923c', soft: 'rgba(251,146,60,0.15)', advice: 'Sensitive groups should reduce prolonged outdoor exertion.' };
  if (usAqi <= 200)
    return { label: 'Unhealthy', color: '#fb7185', soft: 'rgba(251,113,133,0.16)', advice: 'Everyone may feel effects; limit time outdoors and consider a mask.' };
  if (usAqi <= 300)
    return { label: 'Very Unhealthy', color: '#c084fc', soft: 'rgba(192,132,252,0.16)', advice: 'Health alert — avoid outdoor exertion; keep windows closed.' };
  return { label: 'Hazardous', color: '#f87171', soft: 'rgba(248,113,113,0.18)', advice: 'Emergency conditions — stay indoors with air filtration.' };
}

/** Identify the dominant pollutant by rough proportion of its concentration. */
export function dominantPollutant(aq) {
  const candidates = [
    { key: 'PM2.5', value: aq.pm2_5, scale: 35 },
    { key: 'PM10', value: aq.pm10, scale: 150 },
    { key: 'O₃', value: aq.ozone, scale: 100 },
    { key: 'NO₂', value: aq.no2, scale: 100 },
    { key: 'SO₂', value: aq.so2, scale: 75 },
  ].filter((c) => typeof c.value === 'number');
  if (!candidates.length) return null;
  return candidates.sort((a, b) => b.value / b.scale - a.value / a.scale)[0].key;
}
