import { useCallback, useState } from 'react';

/**
 * Thin wrapper over the browser Geolocation API.
 * Returns a `locate()` that resolves to {latitude, longitude} or rejects.
 */
export function useGeolocation() {
  const [status, setStatus] = useState('idle'); // idle | prompting | granted | denied | error

  const locate = useCallback(() => {
    return new Promise((resolve, reject) => {
      if (!('geolocation' in navigator)) {
        setStatus('error');
        reject(new Error('Geolocation unsupported'));
        return;
      }
      setStatus('prompting');
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setStatus('granted');
          resolve({ latitude: pos.coords.latitude, longitude: pos.coords.longitude });
        },
        (err) => {
          setStatus(err.code === err.PERMISSION_DENIED ? 'denied' : 'error');
          reject(err);
        },
        { enableHighAccuracy: false, timeout: 8000, maximumAge: 600000 },
      );
    });
  }, []);

  return { locate, status };
}
