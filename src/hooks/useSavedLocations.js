import { useCallback, useEffect, useState } from 'react';

/**
 * Persisted list of saved/favorite locations (localStorage).
 * Each entry: { id, name, admin1, country, latitude, longitude }.
 */
const KEY = 'aw-saved';

const keyOf = (loc) => `${loc.latitude.toFixed(2)},${loc.longitude.toFixed(2)}`;

function read() {
  try {
    const raw = localStorage.getItem(KEY);
    const arr = raw ? JSON.parse(raw) : [];
    return Array.isArray(arr) ? arr : [];
  } catch {
    return [];
  }
}

export function useSavedLocations() {
  const [saved, setSaved] = useState(read);

  useEffect(() => {
    try {
      localStorage.setItem(KEY, JSON.stringify(saved));
    } catch {
      /* ignore */
    }
  }, [saved]);

  const has = useCallback((loc) => (loc ? saved.some((s) => s.id === keyOf(loc)) : false), [saved]);

  const toggle = useCallback((loc) => {
    if (!loc) return;
    const id = keyOf(loc);
    setSaved((list) => {
      if (list.some((s) => s.id === id)) return list.filter((s) => s.id !== id);
      const entry = {
        id,
        name: loc.name || 'Location',
        admin1: loc.admin1 || '',
        country: loc.country || '',
        latitude: loc.latitude,
        longitude: loc.longitude,
      };
      return [entry, ...list].slice(0, 12);
    });
  }, []);

  const remove = useCallback((id) => setSaved((list) => list.filter((s) => s.id !== id)), []);

  return { saved, has, toggle, remove };
}
