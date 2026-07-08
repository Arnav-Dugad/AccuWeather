import { motion } from 'framer-motion';
import { Sunrise, Sunset, Sun, Clock } from 'lucide-react';
import { clockFromISO, round, uvCategory } from '../lib/format.js';

function sunProgress(sunrise, sunset, utcOffset) {
  if (!sunrise || !sunset) return -1;
  const now = Date.now() + (utcOffset ?? 0) * 1000;
  const srise = Date.parse(`${sunrise}Z`);
  const sset = Date.parse(`${sunset}Z`);
  if (now < srise || now > sset) return -1;
  return Math.min(1, Math.max(0, (now - srise) / (sset - srise)));
}

function pointOnArc(cx, cy, r, progress) {
  const angle = Math.PI * (1 - progress);
  return { x: cx + Math.cos(angle) * r, y: cy - Math.sin(angle) * r };
}

export default function SunArc({ sun, utcOffset, sunshineDuration }) {
  if (!sun || (!sun.sunrise && !sun.sunset)) return null;

  const W = 320;
  const H = 180;
  const cx = W / 2;
  const cy = 145;
  const r = 115;
  const progress = sunProgress(sun.sunrise, sun.sunset, utcOffset);
  const isDay = progress >= 0;

  const rawDayLen = sun.sunrise && sun.sunset
    ? Date.parse(`${sun.sunset}Z`) - Date.parse(`${sun.sunrise}Z`) : null;
  // Guard polar day/night edges where sunset ≤ sunrise (or the pair is invalid),
  // which would otherwise yield NaN/Infinity in the derived stats below.
  const dayLenMs = rawDayLen != null && rawDayLen > 0 ? rawDayLen : null;
  const dayH = dayLenMs ? Math.floor(dayLenMs / 3600000) : null;
  const dayM = dayLenMs ? Math.round((dayLenMs % 3600000) / 60000) : null;
  const uv = uvCategory(sun.uvMax);
  const sunshinePercent = (sunshineDuration != null && dayLenMs)
    ? Math.min(100, Math.round((sunshineDuration / (dayLenMs / 1000)) * 100))
    : null;

  const goldenRise = 1 / ((dayLenMs || 43200000) / 3600000);
  const goldenSet = 1 - goldenRise;

  const sunPos = isDay ? pointOnArc(cx, cy, r, progress) : null;
  const grPt = pointOnArc(cx, cy, r, goldenRise);
  const gsPt = pointOnArc(cx, cy, r, goldenSet);

  const arcPath = `M ${cx - r} ${cy} A ${r} ${r} 0 0 1 ${cx + r} ${cy}`;

  return (
    <div className="glass glass-hover rounded-3xl p-5">
      <div className="flex items-center gap-2 text-ink-soft mb-3">
        <Sun size={16} className="text-amber-300" />
        <h3 className="text-[11px] font-semibold uppercase tracking-[0.18em]">Sun Position</h3>
      </div>

      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="w-full"
        style={{ maxHeight: 170 }}
        role="img"
        aria-label={`Sun path. Sunrise ${clockFromISO(sun.sunrise)}, sunset ${clockFromISO(sun.sunset)}.${isDay ? ' Currently daytime.' : ' Currently night.'}`}
      >
        <defs>
          <linearGradient id="sun-arc-glow" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#fbbf24" stopOpacity="0.15" />
            <stop offset="1" stopColor="#fbbf24" stopOpacity="0" />
          </linearGradient>
          <filter id="sun-glow">
            <feGaussianBlur stdDeviation="4" result="blur" />
            <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
          </filter>
        </defs>

        <line x1={cx - r - 10} y1={cy} x2={cx + r + 10} y2={cy}
          stroke="rgba(255,255,255,0.08)" strokeWidth={1} strokeDasharray="4 4" />

        <path d={arcPath} fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth={2} />
        <path d={`${arcPath} L ${cx - r} ${cy} Z`} fill="url(#sun-arc-glow)" />

        {isDay && (
          <path d={arcPath} fill="none" stroke="#fbbf2444" strokeWidth={2}
            strokeDasharray={`${Math.PI * r * progress} ${Math.PI * r}`} />
        )}

        <circle cx={grPt.x} cy={grPt.y} r={3} fill="#f59e0b" opacity={0.5} />
        <circle cx={gsPt.x} cy={gsPt.y} r={3} fill="#f59e0b" opacity={0.5} />

        <g transform={`translate(${cx - r}, ${cy})`}>
          <Sunrise x={-10} y={2} size={16} className="text-amber-300" />
        </g>
        <g transform={`translate(${cx + r}, ${cy})`}>
          <Sunset x={-6} y={2} size={16} className="text-orange-300" />
        </g>

        <text x={cx - r} y={cy + 26} textAnchor="middle"
          className="fill-ink text-[10px] font-medium" style={{ fontFamily: 'var(--font-sans)' }}>
          {clockFromISO(sun.sunrise)}
        </text>
        <text x={cx + r} y={cy + 26} textAnchor="middle"
          className="fill-ink text-[10px] font-medium" style={{ fontFamily: 'var(--font-sans)' }}>
          {clockFromISO(sun.sunset)}
        </text>

        {sunPos && (
          <motion.circle
            cx={sunPos.x} cy={sunPos.y} r={7}
            fill="#fbbf24" filter="url(#sun-glow)"
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.6, ease: 'easeOut' }}
            style={{ transformOrigin: `${sunPos.x}px ${sunPos.y}px` }}
          />
        )}

        {!isDay && (
          <text x={cx} y={cy - 30} textAnchor="middle"
            className="fill-ink-soft text-[11px]" style={{ fontFamily: 'var(--font-sans)' }}>
            Night time
          </text>
        )}
      </svg>

      <div className="mt-2 flex flex-wrap items-center justify-around gap-3">
        {dayH != null && (
          <div className="flex items-center gap-2">
            <Clock size={14} className="text-sky-300" />
            <div>
              <div className="text-[10px] text-ink-soft">Day Length</div>
              <div className="font-display text-sm font-semibold text-ink">{dayH}h {dayM}m</div>
            </div>
          </div>
        )}
        {sunshinePercent != null && (
          <div className="flex items-center gap-2">
            <Sun size={14} className="text-amber-300" />
            <div>
              <div className="text-[10px] text-ink-soft">Sunshine</div>
              <div className="font-display text-sm font-semibold text-ink">{sunshinePercent}%</div>
            </div>
          </div>
        )}
        {sun.uvMax != null && (
          <div className="flex items-center gap-2">
            <Sun size={14} style={{ color: uv.color }} />
            <div>
              <div className="text-[10px] text-ink-soft">UV Peak</div>
              <div className="flex items-baseline gap-1">
                <span className="font-display text-sm font-semibold text-ink">{round(sun.uvMax, 1)}</span>
                <span className="text-[10px] font-medium" style={{ color: uv.color }}>{uv.label}</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
