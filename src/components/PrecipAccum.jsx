import { motion } from 'framer-motion';
import { CloudRain } from 'lucide-react';
import { hourLabel, round } from '../lib/format.js';
import { useUnits } from '../context/UnitsContext.jsx';

export default function PrecipAccum({ hours }) {
  const { fmtRain, rainUnit } = useUnits();
  const pts = (hours ?? []).filter((h) => typeof h.precip === 'number');
  if (pts.length < 2) return null;

  let cumulative = [];
  let sum = 0;
  for (const h of pts) {
    sum += Math.max(0, h.precip || 0);
    cumulative.push({ time: h.time, value: sum, hourly: h.precip || 0 });
  }

  if (sum < 0.1) return null;

  const W = 1000;
  const H = 120;
  const padL = 24;
  const padR = 24;
  const top = 16;
  const bottom = 14;
  const maxVal = Math.max(sum, 0.5);

  const x = (i) => padL + (i / (cumulative.length - 1)) * (W - padL - padR);
  const y = (v) => top + (1 - v / maxVal) * (H - top - bottom);
  const xPct = (i) => (x(i) / W) * 100;
  const yPct = (v) => (y(v) / H) * 100;

  const linePath = cumulative
    .map((p, i) => `${i === 0 ? 'M' : 'L'} ${x(i).toFixed(1)} ${y(p.value).toFixed(1)}`)
    .join(' ');
  const areaPath = `${linePath} L ${x(cumulative.length - 1).toFixed(1)} ${H - bottom} L ${x(0).toFixed(1)} ${H - bottom} Z`;

  const peakI = cumulative.reduce((best, p, i) => (p.hourly > (cumulative[best]?.hourly || 0) ? i : best), 0);
  const ticks = cumulative.map((p, i) => ({ i, label: hourLabel(p.time, i === 0) })).filter((_, i) => i % 4 === 0);

  const edgeTx = (i) =>
    i === 0 ? 'translate-x-0' : i === cumulative.length - 1 ? '-translate-x-full' : '-translate-x-1/2';

  return (
    <div className="glass rounded-3xl p-5 sm:p-6">
      <div className="mb-4 flex items-center gap-2 text-ink-soft">
        <CloudRain size={16} className="text-sky-300" />
        <h3 className="text-[11px] font-semibold uppercase tracking-[0.18em]">Rain Accumulation &middot; 24h</h3>
      </div>

      <div className="w-full overflow-hidden">
        <div className="relative h-28 w-full sm:h-36">
          <svg viewBox={`0 0 ${W} ${H}`} className="absolute inset-0 h-full w-full" preserveAspectRatio="none">
            <defs>
              <linearGradient id="precipArea" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0" stopColor="#38bdf8" stopOpacity="0.3" />
                <stop offset="1" stopColor="#38bdf8" stopOpacity="0.02" />
              </linearGradient>
            </defs>

            <motion.path
              d={areaPath} fill="url(#precipArea)"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.5, delay: 0.8 }}
            />
            <motion.path
              d={linePath} fill="none" stroke="#38bdf8" strokeWidth={2.5}
              strokeLinecap="round" strokeLinejoin="round"
              vectorEffect="non-scaling-stroke"
              initial={{ pathLength: 0 }}
              animate={{ pathLength: 1 }}
              transition={{ duration: 1.5, ease: 'easeOut' }}
            />
          </svg>

          <div className="pointer-events-none absolute inset-0">
            {cumulative[peakI]?.hourly > 0.1 && (
              <span
                className="absolute -translate-x-1/2 -translate-y-full text-[10px] font-semibold text-sky-300"
                style={{ left: `${xPct(peakI)}%`, top: `${yPct(cumulative[peakI].value)}%`, marginTop: '-6px' }}
              >
                peak
              </span>
            )}
            <span
              className="absolute -translate-x-full text-[11px] font-semibold text-ink"
              style={{ left: `${xPct(cumulative.length - 1)}%`, top: `${yPct(sum)}%`, marginLeft: '-4px', marginTop: '-2px' }}
            >
              {fmtRain(sum)} {rainUnit}
            </span>
          </div>
        </div>

        <div className="relative mt-1 h-3 w-full">
          {ticks.map((t) => (
            <span key={t.i}
              className={`absolute ${edgeTx(t.i)} whitespace-nowrap text-[10px] text-ink-soft`}
              style={{ left: `${xPct(t.i)}%` }}
            >
              {t.label}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
