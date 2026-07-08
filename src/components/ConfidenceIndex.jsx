import { motion } from 'framer-motion';
import { ShieldCheck, ShieldAlert, ShieldQuestion, Gauge } from 'lucide-react';
import { useUnits } from '../context/UnitsContext.jsx';
import CollapsibleCard from './CollapsibleCard.jsx';

const TONES = {
  high: { color: '#34d399', soft: 'rgba(52,211,153,0.15)', Icon: ShieldCheck, ring: 'ring-emerald-400/30', text: 'text-emerald-300' },
  moderate: { color: '#fbbf24', soft: 'rgba(251,191,36,0.15)', Icon: ShieldQuestion, ring: 'ring-amber-400/30', text: 'text-amber-300' },
  low: { color: '#fb7185', soft: 'rgba(251,113,133,0.15)', Icon: ShieldAlert, ring: 'ring-rose-400/30', text: 'text-rose-300' },
};

/** SVG arc gauge for the Meteorological Confidence Index. */
export default function ConfidenceIndex({ confidence }) {
  const { fmtSpread, tempUnit } = useUnits();
  if (!confidence) return null;
  const tone = TONES[confidence.tone] ?? TONES.moderate;
  const { Icon } = tone;

  // 270° arc gauge geometry.
  const size = 168;
  const stroke = 13;
  const r = (size - stroke) / 2;
  const cx = size / 2;
  const cy = size / 2;
  const sweep = 270;
  const startAngle = 135; // bottom-left
  const circ = 2 * Math.PI * r;
  const arcLen = (sweep / 360) * circ;
  const pct = confidence.score / 100;

  return (
    <CollapsibleCard id="confidence" icon={Gauge} title="Confidence Index">
      <div className="flex flex-col items-center">
        <div
          className="relative"
          style={{ width: size, height: size }}
          role="img"
          aria-label={`Confidence index ${confidence.score} out of 100, ${confidence.label}`}
        >
          <svg width={size} height={size} className="-rotate-90" aria-hidden="true">
            <circle
              cx={cx}
              cy={cy}
              r={r}
              fill="none"
              stroke="rgba(255,255,255,0.07)"
              strokeWidth={stroke}
              strokeLinecap="round"
              strokeDasharray={`${arcLen} ${circ}`}
              transform={`rotate(${startAngle} ${cx} ${cy})`}
            />
            <motion.circle
              cx={cx}
              cy={cy}
              r={r}
              fill="none"
              stroke={tone.color}
              strokeWidth={stroke}
              strokeLinecap="round"
              strokeDasharray={`${arcLen} ${circ}`}
              transform={`rotate(${startAngle} ${cx} ${cy})`}
              initial={{ strokeDashoffset: arcLen }}
              animate={{ strokeDashoffset: arcLen * (1 - pct) }}
              transition={{ duration: 1, ease: 'easeOut' }}
              style={{ filter: `drop-shadow(0 0 8px ${tone.soft})` }}
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="font-display text-4xl font-bold tabular-nums text-ink">{confidence.score}</span>
            <span
              className={`mt-1 inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ${tone.ring} ${tone.text}`}
              style={{ background: tone.soft }}
            >
              <Icon size={13} />
              {confidence.label}
            </span>
          </div>
        </div>

        <p className="mt-4 text-center text-sm text-ink-soft">{confidence.blurb}</p>
      </div>

      <div className="divider my-4" />

      <div className="grid grid-cols-2 gap-3 text-center">
        <div>
          <div className="font-display text-lg font-semibold text-ink">
            ±{fmtSpread(confidence.tempSpread)}
            <span className="text-xs">{tempUnit}</span>
          </div>
          <div className="text-[11px] text-ink-soft">Model temp spread</div>
        </div>
        <div>
          <div className="font-display text-lg font-semibold text-ink">{confidence.contributing}</div>
          <div className="text-[11px] text-ink-soft">Models in consensus</div>
        </div>
      </div>
    </CollapsibleCard>
  );
}
