/**
 * Pure time↔pixel conversion utilities.
 *
 * Extracted so ruler, playhead, every lane, and every interaction handler
 * share a single formula. Drift between any two producers is the classic
 * timeline-editor bug; this module prevents it.
 */

export interface ViewportCoords {
  /** Current zoom level. */
  pxPerSecond: number;
  /** Time (seconds) at x=0 in the lane area. */
  scrollSec: number;
  /** Measured lane-area pixel width. */
  containerWidth: number;
  /** Canonical doc duration (seconds). */
  duration: number;
}

export const MIN_PX_PER_SEC = 4;
export const MAX_PX_PER_SEC = 400;

export function clampPxPerSec(v: number): number {
  if (!Number.isFinite(v) || v <= 0) return MIN_PX_PER_SEC;
  return Math.max(MIN_PX_PER_SEC, Math.min(MAX_PX_PER_SEC, v));
}

/**
 * Clamp scrollSec so the viewport stays inside [0, duration]. If the viewport
 * is wider than the doc (zoomed way out), scrollSec is pinned to 0.
 */
export function clampScrollSec(
  s: number,
  duration: number,
  pxPerSec: number,
  containerWidth: number,
): number {
  const visibleSpan = pxPerSec > 0 ? containerWidth / pxPerSec : 0;
  const maxScroll = Math.max(0, duration - visibleSpan);
  return Math.max(0, Math.min(maxScroll, s));
}

export function timeToX(
  t: number,
  v: { pxPerSecond: number; scrollSec: number },
): number {
  return (t - v.scrollSec) * v.pxPerSecond;
}

export function xToTime(
  x: number,
  v: { pxPerSecond: number; scrollSec: number },
): number {
  return x / v.pxPerSecond + v.scrollSec;
}

/**
 * Zoom by `factor` while keeping `cursorX` pinned to the same time.
 * factor > 1 zooms in, factor < 1 zooms out.
 */
export function zoomAtCursor(
  v: ViewportCoords,
  factor: number,
  cursorX: number,
): { pxPerSecond: number; scrollSec: number } {
  const cursorT = xToTime(cursorX, v);
  const newPxPerSec = clampPxPerSec(v.pxPerSecond * factor);
  const newScrollSec = cursorT - cursorX / newPxPerSec;
  return {
    pxPerSecond: newPxPerSec,
    scrollSec: clampScrollSec(newScrollSec, v.duration, newPxPerSec, v.containerWidth),
  };
}

/**
 * Fit the full duration into the lane area. If container not yet measured,
 * returns MIN_PX_PER_SEC as a safe default.
 */
export function fitViewport(
  duration: number,
  containerWidth: number,
): { pxPerSecond: number; scrollSec: number } {
  if (duration <= 0 || containerWidth <= 0) {
    return { pxPerSecond: MIN_PX_PER_SEC, scrollSec: 0 };
  }
  return {
    pxPerSecond: clampPxPerSec(containerWidth / duration),
    scrollSec: 0,
  };
}
