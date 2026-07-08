import { useEffect, useRef, useState } from 'react';
import { Search, MapPin, LocateFixed, Loader2 } from 'lucide-react';
import { geocodeSearch } from '../lib/openMeteo.js';

/**
 * Geocoding search box with debounced autocomplete + "use my location" button.
 * Props: onSelect(place), onLocate(), locating (bool)
 */
export default function SearchBar({ onSelect, onLocate, locating }) {
  const [q, setQ] = useState('');
  const [results, setResults] = useState([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [active, setActive] = useState(-1);
  const boxRef = useRef(null);
  const abortRef = useRef(null);

  useEffect(() => {
    if (q.trim().length < 2) {
      setResults([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    const id = setTimeout(async () => {
      abortRef.current?.abort();
      const ctrl = new AbortController();
      abortRef.current = ctrl;
      try {
        const r = await geocodeSearch(q, ctrl.signal);
        setResults(r);
        setOpen(true);
        setActive(-1);
      } catch (e) {
        if (e.name !== 'AbortError') setResults([]);
      } finally {
        setLoading(false);
      }
    }, 280);
    return () => clearTimeout(id);
  }, [q]);

  useEffect(() => {
    const onClick = (e) => {
      if (boxRef.current && !boxRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, []);

  const choose = (place) => {
    onSelect(place);
    setQ('');
    setResults([]);
    setOpen(false);
  };

  const onKeyDown = (e) => {
    if (!open || !results.length) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActive((a) => Math.min(results.length - 1, a + 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActive((a) => Math.max(0, a - 1));
    } else if (e.key === 'Enter' && active >= 0) {
      e.preventDefault();
      choose(results[active]);
    } else if (e.key === 'Escape') {
      setOpen(false);
    }
  };

  return (
    <div ref={boxRef} className="relative w-full">
      <div className="flex items-center gap-2">
        <div className="glass relative flex flex-1 items-center gap-2.5 rounded-2xl px-4 py-3">
          <Search size={18} className="shrink-0 text-white/45" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onFocus={() => results.length && setOpen(true)}
            onKeyDown={onKeyDown}
            placeholder="Search any city worldwide…"
            className="w-full bg-transparent text-[15px] text-ink placeholder:text-white/35 outline-none"
            aria-label="Search for a city"
            role="combobox"
            aria-expanded={open && results.length > 0}
            aria-controls="search-results-listbox"
            aria-autocomplete="list"
            aria-activedescendant={active >= 0 ? `search-result-${active}` : undefined}
          />
          {loading && <Loader2 size={16} className="shrink-0 animate-spin text-white/40" />}
        </div>
        <button
          onClick={onLocate}
          disabled={locating}
          title="Use my location"
          aria-label="Use my location"
          className="glass glass-hover flex h-[46px] w-[46px] shrink-0 items-center justify-center rounded-2xl text-sky-300 disabled:opacity-60"
        >
          {locating ? <Loader2 size={18} className="animate-spin" /> : <LocateFixed size={18} />}
        </button>
      </div>

      {open && (results.length > 0 || (!loading && q.trim().length >= 2)) && (
        <div id="search-results-listbox" role="listbox" className="popover absolute z-[60] mt-2 w-full overflow-hidden rounded-2xl p-1.5">
          {results.length === 0 ? (
            <div className="px-4 py-6 text-center text-sm text-ink-soft">
              No places found for &ldquo;{q.trim()}&rdquo;
            </div>
          ) : (
            results.map((r, i) => (
              <button
                key={r.id}
                id={`search-result-${i}`}
                role="option"
                aria-selected={active === i}
                onMouseEnter={() => setActive(i)}
                onClick={() => choose(r)}
                className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition ${
                  active === i ? 'bg-white/10' : 'hover:bg-white/5'
                }`}
              >
                <MapPin size={16} className="shrink-0 text-sky-300/80" />
                <span className="flex min-w-0 flex-col">
                  <span className="truncate text-sm font-medium text-ink">{r.name}</span>
                  <span className="truncate text-xs text-ink-soft">
                    {[r.admin1, r.country].filter(Boolean).join(', ')}
                  </span>
                </span>
                <span className="ml-auto hidden shrink-0 text-[11px] tabular-nums text-white/30 xs:block">
                  {r.latitude.toFixed(1)}, {r.longitude.toFixed(1)}
                </span>
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}
