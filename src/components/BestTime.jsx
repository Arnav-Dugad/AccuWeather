import { PersonStanding, Camera, UtensilsCrossed, Star } from 'lucide-react';
import { hourLabel } from '../lib/format.js';
import CollapsibleCard from './CollapsibleCard.jsx';

function parseHour(iso) {
  const m = iso?.match(/T(\d{2})/);
  return m ? parseInt(m[1], 10) : null;
}

function goldenCheck(h, sunriseH, sunsetH) {
  const hr = parseHour(h.time);
  if (hr == null || sunriseH == null || sunsetH == null) return false;
  return (hr >= sunriseH && hr <= sunriseH + 1) || (hr >= sunsetH - 1 && hr <= sunsetH);
}

const ACTIVITIES = [
  {
    key: 'running', label: 'Running', Icon: PersonStanding, color: '#34d399',
    check: (h) => h.temp >= 10 && h.temp <= 22 && (h.wind ?? 0) < 25 && (h.precipProb ?? 0) < 30 && (h.uv ?? 0) < 8,
  },
  {
    key: 'photo', label: 'Photography', Icon: Camera, color: '#fbbf24',
    check: (h, meta) => goldenCheck(h, meta.sunriseH, meta.sunsetH) && (h.cloud ?? 100) < 40 && (h.visibility ?? 0) > 5000,
  },
  {
    key: 'dining', label: 'Outdoor Dining', Icon: UtensilsCrossed, color: '#fb923c',
    check: (h) => h.temp >= 18 && h.temp <= 30 && (h.precipProb ?? 0) < 20 && (h.wind ?? 0) < 20,
  },
  {
    key: 'stargazing', label: 'Stargazing', Icon: Star, color: '#a78bfa',
    check: (h) => !h.isDay && (h.cloud ?? 100) < 30 && (h.visibility ?? 0) > 8000,
  },
];

function findWindow(hours, check, meta) {
  for (let i = 0; i < hours.length - 1; i++) {
    if (check(hours[i], meta) && check(hours[i + 1], meta)) {
      return { start: i, end: i + 1, quality: 'good' };
    }
  }
  for (let i = 0; i < hours.length; i++) {
    if (check(hours[i], meta)) {
      return { start: i, end: i, quality: 'partial' };
    }
  }
  return null;
}

export default function BestTime({ data }) {
  const hours = data?.consensus?.hourly;
  const sun = data?.consensus?.sun;
  if (!hours?.length) return null;

  const sunriseH = sun?.sunrise ? parseHour(sun.sunrise) : null;
  const sunsetH = sun?.sunset ? parseHour(sun.sunset) : null;
  const meta = { sunriseH, sunsetH };

  const results = ACTIVITIES.map((act) => {
    const win = findWindow(hours, act.check, meta);
    let timeStr = 'Not ideal today';
    let quality = 'none';
    if (win) {
      const startLabel = hourLabel(hours[win.start].time, win.start === 0);
      const endLabel = hourLabel(hours[Math.min(win.end + 1, hours.length - 1)].time, false);
      timeStr = `${startLabel} – ${endLabel}`;
      quality = win.quality;
    }
    return { ...act, timeStr, quality };
  });

  return (
    <CollapsibleCard id="best-time" icon={Star} iconClass="text-amber-300" title="Best Time For">
      <div className="flex flex-col gap-2.5">
        {results.map(({ key, label, Icon, color, timeStr, quality }) => (
          <div key={key} className="flex items-center gap-3">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl"
              style={{ background: `${color}1a` }}>
              <Icon size={15} style={{ color }} />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-medium text-ink">{label}</p>
              <p className={`truncate text-[11px] ${
                quality === 'good' ? 'text-emerald-300' : quality === 'partial' ? 'text-amber-300' : 'text-ink-soft'
              }`}>
                {timeStr}
              </p>
            </div>
          </div>
        ))}
      </div>
    </CollapsibleCard>
  );
}
