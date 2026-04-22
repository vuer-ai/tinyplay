# Project: @vuer-ai/vuer-m3u

Generalized m3u8 playlist engine for any time-segmented data (JSONL, VTT, binary, video).

## Package Manager

**Always use `pnpm`**, not npm or yarn. The repo is a pnpm workspace with two packages: the library at `.` and the demo app at `demo/`.

```bash
pnpm install      # install dependencies for both workspaces
pnpm dev          # proxies to demo workspace (pnpm --filter vuer-m3u-demo dev)
pnpm test         # vitest (library)
pnpm typecheck    # tsc --noEmit (library only)
pnpm build        # library build (vite lib + tsc declarations)
```

From the `demo/` directory you can also run `pnpm dev`, `pnpm build`, `pnpm preview`, `pnpm typecheck` directly.

## Workspace Layout

- **`.` — `@vuer-ai/vuer-m3u`**: the publishable library. Only `src/` + `tests/` are in scope. `vite.config.ts` builds the lib to `dist/`. `tsconfig.json` covers `src` + `tests`. No demo concerns in root config.
- **`demo/` — `vuer-m3u-demo`** (private): standalone Vite app that consumes `@vuer-ai/vuer-m3u` via `workspace:*`. Its `vite.config.ts` uses a resolve alias to read `../src/index.ts` directly so editing library source hot-reloads the demo. `demo/mock-data/` is the Vite `publicDir` and is served at `/annotations/*`, `/video/*`, etc.

The library's `package.json` also exposes `./styles.css` in `exports`, so the demo (and downstream consumers) import the stylesheet as `@vuer-ai/vuer-m3u/styles.css`. No file in `src/` is imported via relative path from `demo/`.

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
    VideoPlayer      hls.js (does NOT use Playlist — hls.js handles its own m3u8)
    SubtitleView     VTT cue display
    ActionLabelView  discrete action / phase annotations ({ts, te, label})
    ImuView          6-axis IMU readout (accel + gyro)
    JointAngleView   N-DoF joint angle display
    PoseView         6-DoF pose (position + quaternion, slerp-aware)
  TimelineController scrubber + play/pause + rate + loop
  clock-context      ClockProvider + useClockContext — let views/hooks pick up
                     the clock from React context instead of an explicit prop

demo/               Separate workspace package (vuer-m3u-demo, private)
                    — its own package.json / vite.config.ts / tsconfig.json
                    — consumes @vuer-ai/vuer-m3u via workspace:*
                    — mock-data/ served as Vite publicDir
tests/              vitest tests (library)
```

## Key Design Decisions

- **TimelineClock** is a pure time source. It does NOT know about playlists or segments. It emits `tick` (~60fps) and `seek` (user actions). Nothing else.
- **Segment boundary tracking** is per-hook (useSegment/useSegmentTrack/useMergedTrack), NOT on the clock. Each hook uses `useClockValue(10)` + `resolveSegment()` locally. This allows multiple playlists with different segment boundaries on the same clock.
- **Clock resolution** is uniform across hooks and views. Every consumer accepts an optional `clock` prop and internally calls `useClockContext(clock)`. Priority: explicit arg → `<ClockProvider>` context → throw. This lets app code wrap the tree once in `<ClockProvider clock={clock}>` and skip threading the clock through every view, while still supporting explicit overrides (e.g. a second preview clock).
- **Prefetch** is automatic in `Playlist.getDataAtTime()` — when segment N loads, N+1..N+prefetchCount are fetched in background. No clock attachment needed.
- **Duration auto-detection** — `usePlaylist(options, clock)` calls `clock.extendDuration()` on init and live updates. `extendDuration` only grows, never shrinks.
- **VideoPlayer** uses hls.js directly (not Playlist) because hls.js is a complete HLS implementation (demux, remux, MSE, ABR). Using both would duplicate m3u8 fetches and our decoders can't decode video. Duration synced via `<video>.durationchange`.
- **useTimeline state** does NOT include `currentTime`. Consumers use `useClockValue(fps)` at the frequency they need. This keeps `useTimeline` re-renders to seek events only.
- **useSegment** = discrete data (JSONL events, VTT cues). One segment at a time.
- **useSegmentTrack** = current segment only, normalized into columnar tracks (no merge).
- **useMergedTrack** = current + contiguous neighbors, merged into Float32Arrays for cross-boundary interpolation via `findBracket`.

## Common Patterns

### Adding a new view component

1. Declare the view's props with `clock?: TimelineClock | null`. Call `const resolvedClock = useClockContext(clock)` at the top.
2. Use `usePlaylist(options, resolvedClock)` to create an engine.
3. Choose `useSegment` (discrete), `useSegmentTrack` (one segment, columnar), or `useMergedTrack` (cross-boundary, columnar). Pair with `useTrackSample` for interpolated queries, using `slerpQuat` for quaternions.
4. Use `useClockValue(fps, resolvedClock)` for React-driven rendering, or subscribe to `resolvedClock.on('tick')` imperatively for 60fps Canvas.
5. Document the JSONL schema (line shape + field table) in the file's top JSDoc and in `doc-site-dreamlake/pages/vuer-m3u/views/<name>/+Page.mdx`.

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

## Documentation

All documentation lives in the **doc-site-dreamlake** repo (`pages/vuer-m3u/`), not in this repo. When modifying any code in this package, always update the corresponding documentation in doc-site-dreamlake.
