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
  'alder_pollen',
  'birch_pollen',
  'grass_pollen',
  'mugwort_pollen',
  'olive_pollen',
  'ragweed_pollen',
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
    alderPollen: c.alder_pollen ?? null,
    birchPollen: c.birch_pollen ?? null,
    grassPollen: c.grass_pollen ?? null,
    mugwortPollen: c.mugwort_pollen ?? null,
    olivePollen: c.olive_pollen ?? null,
    ragweedPollen: c.ragweed_pollen ?? null,
    time: c.time ?? null,
  };
}

// Per-species grains/m³ thresholds → [low, moderate, high] cutoffs. Ragweed and
// olive are potent at lower counts; grass/birch need higher counts to matter.
const POLLEN_SPECIES = [
  { key: 'grassPollen', label: 'Grass', cut: [1, 20, 50] },
  { key: 'birchPollen', label: 'Birch', cut: [1, 20, 90] },
  { key: 'ragweedPollen', label: 'Ragweed', cut: [1, 10, 50] },
  { key: 'olivePollen', label: 'Olive', cut: [1, 20, 50] },
  { key: 'alderPollen', label: 'Alder', cut: [1, 20, 90] },
  { key: 'mugwortPollen', label: 'Mugwort', cut: [1, 10, 50] },
];

const RISK_LEVELS = [
  { label: 'None', color: '#64748b' },
  { label: 'Low', color: '#34d399' },
  { label: 'Moderate', color: '#fbbf24' },
  { label: 'High', color: '#fb7185' },
];

/** Severity 0-3 for a species value against its cutoffs. */
function pollenLevel(value, cut) {
  if (!Number.isFinite(value) || value < cut[0]) return 0;
  if (value < cut[1]) return 1;
  if (value < cut[2]) return 2;
  return 3;
}

/**
 * Summarize pollen for the card: per-species level + the overall (worst) risk.
 * Returns null when no species has any measurable data (outside coverage).
 */
export function pollenRisk(aq) {
  if (!aq) return null;
  const species = POLLEN_SPECIES.map((s) => {
    const value = aq[s.key];
    return { ...s, value, level: pollenLevel(value, s.cut) };
  }).filter((s) => Number.isFinite(s.value));

  if (!species.length) return null; // no pollen data at this location

  const withPollen = species.filter((s) => s.value >= s.cut[0]);
  const maxLevel = species.reduce((m, s) => Math.max(m, s.level), 0);
  const overall = RISK_LEVELS[maxLevel];

  // Show the most-present allergens first.
  const ranked = [...species].sort((a, b) => b.level - a.level || b.value - a.value);

  return { overall, maxLevel, species: ranked, active: withPollen.length, levels: RISK_LEVELS };
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
