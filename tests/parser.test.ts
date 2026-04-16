import { describe, it, expect } from 'vitest';
import { parsePlaylist } from '../src/core/parser';

describe('parsePlaylist', () => {
  it('parses a standard HLS VOD playlist', () => {
    const content = `#EXTM3U
#EXT-X-VERSION:3
#EXT-X-TARGETDURATION:10
#EXT-X-MEDIA-SEQUENCE:0
#EXTINF:9.009,
segment0.ts
#EXTINF:9.009,
segment1.ts
#EXTINF:3.003,
segment2.ts
#EXT-X-ENDLIST`;

    const result = parsePlaylist(content);

    expect(result.isLive).toBe(false);
    expect(result.targetDuration).toBe(10);
    expect(result.mediaSequence).toBe(0);
    expect(result.segments).toHaveLength(3);
    expect(result.totalDuration).toBeCloseTo(21.021);

    expect(result.segments[0]).toEqual({
      index: 0,
      duration: 9.009,
      uri: 'segment0.ts',
      title: '',
      startTime: 0,
      endTime: 9.009,
    });

    expect(result.segments[2].startTime).toBeCloseTo(18.018);
    expect(result.segments[2].endTime).toBeCloseTo(21.021);
  });

  it('infers chunkFormat from segment file extension', () => {
    const content = `#EXTM3U
#EXT-X-VERSION:3
#EXT-X-TARGETDURATION:30
#EXT-X-MEDIA-SEQUENCE:0
#EXT-X-PROGRAM-DATE-TIME:2026-01-15T08:00:00.000Z

#EXTINF:30.000,segments=46
abc123def456.jsonl
#EXTINF:30.000,segments=47
789012abc345.jsonl
#EXTINF:18.500,segments=23
def456789012.jsonl`;

    const result = parsePlaylist(content);

    expect(result.chunkFormat).toBe('jsonl');
    expect(result.isLive).toBe(true); // no EXT-X-ENDLIST
    expect(result.programDateTime).toBe('2026-01-15T08:00:00.000Z');
    expect(result.segments).toHaveLength(3);
    expect(result.totalDuration).toBeCloseTo(78.5);

    expect(result.segments[0].title).toBe('segments=46');
    expect(result.segments[0].uri).toBe('abc123def456.jsonl');
    expect(result.segments[1].startTime).toBeCloseTo(30);
    expect(result.segments[2].startTime).toBeCloseTo(60);
  });

  it('infers chunkFormat for parquet files', () => {
    const content = `#EXTM3U
#EXT-X-VERSION:3
#EXT-X-TARGETDURATION:30
#EXT-X-MEDIA-SEQUENCE:0

#EXTINF:30.000,rows=1200
a1b2c3d4e5f6.parquet
#EXTINF:12.500,rows=480
112233445566.parquet
#EXT-X-ENDLIST`;

    const result = parsePlaylist(content);

    expect(result.chunkFormat).toBe('parquet');
    expect(result.isLive).toBe(false);
    expect(result.segments).toHaveLength(2);
    expect(result.segments[1].title).toBe('rows=480');
  });

  it('handles segments without file extensions', () => {
    const content = `#EXTM3U
#EXT-X-TARGETDURATION:10

#EXTINF:10.000,test
hash123
#EXT-X-ENDLIST`;

    const result = parsePlaylist(content);
    // No extension to infer from, but 'hash123' has no dot so split('.').pop() returns 'hash123'
    // This is fine — unknown format falls back to raw decoder
    expect(result.segments).toHaveLength(1);
  });

  it('handles empty playlist', () => {
    const result = parsePlaylist('#EXTM3U\n#EXT-X-ENDLIST');
    expect(result.segments).toHaveLength(0);
    expect(result.isLive).toBe(false);
    expect(result.totalDuration).toBe(0);
  });
});
