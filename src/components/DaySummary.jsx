import { Sparkles } from 'lucide-react';
import { buildDaySummary } from '../lib/summary.js';

/** Slim plain-language summary of today's consensus conditions. */
export default function DaySummary({ consensus }) {
  const text = buildDaySummary(consensus);
  if (!text) return null;

  return (
    <div className="glass glass-hover flex items-start gap-3 rounded-2xl px-4 py-3.5 sm:px-5">
      <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-sky-400/12">
        <Sparkles size={15} className="text-sky-300" />
      </span>
      <div className="min-w-0">
        <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-ink-soft">Today at a glance</div>
        <p className="mt-0.5 text-sm leading-relaxed text-ink">{text}</p>
      </div>
    </div>
  );
}
