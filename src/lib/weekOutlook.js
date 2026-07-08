const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

function dayName(isoDate) {
  const d = new Date(`${isoDate}T00:00:00Z`);
  return DAY_NAMES[d.getUTCDay()] ?? isoDate;
}

function avg(arr) {
  const valid = arr.filter((v) => typeof v === 'number' && Number.isFinite(v));
  return valid.length ? valid.reduce((s, v) => s + v, 0) / valid.length : null;
}

export function buildWeekOutlook(daily) {
  if (!daily || daily.length < 4) return null;
  // Only reason about the next 7 days — the API returns 16, but "this week" copy
  // must not reference conditions a fortnight out.
  const week = daily.slice(0, 7);
  const parts = [];

  const earlyAvg = avg(week.slice(0, 3).map((d) => d.tMax));
  const lateAvg = avg(week.slice(Math.max(0, week.length - 3)).map((d) => d.tMax));
  if (earlyAvg != null && lateAvg != null) {
    const diff = lateAvg - earlyAvg;
    if (diff > 3) parts.push('Warming trend through the week');
    else if (diff < -3) parts.push('Cooling trend through the week');
    else parts.push('Temperatures staying steady');
  }

  let wettestDay = null;
  let wettestPop = 40;
  week.forEach((d) => {
    if ((d.precipProb ?? 0) > wettestPop) {
      wettestPop = d.precipProb;
      wettestDay = d.date;
    }
  });
  if (wettestDay) parts.push(`rain most likely ${dayName(wettestDay)}`);

  let bestScore = -Infinity;
  let bestDay = null;
  week.forEach((d) => {
    const score = 100 - (d.precipProb ?? 50) - Math.abs((d.tMax ?? 22) - 22) * 2;
    if (score > bestScore) { bestScore = score; bestDay = d.date; }
  });
  if (bestDay) parts.push(`best day looks like ${dayName(bestDay)}`);

  // Real Saturday/Sunday within the window, matched by weekday — not fixed indices.
  const sat = week.find((d) => dayName(d.date) === 'Saturday');
  const sun = week.find((d) => dayName(d.date) === 'Sunday');
  if (sat || sun) {
    const weekendDry = (sat?.precipProb ?? 0) < 30 && (sun?.precipProb ?? 0) < 30;
    if (weekendDry) parts.push('weekend looks dry');
    else parts.push('weekend may see some rain');
  }

  if (!parts.length) return null;
  const sentence = parts[0].charAt(0).toUpperCase() + parts[0].slice(1) +
    (parts.length > 1 ? '; ' + parts.slice(1).join('. ') + '.' : '.');
  return sentence;
}
