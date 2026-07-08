import { Flower2 } from 'lucide-react';
import { pollenRisk } from '../lib/airQuality.js';
import CollapsibleCard from './CollapsibleCard.jsx';

export default function PollenCard({ aq }) {
  const risk = pollenRisk(aq);
  if (!risk) return null;

  const top = risk.species.slice(0, 4);
  const maxVal = Math.max(1, ...top.map((s) => s.value));

  const badge = (
    <span
      className="shrink-0 rounded-full px-2.5 py-0.5 text-[11px] font-semibold ring-1"
      style={{ color: risk.overall.color, background: `${risk.overall.color}1a`, borderColor: `${risk.overall.color}44` }}
    >
      {risk.overall.label}
    </span>
  );

  return (
    <CollapsibleCard
      id="pollen"
      icon={Flower2}
      iconClass="text-emerald-300"
      title="Pollen & Allergy"
      actions={badge}
      ariaLabel="Pollen and allergy forecast"
    >
      {risk.active === 0 ? (
        <div className="flex flex-col items-center gap-1.5 py-2 text-center">
          <Flower2 size={22} className="text-emerald-300/60" />
          <p className="text-sm font-medium text-ink">No pollen today</p>
          <p className="text-[11px] text-ink-soft">Low allergy risk</p>
        </div>
      ) : (
        <div className="flex flex-col gap-2.5">
          {top.map((s) => {
            const color = risk.levels[s.level].color;
            const pct = Math.min(100, Math.max(4, (s.value / maxVal) * 100));
            return (
              <div key={s.key} className="flex items-center gap-2.5">
                <span className="w-16 shrink-0 text-xs text-ink-soft">{s.label}</span>
                <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-white/10">
                  <div className="h-full rounded-full" style={{ width: `${pct}%`, background: color }} />
                </div>
                <span className="w-14 shrink-0 text-right text-[11px] font-medium tabular-nums" style={{ color }}>
                  {risk.levels[s.level].label}
                </span>
              </div>
            );
          })}
          <p className="mt-1 text-[11px] text-ink-soft">Grains/m³ · source Open-Meteo (CAMS)</p>
        </div>
      )}
    </CollapsibleCard>
  );
}
