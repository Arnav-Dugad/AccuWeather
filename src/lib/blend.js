/**
 * Consensus & confidence engine.
 *
 * Turns a multi-model Open-Meteo response into:
 *  - per-model series + current snapshot (for the transparency breakdown)
 *  - a weight-blended consensus (current + hourly + daily)
 *  - a Meteorological Confidence Index derived from inter-model spread
 *
 * All blending is transparent post-processing of public model output — not a new
 * NWP model. Weights with value 0 keep a model visible in the breakdown while
 * excluding it from consensus.
 */
import { MODELS } from '../config/models.js';
import { reconcileCode } from './weatherCodes.js';

// ---- small numeric helpers -------------------------------------------------

const isNum = (v) => typeof v === 'number' && Number.isFinite(v);

function mean(values) {
  const v = values.filter(isNum);
  if (!v.length) return null;
  return v.reduce((a, b) => a + b, 0) / v.length;
}

function stdDev(values) {
  const v = values.filter(isNum);
  if (v.length < 2) return 0;
  const m = v.reduce((a, b) => a + b, 0) / v.length;
  const variance = v.reduce((a, b) => a + (b - m) ** 2, 0) / v.length;
  return Math.sqrt(variance);
}

/**
 * Weighted average over {value, weight} pairs, skipping null/NaN values and
 * renormalizing weights across what remains. Returns null if nothing usable.
 */
export function weightedBlend(pairs) {
  let wsum = 0;
  let acc = 0;
  for (const { value, weight } of pairs) {
    if (!isNum(value) || !isNum(weight) || weight <= 0) continue;
    acc += value * weight;
    wsum += weight;
  }
  if (wsum === 0) {
    // Fall back to a plain mean of available values (e.g. all weights 0).
    return mean(pairs.map((p) => p.value));
  }
  return acc / wsum;
}

function median(values) {
  const v = [...values].sort((a, b) => a - b);
  const n = v.length;
  if (!n) return null;
  return n % 2 ? v[(n - 1) / 2] : (v[n / 2 - 1] + v[n / 2]) / 2;
}

/**
 * Outlier-robust weighted mean for roughly-Gaussian variables (temperature,
 * pressure, wind speed, dew point). Uses the median and MAD (median absolute
 * deviation) rather than the mean/σ, because a single large outlier inflates σ
 * enough to mask itself — MAD is resistant to that. Any contributor whose
 * Iglewicz–Hoaglin modified z-score exceeds 3.5 has its weight halved, then we
 * recompute. Only engages with ≥3 numeric contributors — with fewer it returns
 * exactly weightedBlend(pairs), so 2-model regions stay bit-identical and can
 * never be degraded.
 */
export function robustWeightedBlend(pairs) {
  const usable = pairs.filter(
    ({ value, weight }) => isNum(value) && isNum(weight) && weight > 0,
  );
  if (usable.length < 3) return weightedBlend(pairs);

  const values = usable.map((p) => p.value);
  const med = median(values);
  const devs = values.map((v) => Math.abs(v - med));
  let mad = median(devs);
  // MAD collapses to 0 when ≥half the models are identical; fall back to the
  // mean absolute deviation so we still have a usable scale (conservative).
  if (mad === 0) mad = devs.reduce((a, b) => a + b, 0) / devs.length;
  if (mad === 0) return med; // every model agrees exactly

  let rWsum = 0;
  let rAcc = 0;
  for (const { value, weight } of usable) {
    const mz = (0.6745 * Math.abs(value - med)) / mad;
    const w = mz > 3.5 ? weight * 0.5 : weight;
    rAcc += value * w;
    rWsum += w;
  }
  return rAcc / rWsum;
}

/**
 * Weighted circular mean for angular values (0–360°) using vector decomposition.
 * Scalar averaging fails for wrap-around: avg(350°, 10°) = 180° (wrong).
 * Vector mean: decompose into sin/cos, weight, recombine → correct ~0°.
 */
export function weightedCircularBlend(pairs) {
  let sinSum = 0;
  let cosSum = 0;
  let wsum = 0;
  for (const { value, weight } of pairs) {
    if (!isNum(value) || !isNum(weight) || weight <= 0) continue;
    const rad = (value * Math.PI) / 180;
    sinSum += Math.sin(rad) * weight;
    cosSum += Math.cos(rad) * weight;
    wsum += weight;
  }
  if (wsum === 0) {
    const vals = pairs.map((p) => p.value).filter(isNum);
    if (!vals.length) return null;
    let s = 0, c = 0;
    for (const v of vals) {
      const rad = (v * Math.PI) / 180;
      s += Math.sin(rad);
      c += Math.cos(rad);
    }
    return ((Math.atan2(s, c) * 180) / Math.PI + 360) % 360;
  }
  return ((Math.atan2(sinSum, cosSum) * 180) / Math.PI + 360) % 360;
}

/** Weighted mode of WMO codes -> the most "supported" condition. */
function weightedCodeMode(pairs) {
  const tally = new Map();
  let best = null;
  let bestW = -1;
  for (const { value, weight } of pairs) {
    if (!isNum(value)) continue;
    const w = (tally.get(value) ?? 0) + (isNum(weight) && weight > 0 ? weight : 0.0001);
    tally.set(value, w);
    if (w > bestW) {
      bestW = w;
      best = value;
    }
  }
  return best;
}

// ---- response access -------------------------------------------------------

const series = (hourly, varName, modelId) => hourly?.[`${varName}_${modelId}`] ?? null;
const dseries = (daily, varName, modelId) => daily?.[`${varName}_${modelId}`] ?? null;

/**
 * Index of the hour matching "now" in the location's local time.
 * hourly.time strings are local wall-clock (timezone=auto); we treat them as a
 * UTC instant and compare against (nowUTC + utc_offset) on the same scale.
 */
export function currentHourIndex(times, utcOffsetSeconds = 0) {
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

// ---- main builder ----------------------------------------------------------

/**
 * @param {object} api      raw Open-Meteo JSON
 * @param {object} region   active region profile (carries weights/notes)
 * @param {string[]} modelIds models requested, in display order
 * @returns full view-model consumed by the UI
 */
export function buildWeatherModel(api, region, modelIds) {
  const hourly = api.hourly ?? {};
  const daily = api.daily ?? {};
  const times = hourly.time ?? [];
  const dates = daily.time ?? [];
  const now = currentHourIndex(times, api.utc_offset_seconds);

  // Per-model snapshot + availability.
  const models = modelIds.map((id) => {
    const meta = MODELS[id] ?? { id, label: id, full: id, origin: '', accent: '#94a3b8' };
    const temp = series(hourly, 'temperature_2m', id);
    const available = Array.isArray(temp) && isNum(temp[now]);
    const get = (v) => {
      const arr = series(hourly, v, id);
      return arr && isNum(arr[now]) ? arr[now] : null;
    };
    const dmax = dseries(daily, 'temperature_2m_max', id);
    const dmin = dseries(daily, 'temperature_2m_min', id);
    return {
      id,
      meta,
      weight: region.weights[id] ?? 0,
      note: region.notes?.[id] ?? null,
      available,
      current: {
        temp: get('temperature_2m'),
        feels: get('apparent_temperature'),
        code: get('weather_code'),
        precip: get('precipitation'),
        precipProb: get('precipitation_probability'),
        humidity: get('relative_humidity_2m'),
        dewPoint: get('dew_point_2m'),
        wind: get('wind_speed_10m'),
        gust: get('wind_gusts_10m'),
        windDir: get('wind_direction_10m'),
        cloud: get('cloud_cover'),
        pressure: get('pressure_msl'),
        visibility: get('visibility'),
        uv: get('uv_index'),
        isDay: get('is_day') === 1,
      },
      today: {
        tMax: dmax && isNum(dmax[0]) ? dmax[0] : null,
        tMin: dmin && isNum(dmin[0]) ? dmin[0] : null,
      },
    };
  });

  const weightPair = (selector) =>
    models.map((m) => ({ value: selector(m), weight: m.weight }));

  // Lead model = highest-weight available model. Used for non-blendable signals
  // (day/night flag, sunrise/sunset) where a weighted average is meaningless.
  const lead =
    [...models]
      .filter((m) => m.available && m.weight > 0)
      .sort((a, b) => b.weight - a.weight)[0] ||
    models.find((m) => m.available) ||
    models[0];

  // ---- consensus: current ----
  // Blend a variable directly from the hourly arrays at an arbitrary index, so we
  // can read both the current hour and the next one for sub-hour interpolation.
  const blendAt = (varName, i, blender = weightedBlend) =>
    blender(models.map((m) => {
      const arr = series(hourly, varName, m.id);
      return { value: arr ? arr[i] : null, weight: m.weight };
    }));

  // Sub-hour interpolation fraction: how far "now" sits between hour `now` and
  // `now+1` (Open-Meteo hourly values are instantaneous, so lerping to the actual
  // minute is strictly more accurate for the live reading). 0 when there is no
  // next hour to interpolate toward.
  const hasNext = now + 1 < times.length;
  let frac = 0;
  if (hasNext) {
    const t0 = Date.parse(`${times[now]}Z`);
    const t1 = Date.parse(`${times[now + 1]}Z`);
    const nowMs = Date.now() + (api.utc_offset_seconds ?? 0) * 1000;
    if (isNum(t0) && isNum(t1) && t1 > t0) {
      frac = Math.max(0, Math.min(1, (nowMs - t0) / (t1 - t0)));
    }
  }
  // Interpolate a continuous variable between the two blended hourly values.
  const interp = (varName, blender = weightedBlend) => {
    const v0 = blendAt(varName, now, blender);
    if (!hasNext || frac === 0) return v0;
    const v1 = blendAt(varName, now + 1, blender);
    if (!isNum(v0) || !isNum(v1)) return v0;
    return v0 + (v1 - v0) * frac;
  };

  const cur = {
    // Temperature-family: outlier-robust + sub-hour interpolated.
    temp: interp('temperature_2m', robustWeightedBlend),
    feels: interp('apparent_temperature', robustWeightedBlend),
    dewPoint: interp('dew_point_2m', robustWeightedBlend),
    pressure: interp('pressure_msl', robustWeightedBlend),
    wind: interp('wind_speed_10m', robustWeightedBlend),
    // Other continuous vars: sub-hour interpolated.
    precipProb: interp('precipitation_probability'),
    humidity: interp('relative_humidity_2m'),
    gust: interp('wind_gusts_10m'),
    cloud: interp('cloud_cover'),
    visibility: interp('visibility'),
    uv: interp('uv_index'),
    // Non-interpolated: categorical / circular / hourly-accumulation / flag.
    code: weightedCodeMode(weightPair((m) => m.current.code)),
    precip: weightedBlend(weightPair((m) => m.current.precip)),
    windDir: weightedCircularBlend(weightPair((m) => m.current.windDir)),
    isDay: lead ? lead.current.isDay : true,
  };
  // Don't show a rain/drizzle headline when there's effectively no precipitation.
  cur.code = reconcileCode(cur.code, { precip: cur.precip, precipProb: cur.precipProb, cloud: cur.cloud });

  // ---- consensus: hourly (next 24h from now) ----
  const hourlyConsensus = [];
  const end = Math.min(times.length, now + 24);
  for (let i = now; i < end; i++) {
    const pairAt = (v) =>
      models.map((m) => {
        const arr = series(hourly, v, m.id);
        return { value: arr ? arr[i] : null, weight: m.weight };
      });
    const leadIsDay = lead ? series(hourly, 'is_day', lead.id)?.[i] : 1;
    const hPrecip = weightedBlend(pairAt('precipitation'));
    const hPrecipProb = weightedBlend(pairAt('precipitation_probability'));
    const hCloud = weightedBlend(pairAt('cloud_cover'));
    hourlyConsensus.push({
      time: times[i],
      temp: robustWeightedBlend(pairAt('temperature_2m')),
      feels: robustWeightedBlend(pairAt('apparent_temperature')),
      code: reconcileCode(weightedCodeMode(pairAt('weather_code')), {
        precip: hPrecip,
        precipProb: hPrecipProb,
        cloud: hCloud,
      }),
      precipProb: hPrecipProb,
      precip: hPrecip,
      humidity: weightedBlend(pairAt('relative_humidity_2m')),
      wind: robustWeightedBlend(pairAt('wind_speed_10m')),
      uv: weightedBlend(pairAt('uv_index')),
      pressure: robustWeightedBlend(pairAt('pressure_msl')),
      gust: weightedBlend(pairAt('wind_gusts_10m')),
      windDir: weightedCircularBlend(pairAt('wind_direction_10m')),
      cloud: hCloud,
      visibility: weightedBlend(pairAt('visibility')),
      dewPoint: robustWeightedBlend(pairAt('dew_point_2m')),
      isDay: leadIsDay == null ? true : leadIsDay === 1,
    });
  }

  // ---- consensus: daily (7 days) ----
  const dailyConsensus = dates.map((date, i) => {
    const pairAt = (v) =>
      models.map((m) => {
        const arr = dseries(daily, v, m.id);
        return { value: arr ? arr[i] : null, weight: m.weight };
      });
    const dPrecipProb = weightedBlend(pairAt('precipitation_probability_max'));
    const dPrecipSum = weightedBlend(pairAt('precipitation_sum'));
    return {
      date,
      tMax: robustWeightedBlend(pairAt('temperature_2m_max')),
      tMin: robustWeightedBlend(pairAt('temperature_2m_min')),
      feelsMax: robustWeightedBlend(pairAt('apparent_temperature_max')),
      feelsMin: robustWeightedBlend(pairAt('apparent_temperature_min')),
      code: reconcileCode(weightedCodeMode(pairAt('weather_code')), {
        precip: dPrecipSum,
        precipProb: dPrecipProb,
      }),
      precipProb: dPrecipProb,
      precipSum: dPrecipSum,
      precipHours: weightedBlend(pairAt('precipitation_hours')),
      windMax: weightedBlend(pairAt('wind_speed_10m_max')),
      sunshineDuration: weightedBlend(pairAt('sunshine_duration')),
      uvMax: weightedBlend(pairAt('uv_index_max')),
    };
  });

  const pressureTrend = computePressureTrend(models, hourly, now);
  const confidence = computeConfidence(models, hourly, modelIds, now);

  // Sunrise/sunset are non-blendable strings: take today's from the lead model.
  const sun = {
    sunrise: lead ? dseries(daily, 'sunrise', lead.id)?.[0] ?? null : null,
    sunset: lead ? dseries(daily, 'sunset', lead.id)?.[0] ?? null : null,
    uvMax: dailyConsensus[0]?.uvMax ?? null,
  };

  return {
    models,
    consensus: { current: cur, hourly: hourlyConsensus, daily: dailyConsensus, sun, pressureTrend },
    confidence,
    meta: {
      region,
      currentIndex: now,
      times,
      timezone: api.timezone,
      utcOffsetSeconds: api.utc_offset_seconds,
      elevation: api.elevation,
    },
  };
}

/**
 * Pressure trend over the last 3 hours (WMO standard: ±1 hPa = rising/falling).
 */
function computePressureTrend(models, hourly, nowIdx) {
  const lookback = 3;
  if (nowIdx < lookback) return { trend: 'steady', delta: 0 };
  const pressureAt = (idx) => {
    const pairs = models.map((m) => {
      const arr = series(hourly, 'pressure_msl', m.id);
      return { value: arr?.[idx] ?? null, weight: m.weight };
    });
    return weightedBlend(pairs);
  };
  const pNow = pressureAt(nowIdx);
  const pPast = pressureAt(nowIdx - lookback);
  if (!isNum(pNow) || !isNum(pPast)) return { trend: 'steady', delta: 0 };
  const delta = pNow - pPast;
  const trend = delta > 1 ? 'rising' : delta < -1 ? 'falling' : 'steady';
  return { trend, delta: Number(delta.toFixed(1)) };
}

/**
 * Meteorological Confidence Index.
 *
 * Built from how tightly the *contributing* models agree. We measure the spread
 * (σ) of 2m temperature at the current hour and averaged over the next 12h, plus
 * a penalty when models disagree on whether it will rain. Tight agreement => high
 * confidence / stable signal; wide divergence => "Volatile".
 */
export function computeConfidence(models, hourly, modelIds, nowIdx) {
  // Only models that actually contribute to the consensus inform confidence.
  const contributing = modelIds.filter((id) => (models.find((m) => m.id === id)?.weight ?? 0) > 0);
  const pool = contributing.length >= 2 ? contributing : modelIds;

  const tempsNow = pool.map((id) => series(hourly, 'temperature_2m', id)?.[nowIdx]).filter(isNum);

  // Average temperature spread across the next 12 hours for a steadier read.
  const horizon = 12;
  let spreadSum = 0;
  let spreadN = 0;
  for (let i = nowIdx; i < nowIdx + horizon; i++) {
    const vals = pool.map((id) => series(hourly, 'temperature_2m', id)?.[i]);
    const s = stdDev(vals);
    if (vals.filter(isNum).length >= 2) {
      spreadSum += s;
      spreadN += 1;
    }
  }
  const tempSpread = spreadN ? spreadSum / spreadN : stdDev(tempsNow);

  // Precip disagreement: do models agree on rain / no-rain over next 12h?
  let disagreeHours = 0;
  let checkedHours = 0;
  for (let i = nowIdx; i < nowIdx + horizon; i++) {
    const flags = pool
      .map((id) => series(hourly, 'precipitation', id)?.[i])
      .filter(isNum)
      .map((p) => (p >= 0.1 ? 1 : 0));
    if (flags.length >= 2) {
      checkedHours += 1;
      if (new Set(flags).size > 1) disagreeHours += 1;
    }
  }
  const precipDisagree = checkedHours ? disagreeHours / checkedHours : 0;

  // Score: start at 100, subtract for temperature spread and precip disagreement.
  // ~12°C/°C of spread penalty + up to 30 pts for full precip disagreement.
  let score = 100 - tempSpread * 12 - precipDisagree * 30;
  score = Math.max(5, Math.min(100, Math.round(score)));

  // Label off the combined score so precip-only disagreement doesn't read as
  // "Volatile" when the temperature signal is rock-solid.
  let label, tone, blurb;
  if (score >= 80) {
    label = 'High';
    tone = 'high';
    blurb =
      precipDisagree > 0.3
        ? 'Temperatures agree closely; some uncertainty on precipitation timing.'
        : 'Models strongly agree — a reliable, settled signal.';
  } else if (score >= 58) {
    label = 'Moderate';
    tone = 'moderate';
    blurb = 'Some model divergence — the forecast may still shift.';
  } else {
    label = 'Volatile';
    tone = 'low';
    blurb = 'Models diverge sharply — treat this forecast with caution.';
  }

  return {
    score,
    label,
    tone,
    blurb,
    tempSpread: Number(tempSpread.toFixed(1)),
    precipDisagree: Math.round(precipDisagree * 100),
    contributing: pool.length,
  };
}
