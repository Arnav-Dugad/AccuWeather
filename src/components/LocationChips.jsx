import { useState } from 'react';
import { Star, X, Share2, Check, Loader2 } from 'lucide-react';
import { shareUrlFor } from '../lib/url.js';
import { useUnits } from '../context/UnitsContext.jsx';
import { generateWeatherCard } from '../lib/shareCard.js';
import { weatherFor } from '../lib/weatherCodes.js';

export default function LocationChips({ saved, current, isSaved, onPick, onToggleSave, onRemove, data, region, aq }) {
  const [status, setStatus] = useState('idle');
  const units = useUnits();

  const share = async () => {
    if (!current || status === 'generating') return;
    const url = shareUrlFor(current);
    const hasWeather = data?.consensus?.current;

    if (hasWeather) {
      setStatus('generating');
      try {
        const blob = await generateWeatherCard({
          location: current,
          current: data.consensus.current,
          daily: data.consensus.daily?.[0],
          sun: data.consensus.sun,
          region,
          aq,
          units,
          utcOffsetSeconds: data.meta?.utcOffsetSeconds ?? 0,
        });
        const file = new File([blob], 'weather.png', { type: 'image/png' });
        const cond = weatherFor(data.consensus.current.code, data.consensus.current.isDay).label;
        const text = `${units.fmtTemp(data.consensus.current.temp)} · ${cond}\n${url}`;

        if (navigator.canShare?.({ files: [file] })) {
          await navigator.share({
            title: `Weather in ${current.name}`,
            text,
            files: [file],
            url,
          });
        } else {
          const imgUrl = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = imgUrl;
          a.download = `weather-${(current.name || 'forecast').toLowerCase().replace(/\s+/g, '-')}.png`;
          a.click();
          URL.revokeObjectURL(imgUrl);
          await navigator.clipboard.writeText(url).catch(() => {});
        }
        setStatus('done');
        setTimeout(() => setStatus('idle'), 2000);
      } catch {
        setStatus('idle');
      }
    } else {
      try {
        if (navigator.share) {
          await navigator.share({ title: 'AccuWeather forecast', url });
        } else {
          await navigator.clipboard.writeText(url);
          setStatus('done');
          setTimeout(() => setStatus('idle'), 1800);
        }
      } catch {
        /* user cancelled */
      }
    }
  };

  const shareLabel =
    status === 'generating' ? 'Creating…'
    : status === 'done' ? 'Shared!'
    : 'Share';

  const shareIcon =
    status === 'generating' ? <Loader2 size={13} className="animate-spin" />
    : status === 'done' ? <Check size={13} className="text-emerald-300" />
    : <Share2 size={13} />;

  return (
    <div className="scroll-x flex flex-nowrap items-center gap-2 overflow-x-auto pb-1">
      <button
        onClick={() => onToggleSave(current)}
        disabled={!current}
        className={`chip inline-flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition disabled:opacity-50 ${
          isSaved ? 'text-amber-300' : 'text-ink-soft hover:text-ink'
        }`}
        title={isSaved ? 'Remove from saved' : 'Save this location'}
        aria-label={isSaved ? 'Remove from saved' : 'Save this location'}
      >
        <Star size={13} fill={isSaved ? 'currentColor' : 'none'} />
        {isSaved ? 'Saved' : 'Save'}
      </button>

      <button
        onClick={share}
        disabled={!current || status === 'generating'}
        className="chip inline-flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium text-ink-soft transition hover:text-ink disabled:opacity-50"
        title="Share weather photo with link"
        aria-label={status === 'done' ? 'Weather shared' : 'Share weather photo with link'}
        aria-live="polite"
      >
        {shareIcon}
        {shareLabel}
      </button>

      {saved.length > 0 && <span className="mx-0.5 h-4 w-px shrink-0 bg-white/12" />}

      {saved.map((s) => {
        const active = current && s.id === `${current.latitude.toFixed(2)},${current.longitude.toFixed(2)}`;
        return (
          <span
            key={s.id}
            className={`chip group inline-flex shrink-0 items-center gap-1.5 rounded-full py-1.5 pl-3 pr-1.5 text-xs transition ${
              active ? 'text-ink ring-1 ring-sky-400/40' : 'text-ink-soft hover:text-ink'
            }`}
            aria-current={active ? 'location' : undefined}
          >
            <button onClick={() => onPick(s)} className="font-medium" title={s.name} aria-label={`Switch to ${s.name}`}>
              {s.name}
            </button>
            <button
              onClick={() => onRemove(s.id)}
              className="-mr-0.5 flex h-7 w-7 items-center justify-center rounded-full text-white/30 hover:bg-white/10 hover:text-rose-300"
              title="Remove"
              aria-label={`Remove ${s.name}`}
            >
              <X size={13} />
            </button>
          </span>
        );
      })}
    </div>
  );
}
