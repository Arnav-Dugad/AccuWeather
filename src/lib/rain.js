/**
 * Advanced rain engine — probabilistic precipitation from model ensembles plus a
 * short-range minutely-15 nowcast. All keyless (Open-Meteo).
 *
 *  - Ensemble  -> probability of precipitation (PoP), expected amount + P25–P75
 *                 band, and a rain-specific confidence read from member agreement.
 *  - Minutely  -> next-2h "rain starting/ending in ~N min" nowcast.
 *
 * PoP weighting mirrors the deterministic Smart Router (GFS excluded over India),
 * so the rain story stays consistent with the rest of the app.
 */
import { currentHourIndex } from './blend.js';

const ENSEMBLE_URL = 'https://ensemble-api.open-meteo.com/v1/ensemble';
const FORECAST_URL = 'https://api.open-meteo.com/v1/forecast';

const RAIN_MM = 0.1; // measurable-precip threshold per hour
const DAILY_RAIN_MM = 0.5; // measurable-precip threshold per day
const isNum = (v) => typeof v === 'number' && Number.isFinite(v);

// ---------- fetch ----------

async function fetchEnsembleModel(loc, modelId, signal) {
  const p = new URLSearchParams({
    latitude: loc.latitude.toFixed(4),
    longitude: loc.longitude.toFixed(4),
    hourly: 'precipitation',
    models: modelId,
    forecast_days: '7',
    timezone: 'auto',
  });
  const res = await fetch(`${ENSEMBLE_URL}?${p.toString()}`, { signal });
  if (!res.ok) return null;
  const j = await res.json();
  const h = j.hourly ?? {};
  const memberKeys = Object.keys(h).filter((k) => /^precipitation_member\d+$/.test(k));
  const members = [];
  if (Array.isArray(h.precipitation)) members.push(h.precipitation); // control run
  for (const k of memberKeys) members.push(h[k]);
  if (!members.length) return null;
  return { modelId, time: h.time ?? [], members, utcOffsetSeconds: j.utc_offset_seconds ?? 0 };
}

/** Fetch each region ensemble model in parallel; skip any that fail / have no members. */
export async function fetchEnsemble(loc, ensembleWeights, signal) {
  const ids = Object.keys(ensembleWeights ?? {});
  const results = await Promise.all(ids.map((id) => fetchEnsembleModel(loc, id, signal).catch(() => null)));
  return results.filter(Boolean).map((r) => ({ ...r, weight: ensembleWeights[r.modelId] ?? 0 }));
}

export async function fetchMinutely(loc, signal) {
  const p = new URLSearchParams({
    latitude: loc.latitude.toFixed(4),
    longitude: loc.longitude.toFixed(4),
    minutely_15: 'precipitation,rain',
    forecast_days: '1',
    timezone: 'auto',
  });
  const res = await fetch(`${FORECAST_URL}?${p.toString()}`, { signal });
  if (!res.ok) return null;
  return res.json();
}

// ---------- helpers ----------

function percentile(sorted, p) {
  if (!sorted.length) return null;
  const idx = (p / 100) * (sorted.length - 1);
  const lo = Math.floor(idx);
  const hi = Math.ceil(idx);
  if (lo === hi) return sorted[lo];
  return sorted[lo] + (sorted[hi] - sorted[lo]) * (idx - lo);
}

/** Renormalize model weights across the models that actually returned data. */
function normWeights(models) {
  const total = models.reduce((a, m) => a + (m.weight > 0 ? m.weight : 0), 0);
  return total > 0 ? total : models.length; // fall back to equal weighting
}

export function popCategory(pop) {
  if (!isNum(pop)) return { label: '—', color: '#94a3b8' };
  if (pop < 20) return { label: 'Unlikely', color: '#64748b' };
  if (pop < 45) return { label: 'Possible', color: '#38bdf8' };
  if (pop < 70) return { label: 'Likely', color: '#fbbf24' };
  return { label: 'Very likely', color: '#60a5fa' };
}

export function rainConfidenceLabel(agreement) {
  if (!isNum(agreement)) return { label: 'Unknown', tone: 'moderate' };
  if (agreement >= 80) return { label: 'High', tone: 'high' };
  if (agreement >= 60) return { label: 'Moderate', tone: 'moderate' };
  return { label: 'Low', tone: 'low' };
}

// ---------- ensemble aggregation ----------

/** PoP / amount / band at a single hour index, weighted across models. */
function aggregateHour(models, i, denom) {
  let popW = 0;
  let amtW = 0;
  const pool = [];
  for (const m of models) {
    const w = m.weight > 0 ? m.weight : 0;
    const vals = m.members.map((mem) => mem[i]).filter(isNum);
    if (!vals.length) continue;
    const rainy = vals.filter((v) => v >= RAIN_MM).length / vals.length;
    const mean = vals.reduce((a, b) => a + b, 0) / vals.length;
    if (w > 0) {
      popW += rainy * w;
      amtW += mean * w;
      for (const v of vals) pool.push(v);
    }
  }
  pool.sort((a, b) => a - b);
  return {
    pop: Math.round((popW / denom) * 100),
    amount: amtW / denom,
    p25: percentile(pool, 25),
    p75: percentile(pool, 75),
  };
}

/**
 * @param {Array} models  output of fetchEnsemble
 * @returns { hourly, daily, rainConfidence, available }
 */
export function computeRainOutlook(models) {
  if (!models?.length) return { available: false };
  const ref = models[0];
  const times = ref.time ?? [];
  const now = currentHourIndex(times, ref.utcOffsetSeconds);
  const denom = normWeights(models);

  // hourly (next 24h)
  const hourly = [];
  const end = Math.min(times.length, now + 24);
  for (let i = now; i < end; i++) {
    hourly.push({ time: times[i], ...aggregateHour(models, i, denom) });
  }

  // daily (group by date, 7 days) — PoP from per-member daily sums
  const byDate = new Map(); // date -> [indices]
  for (let i = 0; i < times.length; i++) {
    const d = (times[i] || '').slice(0, 10);
    if (!d) continue;
    if (!byDate.has(d)) byDate.set(d, []);
    byDate.get(d).push(i);
  }
  const daily = [...byDate.entries()].slice(0, 7).map(([date, idxs]) => {
    let popW = 0;
    let amtW = 0;
    const pool = [];
    for (const m of models) {
      const w = m.weight > 0 ? m.weight : 0;
      const sums = m.members.map((mem) => idxs.reduce((a, j) => a + (isNum(mem[j]) ? mem[j] : 0), 0));
      if (!sums.length) continue;
      const rainy = sums.filter((s) => s >= DAILY_RAIN_MM).length / sums.length;
      const mean = sums.reduce((a, b) => a + b, 0) / sums.length;
      if (w > 0) {
        popW += rainy * w;
        amtW += mean * w;
        for (const s of sums) pool.push(s);
      }
    }
    pool.sort((a, b) => a - b);
    return {
      date,
      pop: Math.round((popW / denom) * 100),
      amount: amtW / denom,
      p25: percentile(pool, 25),
      p75: percentile(pool, 75),
    };
  });

  // rain confidence = mean member agreement over the next 24h
  const agreements = hourly.map((h) => Math.max(h.pop, 100 - h.pop));
  const agreement = agreements.length ? Math.round(agreements.reduce((a, b) => a + b, 0) / agreements.length) : null;
  const memberCount = models.reduce((a, m) => a + m.members.length, 0);

  return {
    available: true,
    hourly,
    daily,
    rainConfidence: { agreement, ...rainConfidenceLabel(agreement), memberCount, models: models.length },
    nowPop: hourly[0]?.pop ?? null,
  };
}

// ---------- minutely nowcast ----------

function currentQuarterIndex(times, utcOffsetSeconds) {
  if (!Array.isArray(times) || !times.length) return 0;
  const target = Date.now() + utcOffsetSeconds * 1000;
  let idx = 0;
  for (let i = 0; i < times.length; i++) {
    const t = Date.parse(`${times[i]}Z`);
    if (Number.isNaN(t)) continue;
    if (t <= target) idx = i;
    else break;
  }
  return idx;
}

function intensityOf(mmPer15) {
  if (!isNum(mmPer15) || mmPer15 < RAIN_MM) return 'none';
  if (mmPer15 < 0.5) return 'light';
  if (mmPer15 < 2) return 'moderate';
  return 'heavy';
}

/** @returns { hasData, steps:[{time,precip}], headline, tone, peak } */
export function computeNowcast(api) {
  const m = api?.minutely_15;
  if (!m || !Array.isArray(m.time)) return { hasData: false };
  const now = currentQuarterIndex(m.time, api.utc_offset_seconds ?? 0);
  const horizon = 8; // 8 × 15min = 2h
  const steps = [];
  for (let i = now; i < Math.min(m.time.length, now + horizon); i++) {
    steps.push({ time: m.time[i], precip: isNum(m.precipitation?.[i]) ? m.precipitation[i] : 0 });
  }
  if (!steps.length) return { hasData: false };

  const peak = Math.max(...steps.map((s) => s.precip));
  const rainingNow = steps[0].precip >= RAIN_MM;
  let headline;
  let tone = 'dry';

  if (rainingNow) {
    const stopIdx = steps.findIndex((s) => s.precip < RAIN_MM);
    tone = 'rain';
    if (stopIdx === -1) {
      headline = `${capitalize(intensityOf(peak))} rain through the next 2 hours`;
    } else {
      headline = `Rain easing in ~${stopIdx * 15} min`;
    }
  } else {
    const startIdx = steps.findIndex((s) => s.precip >= RAIN_MM);
    if (startIdx === -1) {
      headline = 'Dry for the next 2 hours';
      tone = 'dry';
    } else {
      const intensity = intensityOf(steps[startIdx].precip);
      headline = `${capitalize(intensity)} rain starting in ~${startIdx * 15} min`;
      tone = 'incoming';
    }
  }

  return { hasData: true, steps, headline, tone, peak };
}

function capitalize(s) {
  return s ? s.charAt(0).toUpperCase() + s.slice(1) : s;
}
