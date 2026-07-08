import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { round, cToF, kmhToMph, mmToIn } from '../lib/format.js';

/**
 * Global units preference (metric | imperial), persisted to localStorage.
 * The API is always fetched in metric; conversion happens here at display time,
 * so toggling is instant and never triggers a refetch.
 */
const STORAGE_KEY = 'aw-units';
const UnitsContext = createContext(null);

function readInitial() {
  try {
    const v = localStorage.getItem(STORAGE_KEY);
    if (v === 'metric' || v === 'imperial') return v;
  } catch {
    /* ignore */
  }
  return 'metric'; // default per product decision
}

export function UnitsProvider({ children }) {
  const [units, setUnits] = useState(readInitial);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, units);
    } catch {
      /* ignore */
    }
  }, [units]);

  const toggle = useCallback(() => setUnits((u) => (u === 'metric' ? 'imperial' : 'metric')), []);

  const value = useMemo(() => {
    const imperial = units === 'imperial';
    const tVal = (c) => (imperial ? cToF(c) : c); // numeric, for charts
    const wVal = (k) => (imperial ? kmhToMph(k) : k);
    return {
      units,
      imperial,
      setUnits,
      toggle,
      tempUnit: imperial ? '°F' : '°C',
      windUnit: imperial ? 'mph' : 'km/h',
      rainUnit: imperial ? 'in' : 'mm',
      tVal,
      wVal,
      // string formatters
      fmtTemp: (c) => {
        const r = round(tVal(c));
        return r === null ? '—' : `${r}°`;
      },
      fmtTempUnit: (c) => {
        const r = round(tVal(c));
        return r === null ? '—' : `${r}${imperial ? '°F' : '°C'}`;
      },
      fmtWind: (k) => {
        const r = round(wVal(k));
        return r === null ? '—' : `${r} ${imperial ? 'mph' : 'km/h'}`;
      },
      fmtSpread: (c) => {
        // °C delta -> magnitude in active unit (interval, not offset)
        const r = round(imperial ? c * 1.8 : c, 1);
        return r === null ? '0' : `${r}`;
      },
      fmtRain: (mm) => round(imperial ? mmToIn(mm) : mm, imperial ? 2 : 1),
    };
  }, [units, toggle]);

  return <UnitsContext.Provider value={value}>{children}</UnitsContext.Provider>;
}

export function useUnits() {
  const ctx = useContext(UnitsContext);
  if (!ctx) throw new Error('useUnits must be used within <UnitsProvider>');
  return ctx;
}
