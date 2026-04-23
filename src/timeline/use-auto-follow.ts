import { useEffect, useRef } from 'react';
import { useClockContext } from '../react/clock-context';
import { useTimelineViewport } from './viewport';

const EDGE_MARGIN_FRAC = 0.08;

/**
 * Keep the playhead visible while playing. When the clock time leaves the
 * current viewport during playback, re-scroll so the playhead re-enters
 * near the left edge (with a small margin). Paused state is left alone —
 * users who panned away intentionally aren't fought.
 *
 * Subscribes to the clock's `tick` event directly (no React state per
 * frame) so the scroll decision runs at the clock's native rate without
 * triggering re-renders of the timeline tree.
 */
export function useAutoFollow(): void {
  const clock = useClockContext();
  const vp = useTimelineViewport();
  const vpRef = useRef(vp);
  vpRef.current = vp;

  useEffect(() => {
    const handler = () => {
      if (!clock.playing) return;
      const v = vpRef.current;
      if (v.containerWidth <= 0 || v.pxPerSecond <= 0) return;

      const t = clock.time;
      const inView = t >= v.viewStart && t <= v.viewEnd;
      if (inView) return;

      // Playhead exited the viewport — snap so it re-enters with a small
      // left-edge margin. Works for forward playback, backward seek, or
      // programmatic jump alike.
      const marginSec = (v.containerWidth * EDGE_MARGIN_FRAC) / v.pxPerSecond;
      v.setScrollSec(t - marginSec);
    };
    return clock.on('tick', handler);
  }, [clock]);
}
