import { motion } from 'framer-motion';
import { Droplets, Gauge, Sun, CloudRain, Cloud, Eye, Thermometer, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { round, compass, uvCategory, dewPointComfort, visibilityLabel } from '../lib/format.js';
import { useUnits } from '../context/UnitsContext.jsx';
import WindCompass from './WindCompass.jsx';
import CollapsibleCard from './CollapsibleCard.jsx';

const container = { hidden: {}, visible: { transition: { staggerChildren: 0.06 } } };
const tile = {
  hidden: { opacity: 0, y: 14, scale: 0.95 },
  visible: { opacity: 1, y: 0, scale: 1, transition: { duration: 0.4, ease: 'easeOut' } },
};

function PressureSparkline({ hours }) {
  const vals = (hours ?? []).map((h) => h.pressure).filter((v) => typeof v === 'number');
  if (vals.length < 4) return null;
  const min = Math.min(...vals);
  const max = Math.max(...vals);
  const span = Math.max(max - min, 0.5);
  const pts = vals.map((v, i) => `${(i / (vals.length - 1)) * 100},${38 - ((v - min) / span) * 34}`).join(' ');

  return (
    <svg viewBox="0 0 100 40" preserveAspectRatio="none" className="mt-2 h-8 w-full">
      <polyline
        points={pts}
        fill="none"
        stroke="#fbbf24"
        strokeWidth="2"
        vectorEffect="non-scaling-stroke"
        strokeLinecap="round"
        strokeLinejoin="round"
        opacity="0.7"
      />
    </svg>
  );
}

export default function MetricsGrid({ data }) {
  const { tVal, tempUnit, wVal, windUnit, fmtRain, rainUnit } = useUnits();
  const c = data.consensus.current;
  const pt = data.consensus.pressureTrend;
  const uv = uvCategory(c.uv);
  const TrendIcon = pt?.trend === 'rising' ? TrendingUp : pt?.trend === 'falling' ? TrendingDown : Minus;
  const trendLabel = pt?.trend === 'rising' ? `+${pt.delta}` : pt?.trend === 'falling' ? `${pt.delta}` : 'Steady';

  const vis = c.visibility;
  const visValue = vis != null ? (vis >= 1000 ? round(vis / 1000, 1) : round(vis)) : null;
  const visUnit = vis != null ? (vis >= 1000 ? ' km' : ' m') : '';

  const items = [
    { Icon: Droplets, label: 'Humidity', value: round(c.humidity), unit: '%', accent: '#38bdf8' },
    { Icon: CloudRain, label: 'Precip', value: round(c.precipProb), unit: '%', accent: '#60a5fa' },
    { Icon: Cloud, label: 'Cloud', value: round(c.cloud), unit: '%', accent: '#94a3b8' },
    { Icon: Sun, label: 'UV Index', value: round(c.uv), unit: '', sub: uv.label, accent: uv.color },
    { Icon: Droplets, label: 'Rain', value: fmtRain(c.precip), unit: ` ${rainUnit}`, accent: '#22d3ee' },
    {
      Icon: Thermometer,
      label: 'Dew Point',
      value: round(tVal(c.dewPoint)),
      unit: tempUnit,
      sub: dewPointComfort(c.dewPoint),
      accent: '#6366f1',
    },
    {
      Icon: Eye,
      label: 'Visibility',
      value: visValue,
      unit: visUnit,
      sub: visibilityLabel(vis),
      accent: '#e2e8f0',
    },
  ];

  return (
    <CollapsibleCard bare id="metrics" icon={Gauge} title="Live Conditions" bodyClass="">
      <motion.div
        className="grid grid-cols-2 gap-3 lg:grid-cols-5"
        variants={container}
        initial="hidden"
        animate="visible"
      >
      <motion.div variants={tile} className="col-span-2 lg:col-span-1 lg:row-span-2 glass glass-hover flex items-center justify-center rounded-2xl p-4">
        <WindCompass
          dir={c.windDir}
          speed={wVal(c.wind)}
          gust={wVal(c.gust)}
          windUnit={windUnit}
          compass={c.windDir != null ? compass(c.windDir) : ''}
        />
      </motion.div>

      {/* Pressure tile with sparkline */}
      <motion.div variants={tile} className="glass glass-hover rounded-2xl p-4">
        <div className="flex items-center gap-2 text-ink-soft">
          <Gauge size={16} style={{ color: '#fbbf24' }} />
          <span className="text-[11px] font-semibold uppercase tracking-[0.18em]">Pressure</span>
        </div>
        <div className="mt-2 flex items-baseline gap-1">
          <span className="font-display text-2xl font-semibold tabular-nums text-ink">
            {round(c.pressure) === null ? '—' : round(c.pressure)}
          </span>
          <span className="text-xs text-ink-soft"> hPa</span>
          <span className="ml-auto inline-flex items-center gap-0.5 text-xs font-medium text-ink/80">
            <TrendIcon size={12} />
            {trendLabel}
          </span>
        </div>
        <PressureSparkline hours={data.consensus.hourly} />
      </motion.div>

      {items.map(({ Icon, label, value, unit, sub, accent }) => (
        <motion.div key={label} variants={tile} className="glass glass-hover rounded-2xl p-4">
          <div className="flex items-center gap-2 text-ink-soft">
            <Icon size={16} style={{ color: accent }} />
            <span className="text-[11px] font-semibold uppercase tracking-[0.18em]">{label}</span>
          </div>
          <div className="mt-2 flex items-baseline gap-1">
            <span className="font-display text-2xl font-semibold tabular-nums text-ink">
              {value === null ? '—' : value}
            </span>
            {value !== null && unit && <span className="text-xs text-ink-soft">{unit}</span>}
            {sub && (
              <span className="ml-auto inline-flex items-center gap-0.5 text-xs font-medium text-ink/80">
                {sub}
              </span>
            )}
          </div>
        </motion.div>
      ))}
      </motion.div>
    </CollapsibleCard>
  );
}
