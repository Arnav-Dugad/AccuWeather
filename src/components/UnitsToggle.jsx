import { useUnits } from '../context/UnitsContext.jsx';

/** Segmented °C | °F control. */
export default function UnitsToggle() {
  const { units, setUnits } = useUnits();
  const opts = [
    { key: 'metric', label: '°C' },
    { key: 'imperial', label: '°F' },
  ];
  return (
    <div className="glass inline-flex items-center rounded-xl p-1">
      {opts.map((o) => {
        const active = units === o.key;
        return (
          <button
            key={o.key}
            onClick={() => setUnits(o.key)}
            className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
              active ? 'bg-white/15 text-ink' : 'text-ink-soft hover:text-ink'
            }`}
            aria-pressed={active}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}
