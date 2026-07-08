import { CloudLightning, Sparkles, Wind } from 'lucide-react';
import { buildStormSignal } from '../lib/stormSignal.js';

const TONE = {
  storm: { Icon: CloudLightning, color: '#a78bfa', ring: 'ring-violet-400/25', bg: 'bg-violet-400/10' },
  improving: { Icon: Sparkles, color: '#34d399', ring: 'ring-emerald-400/25', bg: 'bg-emerald-400/10' },
  windy: { Icon: Wind, color: '#38bdf8', ring: 'ring-sky-400/25', bg: 'bg-sky-400/10' },
};

export default function StormSignal({ data }) {
  const signal = buildStormSignal(data?.consensus);
  if (!signal) return null;

  const { Icon, color, ring, bg } = TONE[signal.tone] ?? TONE.storm;

  return (
    <div className={`glass flex items-center gap-3 rounded-3xl p-4 ring-1 ${ring}`} aria-label="Storm signal">
      <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl ${bg}`}>
        <Icon size={19} style={{ color }} />
      </span>
      <div className="min-w-0">
        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-ink-soft">Storm Signal</p>
        <p className="font-display text-sm font-semibold text-ink">{signal.headline}</p>
        <p className="truncate text-xs text-ink-soft">{signal.detail}</p>
      </div>
    </div>
  );
}
