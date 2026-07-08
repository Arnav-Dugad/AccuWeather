const REDUCED = typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

function classify(code) {
  if (code <= 1) return 'clear';
  if (code <= 3) return 'cloudy';
  if (code === 45 || code === 48) return 'fog';
  if ((code >= 51 && code <= 67) || (code >= 80 && code <= 82)) return 'rain';
  if ((code >= 71 && code <= 77) || (code >= 85 && code <= 86)) return 'snow';
  if (code >= 95) return 'thunder';
  return 'cloudy';
}

function SunRays({ isDay }) {
  if (!isDay) return null;
  return (
    <div className="scene-spin-slow absolute -right-8 -top-8 h-40 w-40 opacity-20">
      {[0, 45, 90, 135].map((r) => (
        <div key={r} className="absolute left-1/2 top-0 h-full w-px -translate-x-1/2 bg-gradient-to-b from-amber-300/80 to-transparent"
          style={{ transform: `rotate(${r}deg)`, transformOrigin: '50% 50%' }} />
      ))}
    </div>
  );
}

function Clouds() {
  return (
    <>
      {[0, 1, 2].map((i) => (
        <div key={i}
          className="scene-drift absolute rounded-full bg-white/[0.05]"
          style={{
            width: 60 + i * 20,
            height: 20 + i * 6,
            top: `${12 + i * 18}%`,
            left: `${-15 + i * 10}%`,
            animationDelay: `${i * -7}s`,
            animationDuration: `${18 + i * 4}s`,
          }}
        />
      ))}
    </>
  );
}

function RainDrops() {
  return (
    <>
      {Array.from({ length: 8 }).map((_, i) => (
        <div key={i}
          className="scene-fall absolute w-px bg-gradient-to-b from-sky-300/40 to-transparent"
          style={{
            height: 18 + (i % 3) * 8,
            left: `${10 + i * 11}%`,
            animationDelay: `${i * 0.18}s`,
            animationDuration: `${0.8 + (i % 3) * 0.35}s`,
          }}
        />
      ))}
    </>
  );
}

function SnowFlakes() {
  return (
    <>
      {Array.from({ length: 7 }).map((_, i) => (
        <div key={i}
          className="scene-snow absolute h-1.5 w-1.5 rounded-full bg-white/30"
          style={{
            left: `${8 + i * 13}%`,
            animationDelay: `${i * 0.6}s`,
            animationDuration: `${3 + (i % 3)}s`,
          }}
        />
      ))}
    </>
  );
}

function FogBands() {
  return (
    <>
      {[0, 1].map((i) => (
        <div key={i}
          className="scene-drift absolute h-6 w-[120%] rounded-full bg-white/[0.04]"
          style={{
            top: `${35 + i * 25}%`,
            left: '-10%',
            animationDuration: `${22 + i * 6}s`,
          }}
        />
      ))}
    </>
  );
}

function LightningFlash() {
  return (
    <>
      <RainDrops />
      <div className="scene-flash pointer-events-none absolute inset-0 bg-white/0" />
    </>
  );
}

export default function WeatherScene({ code, isDay }) {
  if (REDUCED) return null;

  const type = classify(code);

  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
      {type === 'clear' && <SunRays isDay={isDay} />}
      {type === 'cloudy' && <Clouds />}
      {type === 'rain' && <RainDrops />}
      {type === 'snow' && <SnowFlakes />}
      {type === 'fog' && <FogBands />}
      {type === 'thunder' && <LightningFlash />}
    </div>
  );
}
