import { Sun, ShieldAlert } from 'lucide-react';
import { hourLabel, uvCategory, round } from '../lib/format.js';

const PROTECT_THRESHOLD = 3; // WHO: sun protection advised at UV index ≥ 3.

/**
 * Derives the day's UV protection window and peak from the 24h consensus.
 * Returns null when there's no hourly UV data at all.
 */
function analyzeUv(hours) {
  const uvs = hours.map((h) => (typeof h.uv === 'number' && Number.isFinite(h.uv) ? h.uv : null));
  if (!uvs.some((v) => v != null)) return null;

  // First contiguous run at/above the protection threshold.
  let start = -1;
  let end = -1;
  for (let i = 0; i < uvs.length; i++) {
    if ((uvs[i] ?? 0) >= PROTECT_THRESHOLD) {
      if (start === -1) start = i;
      end = i;
    } else if (start !== -1) {
      break;
    }
  }

  // Peak UV across the window.
  let peakIdx = 0;
  for (let i = 1; i < uvs.length; i++) {
    if ((uvs[i] ?? -1) > (uvs[peakIdx] ?? -1)) peakIdx = i;
  }
  const peakVal = uvs[peakIdx] ?? 0;

  return {
    needsProtection: start !== -1,
    startLabel: start !== -1 ? hourLabel(hours[start].time, start === 0) : null,
    endLabel: end !== -1 ? hourLabel(hours[Math.min(end + 1, hours.length - 1)].time, false) : null,
    peakVal,
    peakLabel: hourLabel(hours[peakIdx].time, peakIdx === 0),
    peakCat: uvCategory(peakVal),
  };
}

export default function UvWindow({ data }) {
  const hours = data?.consensus?.hourly;
  if (!hours?.length) return null;

  const uv = analyzeUv(hours);
  if (!uv) return null;

  return (
    <div className="glass flex h-full flex-col rounded-3xl p-5" aria-label="UV protection outlook">
      <div className="flex items-center gap-2 text-ink-soft">
        <Sun size={16} className="text-amber-300" />
        <h3 className="text-[11px] font-semibold uppercase tracking-[0.18em]">Sun Protection</h3>
      </div>

      {uv.needsProtection ? (
        <div className="mt-3 flex flex-1 flex-col justify-center gap-3">
          <div className="flex items-center gap-3">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-amber-400/12">
              <ShieldAlert size={17} className="text-amber-300" />
            </span>
            <div className="min-w-0">
              <p className="text-xs text-ink-soft">Protection needed</p>
              <p className="font-display text-sm font-semibold tabular-nums text-ink">
                {uv.startLabel} – {uv.endLabel}
              </p>
            </div>
          </div>
          <div className="divider" />
          <div className="flex items-baseline justify-between">
            <span className="text-xs text-ink-soft">Peak UV</span>
            <span className="flex items-baseline gap-1.5">
              <span className="font-display text-lg font-bold tabular-nums text-ink">
                {round(uv.peakVal, 1)}
              </span>
              <span className="text-[11px] font-medium" style={{ color: uv.peakCat.color }}>
                {uv.peakCat.label}
              </span>
              <span className="text-[11px] text-ink-soft">· {uv.peakLabel}</span>
            </span>
          </div>
        </div>
      ) : (
        <div className="mt-3 flex flex-1 flex-col items-center justify-center gap-1.5 text-center">
          <ShieldAlert size={22} className="text-emerald-300/70" />
          <p className="text-sm font-medium text-ink">Low UV all day</p>
          <p className="text-[11px] text-ink-soft">No sun protection needed</p>
        </div>
      )}
    </div>
  );
}
