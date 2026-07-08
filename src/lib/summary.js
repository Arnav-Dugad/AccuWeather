/**
 * Plain-language "day summary" composed from the blended consensus.
 *
 * Intentionally unit-safe: it describes conditions with words (warm / humid /
 * showers likely) rather than raw numbers, so it reads the same in °C or °F.
 */

const isNum = (v) => typeof v === 'number' && Number.isFinite(v);

// Temperature feel from today's high (°C).
function tempWord(tMax) {
  if (!isNum(tMax)) return null;
  if (tMax < 0) return 'Frigid';
  if (tMax < 10) return 'Cold';
  if (tMax < 18) return 'Cool';
  if (tMax < 24) return 'Mild';
  if (tMax < 30) return 'Warm';
  if (tMax < 36) return 'Hot';
  return 'Very hot';
}

// Humidity feel from dew point (°C).
function humidityWord(dewC) {
  if (!isNum(dewC)) return null;
  if (dewC < 10) return 'dry';
  if (dewC < 16) return 'comfortable';
  if (dewC < 21) return 'humid';
  return 'very humid';
}

const PRECIP_CODES = new Set([51, 53, 55, 56, 57, 61, 63, 65, 66, 67, 71, 73, 75, 77, 80, 81, 82, 85, 86, 95, 96, 99]);
const SNOW_CODES = new Set([71, 73, 75, 77, 85, 86]);

function skyClause(today) {
  const prob = today.precipProb;
  const snowy = SNOW_CODES.has(today.code);
  const wet = PRECIP_CODES.has(today.code);
  if (isNum(prob) && prob >= 60) return snowy ? 'with snow likely' : 'with rain likely';
  if (isNum(prob) && prob >= 30) return snowy ? 'with a chance of snow' : 'with a chance of showers';
  if (wet) return snowy ? 'with passing snow' : 'with passing showers';
  // dry — describe the sky from the code
  if (today.code <= 1) return 'under clear skies';
  if (today.code === 2) return 'with partly cloudy skies';
  if (today.code === 3) return 'under overcast skies';
  return 'and mostly dry';
}

function windClause(cur) {
  const g = cur.gust;
  const w = cur.wind;
  if (isNum(g) && g >= 50) return 'Strong winds at times.';
  if (isNum(w) && w >= 25) return 'Breezy at times.';
  return null;
}

function uvClause(uvMax) {
  if (!isNum(uvMax)) return null;
  if (uvMax >= 8) return 'UV is very high around midday.';
  if (uvMax >= 6) return 'UV runs high midday.';
  return null;
}

/** @returns {string|null} a 1–2 sentence summary, or null if data is too thin. */
export function buildDaySummary(consensus) {
  if (!consensus) return null;
  const cur = consensus.current ?? {};
  const today = consensus.daily?.[0] ?? {};
  const uvMax = consensus.sun?.uvMax;

  const t = tempWord(today.tMax);
  const h = humidityWord(cur.dewPoint);
  if (!t && !h) return null;

  // Lead sentence: "{Warm} and {humid} {with rain likely}."
  const lead = [t, h ? `and ${h}` : null].filter(Boolean).join(' ');
  const first = `${lead} ${skyClause(today)}.`.replace(/\s+/g, ' ').trim();

  // Optional second sentence from wind + UV.
  const tail = [windClause(cur), uvClause(uvMax)].filter(Boolean).join(' ');

  const sentence = tail ? `${capitalize(first)} ${tail}` : capitalize(first);
  return sentence;
}

function capitalize(s) {
  return s ? s.charAt(0).toUpperCase() + s.slice(1) : s;
}
