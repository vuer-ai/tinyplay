interface TickProps {
  time: number;
  label: string;
  percent: number;
  zIndex?: number;
}

/**
 * One ruler tick: a faint vertical line at the exact position plus a
 * rounded pill-style label clamped so it never clips off-screen when the
 * tick sits near the viewport edge.
 *
 * Matches the visual treatment in vuer-uikit's waterfall ruler so both
 * surfaces read consistently.
 */
export function Tick({ time, label, percent, zIndex = 10 }: TickProps) {
  if (percent < -20 || percent > 120) return null;

  // Keep the label visible even when the tick itself is at the edge.
  const LABEL_HALF_PCT = 3;
  const clamped = Math.min(
    100 - LABEL_HALF_PCT,
    Math.max(LABEL_HALF_PCT, percent),
  );

  return (
    <>
      <div
        aria-hidden
        className="absolute top-0 h-full w-px bg-zinc-200 dark:bg-zinc-700"
        style={{ left: `${percent}%` }}
      />
      <div
        aria-hidden
        key={time}
        className="pointer-events-none absolute top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-[6px] px-1.5 py-px text-[10px] font-mono tabular-nums text-zinc-600 dark:text-zinc-300 backdrop-blur-[4px] border border-white/60 dark:border-zinc-700/40 bg-[linear-gradient(147.1deg,rgba(255,255,255,0.78)_0%,rgba(240,240,240,0.7)_100%)] dark:bg-[linear-gradient(147.1deg,rgba(50,50,50,0.72)_0%,rgba(70,70,70,0.68)_100%)]"
        style={{ left: `${clamped}%`, zIndex }}
      >
        {label}
      </div>
    </>
  );
}
