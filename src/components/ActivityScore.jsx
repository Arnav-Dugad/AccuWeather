import { motion } from 'framer-motion';
import { Activity, Droplets, Wind, Sun, Eye, Thermometer, CloudRain, Haze } from 'lucide-react';

const TONES = {
  excellent: { color: '#34d399', soft: 'rgba(52,211,153,0.15)', label: 'Excellent', ring: 'ring-emerald-400/30', text: 'text-emerald-300' },
  good:      { color: '#38bdf8', soft: 'rgba(56,189,248,0.15)', label: 'Good',      ring: 'ring-sky-400/30',     text: 'text-sky-300' },
  fair:      { color: '#fbbf24', soft: 'rgba(251,191,36,0.15)', label: 'Fair',      ring: 'ring-amber-400/30',   text: 'text-amber-300' },
  poor:      { color: '#fb923c', soft: 'rgba(251,146,60,0.15)', label: 'Poor',      ring: 'ring-orange-400/30',  text: 'text-orange-300' },
  indoor:    { color: '#fb7185', soft: 'rgba(251,113,133,0.15)', label: 'Stay Inside', ring: 'ring-rose-400/30', text: 'text-rose-300' },
};

function computeScore(c, aq) {
  let score = 100;
  const factors = [];

  const feels = c.feels ?? c.temp ?? 20;
  if (feels < 5 || feels > 38) { score -= 30; factors.push({ icon: Thermometer, label: 'Extreme temp', impact: 'negative' }); }
  else if (feels < 10 || feels > 33) { score -= 15; factors.push({ icon: Thermometer, label: feels < 10 ? 'Cold' : 'Hot', impact: 'negative' }); }
  else { factors.push({ icon: Thermometer, label: 'Comfortable temp', impact: 'positive' }); }

  const gust = c.gust ?? 0;
  if (gust > 50) { score -= 20; factors.push({ icon: Wind, label: 'Strong gusts', impact: 'negative' }); }
  else if (gust > 30) { score -= 10; factors.push({ icon: Wind, label: 'Breezy', impact: 'negative' }); }

  const pp = c.precipProb ?? 0;
  if (pp > 70) { score -= 25; factors.push({ icon: CloudRain, label: 'Rain likely', impact: 'negative' }); }
  else if (pp > 40) { score -= 15; factors.push({ icon: Droplets, label: 'Rain possible', impact: 'negative' }); }
  else { factors.push({ icon: Droplets, label: 'Dry', impact: 'positive' }); }

  const vis = c.visibility ?? 10000;
  if (vis < 1000) { score -= 15; factors.push({ icon: Eye, label: 'Poor visibility', impact: 'negative' }); }

  const uv = c.uv ?? 0;
  if (uv > 8) { score -= 10; factors.push({ icon: Sun, label: 'High UV', impact: 'negative' }); }

  if (aq?.usAqi > 100) { score -= 15; factors.push({ icon: Haze, label: 'Poor air quality', impact: 'negative' }); }

  return { score: Math.max(0, Math.min(100, score)), factors: factors.slice(0, 4) };
}

function toneFor(score) {
  if (score >= 80) return TONES.excellent;
  if (score >= 60) return TONES.good;
  if (score >= 40) return TONES.fair;
  if (score >= 20) return TONES.poor;
  return TONES.indoor;
}

export default function ActivityScore({ data, aq }) {
  const c = data?.consensus?.current;
  if (!c) return null;

  const { score, factors } = computeScore(c, aq);
  const tone = toneFor(score);
  const pct = score / 100;

  const size = 148;
  const stroke = 12;
  const r = (size - stroke) / 2;
  const cx = size / 2;
  const cy = size / 2;
  const sweep = 270;
  const startAngle = 135;
  const circ = 2 * Math.PI * r;
  const arcLen = (sweep / 360) * circ;

  return (
    <div className="glass flex h-full flex-col rounded-3xl p-5">
      <div className="flex items-center gap-2 text-ink-soft">
        <Activity size={16} className="text-sky-300" />
        <h3 className="text-[11px] font-semibold uppercase tracking-[0.18em]">Outdoor Score</h3>
      </div>

      <div className="mt-2 flex flex-1 flex-col items-center justify-center">
        <div className="relative" style={{ width: size, height: size }}
          role="img" aria-label={`Outdoor activity score ${score} out of 100, ${tone.label}`}>
          <svg width={size} height={size} className="-rotate-90" aria-hidden="true">
            <circle cx={cx} cy={cy} r={r} fill="none" stroke="rgba(255,255,255,0.07)"
              strokeWidth={stroke} strokeLinecap="round"
              strokeDasharray={`${arcLen} ${circ}`}
              transform={`rotate(${startAngle} ${cx} ${cy})`} />
            <motion.circle cx={cx} cy={cy} r={r} fill="none" stroke={tone.color}
              strokeWidth={stroke} strokeLinecap="round"
              strokeDasharray={`${arcLen} ${circ}`}
              transform={`rotate(${startAngle} ${cx} ${cy})`}
              initial={{ strokeDashoffset: arcLen }}
              animate={{ strokeDashoffset: arcLen * (1 - pct) }}
              transition={{ duration: 1, ease: 'easeOut' }}
              style={{ filter: `drop-shadow(0 0 6px ${tone.soft})` }} />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="font-display text-3xl font-bold tabular-nums text-ink">{score}</span>
            <span className={`mt-1 rounded-full px-2 py-0.5 text-[10px] font-semibold ring-1 ${tone.ring} ${tone.text}`}
              style={{ background: tone.soft }}>
              {tone.label}
            </span>
          </div>
        </div>
      </div>

      <div className="mt-3 flex flex-wrap justify-center gap-2">
        {factors.map(({ icon: Icon, label, impact }) => (
          <span key={label} className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium ${
            impact === 'positive' ? 'bg-emerald-400/10 text-emerald-300' : impact === 'negative' ? 'bg-rose-400/10 text-rose-300' : 'bg-white/5 text-ink-soft'
          }`}>
            <Icon size={10} />
            {label}
          </span>
        ))}
      </div>
    </div>
  );
}
