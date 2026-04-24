import type { TrackRow } from '../types/config';

export interface PlaceholderLaneProps {
  /** The TrackRow whose dtype is missing a `views` entry. */
  track: TrackRow;
}

/**
 * Fallback lane for tracks whose `dtype` has no entry in the
 * `<TimelineContainer views>` map. Visible during development so missing
 * wiring is immediately obvious; in production the empty lane at least
 * preserves row layout.
 */
export function PlaceholderLane({ track }: PlaceholderLaneProps) {
  return (
    <div className="h-full flex items-center justify-center text-xs text-zinc-500 dark:text-zinc-500 font-mono">
      <span className="opacity-60">dtype</span>
      <span className="mx-1 px-1 rounded bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300">
        {track.dtype}
      </span>
      <span className="opacity-60">has no view registered</span>
    </div>
  );
}
PlaceholderLane.displayName = 'PlaceholderLane';
