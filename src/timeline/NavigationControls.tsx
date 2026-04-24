import { useCallback } from 'react';
import { Icon } from './Icon';
import { formatDuration } from './duration';
import { useTimelineViewport } from './viewport';

export interface NavigationControlsProps {
  /** Pan step as a fraction of viewDuration (defaults to 0.1 = 10%). */
  panStep?: number;
}

/**
 * Bottom-center navigation capsule: ◀  duration-drag-handle  ▶.
 *
 *   - Arrows pan viewport ± `panStep * viewDuration` in seconds.
 *   - Middle label shows the current viewport duration; drag it
 *     horizontally to zoom (drag right = zoom out, drag left = zoom in),
 *     keeping the viewport centered on its current midpoint.
 *
 * Ports the NavigationControls visual from vuer-uikit's waterfall, wired
 * to our `useTimelineViewport` instead of explicit props.
 */
export function NavigationControls({ panStep = 0.1 }: NavigationControlsProps) {
  const v = useTimelineViewport();
  const viewDuration = v.containerWidth / Math.max(1e-6, v.pxPerSecond);

  const panBy = useCallback(
    (direction: 'left' | 'right') => {
      const amount = viewDuration * panStep;
      v.setScrollSec(v.scrollSec + (direction === 'left' ? -amount : amount));
    },
    [v, viewDuration, panStep],
  );

  const onZoomDrag = useCallback(
    (e: React.PointerEvent) => {
      e.preventDefault();
      e.stopPropagation();
      const startX = e.clientX;
      const startPxPerSec = v.pxPerSecond;
      const centerT = v.scrollSec + viewDuration / 2;
      const onMove = (ev: PointerEvent) => {
        const deltaX = ev.clientX - startX;
        // Drag right → zoom out (smaller pxPerSec); drag left → zoom in.
        const factor = Math.pow(1.1, -deltaX * 0.05);
        const nextPx = startPxPerSec * factor;
        v.setPxPerSecond(nextPx);
        // Keep the center time fixed under the zoom.
        const nextDur = v.containerWidth / Math.max(1e-6, nextPx);
        v.setScrollSec(centerT - nextDur / 2);
      };
      const onUp = () => {
        window.removeEventListener('pointermove', onMove);
        window.removeEventListener('pointerup', onUp);
        document.body.style.cursor = '';
      };
      document.body.style.cursor = 'col-resize';
      window.addEventListener('pointermove', onMove);
      window.addEventListener('pointerup', onUp);
    },
    [v, viewDuration],
  );

  return (
    <div className="pointer-events-none absolute bottom-3 left-0 right-0 z-30 flex justify-center">
      <div className="pointer-events-auto flex items-center gap-1 rounded-full p-1 text-xs font-mono tabular-nums backdrop-blur-[5px] border border-white/60 dark:border-zinc-700/50 shadow-[0_4px_16px_0_rgba(0,0,0,0.12)] dark:shadow-[0_4px_16px_0_rgba(0,0,0,0.4)] bg-[linear-gradient(147.1deg,rgba(246,246,246,0.72)_0%,rgba(232,232,232,0.68)_100%)] dark:bg-[linear-gradient(147.1deg,rgba(50,50,50,0.72)_0%,rgba(70,70,70,0.68)_100%)]">
        <button
          type="button"
          onClick={() => panBy('left')}
          className="p-1 rounded-full hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300 cursor-pointer"
          aria-label="pan left"
        >
          <Icon name="chevron-right" size={14} className="rotate-180" />
        </button>
        <span
          onPointerDown={onZoomDrag}
          className="w-24 cursor-col-resize rounded px-2 py-1 text-center hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-800 dark:text-zinc-100 select-none"
          title="drag to zoom"
        >
          {formatDuration(viewDuration)}
        </span>
        <button
          type="button"
          onClick={() => panBy('right')}
          className="p-1 rounded-full hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300 cursor-pointer"
          aria-label="pan right"
        >
          <Icon name="chevron-right" size={14} />
        </button>
      </div>
    </div>
  );
}
