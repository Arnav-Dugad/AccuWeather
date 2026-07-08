import { useCallback, useEffect, useRef, useState } from 'react';
import { MapContainer, TileLayer, useMap, CircleMarker } from 'react-leaflet';
import {
  Radar, Play, Pause, ExternalLink, CloudRain, Satellite,
  Palette, LocateFixed, Maximize2, Minimize2, ChevronLeft, ChevronRight, SkipBack, ChevronDown,
} from 'lucide-react';
import { usePersistentDisclosure } from '../hooks/usePersistentDisclosure.js';

const MAPS_URL = 'https://api.rainviewer.com/public/weather-maps.json';
const SPEEDS = [0.5, 1, 2];

// RainViewer color schemes we expose (id + label + legend gradient for the bar).
const SCHEMES = [
  { id: 2, label: 'Universal', legend: ['#00ff00', '#ffff00', '#ff8800', '#ff0000', '#ff00ff'] },
  { id: 4, label: 'TITAN', legend: ['#3b82f6', '#22d3ee', '#34d399', '#fbbf24', '#ef4444'] },
  { id: 8, label: 'Neon', legend: ['#22d3ee', '#818cf8', '#c084fc', '#f472b6', '#f87171'] },
];

function Recenter({ lat, lon, zoom, nonce }) {
  const map = useMap();
  useEffect(() => {
    map.setView([lat, lon], zoom, { animate: true });
    // `nonce` lets a button force a re-center without changing lat/lon/zoom.
  }, [lat, lon, zoom, nonce, map]);
  return null;
}

// Leaflet renders for the size it had at mount; when the container resizes
// (fullscreen toggle, or a late layout pass after lazy-load), tiles leave gray
// gaps until invalidateSize() runs. Re-invalidate on mount + whenever fullscreen flips.
function MapResizer({ fullscreen }) {
  const map = useMap();
  useEffect(() => {
    const t = setTimeout(() => map.invalidateSize(), 200);
    return () => clearTimeout(t);
  }, [fullscreen, map]);
  return null;
}

// Relative label like "−45 min" / "Now" / "+30 min" from a unix-seconds frame time.
function relativeLabel(unixSec) {
  const deltaMin = Math.round((unixSec * 1000 - Date.now()) / 60000);
  if (Math.abs(deltaMin) <= 4) return 'Now';
  const sign = deltaMin < 0 ? '−' : '+';
  return `${sign}${Math.abs(deltaMin)} min`;
}

export default function RadarMap({ lat, lon, region }) {
  const [host, setHost] = useState(null);
  const [radarFrames, setRadarFrames] = useState([]);
  const [satFrames, setSatFrames] = useState([]);
  const [pastCount, setPastCount] = useState(0);
  const [idx, setIdx] = useState(0);
  const [playing, setPlaying] = useState(true);
  const [speed, setSpeed] = useState(1);
  const [opacity, setOpacity] = useState(0.7);
  const [layer, setLayer] = useState('radar'); // 'radar' | 'satellite'
  const [schemeIdx, setSchemeIdx] = useState(0);
  const [fullscreen, setFullscreen] = useState(false);
  const [recenterNonce, setRecenterNonce] = useState(0);
  const [err, setErr] = useState(false);
  const [open, setOpen] = usePersistentDisclosure('radar', true);
  const timer = useRef(null);
  const rootRef = useRef(null);

  // ---- load frames ----
  useEffect(() => {
    let alive = true;
    fetch(MAPS_URL)
      .then((r) => r.json())
      .then((j) => {
        if (!alive) return;
        const past = j.radar?.past ?? [];
        const nowcast = j.radar?.nowcast ?? [];
        const radar = [...past, ...nowcast];
        const sat = j.satellite?.infrared ?? [];
        if (!radar.length) {
          setErr(true);
          return;
        }
        setHost(j.host);
        setRadarFrames(radar);
        setSatFrames(sat);
        setPastCount(past.length);
        setIdx(past.length ? past.length - 1 : 0);
      })
      .catch(() => alive && setErr(true));
    return () => {
      alive = false;
    };
  }, []);

  const frames = layer === 'satellite' && satFrames.length ? satFrames : radarFrames;
  const scheme = SCHEMES[schemeIdx];

  // Clamp idx when switching layers to a shorter frame list.
  useEffect(() => {
    setIdx((i) => Math.min(i, Math.max(0, frames.length - 1)));
  }, [layer, frames.length]);

  // ---- animation loop ----
  useEffect(() => {
    clearInterval(timer.current);
    if (playing && frames.length > 1) {
      timer.current = setInterval(() => setIdx((i) => (i + 1) % frames.length), 700 / speed);
    }
    return () => clearInterval(timer.current);
  }, [playing, frames.length, speed]);

  // ---- fullscreen: Esc to exit + lock body scroll ----
  useEffect(() => {
    if (!fullscreen) return;
    const onKey = (e) => e.key === 'Escape' && setFullscreen(false);
    window.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [fullscreen]);

  const step = useCallback(
    (dir) => {
      if (frames.length < 2) return;
      setPlaying(false);
      setIdx((i) => (i + dir + frames.length) % frames.length);
    },
    [frames.length],
  );

  // ---- keyboard controls when the panel is focused ----
  const onKeyDown = (e) => {
    if (e.key === ' ') { e.preventDefault(); setPlaying((p) => !p); }
    else if (e.key === 'ArrowRight') { e.preventDefault(); step(1); }
    else if (e.key === 'ArrowLeft') { e.preventDefault(); step(-1); }
  };

  const frame = frames[idx];
  const zoom = region?.key === 'india' ? 5 : 8;
  // Radar frames take the smooth+snow option suffix (1_1); satellite infrared
  // has no snow mask and must use 0_0, otherwise the tiles don't resolve.
  const tileOpts = layer === 'satellite' ? '0_0' : '1_1';
  const tileUrl =
    host && frame ? `${host}${frame.path}/512/{z}/{x}/{y}/${scheme.id}/${tileOpts}.png` : null;
  const stampAbs = frame ? new Date(frame.time * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '';
  const stampRel = frame ? relativeLabel(frame.time) : '';
  const isForecast = layer === 'radar' && frames.length > 0 && idx >= pastCount && pastCount > 0;
  const loading = radarFrames.length === 0 && !err;

  const controlBtn =
    'chip flex h-9 items-center justify-center rounded-xl px-2.5 text-ink transition hover:bg-white/10 disabled:opacity-40';

  return (
    <div
      ref={rootRef}
      className={
        fullscreen
          ? 'fixed inset-0 z-[1000] flex flex-col bg-[#070b18]'
          : 'glass overflow-hidden rounded-3xl'
      }
    >
      {/* ---- header ---- */}
      <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-4 sm:px-6 sm:py-5">
        <div className="flex items-center gap-2.5">
          <Radar size={16} className="text-sky-300" />
          <div>
            <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-ink-soft">Live Radar</div>
            <h3 className="font-display text-base font-semibold text-ink">
              {layer === 'satellite' ? 'Cloud & Satellite' : 'Precipitation Radar'}
            </h3>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {(open || fullscreen) && (
            <>
          {/* layer toggle */}
          <div className="chip flex items-center gap-0.5 rounded-xl p-0.5">
            <button
              onClick={() => setLayer('radar')}
              className={`flex h-8 items-center gap-1.5 rounded-lg px-2.5 text-xs font-medium transition ${
                layer === 'radar' ? 'bg-white/12 text-ink' : 'text-ink-soft hover:text-ink'
              }`}
              aria-pressed={layer === 'radar'}
            >
              <CloudRain size={13} /> Rain
            </button>
            <button
              onClick={() => setLayer('satellite')}
              disabled={!satFrames.length}
              className={`flex h-8 items-center gap-1.5 rounded-lg px-2.5 text-xs font-medium transition disabled:opacity-40 ${
                layer === 'satellite' ? 'bg-white/12 text-ink' : 'text-ink-soft hover:text-ink'
              }`}
              aria-pressed={layer === 'satellite'}
            >
              <Satellite size={13} /> Clouds
            </button>
          </div>

          {/* color scheme */}
          <button
            onClick={() => setSchemeIdx((s) => (s + 1) % SCHEMES.length)}
            className={`${controlBtn} gap-1.5 text-xs font-medium`}
            title="Color scheme"
            aria-label={`Color scheme: ${scheme.label}`}
          >
            <Palette size={14} /> {scheme.label}
          </button>

          {/* fullscreen */}
          <button
            onClick={() => setFullscreen((f) => !f)}
            className={`${controlBtn} w-9`}
            title={fullscreen ? 'Exit fullscreen' : 'Fullscreen'}
            aria-label={fullscreen ? 'Exit fullscreen' : 'Enter fullscreen'}
          >
            {fullscreen ? <Minimize2 size={15} /> : <Maximize2 size={15} />}
          </button>
            </>
          )}
          {/* collapse (hidden in fullscreen) */}
          {!fullscreen && (
            <button
              onClick={() => setOpen((o) => !o)}
              className={`${controlBtn} w-9`}
              aria-expanded={open}
              title={open ? 'Collapse radar' : 'Expand radar'}
              aria-label={open ? 'Collapse radar' : 'Expand radar'}
            >
              <ChevronDown size={16} className={`transition-transform ${open ? '' : '-rotate-90'}`} />
            </button>
          )}
        </div>
      </div>

      {(open || fullscreen) && (
        <>{/* --- collapsible body --- */}

      {/* ---- map ---- */}
      <div
        className={`relative w-full outline-none ${fullscreen ? 'flex-1' : 'h-[300px] sm:h-[380px] lg:h-[440px]'}`}
        tabIndex={0}
        onKeyDown={onKeyDown}
        role="application"
        aria-label="Interactive precipitation radar map. Space to play or pause, arrow keys to step frames."
      >
        {loading && (
          <div className="skeleton absolute inset-0 z-[400] flex items-center justify-center">
            <span className="flex items-center gap-2 text-sm text-ink-soft">
              <Radar size={16} className="animate-pulse text-sky-300" /> Loading radar…
            </span>
          </div>
        )}
        {err && (
          <div className="absolute inset-x-0 top-3 z-[600] mx-auto w-fit rounded-full bg-black/50 px-3 py-1 text-center text-xs text-ink-soft">
            Radar layer unavailable — base map shown
          </div>
        )}

        <MapContainer
          center={[lat, lon]}
          zoom={zoom}
          className="h-full w-full"
          zoomControl
          attributionControl
          scrollWheelZoom={false}
        >
          <TileLayer
            url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
            attribution='&copy; OpenStreetMap &copy; CARTO'
            subdomains="abcd"
          />
          {tileUrl && <TileLayer key={`${layer}-${frame.path}-${scheme.id}`} url={tileUrl} opacity={opacity} />}
          <CircleMarker
            center={[lat, lon]}
            radius={6}
            pathOptions={{ color: '#38bdf8', fillColor: '#38bdf8', fillOpacity: 0.9, weight: 2 }}
          />
          <Recenter lat={lat} lon={lon} zoom={zoom} nonce={recenterNonce} />
          <MapResizer fullscreen={fullscreen} />
        </MapContainer>

        {/* recenter (floating, top-right) */}
        <button
          onClick={() => setRecenterNonce((n) => n + 1)}
          className="chip absolute right-3 top-3 z-[600] flex h-9 w-9 items-center justify-center rounded-xl text-ink hover:bg-white/10"
          title="Recenter on location"
          aria-label="Recenter map on your location"
        >
          <LocateFixed size={15} />
        </button>

        {/* timestamp badge (floating, top-left) */}
        {frame && (
          <div className="absolute left-3 top-3 z-[600] flex items-center gap-2">
            {isForecast && (
              <span className="rounded-lg bg-amber-400/20 px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-amber-300 ring-1 ring-amber-400/30">
                Forecast
              </span>
            )}
            <span className="chip rounded-lg px-2.5 py-1 text-xs font-medium tabular-nums text-ink">
              {stampAbs} <span className="text-ink-soft">· {stampRel}</span>
            </span>
          </div>
        )}

        {/* transport + timeline dock */}
        {frames.length > 1 && (
          <div className="absolute inset-x-0 bottom-0 z-[500] flex flex-col gap-2 bg-gradient-to-t from-black/55 to-transparent px-4 pb-3 pt-6">
            {/* scrubber */}
            <div className="flex items-center gap-1">
              {frames.map((f, i) => {
                const future = layer === 'radar' && pastCount > 0 && i >= pastCount;
                const active = i === idx;
                const color = future ? '#fbbf24' : '#38bdf8';
                return (
                  <button
                    key={f.path}
                    onClick={() => { setIdx(i); setPlaying(false); }}
                    className="group relative h-2 flex-1 cursor-pointer rounded-full transition-all hover:h-3"
                    style={{
                      background: active ? color : future ? 'rgba(251,191,36,0.3)' : 'rgba(255,255,255,0.18)',
                      boxShadow: active ? `0 0 8px ${color}` : 'none',
                    }}
                    aria-label={`Frame ${i + 1}${future ? ' (forecast)' : ''} · ${relativeLabel(f.time)}`}
                  />
                );
              })}
            </div>
            {/* transport row */}
            <div className="flex items-center justify-center gap-1.5">
              <button onClick={() => step(-1)} className={`${controlBtn} w-9`} title="Previous frame" aria-label="Previous frame">
                <ChevronLeft size={16} />
              </button>
              <button
                onClick={() => setPlaying((p) => !p)}
                className={`${controlBtn} w-11`}
                title={playing ? 'Pause' : 'Play'}
                aria-label={playing ? 'Pause radar animation' : 'Play radar animation'}
              >
                {playing ? <Pause size={16} /> : <Play size={16} />}
              </button>
              <button onClick={() => step(1)} className={`${controlBtn} w-9`} title="Next frame" aria-label="Next frame">
                <ChevronRight size={16} />
              </button>
              <button
                onClick={() => setSpeed((s) => SPEEDS[(SPEEDS.indexOf(s) + 1) % SPEEDS.length])}
                className={`${controlBtn} px-3 text-xs font-medium tabular-nums`}
                title="Playback speed"
                aria-label={`Playback speed ${speed}x`}
              >
                {speed}x
              </button>
              {pastCount > 0 && (
                <button
                  onClick={() => { setIdx(Math.max(0, pastCount - 1)); setPlaying(false); }}
                  className={`${controlBtn} w-9`}
                  title="Jump to now"
                  aria-label="Jump to current time"
                >
                  <SkipBack size={15} />
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      {/* ---- opacity + legend ---- */}
      <div className="flex flex-wrap items-center gap-x-5 gap-y-2 px-5 py-3 sm:px-6">
        <div className="flex items-center gap-2">
          <span className="text-[10px] uppercase tracking-wider text-ink-soft">Opacity</span>
          <input
            type="range"
            min="0.1"
            max="1"
            step="0.1"
            value={opacity}
            onChange={(e) => setOpacity(parseFloat(e.target.value))}
            className="radar-range h-1 w-20 cursor-pointer appearance-none rounded-full bg-white/20"
            aria-label="Radar overlay opacity"
          />
        </div>
        <div className="flex flex-1 items-center gap-2">
          <span className="text-[10px] uppercase tracking-wider text-ink-soft">
            {layer === 'satellite' ? 'Cold' : 'Light'}
          </span>
          <div
            className="h-2 flex-1 rounded-full"
            style={{ background: `linear-gradient(90deg, ${scheme.legend.join(', ')})` }}
          />
          <span className="text-[10px] uppercase tracking-wider text-ink-soft">
            {layer === 'satellite' ? 'Warm' : 'Heavy'}
          </span>
        </div>
      </div>

      {/* ---- attribution ---- */}
      <div className="flex items-center justify-between gap-3 px-5 py-3 text-xs text-ink-soft sm:px-6">
        <span>{layer === 'satellite' ? 'Satellite: RainViewer IR' : 'Radar: RainViewer · 1200+ stations'}</span>
        {region?.key === 'india' && (
          <a
            href="https://mausam.imd.gov.in/responsive/satellite.php"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-sky-300 hover:text-sky-200"
          >
            IMD / INSAT-3D <ExternalLink size={12} />
          </a>
        )}
      </div>
        </>
      )}
    </div>
  );
}
