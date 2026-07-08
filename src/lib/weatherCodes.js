/**
 * WMO weather interpretation codes -> presentation metadata.
 * https://open-meteo.com/en/docs (WMO Weather interpretation codes section)
 *
 * Each entry: { label, icon (lucide name), gradient ([day], [night]), severe }
 */

const C = {
  0: { label: 'Clear sky', icon: 'Sun', day: ['#fbbf24', '#f97316'], night: ['#312e81', '#1e1b4b'], severe: false },
  1: { label: 'Mainly clear', icon: 'Sun', day: ['#fcd34d', '#fb923c'], night: ['#3730a3', '#1e1b4b'], severe: false },
  2: { label: 'Partly cloudy', icon: 'CloudSun', day: ['#60a5fa', '#818cf8'], night: ['#334155', '#1e293b'], severe: false },
  3: { label: 'Overcast', icon: 'Cloud', day: ['#94a3b8', '#64748b'], night: ['#334155', '#1e293b'], severe: false },
  45: { label: 'Fog', icon: 'CloudFog', day: ['#cbd5e1', '#94a3b8'], night: ['#475569', '#334155'], severe: false },
  48: { label: 'Rime fog', icon: 'CloudFog', day: ['#cbd5e1', '#94a3b8'], night: ['#475569', '#334155'], severe: false },
  51: { label: 'Light drizzle', icon: 'CloudDrizzle', day: ['#38bdf8', '#0ea5e9'], night: ['#0c4a6e', '#082f49'], severe: false },
  53: { label: 'Drizzle', icon: 'CloudDrizzle', day: ['#38bdf8', '#0284c7'], night: ['#0c4a6e', '#082f49'], severe: false },
  55: { label: 'Dense drizzle', icon: 'CloudDrizzle', day: ['#0ea5e9', '#0369a1'], night: ['#0c4a6e', '#082f49'], severe: false },
  56: { label: 'Freezing drizzle', icon: 'CloudDrizzle', day: ['#7dd3fc', '#38bdf8'], night: ['#0c4a6e', '#082f49'], severe: false },
  57: { label: 'Freezing drizzle', icon: 'CloudDrizzle', day: ['#7dd3fc', '#38bdf8'], night: ['#0c4a6e', '#082f49'], severe: false },
  61: { label: 'Light rain', icon: 'CloudRain', day: ['#38bdf8', '#0284c7'], night: ['#0c4a6e', '#082f49'], severe: false },
  63: { label: 'Rain', icon: 'CloudRain', day: ['#0ea5e9', '#0369a1'], night: ['#0c4a6e', '#082f49'], severe: false },
  65: { label: 'Heavy rain', icon: 'CloudRainWind', day: ['#0284c7', '#075985'], night: ['#082f49', '#0c1a2e'], severe: true },
  66: { label: 'Freezing rain', icon: 'CloudRain', day: ['#7dd3fc', '#0ea5e9'], night: ['#0c4a6e', '#082f49'], severe: true },
  67: { label: 'Freezing rain', icon: 'CloudRainWind', day: ['#7dd3fc', '#0ea5e9'], night: ['#0c4a6e', '#082f49'], severe: true },
  71: { label: 'Light snow', icon: 'Snowflake', day: ['#e0f2fe', '#bae6fd'], night: ['#475569', '#1e293b'], severe: false },
  73: { label: 'Snow', icon: 'Snowflake', day: ['#bae6fd', '#7dd3fc'], night: ['#475569', '#1e293b'], severe: false },
  75: { label: 'Heavy snow', icon: 'CloudSnow', day: ['#7dd3fc', '#38bdf8'], night: ['#475569', '#1e293b'], severe: true },
  77: { label: 'Snow grains', icon: 'Snowflake', day: ['#e0f2fe', '#bae6fd'], night: ['#475569', '#1e293b'], severe: false },
  80: { label: 'Light showers', icon: 'CloudRain', day: ['#38bdf8', '#0284c7'], night: ['#0c4a6e', '#082f49'], severe: false },
  81: { label: 'Showers', icon: 'CloudRain', day: ['#0ea5e9', '#0369a1'], night: ['#0c4a6e', '#082f49'], severe: false },
  82: { label: 'Violent showers', icon: 'CloudRainWind', day: ['#0284c7', '#075985'], night: ['#082f49', '#0c1a2e'], severe: true },
  85: { label: 'Snow showers', icon: 'CloudSnow', day: ['#bae6fd', '#7dd3fc'], night: ['#475569', '#1e293b'], severe: false },
  86: { label: 'Snow showers', icon: 'CloudSnow', day: ['#7dd3fc', '#38bdf8'], night: ['#475569', '#1e293b'], severe: true },
  95: { label: 'Thunderstorm', icon: 'CloudLightning', day: ['#6366f1', '#4338ca'], night: ['#312e81', '#1e1b4b'], severe: true },
  96: { label: 'Storm w/ hail', icon: 'CloudLightning', day: ['#7c3aed', '#5b21b6'], night: ['#3b0764', '#1e1b4b'], severe: true },
  99: { label: 'Storm w/ hail', icon: 'CloudLightning', day: ['#7c3aed', '#5b21b6'], night: ['#3b0764', '#1e1b4b'], severe: true },
};

const FALLBACK = { label: 'Unknown', icon: 'CloudOff', day: ['#64748b', '#475569'], night: ['#334155', '#1e293b'], severe: false };

export function describeCode(code) {
  return C[code] ?? FALLBACK;
}

/**
 * @param {number} code WMO code
 * @param {boolean} isDay
 * @returns {{label:string, icon:string, gradient:[string,string], severe:boolean}}
 */
export function weatherFor(code, isDay = true) {
  const e = describeCode(code);
  return { label: e.label, icon: e.icon, gradient: isDay ? e.day : e.night, severe: e.severe };
}

// WMO codes that imply precipitation (drizzle/rain/snow/showers/thunder).
const PRECIP_CODES = new Set([51, 53, 55, 56, 57, 61, 63, 65, 66, 67, 71, 73, 75, 77, 80, 81, 82, 85, 86, 95, 96, 99]);
export const isPrecipCode = (code) => PRECIP_CODES.has(code);

// Freezing precip is safety-critical (icing hazard) — never reconcile to clear.
const FREEZING_CODES = new Set([56, 57, 66, 67]);

/** Cloud-cover (%) -> a non-precip sky code (clear/mainly clear/partly/overcast). */
export function cloudCodeFor(cloudPct) {
  if (typeof cloudPct !== 'number' || !Number.isFinite(cloudPct)) return 2;
  if (cloudPct < 12) return 0;
  if (cloudPct < 50) return 1;
  if (cloudPct < 87) return 2;
  return 3;
}

/**
 * Reconcile a headline weather code with the actual precipitation signal.
 * Open-Meteo models frequently emit a "drizzle"/"rain" code even when the
 * precipitation amount and probability are effectively zero — which made the
 * card show rain on dry days. If a precip code isn't backed by real precip,
 * fall back to a cloud-based sky code.
 */
export function reconcileCode(code, { precip, precipProb, cloud } = {}) {
  if (FREEZING_CODES.has(code)) return code;
  const noRain =
    (precip == null || precip < 0.1) && (precipProb == null || precipProb < 25);
  if (isPrecipCode(code) && noRain) return cloudCodeFor(cloud);
  return code;
}
