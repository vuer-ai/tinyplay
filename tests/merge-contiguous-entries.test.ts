import { describe, it, expect } from 'vitest';
import { mergeContiguousEntries } from '../src/react/hooks/use-merged-entries';

type E = { ts: number; label: string };

describe('mergeContiguousEntries', () => {
  it('returns empty + null range when center not loaded', () => {
    const raw = new Map<number, E[]>([[0, [{ ts: 0, label: 'a' }]]]);
    const { entries, range } = mergeContiguousEntries(raw, 5);
    expect(entries).toEqual([]);
    expect(range).toBeNull();
  });

  it('returns a single segment when it is isolated', () => {
    const raw = new Map<number, E[]>([[3, [{ ts: 30, label: 'a' }]]]);
    const { entries, range } = mergeContiguousEntries(raw, 3);
    expect(entries).toEqual([{ ts: 30, label: 'a' }]);
    expect(range).toEqual([3, 3]);
  });

  it('flattens contiguous range around center in segment order', () => {
    const raw = new Map<number, E[]>([
      [
        0,
        [
          { ts: 0, label: 'a0' },
          { ts: 5, label: 'a1' },
        ],
      ],
      [1, [{ ts: 10, label: 'b0' }]],
      [
        2,
        [
          { ts: 20, label: 'c0' },
          { ts: 25, label: 'c1' },
        ],
      ],
    ]);
    const { entries, range } = mergeContiguousEntries(raw, 1);
    expect(entries.map((e) => e.label)).toEqual(['a0', 'a1', 'b0', 'c0', 'c1']);
    expect(range).toEqual([0, 2]);
  });

  it('stops at a gap (non-contiguous cache)', () => {
    const raw = new Map<number, E[]>([
      [0, [{ ts: 0, label: 'zero' }]],
      [2, [{ ts: 20, label: 'two' }]],
      [4, [{ ts: 40, label: 'four' }]],
    ]);
    // Center at 2 → contiguous chain is just [2, 2] since 1 and 3 are missing.
    const { entries, range } = mergeContiguousEntries(raw, 2);
    expect(entries).toEqual([{ ts: 20, label: 'two' }]);
    expect(range).toEqual([2, 2]);
  });

  it('extends left and right until a gap', () => {
    const raw = new Map<number, E[]>([
      [2, [{ ts: 20, label: 'two' }]],
      [3, [{ ts: 30, label: 'three' }]],
      [4, [{ ts: 40, label: 'four' }]],
      [7, [{ ts: 70, label: 'seven' }]],
    ]);
    const { entries, range } = mergeContiguousEntries(raw, 3);
    expect(entries.map((e) => e.label)).toEqual(['two', 'three', 'four']);
    expect(range).toEqual([2, 4]);
  });

  it('handles empty entry arrays within a contiguous range', () => {
    const raw = new Map<number, E[]>([
      [0, [{ ts: 0, label: 'a' }]],
      [1, []],
      [2, [{ ts: 20, label: 'c' }]],
    ]);
    const { entries, range } = mergeContiguousEntries(raw, 1);
    expect(entries.map((e) => e.label)).toEqual(['a', 'c']);
    expect(range).toEqual([0, 2]);
  });
});
