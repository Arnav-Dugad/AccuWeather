import { CloudRain, CloudSun, Cloud, Sun } from 'lucide-react';
import { buildNextChange } from '../lib/nextChange.js';

const TONE = {
  precip: { Icon: CloudRain, color: '#38bdf8' },
  clearing: { Icon: CloudSun, color: '#fbbf24' },
  clouding: { Icon: Cloud, color: '#94a3b8' },
  steady: { Icon: Sun, color: '#a78bfa' },
};

export default function NextChange({ data }) {
  const hours = data?.consensus?.hourly;
  const change = buildNextChange(hours);
  if (!change) return null;

  const { Icon, color } = TONE[change.tone] ?? TONE.steady;

  return (
    <div className="glass flex items-center gap-3 rounded-3xl p-4" aria-label="Next weather change">
      <span
        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl"
        style={{ background: `${color}1a` }}
      >
        <Icon size={19} style={{ color }} />
      </span>
      <div className="min-w-0">
        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-ink-soft">Next Change</p>
        <p className="truncate font-display text-sm font-semibold text-ink">{change.headline}</p>
      </div>
    </div>
  );
}
