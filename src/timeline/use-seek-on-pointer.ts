import { useEffect, useRef, type RefObject } from 'react';
import { useClockContext } from '../react/clock-context';
import { xToTime } from './coords';
import { useTimelineViewport } from './viewport';

export interface SeekOnPointerOptions {
  /**
   * Called when a shift-click lands on the element. If provided, shift-clicks
   * don't seek — the caller decides what to do with the time (e.g. drop a
   * persistent temporal marker). Omitted → shift-click seeks like normal.
   */
  onShiftClick?: (time: number) => void;
  /**
   * When true, the interaction is bypassed entirely. Used to suspend seek
   * handling while a vertical-drag gesture takes over the lane area.
   */
  disabled?: boolean;
  /**
   * Receives pointer deltas since the initial pointerdown. If the callback
   * returns `true` the drag is canceled (seek stops, pointer capture
   * released) — lets callers upgrade a horizontal seek into a vertical
   * scroll when the movement turns out to be mostly vertical.
   */
  onDragUpgrade?: (dx: number, dy: number) => boolean;
}

/**
 * Attach pointerdown/move/up handlers to an element so that clicking or
 * dragging inside it seeks the shared clock to the corresponding time.
 *
 * Used by both the ruler (the whole bar) and the lane area background
 * (everywhere that isn't a lane-internal interactive element).
 *
 * Children that want to intercept the click (e.g. a pill opens a detail
 * popover) should call `e.preventDefault()` or `e.stopPropagation()`
 * in their own handler.
 */
export function useSeekOnPointer(
  ref: RefObject<HTMLElement | null>,
  options: SeekOnPointerOptions = {},
): void {
  const clock = useClockContext();
  const vp = useTimelineViewport();
  const clockRef = useRef(clock);
  const vpRef = useRef(vp);
  const optsRef = useRef(options);
  clockRef.current = clock;
  vpRef.current = vp;
  optsRef.current = options;

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    let dragging = false;
    let startX = 0;
    let startY = 0;
    let capturedPointerId: number | null = null;

    const timeAt = (clientX: number) => {
      const rect = el.getBoundingClientRect();
      const offsetX = clientX - rect.left;
      const t = xToTime(offsetX, vpRef.current);
      return Math.max(0, Math.min(vpRef.current.duration, t));
    };

    const onDown = (e: PointerEvent) => {
      if (optsRef.current.disabled) return;
      if (e.defaultPrevented) return;
      if (e.button !== 0) return; // left click only

      if (e.shiftKey && optsRef.current.onShiftClick) {
        // Shift+click diverts to the caller (e.g. drop a marker). No seek,
        // no drag — this is a one-shot gesture.
        optsRef.current.onShiftClick(timeAt(e.clientX));
        return;
      }

      dragging = true;
      startX = e.clientX;
      startY = e.clientY;
      capturedPointerId = e.pointerId;
      try {
        el.setPointerCapture(e.pointerId);
      } catch {
        // ignore — some environments disallow capture
      }
      clockRef.current.seek(timeAt(e.clientX));
    };
    const onMove = (e: PointerEvent) => {
      if (!dragging) return;
      const dx = e.clientX - startX;
      const dy = e.clientY - startY;
      if (optsRef.current.onDragUpgrade?.(dx, dy)) {
        // Upgrade requested — stop seeking.
        dragging = false;
        if (capturedPointerId !== null) {
          try {
            el.releasePointerCapture(capturedPointerId);
          } catch {
            // ignore
          }
          capturedPointerId = null;
        }
        return;
      }
      clockRef.current.seek(timeAt(e.clientX));
    };
    const endDrag = (_e: PointerEvent) => {
      if (!dragging) return;
      dragging = false;
      if (capturedPointerId !== null) {
        try {
          el.releasePointerCapture(capturedPointerId);
        } catch {
          // ignore
        }
        capturedPointerId = null;
      }
    };

    el.addEventListener('pointerdown', onDown);
    el.addEventListener('pointermove', onMove);
    el.addEventListener('pointerup', endDrag);
    el.addEventListener('pointercancel', endDrag);
    return () => {
      el.removeEventListener('pointerdown', onDown);
      el.removeEventListener('pointermove', onMove);
      el.removeEventListener('pointerup', endDrag);
      el.removeEventListener('pointercancel', endDrag);
    };
  }, [ref]);
}
