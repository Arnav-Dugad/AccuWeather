import { AnimatePresence, motion } from 'framer-motion';
import { ChevronDown } from 'lucide-react';
import { usePersistentDisclosure } from '../hooks/usePersistentDisclosure.js';

/**
 * Shared collapsible card shell. Provides the glass container, a canonical
 * header (icon + uppercase micro-label title), an optional right-aligned
 * `actions` node, and a height-animated body whose open/closed state persists.
 *
 * `actions` sits between the title and the chevron and is NOT inside the toggle
 * button, so interactive controls (chips, badges) don't nest inside a button.
 */
export default function CollapsibleCard({
  id,
  icon: Icon,
  iconClass = 'text-sky-300',
  title,
  subtitle,
  actions,
  defaultOpen = true,
  bare = false,
  className = '',
  bodyClass = 'px-5 pb-5',
  ariaLabel,
  decoration,
  children,
}) {
  const [open, setOpen] = usePersistentDisclosure(id, defaultOpen);
  const shell = bare ? '' : 'glass rounded-3xl';

  return (
    <div className={`relative ${shell} overflow-hidden ${className}`} aria-label={ariaLabel}>
      {decoration}
      <div className="relative flex items-center gap-2 px-5 pt-5 pb-4">
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          aria-expanded={open}
          className="flex min-w-0 flex-1 items-center gap-2 text-left text-ink-soft"
        >
          {Icon && <Icon size={16} className={`shrink-0 ${iconClass}`} />}
          <h3 className="shrink-0 text-[11px] font-semibold uppercase tracking-[0.18em]">{title}</h3>
          {subtitle && <span className="truncate text-xs text-ink-soft/70">· {subtitle}</span>}
        </button>
        {actions}
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          tabIndex={-1}
          aria-hidden="true"
          className="shrink-0 text-ink-soft"
        >
          <ChevronDown size={16} className={`transition-transform ${open ? '' : '-rotate-90'}`} />
        </button>
      </div>

      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: 'easeInOut' }}
            className="overflow-hidden"
          >
            <div className={bodyClass}>{children}</div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
