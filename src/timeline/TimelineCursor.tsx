import { useEffect, useRef, type RefObject } from 'react';
import { Icon } from './Icon';
import { xToTime } from './coords';
import { useTimelineViewport } from './viewport';
import { formatDuration } from './duration';

export interface TimelineCursorProps {
  /** The lane-area wrapper; pointermove inside shows the cursor. */
  areaRef: RefObject<HTMLElement | null>;
  /**
   * Times the cursor snaps to within 8 px. Typically ts/te/startTime/endTime
   * collected from inline-data tracks. Empty disables snap.
   */
  snapPoints?: readonly number[];
}

const SNAP_THRESHOLD_PX = 8;

/**
 * Live hover cursor: vertical line + readout pill at the top that tracks
 * pointer position. When a snap point is within 8 px, the cursor locks onto
 * it and the readout shows a magnet icon.
 *
 * Pointer moves are coalesced through `requestAnimationFrame` and written
 * directly to DOM (no React state per move). Lane rows are never re-rendered
 * as the cursor moves — matching the `Playhead` update path.
 */
export function TimelineCursor({
  areaRef,
  snapPoints = [],
}: TimelineCursorProps) {
  const v = useTimelineViewport();
  const vRef = useRef(v);
  vRef.current = v;
  const snapRef = useRef(snapPoints);
  snapRef.current = snapPoints;

  const wrapRef = useRef<HTMLDivElement>(null);
  const lineRef = useRef<HTMLDivElement>(null);
  const pillRef = useRef<HTMLDivElement>(null);
  const labelRef = useRef<HTMLSpanElement>(null);
  const magnetRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const area = areaRef.current;
    const wrap = wrapRef.current;
    const line = lineRef.current;
    const pill = pillRef.current;
    const label = labelRef.current;
    const magnet = magnetRef.current;
    if (!area || !wrap || !line || !pill || !label || !magnet) return;

    let latestClientX = 0;
    let rafId: number | null = null;
    let visible = false;

    const setVisible = (shown: boolean) => {
      if (visible === shown) return;
      visible = shown;
      wrap.style.opacity = shown ? '1' : '0';
    };

    const render = () => {
      rafId = null;
      const vp = vRef.current;
      const rect = area.getBoundingClientRect();
      const x = latestClientX - rect.left;
      if (x < 0 || x > rect.width) {
        setVisible(false);
        return;
      }
      const rawT = xToTime(x, vp);
      // Snap to nearest event within threshold.
      let closest: number | null = null;
      let minDist = Infinity;
      const snapTimeThresh =
        SNAP_THRESHOLD_PX / Math.max(1e-6, vp.pxPerSecond);
      for (const pt of snapRef.current) {
        const d = Math.abs(pt - rawT);
        if (d < minDist && d < snapTimeThresh) {
          minDist = d;
          closest = pt;
        }
      }
      const displayT = closest ?? rawT;
      const xPx = (displayT - vp.scrollSec) * vp.pxPerSecond;
      // Translate the whole overlay — one transform write per frame.
      line.style.transform = `translateX(${xPx}px)`;
      pill.style.transform = `translateX(${xPx}px) translateX(-50%)`;
      label.textContent = formatDuration(displayT);
      magnet.style.opacity = closest !== null ? '1' : '0';
      magnet.style.width = closest !== null ? '14px' : '0px';
      magnet.style.marginRight = closest !== null ? '4px' : '0px';
      setVisible(true);
    };

    const onMove = (e: PointerEvent) => {
      latestClientX = e.clientX;
      if (rafId === null) rafId = requestAnimationFrame(render);
    };
    const onLeave = () => {
      if (rafId !== null) cancelAnimationFrame(rafId);
      rafId = null;
      setVisible(false);
    };

    area.addEventListener('pointermove', onMove);
    area.addEventListener('pointerleave', onLeave);
    area.addEventListener('pointercancel', onLeave);
    return () => {
      area.removeEventListener('pointermove', onMove);
      area.removeEventListener('pointerleave', onLeave);
      area.removeEventListener('pointercancel', onLeave);
      if (rafId !== null) cancelAnimationFrame(rafId);
    };
  }, [areaRef]);

  return (
    <div
      ref={wrapRef}
      aria-hidden
      className="absolute inset-0 pointer-events-none"
      style={{ opacity: 0, transition: 'opacity 80ms', zIndex: 100 }}
    >
      <div
        ref={lineRef}
        className="absolute top-0 h-full w-px"
        style={{ left: 0, backgroundColor: 'rgb(239 68 68)', willChange: 'transform' }}
      />
      <div
        ref={pillRef}
        className="absolute top-1 flex items-center px-2 py-0.5 text-[11px] font-mono tabular-nums rounded-[6px] border border-zinc-200 dark:border-zinc-700/70 shadow-[0_4px_16px_0_rgba(0,0,0,0.08)] bg-white/90 dark:bg-zinc-900/90 text-zinc-800 dark:text-zinc-100 backdrop-blur-[4px]"
        style={{ left: 0, minWidth: '6ch', willChange: 'transform' }}
      >
        <span
          ref={magnetRef}
          className="flex items-center justify-center overflow-hidden text-zinc-500 dark:text-zinc-400"
          style={{ width: 0, marginRight: 0, opacity: 0, transition: 'opacity 80ms' }}
        >
          <Icon name="magnet" size={11} />
        </span>
        <span ref={labelRef}>0s</span>
      </div>
    </div>
  );
}
