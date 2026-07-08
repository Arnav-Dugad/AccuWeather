import { motion } from 'framer-motion';
import { MapPin, ArrowUp, ArrowDown, Clock } from 'lucide-react';
import WeatherIcon from './WeatherIcon.jsx';
import AnimatedNumber from './AnimatedNumber.jsx';
import WeatherScene from './WeatherScene.jsx';
import FeelsGauge from './FeelsGauge.jsx';
import { weatherFor } from '../lib/weatherCodes.js';
import { round, localClock } from '../lib/format.js';
import { useUnits } from '../context/UnitsContext.jsx';

/**
 * Hero "Consensus Temperature/Condition" card.
 * Props: data (weather model), placeName
 */
export default function ConsensusCard({ data, placeName, pop }) {
  const { tVal, fmtTemp, tempUnit } = useUnits();
  const c = data.consensus.current;
  const today = data.consensus.daily[0];
  const { label, gradient, severe } = weatherFor(c.code, c.isDay);
  // Prefer ensemble PoP (probabilistic) over deterministic precip probability.
  const precipPct = typeof pop === 'number' ? pop : round(c.precipProb);

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: 'easeOut' }}
      className="glass relative overflow-hidden rounded-3xl p-6 sm:p-8"
    >
      {/* condition-tinted glow */}
      <div
        className="pointer-events-none absolute -right-16 -top-20 h-64 w-64 rounded-full opacity-40 blur-3xl"
        style={{ background: `radial-gradient(circle, ${gradient[0]}, transparent 70%)` }}
      />
      <WeatherScene code={c.code} isDay={c.isDay} />

      <div className="relative flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="flex items-center gap-2 text-ink-soft">
            <MapPin size={15} className="shrink-0 text-sky-300" />
            <h2 className="truncate text-sm font-medium sm:text-base">{placeName}</h2>
          </div>
          <div className="mt-1 flex min-w-0 items-center gap-2 text-xs text-white/45">
            <Clock size={12} className="shrink-0" />
            <span className="shrink-0">Local {localClock(data.meta.utcOffsetSeconds)}</span>
            <span className="shrink-0 text-white/25">·</span>
            <span className="truncate">{data.meta.timezone}</span>
          </div>
        </div>

        <span className="chip inline-flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-wider text-sky-200">
          Consensus
        </span>
      </div>

      <div className="relative mt-6 flex flex-wrap items-center justify-between gap-x-6 gap-y-4">
        <div className="flex items-center gap-5">
          <div className="flex items-start font-display text-6xl font-bold tabular-nums leading-none xs:text-7xl lg:text-8xl">
            <AnimatedNumber value={tVal(c.temp)} />
            <span className="mt-1.5 text-2xl text-ink-soft xs:text-3xl lg:text-4xl">{tempUnit}</span>
          </div>
        </div>

        <div className="flex flex-col items-end gap-2 text-right">
          <WeatherIcon code={c.code} isDay={c.isDay} size={60} strokeWidth={1.4} />
          <span className="text-lg font-semibold text-ink">{label}</span>
          {severe && (
            <span className="rounded-full bg-rose-500/15 px-2.5 py-0.5 text-[11px] font-semibold text-rose-300 ring-1 ring-rose-400/30">
              Severe conditions
            </span>
          )}
        </div>
      </div>

      <div className="relative mt-6 space-y-3">
        <FeelsGauge feels={c.feels} actual={c.temp} />
        <div className="flex flex-wrap items-center gap-x-6 gap-y-3 text-sm">
          {today && (
            <span className="inline-flex items-center gap-3 text-ink-soft">
              <span className="inline-flex items-center gap-1">
                <ArrowUp size={14} className="text-rose-300" />
                <strong className="font-semibold text-ink">{fmtTemp(today.tMax)}</strong>
              </span>
              <span className="inline-flex items-center gap-1">
                <ArrowDown size={14} className="text-sky-300" />
                <strong className="font-semibold text-ink">{fmtTemp(today.tMin)}</strong>
              </span>
            </span>
          )}
          {precipPct !== null && (
            <span className="text-ink-soft">
              Rain chance <strong className="font-semibold text-ink">{precipPct}%</strong>
            </span>
          )}
        </div>
      </div>
    </motion.div>
  );
}
