import { useCallback, useEffect, useRef, useState } from 'react';
import { resolveRegion, modelsForRegion } from '../lib/router.js';
import { fetchForecast } from '../lib/openMeteo.js';
import { buildWeatherModel } from '../lib/blend.js';
import { getCached, setCache } from '../lib/cache.js';

export function useWeather(location) {
  const [state, setState] = useState({ data: null, region: null, modelIds: [], status: 'idle', error: null });
  const abortRef = useRef(null);

  const run = useCallback(async (force = false) => {
    if (!location) return;
    abortRef.current?.abort();
    const ctrl = new AbortController();
    abortRef.current = ctrl;

    const region = resolveRegion(location.latitude, location.longitude);
    const modelIds = modelsForRegion(region);

    if (!force) {
      const cached = getCached(location.latitude, location.longitude, 'forecast');
      if (cached) {
        const data = buildWeatherModel(cached, region, modelIds);
        setState({ data, region, modelIds, status: 'success', error: null });
        return;
      }
    }

    setState((s) => ({ ...s, region, modelIds, status: 'loading', error: null }));
    try {
      const api = await fetchForecast(location, modelIds, ctrl.signal);
      setCache(location.latitude, location.longitude, 'forecast', api);
      const data = buildWeatherModel(api, region, modelIds);
      setState({ data, region, modelIds, status: 'success', error: null });
    } catch (err) {
      if (err.name === 'AbortError') return;
      setState({ data: null, region, modelIds, status: 'error', error: err.message || 'Failed to load forecast' });
    }
  }, [location]);

  useEffect(() => {
    run();
    return () => abortRef.current?.abort();
  }, [run]);

  const reload = useCallback(() => run(true), [run]);
  return { ...state, reload };
}
