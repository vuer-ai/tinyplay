interface EventDotProps {
  /** Position as percentage (0-100) across the ruler. */
  percent: number;
}

/**
 * Tiny dot on the ruler marking a "snap point" — a track's start time,
 * end time, or an instant event's time. The cursor overlay snaps to the
 * closest dot within a small threshold so clicking on the ruler lands on
 * meaningful moments.
 */
export function EventDot({ percent }: EventDotProps) {
  if (percent < 0 || percent > 100) return null;
  return (
    <div
      aria-hidden
      className="absolute top-1/2 h-1 w-1 -translate-y-1/2 rounded-full bg-zinc-400/80 dark:bg-zinc-500/70 z-0"
      style={{ left: `${percent}%` }}
    />
  );
}
