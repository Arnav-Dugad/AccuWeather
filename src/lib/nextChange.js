import { isPrecipCode, weatherFor } from './weatherCodes.js';
import { hourLabel } from './format.js';

/** Coarse sky state used to detect meaningful transitions. */
function skyState(code) {
  if (isPrecipCode(code)) return 'precip';
  if (code <= 1) return 'clear'; // clear / mainly clear
  return 'cloud'; // partly cloudy, overcast, fog, etc.
}

const isSnow = (code) => [71, 73, 75, 77, 85, 86].includes(code);

/**
 * Find the next meaningful weather transition in the 24h consensus and describe
 * it in one line. Returns { tone, headline } or null when there's no data.
 *   tone: 'precip' | 'clearing' | 'clouding' | 'steady'
 */
export function buildNextChange(hours) {
  if (!hours?.length) return null;
  const now = hours[0];
  if (typeof now.code !== 'number') return null;

  const fromState = skyState(now.code);

  for (let i = 1; i < hours.length; i++) {
    const h = hours[i];
    if (typeof h.code !== 'number') continue;
    const toState = skyState(h.code);
    if (toState === fromState) continue;

    const when = hourLabel(h.time, false);

    if (toState === 'precip') {
      const label = weatherFor(h.code).label.toLowerCase();
      const kind = isSnow(h.code) ? 'snow' : label.includes('drizzle') ? 'drizzle' : label.includes('thunder') ? 'storms' : 'rain';
      return { tone: 'precip', headline: `${cap(kind)} likely around ${when}` };
    }
    if (fromState === 'precip') {
      return { tone: 'clearing', headline: `Precipitation easing by ${when}` };
    }
    if (toState === 'cloud') {
      return { tone: 'clouding', headline: `Clouds building around ${when}` };
    }
    // toState === 'clear'
    return { tone: 'clearing', headline: `Skies clearing by ${when}` };
  }

  // No transition within the window — describe the settled state.
  if (fromState === 'precip') return { tone: 'precip', headline: 'Precipitation continuing through the day' };
  if (fromState === 'clear') return { tone: 'steady', headline: 'Staying clear all day' };
  return { tone: 'steady', headline: 'No major change expected today' };
}

const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);
