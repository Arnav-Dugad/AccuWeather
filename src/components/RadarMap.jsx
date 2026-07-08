import { useEffect, useRef, useState } from 'react';
import { MapContainer, TileLayer, useMap, CircleMarker } from 'react-leaflet';
import { Radar, Play, Pause, ExternalLink } from 'lucide-react';

const MAPS_URL = 'https://api.rainviewer.com/public/weather-maps.json';
const SPEEDS = [0.5, 1, 2];

function Recenter({ lat, lon, zoom }) {
  const map = useMap();
  useEffect(() => {
    map.setView([lat, lon], zoom, { animate: true });
  }, [lat, lon, zoom, map]);
  return null;
}

export default function RadarMap({ lat, lon, region }) {
  const [host, setHost] = useState(null);
  const [frames, setFrames] = useState([]);
  const [pastCount, setPastCount] = useState(0);
  const [idx, setIdx] = useState(0);
  const [playing, setPlaying] = useState(true);
  const [speed, setSpeed] = useState(1);
  const [opacity, setOpacity] = useState(0.7);
  const [err, setErr] = useState(false);
  const timer = useRef(null);

  useEffect(() => {
    let alive = true;
    fetch(MAPS_URL)
      .then((r) => r.json())
      .then((j) => {
        if (!alive) return;
        const past = j.radar?.past ?? [];
        const nowcast = j.radar?.nowcast ?? [];
        const all = [...past, ...nowcast];
        if (!all.length) {
          setErr(true);
          return;
        }
        setHost(j.host);
        setFrames(all);
        setPastCount(past.length);
        setIdx(past.length ? past.length - 1 : 0);
      })
      .catch(() => alive && setErr(true));
    return () => {
      alive = false;
    };
  }, []);

  useEffect(() => {
    clearInterval(timer.current);
    if (playing && frames.length > 1) {
      timer.current = setInterval(() => setIdx((i) => (i + 1) % frames.length), 700 / speed);
    }
    return () => clearInterval(timer.current);
  }, [playing, frames.length, speed]);

  const frame = frames[idx];
  const zoom = region?.key === 'india' ? 5 : 8;
  const tileUrl =
    host && frame ? `${host}${frame.path}/256/{z}/{x}/{y}/2/1_1.png` : null;
  const stamp = frame ? new Date(frame.time * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '';
  const isForecast = frames.length > 0 && idx >= pastCount && pastCount > 0;

  return (
    <div className="glass overflow-hidden rounded-3xl">
      <div className="flex flex-wrap items-center justify-between gap-3 px-6 py-5">
        <div className="flex items-center gap-2.5">
          <Radar size={18} className="text-sky-300" />
          <div>
            <h3 className="font-display text-base font-semibold text-ink">
              Live Precipitation Radar
            </h3>
            <p className="text-xs text-ink-soft">
              {region?.key === 'india'
                ? 'Real-time nowcasting over the Indian subcontinent'
                : 'Animated 2-hour precipitation loop'}
              {frames.length === 0 && !err && (
                <span className="ml-2 inline-block h-2 w-2 animate-pulse rounded-full bg-sky-300" />
              )}
            </p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {/* opacity */}
          <div className="flex items-center gap-2">
            <span className="text-[10px] text-ink-soft">Opacity</span>
            <input
              type="range"
              min="0.1"
              max="1"
              step="0.1"
              value={opacity}
              onChange={(e) => setOpacity(parseFloat(e.target.value))}
              className="radar-range h-1 w-16 cursor-pointer appearance-none rounded-full bg-white/20"
              aria-label="Radar overlay opacity"
            />
          </div>
          {frames.length > 1 && (
            <>
              {/* speed */}
              <button
                onClick={() => setSpeed((s) => SPEEDS[(SPEEDS.indexOf(s) + 1) % SPEEDS.length])}
                className="chip flex h-10 items-center justify-center rounded-xl px-3 text-xs font-medium tabular-nums text-ink hover:bg-white/10"
                title="Playback speed"
                aria-label={`Playback speed ${speed}x`}
              >
                {speed}x
              </button>
              {/* play / pause */}
              <button
                onClick={() => setPlaying((p) => !p)}
                className="chip flex h-10 w-10 items-center justify-center rounded-xl text-ink hover:bg-white/10"
                title={playing ? 'Pause' : 'Play'}
                aria-label={playing ? 'Pause radar animation' : 'Play radar animation'}
              >
                {playing ? <Pause size={15} /> : <Play size={15} />}
              </button>
            </>
          )}
          {isForecast && (
            <span className="rounded-xl bg-amber-400/15 px-2.5 py-1.5 text-[11px] font-bold uppercase tracking-wider text-amber-300 ring-1 ring-amber-400/30">
              Forecast
            </span>
          )}
          {stamp && (
            <span className="chip rounded-xl px-3 py-1.5 text-xs font-medium tabular-nums text-ink">
              {stamp}
            </span>
          )}
        </div>
      </div>

      <div className="relative h-[300px] w-full sm:h-[380px] lg:h-[420px]">
        {err ? (
          <div className="flex h-full items-center justify-center px-6 text-center text-sm text-ink-soft">
            Radar layer is temporarily unavailable. Base map shown below.
          </div>
        ) : null}
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
          {tileUrl && <TileLayer key={frame.path} url={tileUrl} opacity={opacity} />}
          <CircleMarker
            center={[lat, lon]}
            radius={6}
            pathOptions={{ color: '#38bdf8', fillColor: '#38bdf8', fillOpacity: 0.9, weight: 2 }}
          />
          <Recenter lat={lat} lon={lon} zoom={zoom} />
        </MapContainer>

        {/* interactive timeline */}
        {frames.length > 1 && (
          <div className="absolute bottom-0 left-0 right-0 z-[500] flex items-center gap-1 bg-gradient-to-t from-black/40 to-transparent px-4 py-3">
            {frames.map((f, i) => {
              const future = pastCount > 0 && i >= pastCount;
              const active = i === idx;
              const color = future ? '#fbbf24' : '#38bdf8';
              return (
                <button
                  key={f.path}
                  onClick={() => { setIdx(i); setPlaying(false); }}
                  className="h-2 flex-1 cursor-pointer rounded-full transition-all hover:h-3"
                  style={{
                    background: active ? color : future ? 'rgba(251,191,36,0.3)' : 'rgba(255,255,255,0.18)',
                    boxShadow: active ? `0 0 8px ${color}` : 'none',
                  }}
                  aria-label={`Frame ${i + 1}${future ? ' (forecast)' : ''}`}
                />
              );
            })}
          </div>
        )}
      </div>

      {/* intensity legend */}
      <div className="flex items-center gap-2 px-6 py-2">
        <span className="text-[10px] text-ink-soft">Light</span>
        <div
          className="h-2 flex-1 rounded-full"
          style={{ background: 'linear-gradient(90deg, #00ff00, #ffff00, #ff8800, #ff0000, #ff00ff)' }}
        />
        <span className="text-[10px] text-ink-soft">Heavy</span>
      </div>

      <div className="flex items-center justify-between gap-3 px-6 py-3 text-xs text-ink-soft">
        <span>Radar: RainViewer · 1200+ stations worldwide</span>
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
    </div>
  );
}
