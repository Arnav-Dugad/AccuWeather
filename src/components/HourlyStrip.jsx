import { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { Clock, Droplets } from 'lucide-react';
import WeatherIcon from './WeatherIcon.jsx';
import { hourLabel, round } from '../lib/format.js';
import { useUnits } from '../context/UnitsContext.jsx';
import TempChart from './TempChart.jsx';
import CollapsibleCard from './CollapsibleCard.jsx';

/** Next-24h consensus: switchable metric chart + horizontally scrollable strip. */
export default function HourlyStrip({ data }) {
  const { fmtTemp, tVal, tempUnit, wVal, windUnit } = useUnits();
  const [metricKey, setMetricKey] = useState('temp');
  const hours = data.consensus.hourly;

  const metrics = useMemo(
    () => ({
      temp: { key: 'temp', label: 'temperature', short: 'Temp', unit: tempUnit, color: '#38bdf8',
        accessor: (h) => (typeof h.temp === 'number' ? tVal(h.temp) : NaN), format: (v) => `${round(v)}°` },
      feels: { key: 'feels', label: 'feels-like', short: 'Feels', unit: tempUnit, color: '#fb923c',
        accessor: (h) => (typeof h.feels === 'number' ? tVal(h.feels) : NaN), format: (v) => `${round(v)}°` },
      rain: { key: 'rain', label: 'rain chance', short: 'Rain', unit: '%', color: '#60a5fa', minSpan: 20,
        accessor: (h) => (typeof h.precipProb === 'number' ? h.precipProb : NaN), format: (v) => `${round(v)}%` },
      wind: { key: 'wind', label: 'wind', short: 'Wind', unit: windUnit, color: '#34d399',
        accessor: (h) => (typeof h.wind === 'number' ? wVal(h.wind) : NaN), format: (v) => `${round(v)}` },
      humidity: { key: 'humidity', label: 'humidity', short: 'Humidity', unit: '%', color: '#a78bfa', minSpan: 15,
        accessor: (h) => (typeof h.humidity === 'number' ? h.humidity : NaN), format: (v) => `${round(v)}%` },
      uv: { key: 'uv', label: 'UV index', short: 'UV', unit: '', color: '#fbbf24', minSpan: 3,
        accessor: (h) => (typeof h.uv === 'number' ? h.uv : NaN), format: (v) => `${round(v, 1)}` },
    }),
    [tVal, tempUnit, wVal, windUnit],
  );

  if (!hours?.length) return null;
  const metric = metrics[metricKey];
  const chips = ['temp', 'feels', 'rain', 'wind', 'humidity', 'uv'];

  return (
    <CollapsibleCard id="hourly" icon={Clock} title="Next 24 Hours">
      <div className="mb-4 flex flex-wrap gap-1.5" role="group" aria-label="Hourly metric">
        {chips.map((k) => {
          const active = k === metricKey;
          return (
            <button
              key={k}
              type="button"
              onClick={() => setMetricKey(k)}
              aria-pressed={active}
              className={`rounded-full px-2.5 py-1 text-[11px] font-medium transition ${
                active ? 'bg-sky-400/20 text-sky-200 ring-1 ring-sky-400/40' : 'chip text-ink-soft hover:text-ink'
              }`}
            >
              {metrics[k].short}
            </button>
          );
        })}
      </div>

      <TempChart key={metricKey} hours={hours} metric={metric} />

      <div className="scroll-x mt-4 flex w-full gap-2 overflow-x-auto pb-1">
        {hours.map((h, i) => {
          const prob = round(h.precipProb) ?? 0;
          return (
            <motion.div
              key={h.time}
              initial={{ opacity: 0, scale: 0.92 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.3, delay: i * 0.03, ease: 'easeOut' }}
              className={`flex min-w-[58px] flex-col items-center gap-2 rounded-2xl border px-2 py-3 sm:min-w-[64px] sm:px-2.5 ${
                i === 0 ? 'border-sky-400/40 bg-sky-400/10' : 'border-white/5 bg-white/[0.03]'
              }`}
            >
              <span className={`text-xs font-medium ${i === 0 ? 'text-sky-200' : 'text-ink-soft'}`}>
                {hourLabel(h.time, i === 0)}
              </span>
              <WeatherIcon code={h.code} isDay={h.isDay} size={26} />
              <span className="font-display text-sm font-semibold text-ink">{fmtTemp(h.temp)}</span>
              <span
                className={`inline-flex items-center gap-0.5 text-[10.5px] ${
                  prob > 30 ? 'text-sky-300' : 'text-white/35'
                }`}
              >
                <Droplets size={10} />
                {prob}%
              </span>
            </motion.div>
          );
        })}
      </div>
    </CollapsibleCard>
  );
}
