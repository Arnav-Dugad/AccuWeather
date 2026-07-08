import { motion } from 'framer-motion';
import { useUnits } from '../context/UnitsContext.jsx';

const MIN_C = -20;
const MAX_C = 50;
const RANGE = MAX_C - MIN_C;

function comfort(feelsC) {
  if (!Number.isFinite(feelsC)) return { label: '', context: '' };
  if (feelsC < 0) return { label: 'Frigid', context: 'Wind chill effect' };
  if (feelsC < 10) return { label: 'Cold', context: 'Wind chill effect' };
  if (feelsC < 18) return { label: 'Cool', context: '' };
  if (feelsC < 26) return { label: 'Comfortable', context: '' };
  if (feelsC < 32) return { label: 'Warm', context: 'Heat index effect' };
  if (feelsC < 40) return { label: 'Hot', context: 'Heat index effect' };
  return { label: 'Dangerous', context: 'Extreme heat' };
}

function effectLabel(feels, actual) {
  if (!Number.isFinite(feels) || !Number.isFinite(actual)) return '';
  const diff = feels - actual;
  if (diff < -2) return 'Wind chill effect';
  if (diff > 2) return 'Heat index effect';
  return '';
}

export default function FeelsGauge({ feels, actual }) {
  const { fmtTemp } = useUnits();

  if (!Number.isFinite(feels)) return null;

  const pct = Math.min(100, Math.max(0, ((feels - MIN_C) / RANGE) * 100));
  const { label } = comfort(feels);
  const effect = effectLabel(feels, actual);

  return (
    <div className="w-full">
      <div className="flex items-center gap-2 text-sm text-ink-soft">
        <span>Feels like</span>
        <strong className="font-semibold text-ink">{fmtTemp(feels)}</strong>
        {effect && <span className="text-[11px] text-ink-soft/70">· {effect}</span>}
      </div>
      <div className="relative mt-2 h-2 w-full overflow-hidden rounded-full"
        role="img"
        aria-label={`Comfort gauge: feels ${label.toLowerCase()}`}
        style={{ background: 'linear-gradient(90deg, #3b82f6, #06b6d4, #34d399, #fbbf24, #f97316, #ef4444)' }}>
        <motion.div
          className="absolute top-1/2 h-4 w-4 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white bg-white shadow-lg shadow-black/30"
          initial={{ left: '50%' }}
          animate={{ left: `${pct}%` }}
          transition={{ type: 'spring', stiffness: 80, damping: 14 }}
        />
      </div>
      <div className="mt-1 text-[10px] font-medium text-ink-soft">{label}</div>
    </div>
  );
}
