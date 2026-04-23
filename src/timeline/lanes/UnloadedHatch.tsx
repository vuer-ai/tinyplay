import { timeToX } from '../coords';
import { useTimelineViewport } from '../viewport';

// Theme-neutral hatch — readable on both white and near-black backgrounds.
// Slightly stronger than a pure status overlay because the lane behind may
// itself be low-contrast (e.g. a canvas chart on light theme).
const HATCH_BG =
  'repeating-linear-gradient(45deg, rgba(127,127,127,0.14) 0 4px, transparent 4px 10px)';

export interface UnloadedHatchProps {
  /**
   * The single contiguous time range that is loaded (seconds). Regions
   * within `[0, duration]` but outside this range render as hatch. Pass
   * `null` when nothing is loaded yet — the whole doc width hatches.
   */
  loadedRange: readonly [number, number] | null;
}

/**
 * Paint "unloaded — data will appear when the playhead reaches here"
 * hatch in the time regions a lane has no data for. Pointer-transparent
 * so click/drag-to-seek still fires through to the lane area behind it.
 */
export function UnloadedHatch({ loadedRange }: UnloadedHatchProps) {
  const v = useTimelineViewport();

  if (v.duration <= 0) return null;

  if (loadedRange === null) {
    const x = timeToX(0, v);
    const w = timeToX(v.duration, v) - x;
    if (w <= 0) return null;
    return (
      <div
        aria-hidden
        className="absolute inset-y-0 pointer-events-none"
        style={{ left: x, width: w, backgroundImage: HATCH_BG }}
      />
    );
  }

  const [loadStart, loadEnd] = loadedRange;
  const leftX = timeToX(0, v);
  const leftW = timeToX(Math.max(0, loadStart), v) - leftX;
  const rightX = timeToX(Math.min(v.duration, loadEnd), v);
  const rightW = timeToX(v.duration, v) - rightX;

  return (
    <>
      {leftW > 0 && (
        <div
          aria-hidden
          className="absolute inset-y-0 pointer-events-none"
          style={{ left: leftX, width: leftW, backgroundImage: HATCH_BG }}
        />
      )}
      {rightW > 0 && (
        <div
          aria-hidden
          className="absolute inset-y-0 pointer-events-none"
          style={{ left: rightX, width: rightW, backgroundImage: HATCH_BG }}
        />
      )}
    </>
  );
}
