import { useEffect, useState } from 'react';

const PREFIX = 'aw-collapse:';

/**
 * Open/closed state for a collapsible card, remembered across visits.
 * @param {string} id       stable key (unique per card)
 * @param {boolean} defaultOpen
 * @returns {[boolean, function]}
 */
export function usePersistentDisclosure(id, defaultOpen = true) {
  const [open, setOpen] = useState(() => {
    try {
      const v = localStorage.getItem(PREFIX + id);
      return v === null ? defaultOpen : v === '1';
    } catch {
      return defaultOpen;
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem(PREFIX + id, open ? '1' : '0');
    } catch {
      /* ignore */
    }
  }, [id, open]);

  return [open, setOpen];
}
