/**
 * Derived severe-weather alerts.
 *
 * These are NOT official government warnings — they're transparent thresholds
 * applied to the blended consensus (current snapshot + today's daily + the next
 * 24h hourly). Useful as an at-a-glance safety read on top of the forecast.
 *
 * The lib stays unit-agnostic: it works in metric and receives the active-unit
 * formatters so detail strings render correctly without the logic caring.
 */

const isNum = (v) => typeof v === 'number' && Number.isFinite(v);
const SEVERITY_RANK = { severe: 3, warning: 2, watch: 1 };

const STORM_CODES = new Set([95, 96, 99]);
const HEAVY_SNOW_CODES = new Set([75, 86]);

/**
 * @param {object} consensus  data.consensus (current, daily, hourly, sun)
 * @param {object} fmt        { fmtTemp, fmtWind, fmtRain, tempUnit, windUnit, rainUnit }
 * @returns {Array<{id,severity,title,detail,icon}>} sorted, most severe first
 */
export function deriveAlerts(consensus, fmt) {
  if (!consensus) return [];
  const cur = consensus.current ?? {};
  const today = consensus.daily?.[0] ?? {};
  const hours = consensus.hourly ?? [];
  const uvMax = consensus.sun?.uvMax;
  const alerts = [];

  const push = (severity, title, detail, icon, id) => alerts.push({ id, severity, title, detail, icon });

  // ---- thunderstorm ----
  const stormNow = STORM_CODES.has(cur.code);
  const stormSoon = hours.some((h) => STORM_CODES.has(h.code));
  if (stormNow || stormSoon) {
    push('severe', 'Thunderstorm', stormNow ? 'Storms occurring now — seek shelter.' : 'Storms expected within 24 hours.', 'CloudLightning', 'storm');
  }

  // ---- heavy rain ----
  const peakHourly = Math.max(0, ...hours.map((h) => (isNum(h.precip) ? h.precip : 0)));
  if ((isNum(today.precipSum) && today.precipSum >= 25) || peakHourly >= 7.6) {
    const amt = isNum(today.precipSum) ? `${fmt.fmtRain(today.precipSum)} ${fmt.rainUnit}` : 'heavy rates';
    push('warning', 'Heavy rain', `Up to ${amt} expected today — possible flooding.`, 'CloudRainWind', 'rain');
  }

  // ---- high wind ----
  const windPeak = Math.max(isNum(cur.gust) ? cur.gust : 0, isNum(today.windMax) ? today.windMax : 0);
  if (windPeak >= 60) {
    push('warning', 'High wind', `Gusts to ${fmt.fmtWind(windPeak)} — secure loose objects.`, 'Wind', 'wind');
  }

  // ---- heat ----
  if (isNum(today.tMax)) {
    if (today.tMax >= 40) push('severe', 'Extreme heat', `Highs near ${fmt.fmtTemp(today.tMax)} — heat-stroke risk.`, 'Thermometer', 'heat');
    else if (today.tMax >= 35) push('watch', 'Heat advisory', `Highs near ${fmt.fmtTemp(today.tMax)} — stay hydrated.`, 'Thermometer', 'heat');
  }

  // ---- cold / frost ----
  if (isNum(today.tMin)) {
    if (today.tMin <= -10) push('severe', 'Extreme cold', `Lows near ${fmt.fmtTemp(today.tMin)} — frostbite risk.`, 'Snowflake', 'cold');
    else if (today.tMin <= 0) push('watch', 'Frost', `Lows near ${fmt.fmtTemp(today.tMin)} — frost likely.`, 'Snowflake', 'cold');
  }

  // ---- heavy snow ----
  const snowNow = HEAVY_SNOW_CODES.has(cur.code);
  const snowSoon = hours.some((h) => HEAVY_SNOW_CODES.has(h.code));
  if (snowNow || snowSoon) {
    push('warning', 'Heavy snow', snowNow ? 'Heavy snow falling now.' : 'Heavy snow expected within 24 hours.', 'CloudSnow', 'snow');
  }

  // ---- extreme UV ----
  if (isNum(uvMax) && uvMax >= 11) {
    push('watch', 'Extreme UV', `UV index peaks near ${Math.round(uvMax)} — limit midday sun.`, 'Sun', 'uv');
  }

  // ---- dense fog ----
  if (isNum(cur.visibility) && cur.visibility < 1000) {
    push('watch', 'Dense fog', 'Visibility under 1 km — drive with care.', 'CloudFog', 'fog');
  }

  return alerts.sort((a, b) => SEVERITY_RANK[b.severity] - SEVERITY_RANK[a.severity]);
}
