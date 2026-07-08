import { AlertTriangle, RotateCw } from 'lucide-react';

export function SkeletonDashboard() {
  return (
    <div className="space-y-5">
      <div className="grid gap-5 lg:grid-cols-[1.6fr_1fr]">
        <div className="skeleton h-64 rounded-3xl" />
        <div className="skeleton h-64 rounded-3xl" />
      </div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="skeleton h-20 rounded-2xl" />
        ))}
      </div>
      <div className="skeleton h-28 rounded-3xl" />
      <div className="grid gap-5 lg:grid-cols-2">
        <div className="skeleton h-72 rounded-3xl" />
        <div className="skeleton h-72 rounded-3xl" />
      </div>
    </div>
  );
}

export function ErrorState({ message, onRetry }) {
  return (
    <div className="glass flex flex-col items-center gap-4 rounded-3xl px-6 py-14 text-center">
      <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-rose-500/15 text-rose-300 ring-1 ring-rose-400/30">
        <AlertTriangle size={22} />
      </span>
      <div>
        <h3 className="font-display text-lg font-semibold text-ink">Couldn’t load the forecast</h3>
        <p className="mt-1 max-w-sm text-sm text-ink-soft">{message}</p>
      </div>
      <button
        onClick={onRetry}
        className="chip inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-medium text-ink hover:bg-white/10"
      >
        <RotateCw size={15} /> Retry
      </button>
    </div>
  );
}
