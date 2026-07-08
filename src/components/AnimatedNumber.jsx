import { useEffect, useRef, useState } from 'react';

/** Counts up to `value` on mount/change for a premium feel. */
export default function AnimatedNumber({ value, decimals = 0, duration = 800, className = '' }) {
  const [display, setDisplay] = useState(value ?? 0);
  const fromRef = useRef(value ?? 0);
  const rafRef = useRef(null);

  useEffect(() => {
    if (typeof value !== 'number' || !Number.isFinite(value)) {
      setDisplay(null);
      return;
    }
    const from = fromRef.current ?? 0;
    const to = value;
    const start = performance.now();
    const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

    if (reduce) {
      setDisplay(to);
      fromRef.current = to;
      return;
    }

    const tick = (now) => {
      const t = Math.min(1, (now - start) / duration);
      // easeOutBack: snappy with a slight settle. It overshoots past 1, so clamp
      // the displayed value to never pass the target — a count-up must not flash a
      // value higher than the real temperature (and vice-versa for a count-down).
      const eased = t < 1 ? 1 + 2.70158 * Math.pow(t - 1, 3) + 1.70158 * Math.pow(t - 1, 2) : 1;
      let next = from + (to - from) * eased;
      next = to > from ? Math.min(next, to) : Math.max(next, to);
      setDisplay(next);
      if (t < 1) rafRef.current = requestAnimationFrame(tick);
      else fromRef.current = to;
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, [value, duration]);

  if (display === null || display === undefined) return <span className={className}>—</span>;
  return <span className={className}>{display.toFixed(decimals)}</span>;
}
