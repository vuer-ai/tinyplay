import { describe, it, expect } from 'vitest';
import {
  assertSrcOrData,
  validateTrackRow,
  validateTimelineConfig,
} from '../src/timeline/validate';
import type { TrackRow, TimelineConfig } from '../src/timeline/types/config';

// Built-in dtypes auto-register via `import '@vuer-ai/vuer-m3u/dtypes'` side
// effect. Importing the validate module (which imports the registry) is
// enough because src/dtypes/index.ts runs the registration loop at load.
import '../src/dtypes';

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
    expect(() => assertSrcOrData({}, 'TrackRow "foo"')).toThrow(
      /TrackRow "foo"/,
    );
  });
});

describe('validateTrackRow', () => {
  const base: TrackRow = {
    id: 'a',
    path: 'cam/wrist',
    dtype: 'video',
    src: '/a.m3u8',
  };

  it('accepts a valid src-based track', () => {
    expect(() => validateTrackRow(base)).not.toThrow();
  });

  it('accepts a valid data-based track', () => {
    expect(() =>
      validateTrackRow({
        id: 'm',
        path: 'events',
        dtype: 'marker_event',
        data: [{ ts: 0 }],
      }),
    ).not.toThrow();
  });

  it('rejects missing id', () => {
    expect(() =>
      validateTrackRow({ ...base, id: '' } as TrackRow),
    ).toThrow(/requires a non-empty `id`/);
  });

  it('rejects missing path', () => {
    expect(() =>
      validateTrackRow({ ...base, path: '' } as unknown as TrackRow),
    ).toThrow(/`path` must be a non-empty string/);
  });

  it('rejects path with leading slash', () => {
    expect(() => validateTrackRow({ ...base, path: '/a/b' })).toThrow(
      /must not start or end with '\/'/,
    );
  });

  it('rejects path with empty segment', () => {
    expect(() => validateTrackRow({ ...base, path: 'a//b' })).toThrow(
      /must not start or end with '\/' and must not contain empty segments/,
    );
  });

  it('rejects missing dtype', () => {
    expect(() =>
      validateTrackRow({ ...base, dtype: '' } as TrackRow),
    ).toThrow(/missing `dtype`/);
  });

  it('rejects unknown dtype', () => {
    expect(() =>
      validateTrackRow({ ...base, dtype: 'totally_fake' }),
    ).toThrow(/dtype "totally_fake" is not registered/);
  });

  it('rejects both src and data', () => {
    expect(() =>
      validateTrackRow({ ...base, data: [] }),
    ).toThrow(/not both/);
  });
});

describe('validateTimelineConfig', () => {
  const mk = (tracks: TrackRow[]): TimelineConfig => ({
    container: { id: 'ep', duration: 30 },
    tracks,
  });

  it('accepts a well-formed timeline', () => {
    expect(() =>
      validateTimelineConfig(
        mk([
          { id: 'a', path: 'cam/wrist', dtype: 'video', src: '/a.m3u8' },
          { id: 'b', path: 'events', dtype: 'marker_event', data: [{ ts: 0 }] },
        ]),
      ),
    ).not.toThrow();
  });

  it('rejects duplicate track ids', () => {
    expect(() =>
      validateTimelineConfig(
        mk([
          { id: 'a', path: 'cam/wrist', dtype: 'video', src: '/a.m3u8' },
          { id: 'a', path: 'cam/scene', dtype: 'video', src: '/b.m3u8' },
        ]),
      ),
    ).toThrow(/Duplicate track id "a"/);
  });

  it('rejects duplicate paths', () => {
    expect(() =>
      validateTimelineConfig(
        mk([
          { id: 'a', path: 'cam/wrist', dtype: 'video', src: '/a.m3u8' },
          { id: 'b', path: 'cam/wrist', dtype: 'video', src: '/b.m3u8' },
        ]),
      ),
    ).toThrow(/Duplicate track path "cam\/wrist"/);
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
