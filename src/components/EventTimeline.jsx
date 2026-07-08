import { Clock } from 'lucide-react';
import { hourLabel } from '../lib/format.js';

function detectEvents(hours, sun) {
  const events = [];
  let rainStart = null;
  let uvStart = null;
  let gustStart = null;

  for (let i = 0; i < hours.length; i++) {
    const h = hours[i];
    const raining = (h.precipProb ?? 0) >= 40;
    const highUV = (h.uv ?? 0) > 6;
    const gusty = (h.gust ?? 0) > 40;

    if (raining && rainStart == null) rainStart = i;
    if (!raining && rainStart != null) {
      events.push({ type: 'rain', start: rainStart, end: i - 1, color: '#38bdf8', label: 'Rain' });
      rainStart = null;
    }
    if (highUV && uvStart == null) uvStart = i;
    if (!highUV && uvStart != null) {
      events.push({ type: 'uv', start: uvStart, end: i - 1, color: '#fbbf24', label: 'UV Peak' });
      uvStart = null;
    }
    if (gusty && gustStart == null) gustStart = i;
    if (!gusty && gustStart != null) {
      events.push({ type: 'gust', start: gustStart, end: i - 1, color: '#34d399', label: 'Wind' });
      gustStart = null;
    }
  }
  if (rainStart != null) events.push({ type: 'rain', start: rainStart, end: hours.length - 1, color: '#38bdf8', label: 'Rain' });
  if (uvStart != null) events.push({ type: 'uv', start: uvStart, end: hours.length - 1, color: '#fbbf24', label: 'UV Peak' });
  if (gustStart != null) events.push({ type: 'gust', start: gustStart, end: hours.length - 1, color: '#34d399', label: 'Wind' });

  return events;
}

/**
 * Derive daytime spans and sunrise/sunset transitions straight from each hour's
 * is_day flag (present on every consensus-hourly entry). This is correct all day
 * and across the midnight wrap — unlike subtracting hour-of-day from today's
 * sunrise, which broke once sunrise had passed.
 */
function daylightFromHours(hours) {
  const daySpans = [];
  const sunrises = [];
  const sunsets = [];
  let runStart = null;
  for (let i = 0; i < hours.length; i++) {
    const day = hours[i].isDay === true;
    const prevDay = i > 0 ? hours[i - 1].isDay === true : null;
    if (day && runStart == null) {
      runStart = i;
      if (prevDay === false) sunrises.push(i); // night -> day
    }
    if (!day && runStart != null) {
      daySpans.push([runStart, i - 1]);
      if (prevDay === true) sunsets.push(i - 1); // day -> night at prior hour
      runStart = null;
    }
  }
  if (runStart != null) daySpans.push([runStart, hours.length - 1]);
  return { daySpans, sunrises, sunsets };
}

export default function EventTimeline({ data }) {
  const hours = data?.consensus?.hourly;
  const sun = data?.consensus?.sun;
  if (!hours?.length) return null;

  const events = detectEvents(hours, sun);
  if (!events.length) return null;

  const total = hours.length;
  const { daySpans, sunrises, sunsets } = daylightFromHours(hours);
  const hasSunEvent = sunrises.length > 0 || sunsets.length > 0;

  const ticks = hours
    .map((h, i) => ({ i, label: hourLabel(h.time, i === 0) }))
    .filter((_, i) => i % 4 === 0);

  return (
    <div className="glass rounded-3xl p-5">
      <div className="mb-3 flex items-center gap-2 text-ink-soft">
        <Clock size={16} className="text-sky-300" />
        <h3 className="text-[11px] font-semibold uppercase tracking-[0.18em]">Today's Events</h3>
      </div>

      <div className="relative h-7 w-full overflow-hidden rounded-full bg-white/5">
        {/* daytime bands (one per daylight run in the window) */}
        {daySpans.map(([s, e]) => (
          <div
            key={`day-${s}`}
            className="absolute inset-y-0 bg-amber-400/8"
            style={{ left: `${(s / total) * 100}%`, width: `${((e - s + 1) / total) * 100}%` }}
          />
        ))}

        {/* event segments */}
        {events.map((ev, i) => (
          <div
            key={`${ev.type}-${i}`}
            className="absolute inset-y-0 rounded-full"
            style={{
              left: `${(ev.start / total) * 100}%`,
              width: `${Math.max(((ev.end - ev.start + 1) / total) * 100, 2)}%`,
              background: ev.color,
              opacity: 0.35,
            }}
          />
        ))}

        {/* sunrise/sunset transition markers */}
        {[...sunrises, ...sunsets].map((idx) => (
          <div
            key={`sun-${idx}`}
            className="absolute inset-y-0 w-0.5 bg-orange-400/60"
            style={{ left: `${(idx / total) * 100}%` }}
          />
        ))}
      </div>

      {/* tick labels */}
      <div className="relative mt-1 h-4">
        {ticks.map((t) => (
          <span
            key={t.i}
            className="absolute -translate-x-1/2 text-[10px] text-ink-soft"
            style={{ left: `${(t.i / total) * 100}%` }}
          >
            {t.label}
          </span>
        ))}
      </div>

      {/* legend */}
      <div className="mt-2 flex flex-wrap gap-3">
        {events.filter((ev, i, arr) => arr.findIndex((e) => e.type === ev.type) === i).map((ev) => {
          const startLabel = hourLabel(hours[ev.start].time, ev.start === 0);
          const endLabel = hourLabel(hours[Math.min(ev.end + 1, hours.length - 1)].time, false);
          return (
            <span key={ev.type} className="inline-flex items-center gap-1.5 text-[11px] text-ink-soft">
              <span className="h-2 w-2 rounded-full" style={{ background: ev.color }} />
              {ev.label} {startLabel}–{endLabel}
            </span>
          );
        })}
        {hasSunEvent && (
          <span className="inline-flex items-center gap-1.5 text-[11px] text-ink-soft">
            <span className="h-2 w-2 rounded-full bg-orange-400" />
            Sunrise/Sunset
          </span>
        )}
      </div>
    </div>
  );
}
