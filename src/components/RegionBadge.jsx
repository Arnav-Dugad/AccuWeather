import { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Cpu, ChevronDown } from 'lucide-react';

export default function RegionBadge({ region }) {
  const [open, setOpen] = useState(false);
  if (!region) return null;

  return (
    <div className="glass overflow-hidden rounded-2xl">
      <button
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-label={open ? 'Collapse smart router details' : 'Expand smart router details'}
        className="flex w-full items-center gap-3 px-4 py-2.5 text-left"
      >
        <span className="inline-flex shrink-0 items-center gap-2">
          <Cpu size={15} className="text-sky-300" />
          <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-ink-soft">
            Smart Router
          </span>
        </span>
        <span className="hidden h-3.5 w-px shrink-0 bg-white/15 sm:block" />
        <span className="inline-flex shrink-0 items-center gap-1.5 text-sm font-semibold text-ink">
          <span className="text-base leading-none">{region.flag}</span>
          {region.name}
        </span>
        <ChevronDown
          size={15}
          className={`ml-auto shrink-0 text-ink-soft transition-transform ${open ? 'rotate-180' : ''}`}
        />
      </button>

      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: 'easeInOut' }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-3">
              <p className="text-sm text-ink-soft">· {region.summary}</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
