import { describe, it, expect } from 'vitest';
import {
  MIN_PX_PER_SEC,
  MAX_PX_PER_SEC,
  clampPxPerSec,
  clampScrollSec,
  timeToX,
  xToTime,
  zoomAtCursor,
  fitViewport,
} from '../src/timeline/coords';

describe('clampPxPerSec', () => {
  it('clamps to [MIN, MAX]', () => {
    expect(clampPxPerSec(0.5)).toBe(MIN_PX_PER_SEC);
    expect(clampPxPerSec(10000)).toBe(MAX_PX_PER_SEC);
    expect(clampPxPerSec(36)).toBe(36);
  });

  it('falls back to MIN on non-finite / non-positive', () => {
    expect(clampPxPerSec(NaN)).toBe(MIN_PX_PER_SEC);
    expect(clampPxPerSec(-10)).toBe(MIN_PX_PER_SEC);
    expect(clampPxPerSec(0)).toBe(MIN_PX_PER_SEC);
  });
});

describe('clampScrollSec', () => {
  it('clamps to [0, duration - visibleSpan]', () => {
    // 30s duration, 36 px/s, 1440px wide → visibleSpan = 40s → maxScroll = max(0, -10) = 0
    expect(clampScrollSec(5, 30, 36, 1440)).toBe(0);
    // 30s duration, 72 px/s, 1440px wide → visibleSpan = 20s → maxScroll = 10
    expect(clampScrollSec(-5, 30, 72, 1440)).toBe(0);
    expect(clampScrollSec(5, 30, 72, 1440)).toBe(5);
    expect(clampScrollSec(15, 30, 72, 1440)).toBe(10);
  });
});

describe('timeToX / xToTime are inverses', () => {
  const v = { pxPerSecond: 36, scrollSec: 5 };
  it('roundtrips', () => {
    for (const t of [0, 5, 7.4, 15, 30]) {
      const x = timeToX(t, v);
      expect(xToTime(x, v)).toBeCloseTo(t, 6);
    }
  });

  it('x=0 corresponds to scrollSec', () => {
    expect(xToTime(0, v)).toBe(5);
  });
});

describe('zoomAtCursor', () => {
  const base = {
    pxPerSecond: 36,
    scrollSec: 0,
    containerWidth: 1440,
    duration: 600,
  };

  it('keeps cursor time fixed under zoom', () => {
    const cursorX = 500;
    const cursorT = xToTime(cursorX, base);
    const next = zoomAtCursor(base, 2, cursorX);
    const postT = xToTime(cursorX, next);
    expect(postT).toBeCloseTo(cursorT, 6);
  });

  it('scales pxPerSecond by factor within clamp', () => {
    expect(zoomAtCursor(base, 2, 0).pxPerSecond).toBe(72);
    expect(zoomAtCursor(base, 0.5, 0).pxPerSecond).toBe(18);
    expect(zoomAtCursor(base, 100, 0).pxPerSecond).toBe(MAX_PX_PER_SEC);
    expect(zoomAtCursor(base, 0.001, 0).pxPerSecond).toBe(MIN_PX_PER_SEC);
  });

  it('clamps scrollSec inside valid range', () => {
    // Zooming in at cursor near the far right would push scrollSec huge;
    // clamp keeps the viewport inside [0, duration].
    const next = zoomAtCursor(base, 100, 0);
    expect(next.scrollSec).toBeGreaterThanOrEqual(0);
  });
});

describe('fitViewport', () => {
  it('fits duration into containerWidth', () => {
    expect(fitViewport(30, 1440)).toEqual({
      pxPerSecond: 48,
      scrollSec: 0,
    });
  });

  it('returns MIN_PX_PER_SEC when container not measured', () => {
    expect(fitViewport(30, 0)).toEqual({
      pxPerSecond: MIN_PX_PER_SEC,
      scrollSec: 0,
    });
  });

  it('clamps to MAX_PX_PER_SEC for very short durations', () => {
    const out = fitViewport(0.1, 1440);
    expect(out.pxPerSecond).toBe(MAX_PX_PER_SEC);
  });
});
