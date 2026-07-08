import { useCallback, useEffect, useRef, useState } from 'react';
import { fetchMarine } from '../lib/marine.js';
import { getCached, setCache } from '../lib/cache.js';

export function useMarine(location) {
  const [state, setState] = useState({ data: null, status: 'idle', error: null });
  const abortRef = useRef(null);

  const run = useCallback(async (force = false) => {
    if (!location) return;
    abortRef.current?.abort();
    const ctrl = new AbortController();
    abortRef.current = ctrl;

    if (!force) {
      const cached = getCached(location.latitude, location.longitude, 'marine');
      if (cached) {
        setState({ data: cached, status: 'success', error: null });
        return;
      }
    }

    setState((s) => ({ ...s, status: 'loading', error: null }));
    try {
      const data = await fetchMarine(location, ctrl.signal);
      setCache(location.latitude, location.longitude, 'marine', data);
      setState({ data, status: 'success', error: null });
    } catch (err) {
      if (err.name === 'AbortError') return;
      setState({ data: null, status: 'error', error: err.message });
    }
  }, [location]);

  useEffect(() => {
    run();
    return () => abortRef.current?.abort();
  }, [run]);

  const reload = useCallback(() => run(true), [run]);
  return { ...state, reload };
}
