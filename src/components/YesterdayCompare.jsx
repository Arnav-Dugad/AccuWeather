import { History, ArrowUp, ArrowDown, Minus } from 'lucide-react';
import { weatherFor } from '../lib/weatherCodes.js';
import { useUnits } from '../context/UnitsContext.jsx';
import CollapsibleCard from './CollapsibleCard.jsx';

export default function YesterdayCompare({ data }) {
  const { fmtSpread, fmtTemp } = useUnits();
  const c = data?.consensus?.current;
  const tY = c?.tempYesterday;
  if (!Number.isFinite(c?.temp) || !Number.isFinite(tY)) return null;

  const diff = c.temp - tY; // °C
  const abs = Math.abs(diff);
  const rounded = Math.round(diff);
  let Icon, color, word;
  if (rounded > 0) { Icon = ArrowUp; color = '#fb7185'; word = 'warmer'; }
  else if (rounded < 0) { Icon = ArrowDown; color = '#38bdf8'; word = 'cooler'; }
  else { Icon = Minus; color = '#94a3b8'; word = 'about the same'; }

  const headline = rounded === 0
    ? 'About the same as yesterday'
    : `${fmtSpread(abs)}° ${word} than yesterday`;

  const condYesterday = Number.isFinite(c.codeYesterday) ? weatherFor(c.codeYesterday, true).label : null;

  return (
    <CollapsibleCard id="yesterday" icon={History} iconClass="text-indigo-300" title="Vs. Yesterday" ariaLabel="Comparison to yesterday">
      <div className="flex flex-col gap-3">
        <div className="flex items-center gap-3">
          <span
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl"
            style={{ background: `${color}1a` }}
          >
            <Icon size={20} style={{ color }} />
          </span>
          <p className="font-display text-base font-semibold leading-tight text-ink">{headline}</p>
        </div>

        <div className="divider" />

        <div className="flex items-center justify-between text-xs">
          <span className="text-ink-soft">This time yesterday</span>
          <span className="font-display text-sm font-semibold tabular-nums text-ink">
            {fmtTemp(tY)}
          </span>
        </div>
        {condYesterday && (
          <div className="flex items-center justify-between text-xs">
            <span className="text-ink-soft">Conditions then</span>
            <span className="font-medium text-ink">{condYesterday}</span>
          </div>
        )}
      </div>
    </CollapsibleCard>
  );
}
