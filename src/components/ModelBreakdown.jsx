import { AnimatePresence, motion } from 'framer-motion';
import { Layers, ChevronDown, Info } from 'lucide-react';
import WeatherIcon from './WeatherIcon.jsx';
import { weatherFor } from '../lib/weatherCodes.js';
import { pct, round } from '../lib/format.js';
import { useUnits } from '../context/UnitsContext.jsx';
import { usePersistentDisclosure } from '../hooks/usePersistentDisclosure.js';

/**
 * Transparency panel: what each individual model says, side by side, with its
 * blend weight. Collapsible. Excluded (weight 0) models are dimmed + tagged.
 * Props: data, consensusTemp
 */
export default function ModelBreakdown({ data }) {
  const [open, setOpen] = usePersistentDisclosure('model-breakdown', false);
  const models = data.models;
  const consensusTemp = data.consensus.current.temp;

  return (
    <div className="glass overflow-hidden rounded-3xl">
      <button
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-label={open ? 'Collapse model breakdown' : 'Expand model breakdown'}
        className="flex w-full items-center justify-between gap-3 px-6 py-5 text-left"
      >
        <span className="flex items-center gap-2.5">
          <Layers size={18} className="text-sky-300" />
          <span className="font-display text-base font-semibold text-ink">Model Breakdown</span>
          <span className="hidden text-sm text-ink-soft sm:inline">
            · full transparency across {models.length} models
          </span>
        </span>
        <ChevronDown
          size={18}
          className={`shrink-0 text-ink-soft transition-transform ${open ? 'rotate-180' : ''}`}
        />
      </button>

      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: 'easeInOut' }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-5 sm:px-6">
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
                {models.map((m) => (
                  <ModelColumn key={m.id} m={m} consensusTemp={consensusTemp} />
                ))}
              </div>

              <p className="mt-4 flex items-start gap-2 text-xs leading-relaxed text-ink-soft">
                <Info size={13} className="mt-0.5 shrink-0 text-sky-300/70" />
                <span>
                  The consensus is a weight-blended average of the contributing models. Models at 0%
                  are shown for transparency but excluded from the blend (e.g. GFS over India, which
                  runs a known monsoon wet/hot bias).
                </span>
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function ModelColumn({ m, consensusTemp }) {
  const { fmtTemp, fmtWind, fmtSpread } = useUnits();
  const excluded = m.weight <= 0;
  const { label } = weatherFor(m.current.code, m.current.isDay);
  const delta =
    typeof m.current.temp === 'number' && typeof consensusTemp === 'number'
      ? m.current.temp - consensusTemp
      : null;
  const accent = m.meta.accent;

  return (
    <div
      className={`relative rounded-2xl border p-4 transition ${
        excluded ? 'border-white/8 bg-white/[0.02] opacity-70' : 'border-white/10 bg-white/[0.04]'
      }`}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="h-2.5 w-2.5 rounded-full" style={{ background: accent }} />
          <span className="font-display text-sm font-bold text-ink">{m.meta.label}</span>
        </div>
        <span
          className="rounded-full px-2 py-0.5 text-[11px] font-bold tabular-nums"
          style={{
            color: excluded ? '#94a3b8' : accent,
            background: excluded ? 'rgba(148,163,184,0.12)' : `${accent}1f`,
          }}
        >
          {round(m.weight * 100)}%
        </span>
      </div>

      <div className="mt-1 text-[11px] text-ink-soft">{m.meta.origin}</div>

      {m.available ? (
        <>
          <div className="mt-3 flex items-center justify-between">
            <span className="font-display text-3xl font-bold text-ink">{fmtTemp(m.current.temp)}</span>
            <WeatherIcon code={m.current.code} isDay={m.current.isDay} size={30} />
          </div>
          <div className="mt-1 truncate text-xs text-ink-soft">{label}</div>

          <div className="mt-3 space-y-1 text-[11px] text-ink-soft">
            <Row k="Feels" v={fmtTemp(m.current.feels)} />
            <Row k="Precip" v={pct(m.current.precipProb)} />
            <Row k="Wind" v={m.current.wind != null ? fmtWind(m.current.wind) : '—'} />
          </div>

          {delta !== null && (
            <div className="mt-3 text-[11px]">
              <span className="text-ink-soft">vs consensus </span>
              <span
                className={`font-semibold ${
                  Math.abs(delta) < 0.5 ? 'text-ink' : delta > 0 ? 'text-rose-300' : 'text-sky-300'
                }`}
              >
                {delta > 0 ? '+' : ''}
                {fmtSpread(delta)}°
              </span>
            </div>
          )}
        </>
      ) : (
        <div className="mt-4 text-xs text-ink-soft">No data at this location.</div>
      )}

      {m.note && (
        <div className="mt-3 rounded-lg bg-amber-400/10 px-2 py-1 text-[10.5px] font-medium text-amber-200/90 ring-1 ring-amber-400/20">
          {m.note}
        </div>
      )}
    </div>
  );
}

function Row({ k, v }) {
  return (
    <div className="flex items-center justify-between">
      <span>{k}</span>
      <span className="font-medium text-ink/90">{v}</span>
    </div>
  );
}
