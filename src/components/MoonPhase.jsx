import { Moon } from 'lucide-react';

const SYNODIC = 29.53059;
const REF_NEW_MOON = new Date('2000-01-06T18:14:00Z').getTime();
const NAMES = ['New Moon', 'Waxing Crescent', 'First Quarter', 'Waxing Gibbous', 'Full Moon', 'Waning Gibbous', 'Last Quarter', 'Waning Crescent'];
const EMOJIS = ['\u{1F311}', '\u{1F312}', '\u{1F313}', '\u{1F314}', '\u{1F315}', '\u{1F316}', '\u{1F317}', '\u{1F318}'];

function getMoonPhase(date = new Date()) {
  const daysSinceRef = (date.getTime() - REF_NEW_MOON) / 86400000;
  const phase = ((daysSinceRef % SYNODIC) + SYNODIC) % SYNODIC;
  const illumination = Math.round(((1 - Math.cos((phase / SYNODIC) * 2 * Math.PI)) / 2) * 100);
  const segment = Math.floor((phase / SYNODIC) * 8) % 8;
  const daysToFull = Math.round(((SYNODIC / 2 - phase + SYNODIC) % SYNODIC));
  const daysToNew = Math.round((SYNODIC - phase) % SYNODIC);

  return { name: NAMES[segment], emoji: EMOJIS[segment], illumination, daysToFull, daysToNew, phase, segment };
}

function MoonDisc({ illumination, segment }) {
  const r = 36;
  const d = r * 2;
  const illFrac = illumination / 100;
  const rx = Math.abs(1 - 2 * illFrac) * r;
  const isWaxing = segment < 4;
  const sweep = illFrac > 0.5 ? 1 : 0;
  const leftArc = isWaxing ? sweep : 1 - sweep;

  return (
    <svg width={d} height={d} viewBox={`0 0 ${d} ${d}`} className="drop-shadow-[0_0_12px_rgba(251,191,36,0.25)]">
      <circle cx={r} cy={r} r={r} fill="#1e293b" />
      <path
        d={`M ${r} 0 A ${r} ${r} 0 0 1 ${r} ${d} A ${rx} ${r} 0 0 ${leftArc} ${r} 0`}
        fill="#fde68a"
      />
    </svg>
  );
}

export default function MoonPhase() {
  const moon = getMoonPhase();

  return (
    <div className="glass flex h-full flex-col rounded-3xl p-5">
      <div className="flex items-center gap-2 text-ink-soft">
        <Moon size={16} className="text-amber-300" />
        <h3 className="text-[11px] font-semibold uppercase tracking-[0.18em]">Moon Phase</h3>
      </div>

      <div className="mt-4 flex flex-1 flex-col items-center justify-center gap-3">
        <MoonDisc illumination={moon.illumination} segment={moon.segment} />
        <div className="text-center">
          <p className="font-display text-base font-semibold text-ink">{moon.name}</p>
          <p className="mt-0.5 text-xs text-ink-soft">{moon.illumination}% illuminated</p>
        </div>
      </div>

      <div className="divider my-3" />

      <div className="grid grid-cols-2 gap-3 text-center text-xs">
        <div>
          <p className="font-display text-sm font-semibold text-ink">{moon.daysToFull}d</p>
          <p className="text-ink-soft">Next Full</p>
        </div>
        <div>
          <p className="font-display text-sm font-semibold text-ink">{moon.daysToNew}d</p>
          <p className="text-ink-soft">Next New</p>
        </div>
      </div>
    </div>
  );
}
