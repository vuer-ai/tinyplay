import type { TrackConfig } from '../types/config';

export interface PlaceholderLaneProps {
  /** The TrackConfig that failed to resolve to a registered view. */
  track: TrackConfig;
}

/**
 * Fallback lane for `TrackConfig.view` values not present in the registry.
 * Visible during development so missing views are immediately obvious; in
 * production the empty lane at least preserves the row layout.
 */
export function PlaceholderLane({ track }: PlaceholderLaneProps) {
  return (
    <div className="h-full flex items-center justify-center text-xs text-zinc-500 dark:text-zinc-500 font-mono">
      <span className="opacity-60">view</span>
      <span className="mx-1 px-1 rounded bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300">
        {track.view}
      </span>
      <span className="opacity-60">not registered</span>
    </div>
  );
}
PlaceholderLane.displayName = 'PlaceholderLane';
