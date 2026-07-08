import { Thermometer, Wind, Droplets, Sun } from 'lucide-react';
import { dewPointComfort } from '../lib/format.js';
import { useUnits } from '../context/UnitsContext.jsx';

/**
 * Explains WHY it feels the way it does: the dominant driver of the gap between
 * actual and apparent temperature (wind chill vs heat/humidity), plus a comfort
 * verdict. Pure-derived from current conditions.
 */
function analyze(c) {
  const { temp, feels, wind, humidity, dewPoint } = c;
  if (!Number.isFinite(temp) || !Number.isFinite(feels)) return null;

  const diff = feels - temp; // °C, negative = feels colder
  const absDiff = Math.abs(diff);
  const windHigh = Number.isFinite(wind) && wind >= 20;
  const humid = Number.isFinite(humidity) && humidity >= 65;

  let driver, Icon, color;
  if (diff <= -1.5 && windHigh) {
    driver = 'Brisk wind chill'; Icon = Wind; color = '#38bdf8';
  } else if (diff <= -1.5) {
    driver = 'Cooler than the reading'; Icon = Thermometer; color = '#60a5fa';
  } else if (diff >= 1.5 && humid) {
    driver = 'Humid, muggy heat'; Icon = Droplets; color = '#fb923c';
  } else if (diff >= 1.5) {
    driver = 'Strong sun & warmth'; Icon = Sun; color = '#fbbf24';
  } else {
    driver = 'Close to the actual reading'; Icon = Thermometer; color = '#34d399';
  }

  // Comfort verdict from apparent temp + dew-point mugginess.
  let verdict, vColor;
  const muggy = Number.isFinite(dewPoint) && dewPoint >= 18;
  if (feels < 0) { verdict = 'Frigid'; vColor = '#60a5fa'; }
  else if (feels < 10) { verdict = 'Cold'; vColor = '#38bdf8'; }
  else if (feels > 38) { verdict = 'Dangerous heat'; vColor = '#f87171'; }
  else if (feels > 30 && muggy) { verdict = 'Oppressive'; vColor = '#fb923c'; }
  else if (feels > 30) { verdict = 'Hot'; vColor = '#fbbf24'; }
  else if (feels >= 18 && feels <= 26 && !muggy) { verdict = 'Very comfortable'; vColor = '#34d399'; }
  else { verdict = 'Comfortable'; vColor = '#34d399'; }

  return { diff, absDiff, driver, Icon, color, verdict, vColor, dewPoint };
}

export default function ComfortIndex({ data }) {
  const { fmtTemp, fmtSpread } = useUnits();
  const c = data?.consensus?.current;
  const a = c ? analyze(c) : null;
  if (!a) return null;

  const { Icon, color, driver, absDiff, diff, verdict, vColor, dewPoint } = a;
  const dpComfort = dewPointComfort(dewPoint);
  const gapText =
    absDiff < 1.5
      ? 'Feels about the same'
      : `Feels ${fmtSpread(absDiff)}° ${diff < 0 ? 'colder' : 'warmer'}`;

  return (
    <div className="glass flex h-full flex-col rounded-3xl p-5" aria-label="Comfort breakdown">
      <div className="flex items-center gap-2 text-ink-soft">
        <Thermometer size={16} className="text-orange-300" />
        <h3 className="text-[11px] font-semibold uppercase tracking-[0.18em]">Comfort</h3>
      </div>

      <div className="mt-3 flex flex-1 flex-col justify-center gap-3">
        <div className="flex items-center gap-3">
          <span
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl"
            style={{ background: `${color}1a` }}
          >
            <Icon size={19} style={{ color }} />
          </span>
          <div className="min-w-0">
            <p className="font-display text-base font-semibold leading-tight text-ink">{verdict}</p>
            <p className="truncate text-xs text-ink-soft">{driver}</p>
          </div>
        </div>

        <div className="divider" />

        <div className="flex items-center justify-between text-xs">
          <span className="text-ink-soft">vs. actual</span>
          <span className="font-medium tabular-nums" style={{ color: vColor }}>{gapText}</span>
        </div>
        <div className="flex items-center justify-between text-xs">
          <span className="text-ink-soft">Feels like</span>
          <span className="font-display text-sm font-semibold tabular-nums text-ink">{fmtTemp(c.feels)}</span>
        </div>
        {dpComfort && (
          <div className="flex items-center justify-between text-xs">
            <span className="text-ink-soft">Humidity feel</span>
            <span className="font-medium text-ink">{dpComfort}</span>
          </div>
        )}
      </div>
    </div>
  );
}
