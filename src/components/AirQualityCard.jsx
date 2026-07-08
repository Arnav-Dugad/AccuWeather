import { motion } from 'framer-motion';
import { Wind, Info } from 'lucide-react';
import AnimatedNumber from './AnimatedNumber.jsx';
import { aqiCategory, dominantPollutant } from '../lib/airQuality.js';
import { round } from '../lib/format.js';

/**
 * Air Quality card (US AQI + pollutants + health advice).
 * Props: aq (object from fetchAirQuality), status
 */
export default function AirQualityCard({ aq, status }) {
  if (status === 'error' || (status === 'success' && !aq)) return null;

  const loading = status === 'loading' || status === 'idle' || !aq;
  const cat = aqiCategory(aq?.usAqi);
  const dom = aq ? dominantPollutant(aq) : null;

  const pollutants = aq
    ? [
        { k: 'PM2.5', v: round(aq.pm2_5, 1), u: 'µg/m³' },
        { k: 'PM10', v: round(aq.pm10), u: 'µg/m³' },
        { k: 'O₃', v: round(aq.ozone), u: 'µg/m³' },
        { k: 'NO₂', v: round(aq.no2), u: 'µg/m³' },
        { k: 'SO₂', v: round(aq.so2), u: 'µg/m³' },
        { k: 'CO', v: round(aq.co), u: 'µg/m³' },
      ]
    : [];

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.1, ease: 'easeOut' }}
      className="glass relative overflow-hidden rounded-3xl p-5"
    >
      <div
        className="pointer-events-none absolute -right-12 -top-16 h-48 w-48 rounded-full opacity-40 blur-3xl"
        style={{ background: `radial-gradient(circle, ${cat.color}, transparent 70%)` }}
      />

      <div className="flex items-center gap-2 text-ink-soft">
        <Wind size={16} className="text-sky-300" />
        <h3 className="text-[11px] font-semibold uppercase tracking-[0.18em]">Air Quality</h3>
      </div>

      {loading ? (
        <div className="mt-4 space-y-3">
          <div className="skeleton h-12 w-28 rounded-xl" />
          <div className="skeleton h-4 w-full rounded" />
          <div className="grid grid-cols-3 gap-2 xs:grid-cols-6">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="skeleton h-12 rounded-xl" />
            ))}
          </div>
        </div>
      ) : (
        <>
          <div className="relative mt-3 flex items-end justify-between gap-4">
            <div>
              <div className="flex items-baseline gap-2">
                <span className="font-display text-5xl font-bold text-ink">
                  <AnimatedNumber value={aq.usAqi} />
                </span>
                <span className="text-xs text-ink-soft">US AQI</span>
              </div>
              <div className="mt-2 flex flex-wrap gap-1.5">
                <span
                  className="inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ring-1"
                  style={{ background: cat.soft, color: cat.color, borderColor: `${cat.color}55` }}
                >
                  {cat.label}
                </span>
                {aq.euAqi != null && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-white/8 px-2.5 py-1 text-[11px] font-medium text-ink-soft ring-1 ring-white/10">
                    EU {round(aq.euAqi)}
                  </span>
                )}
              </div>
            </div>
            {dom && (
              <div className="text-right">
                <div className="text-[11px] text-ink-soft">Dominant</div>
                <div className="font-display text-lg font-semibold text-ink">{dom}</div>
              </div>
            )}
          </div>

          <div className="mt-4 grid grid-cols-3 gap-2 xs:grid-cols-6">
            {pollutants.map((p) => (
              <div key={p.k} className="rounded-xl border border-white/8 bg-white/[0.03] px-2 py-2 text-center">
                <div className="text-[10.5px] text-ink-soft">{p.k}</div>
                <div className="font-display text-sm font-semibold text-ink">{p.v ?? '—'}</div>
              </div>
            ))}
          </div>

          <p className="mt-4 flex items-start gap-2 text-xs leading-relaxed text-ink-soft">
            <Info size={13} className="mt-0.5 shrink-0 text-sky-300/70" />
            <span>{cat.advice}</span>
          </p>
        </>
      )}
    </motion.div>
  );
}
