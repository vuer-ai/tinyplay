# Project: @vuer-ai/vuer-m3u

Generalized m3u8 playlist engine for any time-segmented data (JSONL, VTT, binary, video).

## Package Manager

**Always use `pnpm`**, not npm or yarn.

```bash
pnpm install      # install dependencies
pnpm dev          # demo dev server
pnpm test         # vitest
pnpm typecheck    # tsc --noEmit
pnpm build        # library build (vite + tsc declarations)
```

## Project Structure

```
src/core/           Framework-agnostic engine (no React dependency)
  timeline.ts       TimelineClock — pure time source (tick/seek events)
  parser.ts         m3u8 text → ParsedPlaylist
  segment-resolver  time → segment (binary search)
  segment-loader    fetch + LRU cache + request dedup
  playlist          orchestrator: parse + load + prefetch + live poll
  find-bracket      O(1) keyframe lookup for interpolation
  decoders/         pluggable: jsonl, text, raw + registerDecoder()

src/react/          React integration layer
  hooks/
    use-timeline    clock lifecycle + discrete state (playing/rate/loop/duration)
    use-clock-value throttled clock.time at N fps
    use-playlist         playlist lifecycle + auto duration sync
    use-segment     discrete data — one segment at a time (JSONL, VTT)
    use-track-reducer  continuous data — merged Float32Arrays for interpolation
  players/
    VideoPlayer     hls.js (does NOT use Playlist — hls.js handles its own m3u8)
    JsonlView       JSONL event list viewer
    SubtitleView    VTT cue display
    CanvasTrackView Canvas chart + 2D path animation
  TimelineController  scrubber + play/pause + rate + loop

demo/               Demo app with mock data (served via Vite publicDir)
docs/               DESIGN.md, EXAMPLES.md, ARCHITECTURE.md
tests/              vitest tests
```

## Key Design Decisions

- **TimelineClock** is a pure time source. It does NOT know about playlists or segments. It emits `tick` (~60fps) and `seek` (user actions). Nothing else.
- **Segment boundary tracking** is per-hook (useSegment/useTrackReducer), NOT on the clock. Each hook uses `useClockValue(clock, 10)` + `resolveSegment()` locally. This allows multiple playlists with different segment boundaries on the same clock.
- **Prefetch** is automatic in `Playlist.getDataAtTime()` — when segment N loads, N+1..N+prefetchCount are fetched in background. No clock attachment needed.
- **Duration auto-detection** — `usePlaylist(options, clock)` calls `clock.extendDuration()` on init and live updates. `extendDuration` only grows, never shrinks.
- **VideoPlayer** uses hls.js directly (not Playlist) because hls.js is a complete HLS implementation (demux, remux, MSE, ABR). Using both would duplicate m3u8 fetches and our decoders can't decode video. Duration synced via `<video>.durationchange`.
- **useTimeline state** does NOT include `currentTime`. Consumers use `useClockValue(clock, fps)` at the frequency they need. This keeps `useTimeline` re-renders to seek events only.
- **useSegment** = discrete data (JSONL events, VTT cues). One segment at a time.
- **useTrackReducer** = continuous data (position, sensor). Merges contiguous segments into Float32Arrays for interpolation via `findBracket`.

## Common Patterns

### Adding a new view component

1. Use `usePlaylist(options, clock)` to create an engine
2. Choose `useSegment` (discrete) or `useTrackReducer` (continuous)
3. Use `useClockValue(clock, fps)` for time-dependent rendering
4. For high-fps rendering, subscribe to `clock.on('tick')` imperatively (Canvas)

### Adding a new decoder

```typescript
// Global (by chunkFormat name)
registerDecoder('csv', (raw) => parseCsv(new TextDecoder().decode(raw)));

// Per-engine (any format)
new Playlist({ url, decoder: (raw) => myDecode(raw) });
```

### Testing

Tests use vitest with `environment: 'node'`. Core logic (parser, resolver, find-bracket) is testable without DOM.

```bash
pnpm test         # run once
pnpm test:watch   # watch mode
```
