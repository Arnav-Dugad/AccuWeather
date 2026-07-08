import { motion } from 'framer-motion';

const CARDINALS = [
  { label: 'N', angle: 0 },
  { label: 'E', angle: 90 },
  { label: 'S', angle: 180 },
  { label: 'W', angle: 270 },
];

const INTERCARDINALS = [45, 135, 225, 315];

export default function WindCompass({ dir, speed, gust, windUnit, compass }) {
  const size = 140;
  const cx = size / 2;
  const cy = size / 2;
  const outerR = 50;
  const innerR = 40;
  const needleLen = 36;
  const gustRatio = gust && speed ? Math.min(1, gust / (speed * 2.5 || 1)) : 0;

  return (
    <div
      className="flex flex-col items-center gap-2"
      role="img"
      aria-label={`Wind ${speed != null ? Math.round(speed) : 'unknown'} ${windUnit}${compass ? ` from the ${compass}` : ''}`}
    >
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden="true">
          <circle cx={cx} cy={cy} r={outerR} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth={1.5} />
          <circle cx={cx} cy={cy} r={innerR} fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth={1} />

          {CARDINALS.map(({ label, angle }) => {
            const rad = ((angle - 90) * Math.PI) / 180;
            const tx = cx + Math.cos(rad) * (outerR + 9);
            const ty = cy + Math.sin(rad) * (outerR + 9);
            const ix = cx + Math.cos(rad) * outerR;
            const iy = cy + Math.sin(rad) * outerR;
            const ox = cx + Math.cos(rad) * (outerR - 5);
            const oy = cy + Math.sin(rad) * (outerR - 5);
            return (
              <g key={label}>
                <line x1={ox} y1={oy} x2={ix} y2={iy} stroke="rgba(255,255,255,0.3)" strokeWidth={1.5} />
                <text x={tx} y={ty} textAnchor="middle" dominantBaseline="central"
                  className="fill-ink text-[10px] font-semibold" style={{ fontFamily: 'var(--font-display)' }}>
                  {label}
                </text>
              </g>
            );
          })}

          {INTERCARDINALS.map((angle) => {
            const rad = ((angle - 90) * Math.PI) / 180;
            const ix = cx + Math.cos(rad) * outerR;
            const iy = cy + Math.sin(rad) * outerR;
            const ox = cx + Math.cos(rad) * (outerR - 3);
            const oy = cy + Math.sin(rad) * (outerR - 3);
            return <line key={angle} x1={ox} y1={oy} x2={ix} y2={iy} stroke="rgba(255,255,255,0.15)" strokeWidth={1} />;
          })}

          {gustRatio > 0 && (
            <motion.circle
              cx={cx} cy={cy} r={outerR + 3}
              fill="none" stroke="#a78bfa" strokeWidth={2}
              strokeDasharray={`${gustRatio * 2 * Math.PI * (outerR + 3)} ${2 * Math.PI * (outerR + 3)}`}
              strokeLinecap="round"
              animate={{ scale: [1, 1.04, 1], opacity: [0.25, 0.55, 0.25] }}
              transition={{ repeat: Infinity, duration: 2, ease: 'easeInOut' }}
              style={{ transformBox: 'fill-box', transformOrigin: 'center' }}
            />
          )}
        </svg>

        <motion.div
          className="absolute inset-0"
          animate={{ rotate: typeof dir === 'number' ? dir : 0 }}
          transition={{ type: 'spring', stiffness: 60, damping: 15 }}
          style={{ transformOrigin: `${cx}px ${cy}px` }}
        >
          <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
            <defs>
              <linearGradient id="needle-grad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0" stopColor="#f87171" />
                <stop offset="1" stopColor="#fb923c" />
              </linearGradient>
            </defs>
            <line
              x1={cx} y1={cy - needleLen} x2={cx} y2={cy + 14}
              stroke="url(#needle-grad)" strokeWidth={2.5} strokeLinecap="round"
            />
            <polygon
              points={`${cx},${cy - needleLen} ${cx - 4},${cy - needleLen + 10} ${cx + 4},${cy - needleLen + 10}`}
              fill="#f87171"
            />
            <circle cx={cx} cy={cy} r={4} fill="#1e1b4b" stroke="rgba(255,255,255,0.2)" strokeWidth={1} />
          </svg>
        </motion.div>

        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
          <span className="font-display text-lg font-bold text-ink leading-none">
            {speed != null ? Math.round(speed) : '--'}
          </span>
          <span className="text-[9px] text-ink-soft">{windUnit}</span>
        </div>
      </div>

      {compass && (
        <div className="text-center text-[10.5px] font-medium text-ink-soft">
          {compass} · {typeof dir === 'number' ? `${Math.round(dir)}°` : '--'}
        </div>
      )}
    </div>
  );
}
