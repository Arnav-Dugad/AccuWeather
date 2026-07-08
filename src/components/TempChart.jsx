import { useId } from 'react';
import { motion } from 'framer-motion';
import { hourLabel, round } from '../lib/format.js';

/**
 * Metric-aware 24h consensus chart. Plots whatever series the `metric` descriptor
 * exposes (temperature / feels-like / rain chance / wind / humidity) in a
 * stretchable SVG with a non-scaling stroke; labels and the "now" dot are HTML
 * positioned by percentage so text stays crisp at every width.
 *
 * Props:
 *   hours  — data.consensus.hourly
 *   metric — { key, label, unit, color, accessor(h)->number, format(v)->string }
 */
export default function TempChart({ hours, metric }) {
  const gid = `c${useId().replace(/:/g, '')}`;
  const accessor = metric?.accessor ?? ((h) => h.temp);
  const fmt = metric?.format ?? ((v) => round(v));
  const color = metric?.color ?? '#38bdf8';
  const isTemp = (metric?.key ?? 'temp') === 'temp';

  const pts = (hours ?? []).filter((h) => { const v = accessor(h); return typeof v === 'number' && Number.isFinite(v); });
  if (pts.length < 2) return null;

  const W = 1000;
  const H = 100;
  const insetL = 24;
  const insetR = 24;
  const top = 22;
  const bottom = 14;

  const vals = pts.map((h) => accessor(h));
  const min = Math.min(...vals);
  const max = Math.max(...vals);
  if (!Number.isFinite(min) || !Number.isFinite(max)) return null;
  const span = Math.max(metric?.minSpan ?? 1, max - min);

  const x = (i) => insetL + (i / (pts.length - 1)) * (W - insetL - insetR);
  const y = (t) => top + (1 - (t - min) / span) * (H - top - bottom);
  const xPct = (i) => (x(i) / W) * 100;
  const yPct = (t) => (y(t) / H) * 100;

  const linePath = vals.map((t, i) => `${i === 0 ? 'M' : 'L'} ${x(i).toFixed(1)} ${y(t).toFixed(1)}`).join(' ');
  const areaPath = `${linePath} L ${x(pts.length - 1).toFixed(1)} ${H - bottom} L ${x(0).toFixed(1)} ${H - bottom} Z`;

  const ticks = pts.map((h, i) => ({ i, label: hourLabel(h.time, i === 0) })).filter((_, i) => i % 3 === 0);
  const maxI = vals.indexOf(max);
  const minI = vals.indexOf(min);

  const edgeTx = (i) =>
    i === 0 ? 'translate-x-0' : i === pts.length - 1 ? '-translate-x-full' : '-translate-x-1/2';

  return (
    <div className="w-full overflow-hidden">
      <div
        className="relative h-28 w-full sm:h-36"
        role="img"
        aria-label={`24-hour ${metric?.label ?? 'temperature'} trend, ${fmt(min)} to ${fmt(max)} ${metric?.unit ?? ''}`}
      >
        <svg viewBox={`0 0 ${W} ${H}`} className="absolute inset-0 h-full w-full" preserveAspectRatio="none">
          <defs>
            <linearGradient id={`${gid}area`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor={color} stopOpacity="0.35" />
              <stop offset="1" stopColor={color} stopOpacity="0" />
            </linearGradient>
            <linearGradient id={`${gid}line`} x1="0" y1="0" x2="1" y2="0">
              {isTemp ? (
                <>
                  <stop offset="0" stopColor="#38bdf8" />
                  <stop offset="0.5" stopColor="#818cf8" />
                  <stop offset="1" stopColor="#f472b6" />
                </>
              ) : (
                <>
                  <stop offset="0" stopColor={color} />
                  <stop offset="1" stopColor={color} />
                </>
              )}
            </linearGradient>
          </defs>

          {/* precip-probability bars — temperature view only */}
          {isTemp &&
            pts.map((h, i) => {
              const p = round(h.precipProb) ?? 0;
              if (p <= 0) return null;
              const bh = (p / 100) * (H - top - bottom) * 0.55;
              return <rect key={i} x={x(i) - 4} y={H - bottom - bh} width={8} height={bh} fill="#38bdf8" opacity={0.14} />;
            })}

          <motion.path
            d={areaPath}
            fill={`url(#${gid}area)`}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.6 }}
          />
          <motion.path
            d={linePath}
            fill="none"
            stroke={`url(#${gid}line)`}
            strokeWidth={2.5}
            strokeLinecap="round"
            strokeLinejoin="round"
            vectorEffect="non-scaling-stroke"
            initial={{ pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{ duration: 1.2, ease: 'easeOut', delay: 0.3 }}
          />
          <line
            x1={x(0)}
            y1={top - 6}
            x2={x(0)}
            y2={H - bottom}
            stroke="rgba(255,255,255,0.22)"
            strokeWidth={1}
            strokeDasharray="3 3"
            vectorEffect="non-scaling-stroke"
          />
        </svg>

        <div className="pointer-events-none absolute inset-0">
          <span
            className="absolute h-2 w-2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white ring-2"
            style={{ left: `${xPct(0)}%`, top: `${yPct(vals[0])}%`, '--tw-ring-color': color }}
          />
          {[maxI, minI].map((i) => (
            <span
              key={i}
              className={`absolute ${edgeTx(i)} -translate-y-full text-[11px] font-semibold text-slate-200`}
              style={{ left: `${xPct(i)}%`, top: `${yPct(vals[i])}%`, marginTop: '-4px' }}
            >
              {fmt(vals[i])}
            </span>
          ))}
        </div>
      </div>

      <div className="relative mt-1 h-3 w-full">
        {ticks.map((t) => (
          <span
            key={t.i}
            className={`absolute ${edgeTx(t.i)} whitespace-nowrap text-[10px] text-ink-soft`}
            style={{ left: `${xPct(t.i)}%` }}
          >
            {t.label}
          </span>
        ))}
      </div>
      <div className="mt-1 text-right text-[10.5px] text-ink-soft">
        {metric?.label ?? 'temperature'} in {metric?.unit ?? '°'}
      </div>
    </div>
  );
}
