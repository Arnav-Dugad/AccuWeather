import { motion } from 'framer-motion';
import { Droplets, Layers3, ShieldCheck, ShieldAlert, ShieldQuestion } from 'lucide-react';
import { popCategory } from '../lib/rain.js';
import { hourLabel, dayLabel } from '../lib/format.js';
import { useUnits } from '../context/UnitsContext.jsx';
import CollapsibleCard from './CollapsibleCard.jsx';

const CONF_ICON = { high: ShieldCheck, moderate: ShieldQuestion, low: ShieldAlert };
const CONF_COLOR = { high: '#34d399', moderate: '#fbbf24', low: '#fb7185' };

/**
 * Ensemble Rain Outlook: probability of precipitation (PoP) from many model
 * members, with expected-amount band and a rain-specific confidence read.
 * Props: outlook (from computeRainOutlook), status
 */
export default function RainOutlook({ outlook, status }) {
  const { fmtRain, rainUnit } = useUnits();

  if (status === 'loading' || status === 'idle') {
    return <div className="skeleton h-72 rounded-3xl" />;
  }
  if (!outlook?.available) return null;

  const rc = outlook.rainConfidence;
  const ConfIcon = CONF_ICON[rc.tone] ?? ShieldQuestion;
  const confColor = CONF_COLOR[rc.tone] ?? '#fbbf24';

  const maxHourAmt = Math.max(0.5, ...outlook.hourly.map((h) => h.p75 || 0));

  const confBadge = (
    <span
      className="hidden shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold ring-1 sm:inline-flex"
      style={{ background: `${confColor}1f`, color: confColor, borderColor: `${confColor}55` }}
    >
      <ConfIcon size={13} />
      {rc.label} · {rc.agreement}% agree
    </span>
  );

  return (
    <CollapsibleCard
      id="rain-outlook"
      icon={Layers3}
      title="Rain Outlook"
      subtitle={`${rc.memberCount} members · ${rc.models} models`}
      actions={confBadge}
    >
      {/* next 24h PoP bars */}
      <div className="mt-5">
        <div className="mb-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-ink-soft">
          Chance of rain · next 24h
        </div>
        <div className="scroll-x overflow-x-auto pb-1">
          <div className="flex min-w-max gap-1.5">
            {outlook.hourly.map((h, i) => {
              const cat = popCategory(h.pop);
              return (
                <div
                  key={h.time}
                  className="flex w-[26px] flex-col items-center gap-1"
                  title={`${h.pop}% · ~${fmtRain(h.amount) ?? 0}${rainUnit}`}
                >
                  <span className="text-[9.5px] tabular-nums text-ink-soft">{h.pop}%</span>
                  <div className="flex h-24 w-full items-end overflow-hidden rounded-md bg-white/[0.04]">
                    <motion.div
                      className="w-full rounded-md"
                      initial={{ height: 0 }}
                      animate={{ height: `${Math.max(3, h.pop)}%` }}
                      transition={{ duration: 0.5, delay: i * 0.04, ease: 'easeOut' }}
                      style={{ background: cat.color, opacity: 0.85 }}
                    />
                  </div>
                  <span className="h-3 text-[9px] text-white/35">
                    {i % 3 === 0 ? hourLabel(h.time, i === 0) : ''}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <div className="divider my-4" />

      {/* 7-day rain probability + amount band */}
      <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-ink-soft">7-day rain</div>
      <div className="mt-2 flex flex-col">
        {outlook.daily.map((d, i) => {
          const cat = popCategory(d.pop);
          const band = d.p75 > 0 ? `${fmtRain(d.p25) ?? 0}–${fmtRain(d.p75) ?? 0} ${rainUnit}` : '—';
          return (
            <div key={d.date} className="grid grid-cols-[2.4rem_1fr_auto] items-center gap-3 border-b border-white/5 py-2 last:border-0">
              <span className="text-sm font-medium text-ink">{dayLabel(d.date, i)}</span>
              <div className="flex min-w-0 items-center gap-2">
                <div className="h-2 flex-1 overflow-hidden rounded-full bg-white/8">
                  <div className="h-full rounded-full" style={{ width: `${Math.max(2, d.pop)}%`, background: cat.color }} />
                </div>
                <span className="w-9 shrink-0 text-right text-xs tabular-nums text-ink-soft">{d.pop}%</span>
              </div>
              <span className="inline-flex shrink-0 items-center justify-end gap-1 whitespace-nowrap text-[11px] text-ink-soft">
                <Droplets size={11} className="text-sky-300/70" />
                {band}
              </span>
            </div>
          );
        })}
      </div>
    </CollapsibleCard>
  );
}
