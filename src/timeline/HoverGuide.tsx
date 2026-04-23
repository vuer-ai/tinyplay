import { useEffect, useRef, type RefObject } from 'react';
import { xToTime } from './coords';
import { useTimelineViewport } from './viewport';

export interface HoverGuideProps {
  /**
   * The element the guide measures against — typically the lane-area
   * wrapper. Pointer moves inside this element reveal the guide; leaving
   * it hides both line and tooltip.
   */
  areaRef: RefObject<HTMLElement | null>;
}

/**
 * Amber hover guide: vertical line + time readout that tracks the mouse
 * while inside the lane area. Separate from the (red) playhead so at any
 * moment you can see both "where I'm considering seeking to" and "where
 * the clock actually is".
 *
 * Driven imperatively — no React state per mousemove — to keep 60fps
 * hover smooth even over large lane grids.
 */
export function HoverGuide({ areaRef }: HoverGuideProps) {
  const vp = useTimelineViewport();
  const vpRef = useRef(vp);
  vpRef.current = vp;

  const lineRef = useRef<HTMLDivElement>(null);
  const tipRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const area = areaRef.current;
    if (!area) return;

    const show = (x: number) => {
      if (lineRef.current) {
        lineRef.current.style.transform = `translateX(${x}px)`;
        lineRef.current.style.opacity = '1';
      }
      if (tipRef.current) {
        const t = xToTime(x, vpRef.current);
        const clamped = Math.max(0, Math.min(vpRef.current.duration, t));
        tipRef.current.textContent = `${clamped.toFixed(2)}s`;
        tipRef.current.style.transform = `translateX(${x + 6}px)`;
        tipRef.current.style.opacity = '1';
      }
    };
    const hide = () => {
      if (lineRef.current) lineRef.current.style.opacity = '0';
      if (tipRef.current) tipRef.current.style.opacity = '0';
    };

    const onMove = (e: PointerEvent) => {
      const rect = area.getBoundingClientRect();
      const x = e.clientX - rect.left;
      if (x < 0 || x > rect.width) {
        hide();
        return;
      }
      show(x);
    };

    area.addEventListener('pointermove', onMove);
    area.addEventListener('pointerleave', hide);
    area.addEventListener('pointercancel', hide);
    return () => {
      area.removeEventListener('pointermove', onMove);
      area.removeEventListener('pointerleave', hide);
      area.removeEventListener('pointercancel', hide);
    };
  }, [areaRef]);

  return (
    <>
      <div
        ref={lineRef}
        aria-hidden
        className="absolute top-0 bottom-0 w-px pointer-events-none z-10 bg-amber-500/70 dark:bg-amber-300/60"
        style={{ left: 0, opacity: 0, transition: 'opacity 120ms' }}
      />
      <div
        ref={tipRef}
        aria-hidden
        className="absolute top-1 text-[10px] font-mono px-1.5 py-0.5 rounded pointer-events-none z-10 bg-amber-500/15 text-amber-700 dark:bg-amber-400/20 dark:text-amber-200 tabular-nums"
        style={{ left: 0, opacity: 0, transition: 'opacity 120ms' }}
      />
    </>
  );
}
