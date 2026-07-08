import { useMemo } from 'react';
import { CalendarDays, Droplets } from 'lucide-react';
import WeatherIcon from './WeatherIcon.jsx';
import CollapsibleCard from './CollapsibleCard.jsx';
import { weatherFor } from '../lib/weatherCodes.js';
import { dayLabel, round } from '../lib/format.js';
import { useUnits } from '../context/UnitsContext.jsx';

/** Extended consensus forecast with a min/max range bar. */
export default function DailyForecast({ data, rainDaily }) {
  const { fmtTemp } = useUnits();
  // Hooks must run unconditionally — keep this above any early return.
  const popByDate = useMemo(() => new Map((rainDaily ?? []).map((d) => [d.date, d.pop])), [rainDaily]);

  const days = data.consensus.daily;
  if (!days?.length) return null;

  const maxes = days.map((d) => d.tMax).filter((v) => typeof v === 'number' && Number.isFinite(v));
  const mins = days.map((d) => d.tMin).filter((v) => typeof v === 'number' && Number.isFinite(v));
  if (!maxes.length || !mins.length) return null;
  const weekMax = Math.max(...maxes);
  const weekMin = Math.min(...mins);
  const span = Math.max(1, weekMax - weekMin);

  return (
    <CollapsibleCard id="daily" icon={CalendarDays} title="Extended Forecast">
      <div className="flex flex-col">
        {days.map((d, i) => {
          const { label } = weatherFor(d.code, true);
          const lo = Number.isFinite(((d.tMin - weekMin) / span) * 100) ? ((d.tMin - weekMin) / span) * 100 : 0;
          const hi = Number.isFinite(((d.tMax - weekMin) / span) * 100) ? ((d.tMax - weekMin) / span) * 100 : 100;
          const pop = popByDate.has(d.date) ? popByDate.get(d.date) : round(d.precipProb) ?? 0;
          const extended = i >= 7;
          return (
            <div
              key={d.date}
              className={`flex items-center gap-1.5 rounded-lg border-b border-white/5 py-2.5 transition-colors hover:bg-white/5 last:border-0 xs:gap-2.5 ${
                extended ? 'opacity-60' : ''
              }`}
            >
              <span className="w-8 shrink-0 text-sm font-medium text-ink xs:w-9">{dayLabel(d.date, i)}</span>
              <WeatherIcon code={d.code} isDay size={20} className="shrink-0" />

              <span className="min-w-0 flex-1 truncate text-xs text-ink-soft">{label}</span>

              <span className="inline-flex shrink-0 items-center gap-0.5 text-[11px] tabular-nums text-ink-soft">
                <Droplets size={10} className={pop > 30 ? 'text-sky-300' : 'text-white/30'} />
                {pop}%
              </span>

              <span className="w-7 shrink-0 text-right text-xs tabular-nums text-ink-soft xs:w-9 xs:text-sm">
                {fmtTemp(d.tMin)}
              </span>

              <div className="relative h-1.5 min-w-[1.5rem] flex-1 overflow-hidden rounded-full bg-white/10 sm:max-w-[6rem]">
                <div
                  className="absolute h-full rounded-full"
                  style={{
                    left: `${Math.max(0, lo)}%`,
                    width: `${Math.min(100, Math.max(8, hi - lo))}%`,
                    background: 'linear-gradient(90deg, #38bdf8, #fbbf24, #fb7185)',
                  }}
                />
              </div>

              <span className="w-7 shrink-0 text-right text-xs font-semibold tabular-nums text-ink xs:w-9 xs:text-sm">
                {fmtTemp(d.tMax)}
              </span>
            </div>
          );
        })}
      </div>

      {days.length > 7 && (
        <p className="mt-3 text-center text-[10.5px] text-ink-soft/60">
          Days 8–{days.length}: extended range — lower confidence
        </p>
      )}
    </CollapsibleCard>
  );
}
