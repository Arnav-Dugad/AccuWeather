import { motion } from 'framer-motion';
import { CloudRain, CloudOff, Umbrella, Droplets } from 'lucide-react';
import { useUnits } from '../context/UnitsContext.jsx';

const TONES = {
  dry: { color: '#34d399', Icon: CloudOff, ring: 'ring-emerald-400/25' },
  incoming: { color: '#fbbf24', Icon: Umbrella, ring: 'ring-amber-400/25' },
  rain: { color: '#38bdf8', Icon: CloudRain, ring: 'ring-sky-400/25' },
};

function intensityLabel(mmPer15) {
  if (mmPer15 < 0.1) return 'none';
  if (mmPer15 < 0.5) return 'light';
  if (mmPer15 < 2) return 'moderate';
  return 'heavy';
}

// Relative offset label for a 15-min step index.
function offsetLabel(i) {
  if (i === 0) return 'Now';
  const m = i * 15;
  if (m % 60 === 0) return `+${m / 60}h`;
  if (m === 30) return '+30m';
  if (m === 90) return '+1.5h';
  return `+${m}m`;
}

/**
 * Minutely-15 nowcast: plain-language headline, peak/total detail, and a 2-hour
 * precipitation-intensity sparkline. Props: nowcast (from computeNowcast), status
 */
export default function RainNowcast({ nowcast, status }) {
  const { fmtRain, rainUnit } = useUnits();

  if (status === 'loading' || status === 'idle') {
    return <div className="skeleton h-40 rounded-3xl" />;
  }
  if (!nowcast?.hasData) return null;

  const tone = TONES[nowcast.tone] ?? TONES.rain;
  const { Icon } = tone;
  const maxP = Math.max(nowcast.peak, 0.5); // scale floor so light rain stays visible
  const total = nowcast.steps.reduce((a, s) => a + (s.precip || 0), 0);
  const peakWord = intensityLabel(nowcast.peak);
  const isDry = nowcast.tone === 'dry';

  const detail = isDry
    ? 'No measurable precipitation expected in the next 2 hours.'
    : `Peak intensity ${peakWord} · about ${fmtRain(total) ?? 0} ${rainUnit} total expected.`;

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, ease: 'easeOut' }}
      className="glass relative overflow-hidden rounded-3xl p-5 sm:p-6"
    >
      <div
        className="pointer-events-none absolute -left-10 -top-12 h-44 w-44 rounded-full opacity-30 blur-3xl"
        style={{ background: `radial-gradient(circle, ${tone.color}, transparent 70%)` }}
      />

      <div className="relative flex items-start justify-between gap-4">
        <div className="flex min-w-0 items-start gap-3">
          <span
            className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl ring-1 ${tone.ring}`}
            style={{ background: `${tone.color}1f` }}
          >
            <Icon size={20} style={{ color: tone.color }} />
          </span>
          <div className="min-w-0">
            <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-ink-soft">
              Nowcast · next 2 hours
            </div>
            <div className="font-display text-base font-semibold text-ink sm:text-lg">{nowcast.headline}</div>
            <p className="mt-0.5 text-xs text-ink-soft">{detail}</p>
          </div>
        </div>

        {/* peak/total stat */}
        <div className="shrink-0 rounded-2xl px-3 py-2 text-right ring-1 ring-white/10" style={{ background: `${tone.color}14` }}>
          <div className="flex items-baseline justify-end gap-1">
            <span className="font-display text-xl font-bold text-ink">{fmtRain(total) ?? 0}</span>
            <span className="text-[11px] text-ink-soft">{rainUnit}</span>
          </div>
          <div className="mt-0.5 inline-flex items-center gap-1 text-[10px] uppercase tracking-wider text-ink-soft">
            <Droplets size={10} style={{ color: tone.color }} />2h total
          </div>
        </div>
      </div>

      {/* 15-min intensity sparkline — bars share one baseline; labels in a fixed row */}
      <div className="mt-5">
        <div className="flex h-16 items-stretch gap-1 border-b border-white/10 sm:h-20">
          {nowcast.steps.map((s, i) => {
            const wet = s.precip >= 0.1;
            const fillPct = wet ? Math.min(100, Math.max(12, (s.precip / maxP) * 100)) : 0;
            return (
              <div
                key={s.time}
                className="relative flex-1 overflow-hidden rounded-md bg-white/10"
                title={`${s.precip.toFixed(2)} mm`}
              >
                {wet && (
                  <motion.div
                    className="absolute inset-x-0 bottom-0 rounded-md"
                    initial={{ height: 0 }}
                    animate={{ height: `${fillPct}%` }}
                    transition={{ duration: 0.5, delay: i * 0.06, ease: 'easeOut' }}
                    style={{ background: tone.color, opacity: 0.9 }}
                  />
                )}
              </div>
            );
          })}
        </div>
        <div className="mt-1.5 flex gap-1">
          {nowcast.steps.map((s, i) => (
            <span key={s.time} className="flex-1 text-center text-[9.5px] text-white/40">
              {i % 2 === 0 ? offsetLabel(i) : ' '}
            </span>
          ))}
        </div>
      </div>
    </motion.div>
  );
}
