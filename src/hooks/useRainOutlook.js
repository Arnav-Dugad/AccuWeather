import { useCallback, useEffect, useRef, useState } from 'react';
import { resolveRegion } from '../lib/router.js';
import { fetchEnsemble, fetchMinutely, computeRainOutlook, computeNowcast } from '../lib/rain.js';
import { getCached, setCache } from '../lib/cache.js';

export function useRainOutlook(location) {
  const [state, setState] = useState({ outlook: null, nowcast: null, status: 'idle', error: null });
  const abortRef = useRef(null);

  const run = useCallback(async (force = false) => {
    if (!location) return;
    abortRef.current?.abort();
    const ctrl = new AbortController();
    abortRef.current = ctrl;
    const region = resolveRegion(location.latitude, location.longitude);

    if (!force) {
      const cachedE = getCached(location.latitude, location.longitude, 'ensemble');
      const cachedM = getCached(location.latitude, location.longitude, 'minutely');
      if (cachedE) {
        const outlook = computeRainOutlook(cachedE);
        const nowcast = cachedM ? computeNowcast(cachedM) : null;
        setState({ outlook, nowcast, status: 'success', error: null });
        return;
      }
    }

    setState((s) => ({ ...s, status: 'loading', error: null }));
    try {
      const [ensemble, minutely] = await Promise.all([
        fetchEnsemble(location, region.ensemble, ctrl.signal),
        fetchMinutely(location, ctrl.signal).catch(() => null),
      ]);
      setCache(location.latitude, location.longitude, 'ensemble', ensemble);
      if (minutely) setCache(location.latitude, location.longitude, 'minutely', minutely);
      const outlook = computeRainOutlook(ensemble);
      const nowcast = minutely ? computeNowcast(minutely) : null;
      setState({ outlook, nowcast, status: 'success', error: null });
    } catch (err) {
      if (err.name === 'AbortError') return;
      setState({ outlook: null, nowcast: null, status: 'error', error: err.message });
    }
  }, [location]);

  useEffect(() => {
    run();
    return () => abortRef.current?.abort();
  }, [run]);

  const reload = useCallback(() => run(true), [run]);
  return { ...state, reload };
}
