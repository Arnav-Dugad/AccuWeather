import { TrendingUp } from 'lucide-react';
import { buildWeekOutlook } from '../lib/weekOutlook.js';

export default function WeekOutlook({ data }) {
  const text = buildWeekOutlook(data?.consensus?.daily);
  if (!text) return null;

  return (
    <div className="glass flex items-start gap-3 rounded-3xl px-5 py-4">
      <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-xl bg-sky-400/10">
        <TrendingUp size={14} className="text-sky-300" />
      </span>
      <div>
        <h3 className="text-[11px] font-semibold uppercase tracking-[0.18em] text-ink-soft">Week Outlook</h3>
        <p className="mt-1 text-sm leading-relaxed text-ink">{text}</p>
      </div>
    </div>
  );
}
