import { useId } from 'react';
import { motion } from 'framer-motion';
import {
  Sun,
  CloudSun,
  Cloud,
  CloudFog,
  CloudDrizzle,
  CloudRain,
  CloudRainWind,
  CloudSnow,
  Snowflake,
  CloudLightning,
  CloudOff,
} from 'lucide-react';
import { weatherFor } from '../lib/weatherCodes.js';

const ICONS = {
  Sun,
  CloudSun,
  Cloud,
  CloudFog,
  CloudDrizzle,
  CloudRain,
  CloudRainWind,
  CloudSnow,
  Snowflake,
  CloudLightning,
  CloudOff,
};

function animProps(code, size) {
  if (size < 24) return null;
  if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return null;
  if (code <= 1) return { animate: { rotate: 360 }, transition: { repeat: Infinity, duration: 20, ease: 'linear' } };
  if (code <= 3) return { animate: { x: [-2, 2, -2] }, transition: { repeat: Infinity, duration: 4, ease: 'easeInOut' } };
  if ((code >= 51 && code <= 67) || (code >= 80 && code <= 82))
    return { animate: { y: [0, -2, 0] }, transition: { repeat: Infinity, duration: 1.5, ease: 'easeInOut' } };
  if ((code >= 71 && code <= 77) || (code >= 85 && code <= 86))
    return { animate: { rotate: [-5, 5, -5] }, transition: { repeat: Infinity, duration: 3, ease: 'easeInOut' } };
  if (code >= 95)
    return { animate: { opacity: [1, 0.7, 1] }, transition: { repeat: Infinity, duration: 0.3, repeatDelay: 3 } };
  return null;
}

export default function WeatherIcon({ code, isDay = true, size = 24, className = '', strokeWidth = 1.75 }) {
  const { icon, gradient } = weatherFor(code, isDay);
  const Cmp = ICONS[icon] ?? CloudOff;
  const id = `wi${useId().replace(/:/g, '')}`;
  const anim = animProps(code, size);

  const inner = (
    <span className={`inline-flex ${className}`} style={{ lineHeight: 0 }}>
      <svg width="0" height="0" style={{ position: 'absolute' }} aria-hidden>
        <defs>
          <linearGradient id={id} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor={gradient[0]} />
            <stop offset="1" stopColor={gradient[1]} />
          </linearGradient>
        </defs>
      </svg>
      <Cmp size={size} strokeWidth={strokeWidth} stroke={`url(#${id})`} />
    </span>
  );

  if (!anim) return inner;

  return (
    <motion.div {...anim} style={{ display: 'inline-flex' }}>
      {inner}
    </motion.div>
  );
}
