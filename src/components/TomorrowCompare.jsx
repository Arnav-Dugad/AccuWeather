import { ArrowUp, ArrowDown, Minus, CalendarClock } from 'lucide-react';
import WeatherIcon from './WeatherIcon.jsx';
import { useUnits } from '../context/UnitsContext.jsx';
import { round, pct } from '../lib/format.js';
import CollapsibleCard from './CollapsibleCard.jsx';

function Delta({ value, unit }) {
  if (value == null || Math.abs(value) < 0.5) {
    return <span className="inline-flex items-center gap-0.5 text-xs text-ink-soft"><Minus size={12} /> Similar</span>;
  }
  const up = value > 0;
  const Icon = up ? ArrowUp : ArrowDown;
  const color = up ? 'text-rose-300' : 'text-sky-300';
  return (
    <span className={`inline-flex items-center gap-0.5 text-xs font-semibold ${color}`}>
      <Icon size={12} />
      {up ? '+' : ''}{round(value, 1)}{unit}
    </span>
  );
}

export default function TomorrowCompare({ data }) {
  const { fmtTemp, tVal, tempUnit } = useUnits();
  const daily = data?.consensus?.daily;
  if (!daily || daily.length < 2) return null;

  const today = daily[0];
  const tomorrow = daily[1];
  const dMax = tVal(tomorrow.tMax) - tVal(today.tMax);
  const dMin = tVal(tomorrow.tMin) - tVal(today.tMin);
  const dRain = (tomorrow.precipProb ?? 0) - (today.precipProb ?? 0);

  const tempWord = dMax > 2 ? 'Warmer' : dMax < -2 ? 'Cooler' : 'Similar temps';
  const rainWord = dRain > 15 ? 'Wetter' : dRain < -15 ? 'Drier' : '';

  return (
    <CollapsibleCard id="tomorrow" icon={CalendarClock} title="Tomorrow vs Today">
      <div className="flex items-center gap-4">
        <WeatherIcon code={tomorrow.code} isDay={true} size={40} />
        <div className="flex flex-1 flex-col gap-2">
          <div className="flex items-center justify-between">
            <span className="text-xs text-ink-soft">High</span>
            <span className="flex items-center gap-2">
              <span className="font-display text-sm font-semibold text-ink">{fmtTemp(tomorrow.tMax)}</span>
              <Delta value={dMax} unit={tempUnit} />
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-xs text-ink-soft">Low</span>
            <span className="flex items-center gap-2">
              <span className="font-display text-sm font-semibold text-ink">{fmtTemp(tomorrow.tMin)}</span>
              <Delta value={dMin} unit={tempUnit} />
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-xs text-ink-soft">Rain</span>
            <span className="flex items-center gap-2">
              <span className="font-display text-sm font-semibold text-ink">{pct(tomorrow.precipProb)}</span>
              <Delta value={dRain} unit="%" />
            </span>
          </div>
        </div>
      </div>

      <div className="divider my-3" />
      <p className="text-center text-xs font-medium text-ink-soft">
        {tempWord}{rainWord ? ` · ${rainWord}` : ''}
      </p>
    </CollapsibleCard>
  );
}
