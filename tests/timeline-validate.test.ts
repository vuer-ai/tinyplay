import { describe, it, expect } from 'vitest';
import {
  assertSrcOrData,
  validateTrackConfig,
  validateTimelineConfig,
} from '../src/timeline/validate';
import type { TrackConfig, TimelineConfig } from '../src/timeline/types/config';

describe('assertSrcOrData', () => {
  it('accepts src alone', () => {
    expect(() => assertSrcOrData({ src: '/a.m3u8' }, 'ctx')).not.toThrow();
  });

  it('accepts data alone (even when empty)', () => {
    expect(() => assertSrcOrData({ data: [] }, 'ctx')).not.toThrow();
  });

  it('rejects both src and data', () => {
    expect(() =>
      assertSrcOrData({ src: '/a.m3u8', data: [1] }, 'ctx'),
    ).toThrow(/either `src` or `data`, not both/);
  });

  it('rejects neither src nor data', () => {
    expect(() => assertSrcOrData({}, 'ctx')).toThrow(
      /must provide either `src`.*or `data`/,
    );
  });

  it('includes context in error message', () => {
    expect(() => assertSrcOrData({}, 'TrackConfig "foo"')).toThrow(
      /TrackConfig "foo"/,
    );
  });
});

describe('validateTrackConfig', () => {
  const base: TrackConfig = { id: 'a', view: 'VideoLane', src: '/a.m3u8' };

  it('accepts a valid src-based track', () => {
    expect(() => validateTrackConfig(base)).not.toThrow();
  });

  it('accepts a valid data-based track', () => {
    expect(() =>
      validateTrackConfig({ id: 'a', view: 'MarkerLane', data: [{ ts: 0 }] }),
    ).not.toThrow();
  });

  it('rejects missing id', () => {
    expect(() =>
      validateTrackConfig({ ...base, id: '' } as TrackConfig),
    ).toThrow(/requires a non-empty `id`/);
  });

  it('rejects missing view', () => {
    expect(() =>
      validateTrackConfig({ ...base, view: '' } as TrackConfig),
    ).toThrow(/missing `view`/);
  });

  it('rejects both src and data', () => {
    expect(() =>
      validateTrackConfig({ ...base, data: [] }),
    ).toThrow(/not both/);
  });
});

describe('validateTimelineConfig', () => {
  const mk = (tracks: TrackConfig[]): TimelineConfig => ({
    container: { id: 'ep', duration: 30 },
    tracks,
  });

  it('accepts a well-formed timeline', () => {
    expect(() =>
      validateTimelineConfig(
        mk([
          { id: 'a', view: 'VideoLane', src: '/a.m3u8' },
          { id: 'b', view: 'MarkerLane', data: [{ ts: 0 }] },
        ]),
      ),
    ).not.toThrow();
  });

  it('rejects duplicate track ids', () => {
    expect(() =>
      validateTimelineConfig(
        mk([
          { id: 'a', view: 'VideoLane', src: '/a.m3u8' },
          { id: 'a', view: 'MarkerLane', data: [] },
        ]),
      ),
    ).toThrow(/Duplicate track id "a"/);
  });

  it('rejects non-positive duration', () => {
    expect(() =>
      validateTimelineConfig({
        container: { id: 'ep', duration: 0 },
        tracks: [],
      }),
    ).toThrow(/`duration` must be a positive number/);
  });

  it('rejects empty container id', () => {
    expect(() =>
      validateTimelineConfig({
        container: { id: '', duration: 30 },
        tracks: [],
      }),
    ).toThrow(/container requires a non-empty `id`/);
  });
});
