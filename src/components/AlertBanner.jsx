import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  CloudLightning, CloudRainWind, Wind, Thermometer, Snowflake, CloudSnow, Sun, CloudFog,
  AlertTriangle, ChevronDown,
} from 'lucide-react';
import { deriveAlerts } from '../lib/alerts.js';
import { useUnits } from '../context/UnitsContext.jsx';

const ICONS = { CloudLightning, CloudRainWind, Wind, Thermometer, Snowflake, CloudSnow, Sun, CloudFog };

const TONE = {
  severe: { color: '#fb7185', bg: 'rgba(251,113,133,0.12)', ring: 'ring-rose-400/30', text: 'text-rose-200' },
  warning: { color: '#fbbf24', bg: 'rgba(251,191,36,0.12)', ring: 'ring-amber-400/30', text: 'text-amber-200' },
  watch: { color: '#38bdf8', bg: 'rgba(56,189,248,0.12)', ring: 'ring-sky-400/30', text: 'text-sky-200' },
};

function AlertRow({ alert }) {
  const Icon = ICONS[alert.icon] ?? AlertTriangle;
  const tone = TONE[alert.severity] ?? TONE.watch;
  return (
    <div className="flex items-start gap-3 py-2">
      <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl" style={{ background: tone.bg }}>
        <Icon size={16} style={{ color: tone.color }} />
      </span>
      <div className="min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-display text-sm font-semibold text-ink">{alert.title}</span>
          <span className={`rounded-full px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider ring-1 ${tone.ring} ${tone.text}`}>
            {alert.severity}
          </span>
        </div>
        <p className="text-xs text-ink-soft">{alert.detail}</p>
      </div>
    </div>
  );
}

/** Derived severe-weather alert banner. Renders nothing when all-clear. */
export default function AlertBanner({ consensus }) {
  const { fmtTemp, fmtWind, fmtRain, tempUnit, windUnit, rainUnit } = useUnits();
  const [expanded, setExpanded] = useState(false);

  const alerts = deriveAlerts(consensus, { fmtTemp, fmtWind, fmtRain, tempUnit, windUnit, rainUnit });
  if (!alerts.length) return null;

  const top = alerts[0];
  const tone = TONE[top.severity] ?? TONE.watch;
  const visible = expanded ? alerts : alerts.slice(0, 2);
  const hidden = alerts.length - visible.length;

  return (
    <motion.div
      role="alert"
      aria-live="polite"
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      className="glass relative overflow-hidden rounded-3xl p-4 sm:p-5 ring-1"
      style={{ borderColor: `${tone.color}40` }}
    >
      <div className="pointer-events-none absolute -left-10 -top-12 h-40 w-40 rounded-full opacity-30 blur-3xl"
        style={{ background: `radial-gradient(circle, ${tone.color}, transparent 70%)` }} aria-hidden="true" />

      <div className="relative flex items-center gap-2 text-ink-soft">
        <AlertTriangle size={15} style={{ color: tone.color }} />
        <h3 className="text-[11px] font-semibold uppercase tracking-[0.18em]">
          Weather Alert{alerts.length > 1 ? `s · ${alerts.length}` : ''}
        </h3>
      </div>

      <div className="relative mt-1 divide-y divide-white/5">
        {visible.map((a) => <AlertRow key={a.id} alert={a} />)}
      </div>

      {(hidden > 0 || expanded) && alerts.length > 2 && (
        <button
          onClick={() => setExpanded((e) => !e)}
          aria-expanded={expanded}
          className="mt-1 inline-flex items-center gap-1 text-xs font-medium text-ink-soft hover:text-ink"
        >
          {expanded ? 'Show less' : `+${hidden} more`}
          <ChevronDown size={13} className={`transition-transform ${expanded ? 'rotate-180' : ''}`} />
        </button>
      )}
    </motion.div>
  );
}
