import { Waves, Thermometer, Timer, Navigation } from 'lucide-react';
import { seaState } from '../lib/marine.js';
import { compass, round } from '../lib/format.js';
import { useUnits } from '../context/UnitsContext.jsx';
import CollapsibleCard from './CollapsibleCard.jsx';

export default function MarineCard({ marine }) {
  const { fmtTemp } = useUnits();
  const wh = marine?.waveHeight;
  if (!Number.isFinite(wh)) return null; // inland / no data

  const state = seaState(wh);
  const stats = [
    { Icon: Timer, label: 'Period', value: Number.isFinite(marine.wavePeriod) ? `${round(marine.wavePeriod, 1)} s` : '—' },
    {
      Icon: Navigation,
      label: 'Swell dir',
      value: Number.isFinite(marine.waveDirection) ? compass(marine.waveDirection) : '—',
    },
    { Icon: Thermometer, label: 'Sea temp', value: Number.isFinite(marine.seaTemp) ? fmtTemp(marine.seaTemp) : '—' },
  ];

  const badge = (
    <span
      className="shrink-0 rounded-full px-2.5 py-0.5 text-[11px] font-semibold ring-1"
      style={{ color: state.color, background: `${state.color}1a`, borderColor: `${state.color}44` }}
    >
      {state.label}
    </span>
  );

  return (
    <CollapsibleCard
      id="marine"
      icon={Waves}
      iconClass="text-cyan-300"
      title="Marine & Beach"
      actions={badge}
      ariaLabel="Marine and beach conditions"
    >
      <div className="flex items-baseline gap-2">
        <span className="font-display text-4xl font-bold tabular-nums text-ink">{round(wh, 1)}</span>
        <span className="text-sm text-ink-soft">m wave height</span>
      </div>

      <div className="mt-4 grid grid-cols-3 gap-2">
        {stats.map(({ Icon, label, value }) => (
          <div key={label} className="rounded-2xl bg-white/[0.03] p-2.5 text-center ring-1 ring-white/5">
            <Icon size={14} className="mx-auto text-cyan-300/80" />
            <div className="mt-1 text-[10px] uppercase tracking-wider text-ink-soft">{label}</div>
            <div className="font-display text-sm font-semibold tabular-nums text-ink">{value}</div>
          </div>
        ))}
      </div>
    </CollapsibleCard>
  );
}
