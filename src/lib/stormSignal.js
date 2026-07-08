import { isPrecipCode, describeCode } from './weatherCodes.js';
import { hourLabel } from './format.js';

const isNum = (v) => typeof v === 'number' && Number.isFinite(v);

/**
 * Derive a short "storm signal" advisory from the pressure tendency and the
 * near-term hourly trend. Returns null for a plain settled forecast so the card
 * only appears when something meaningful is changing.
 *   tone: 'storm' | 'improving' | 'windy'
 */
export function buildStormSignal(consensus) {
  const hours = consensus?.hourly;
  const pt = consensus?.pressureTrend;
  if (!hours?.length) return null;

  const look = hours.slice(0, 7); // ~next 6h
  const rainingNow = isPrecipCode(hours[0].code);
  const falling = pt?.trend === 'falling';
  const rising = pt?.trend === 'rising';

  // First precip / severe onset in the window.
  let onsetIdx = -1;
  let severeSoon = false;
  for (let i = 1; i < look.length; i++) {
    const code = look[i].code;
    if (onsetIdx === -1 && isNum(code) && isPrecipCode(code)) onsetIdx = i;
    if (isNum(code) && describeCode(code).severe) severeSoon = true;
  }

  // Gust trend.
  const gustNow = isNum(hours[0].gust) ? hours[0].gust : null;
  const gustPeak = Math.max(...look.map((h) => (isNum(h.gust) ? h.gust : 0)));
  const gustRising = gustNow != null && gustPeak >= 45 && gustPeak - gustNow >= 15;

  // Clears within the window (was raining, stops).
  let clearsIdx = -1;
  if (rainingNow) {
    for (let i = 1; i < look.length; i++) {
      if (isNum(look[i].code) && !isPrecipCode(look[i].code)) { clearsIdx = i; break; }
    }
  }

  // ---- decide ----
  if (falling && (onsetIdx !== -1 || severeSoon || rainingNow)) {
    const when = onsetIdx !== -1 ? ` around ${hourLabel(look[onsetIdx].time, false)}` : '';
    return {
      tone: 'storm',
      headline: severeSoon ? 'Unsettled — storms possible' : 'Pressure falling, rain likely',
      detail: onsetIdx !== -1 ? `Precipitation moving in${when}` : `Barometer down ${Math.abs(pt.delta)} hPa / 3h`,
    };
  }

  if (rising && (rainingNow || clearsIdx !== -1)) {
    return {
      tone: 'improving',
      headline: 'Conditions improving',
      detail: clearsIdx !== -1 ? `Clearing by ${hourLabel(look[clearsIdx].time, false)}` : 'Pressure rising, skies settling',
    };
  }

  if (gustRising) {
    return {
      tone: 'windy',
      headline: 'Winds picking up',
      detail: `Gusts building toward ${Math.round(gustPeak)} km/h`,
    };
  }

  return null; // settled / uninformative
}
