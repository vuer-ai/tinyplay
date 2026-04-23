import { useCallback, useEffect, useRef, useState } from 'react';
import type { Playlist } from '../../core/playlist';
import type { TimelineClock } from '../../core/timeline';
import { useSegment } from './use-segment';
import { useClockContext } from '../clock-context';

export interface MergedEntriesState<T> {
  /** Flat list of decoded entries across all contiguously-loaded segments. */
  entries: T[];
  /** Set of loaded segment indices (may include non-contiguous cached segments). */
  loadedSegments: Set<number>;
  /** Contiguous range that was flattened [startIdx, endIdx] inclusive, or null. */
  mergedRange: [number, number] | null;
  loading: boolean;
}

export interface MergedEntriesOptions<T> {
  /**
   * Decode a segment payload into a flat list of entries. Default assumes the
   * decoded payload is already `T[]` — the typical shape when the decoder is
   * `jsonlDecoder` and each line is one entry.
   */
  decode?: (decoded: unknown) => T[];
}

function defaultDecode<T>(decoded: unknown): T[] {
  return Array.isArray(decoded) ? (decoded as T[]) : [];
}

/**
 * Find the longest contiguous chain of loaded segments containing `centerIdx`
 * and flatten their entries in segment order.
 *
 * Exported as a pure helper so the merge semantics are unit-testable without
 * setting up a React + Playlist fixture.
 */
export function mergeContiguousEntries<T>(
  raw: Map<number, T[]>,
  centerIdx: number,
): { entries: T[]; range: [number, number] | null } {
  if (!raw.has(centerIdx)) return { entries: [], range: null };
  let lo = centerIdx;
  let hi = centerIdx;
  while (lo > 0 && raw.has(lo - 1)) lo--;
  while (raw.has(hi + 1)) hi++;
  const entries: T[] = [];
  for (let i = lo; i <= hi; i++) {
    const segEntries = raw.get(i);
    if (segEntries) entries.push(...segEntries);
  }
  return { entries, range: [lo, hi] };
}

/**
 * Discrete counterpart to `useMergedTrack`. Loads the current segment plus a
 * window of neighbors around the playhead (via `engine.getDataAtTime`),
 * decodes each into an entry array, and flattens all contiguous loaded
 * segments into a single `T[]` suitable for `PillLane` / `MarkerLane` /
 * `RibbonLane`-style rendering.
 *
 * Playhead-centric: zoom / pan never triggers loading. Regions outside the
 * contiguous chain are simply absent from `entries` — lanes can render a
 * hatch over those time ranges from `loadedSegments`.
 *
 * Gap safety: non-contiguous cached segments stay in `loadedSegments` but do
 * not contribute to `entries` until the gap fills. Playback will fill gaps
 * as the playhead advances; seek clears the cache (matches `useMergedTrack`).
 */
export function useMergedEntries<T>(
  engine: Playlist | null,
  clock?: TimelineClock | null,
  options?: MergedEntriesOptions<T>,
): MergedEntriesState<T> {
  const resolvedClock = useClockContext(clock);
  const rawRef = useRef(new Map<number, T[]>());

  const decodeRef = useRef<(d: unknown) => T[]>(options?.decode ?? defaultDecode);
  decodeRef.current = options?.decode ?? defaultDecode;

  const [state, setState] = useState<MergedEntriesState<T>>({
    entries: [],
    loadedSegments: new Set(),
    mergedRange: null,
    loading: false,
  });

  // Follow the current segment for boundary detection. The decoded data from
  // useSegment is ignored — we re-fetch via engine.getDataAtTime (cache hit)
  // so the window loader stays the single decoder call site per segment.
  const { segment } = useSegment<unknown>(engine, resolvedClock);

  const rebuild = useCallback((centerIdx: number) => {
    const raw = rawRef.current;
    const { entries, range } = mergeContiguousEntries(raw, centerIdx);
    setState({
      entries,
      loadedSegments: new Set(raw.keys()),
      mergedRange: range,
      loading: false,
    });
  }, []);

  useEffect(() => {
    if (!engine || !segment) return;
    const playlist = engine.getPlaylist();
    if (!playlist || playlist.segments.length === 0) return;

    const centerIdx = segment.index;
    const windowSize = engine.options.prefetchCount ?? 2;
    let cancelled = false;

    const loadWindow = async () => {
      const indices: number[] = [];
      for (let offset = -windowSize; offset <= windowSize; offset++) {
        const i = centerIdx + offset;
        if (i < 0 || i >= playlist.segments.length) continue;
        if (rawRef.current.has(i)) continue;
        indices.push(i);
      }

      if (indices.length === 0) {
        rebuild(centerIdx);
        return;
      }

      setState((prev) => ({ ...prev, loading: true }));

      await Promise.all(
        indices.map(async (i) => {
          try {
            const seg = playlist.segments[i];
            const result = await engine.getDataAtTime(seg.startTime);
            if (cancelled || !result) return;
            const entries = decodeRef.current(result.decoded);
            rawRef.current.set(result.segment.index, entries);
          } catch {
            // Errors surfaced via engine events; skip this segment.
          }
        }),
      );

      if (!cancelled) rebuild(centerIdx);
    };

    loadWindow();
    return () => {
      cancelled = true;
    };
  }, [engine, segment?.index, rebuild]);

  // Seek resets the loaded window — drop cache so the next effect rebuilds
  // fresh around the new position. Matches useMergedTrack's gap safety.
  useEffect(() => {
    const unsub = resolvedClock.on('seek', () => {
      rawRef.current.clear();
    });
    return unsub;
  }, [resolvedClock]);

  return state;
}
