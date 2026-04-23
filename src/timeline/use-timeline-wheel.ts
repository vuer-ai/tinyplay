import { useEffect, useRef, type RefObject } from 'react';
import { useTimelineViewport } from './viewport';

/**
 * Attach a wheel handler to an element for timeline pan + zoom, while
 * letting plain vertical scroll pass through to the outer scroller so
 * virtualized row scrolling keeps working.
 *
 *   cmd/ctrl + wheel        → zoom at cursor (preventDefault)
 *   shift + wheel           → horizontal pan (preventDefault)
 *   wheel with deltaX > |Y| → horizontal pan (preventDefault)
 *   plain deltaY            → NOT intercepted — browser scrolls the page/parent
 *
 * Uses `addEventListener` directly so `preventDefault` takes effect —
 * React's synthetic `onWheel` is passive by default.
 */
export function useTimelineWheel(
  ref: RefObject<HTMLElement | null>,
): void {
  const vp = useTimelineViewport();
  const vpRef = useRef(vp);
  vpRef.current = vp;

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      const v = vpRef.current;

      if (e.metaKey || e.ctrlKey) {
        e.preventDefault();
        const rect = el.getBoundingClientRect();
        const cursorX = e.clientX - rect.left;
        const delta = e.deltaY !== 0 ? e.deltaY : e.deltaX;
        const factor = Math.exp(-delta * 0.002);
        v.zoomAtCursor(factor, cursorX);
        return;
      }

      if (e.shiftKey) {
        e.preventDefault();
        const delta = e.deltaY !== 0 ? e.deltaY : e.deltaX;
        v.setScrollSec(v.scrollSec + delta / v.pxPerSecond);
        return;
      }

      // Trackpad horizontal swipe → pan horizontally, preventing the
      // browser's "back/forward gesture" behavior.
      if (Math.abs(e.deltaX) > Math.abs(e.deltaY)) {
        e.preventDefault();
        v.setScrollSec(v.scrollSec + e.deltaX / v.pxPerSecond);
        return;
      }

      // Plain vertical wheel: let it bubble so the outer row-scroller
      // moves.
    };
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  }, [ref]);
}
