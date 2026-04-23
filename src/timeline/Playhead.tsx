import { useEffect, useRef, type RefObject } from 'react';
import { useClockContext } from '../react/clock-context';
import { timeToX, xToTime } from './coords';
import { useTimelineViewport } from './viewport';

export interface PlayheadProps {
  /**
   * Lane-area wrapper ref, used for coordinate conversion when dragging
   * the triangle handle. Clicking the handle seeks exactly like clicking
   * the ruler does — it's a visual affordance for the same intent.
   */
  areaRef: RefObject<HTMLElement | null>;
}

/**
 * Vertical red line tracking `clock.time` with a draggable triangle
 * handle at the top. Line position updates imperatively via the clock's
 * tick event so the React tree around it never re-renders at frame rate.
 */
export function Playhead({ areaRef }: PlayheadProps) {
  const clock = useClockContext();
  const v = useTimelineViewport();
  const vRef = useRef(v);
  vRef.current = v;
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const update = () => {
      const x = timeToX(clock.time, vRef.current);
      el.style.transform = `translateX(${x}px)`;
    };
    update();
    const unsub1 = clock.on('tick', update);
    const unsub2 = clock.on('seek', update);
    return () => {
      unsub1();
      unsub2();
    };
  }, [clock, v.pxPerSecond, v.scrollSec]);

  const onHandleDown = (e: React.PointerEvent) => {
    const area = areaRef.current;
    if (!area || e.button !== 0) return;
    e.stopPropagation();
    e.preventDefault();
    const seekAt = (clientX: number) => {
      const rect = area.getBoundingClientRect();
      const offsetX = clientX - rect.left;
      const t = xToTime(offsetX, vRef.current);
      clock.seek(Math.max(0, Math.min(vRef.current.duration, t)));
    };
    seekAt(e.clientX);
    const onMove = (ev: PointerEvent) => seekAt(ev.clientX);
    const onUp = () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
    };
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
  };

  return (
    <div
      ref={wrapRef}
      aria-hidden
      className="absolute top-0 bottom-0 w-0 pointer-events-none z-20"
      style={{ left: 0 }}
    >
      <div
        className="absolute left-0 top-0 bottom-0"
        style={{ width: 1, backgroundColor: 'rgb(239 68 68)' }}
      />
      <div
        onPointerDown={onHandleDown}
        title="drag to scrub"
        className="absolute pointer-events-auto cursor-ew-resize"
        style={{
          top: 0,
          left: -6,
          width: 12,
          height: 12,
          backgroundColor: 'rgb(239 68 68)',
          clipPath: 'polygon(50% 100%, 0 0, 100% 0)',
        }}
      />
    </div>
  );
}
