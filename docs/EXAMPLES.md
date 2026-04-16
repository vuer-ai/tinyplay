# Usage Examples

## 1. Minimal

```tsx
import { useTimeline, useClockValue, TimelineController, JsonlView } from '@vuer-ai/vuer-m3u';

function App() {
  const { clock, state, play, pause, seek, setPlaybackRate } = useTimeline();
  return (
    <div>
      <JsonlView playlistUrl="/annotations.m3u8" clock={clock} />
      <TimelineController clock={clock} state={state}
        onPlay={play} onPause={pause} onSeek={seek} onPlaybackRateChange={setPlaybackRate} />
    </div>
  );
}
```

Duration auto-detected from the playlist.

---

## 2. Multi-Track Synchronized Playback

```tsx
import {
  useTimeline, TimelineController,
  VideoPlayer, JsonlView, SubtitleView, CanvasTrackView,
} from '@vuer-ai/vuer-m3u';

function App() {
  const { clock, state, play, pause, seek, setPlaybackRate, setLoop } = useTimeline();
  return (
    <div>
      <VideoPlayer playlistUrl="https://example.com/video.m3u8" clock={clock} />
      <JsonlView playlistUrl="/annotations.m3u8" clock={clock} />
      <CanvasTrackView playlistUrl="/trajectory.m3u8" clock={clock} mode="both" />
      <SubtitleView playlistUrl="/subtitles.m3u8" clock={clock} />
      <TimelineController clock={clock} state={state}
        onPlay={play} onPause={pause} onSeek={seek}
        onPlaybackRateChange={setPlaybackRate} onLoopChange={setLoop} />
    </div>
  );
}
```

Multiple views with different durations → clock auto-extends to max.

---

## 3. Reading currentTime

`useTimeline` state does NOT include `currentTime`. Use `useClockValue` at the fps you need:

```tsx
import { useTimeline, useClockValue } from '@vuer-ai/vuer-m3u';

function MyComponent() {
  const { clock } = useTimeline();
  const time = useClockValue(clock, 10);  // re-renders at ~10fps
  return <div>Time: {time.toFixed(2)}</div>;
}
```

Or read `clock.time` imperatively (no React re-render):
```typescript
clock.on('tick', (e) => {
  console.log(e.time);  // 60fps, no React involvement
});
```

---

## 4. Core API Without React

```typescript
import { Playlist, TimelineClock } from '@vuer-ai/vuer-m3u';

const engine = new Playlist({ url: '/data.m3u8' });
const playlist = await engine.init();

const result = await engine.getDataAtTime(15);
console.log(result?.decoded);

const clock = new TimelineClock();
clock.extendDuration(playlist.totalDuration);
clock.play();

engine.destroy();
clock.destroy();
```

---

## 5. Custom Decoder — Global

```typescript
import { registerDecoder } from '@vuer-ai/vuer-m3u';
import { decode } from '@msgpack/msgpack';

registerDecoder('mpk', (raw) => decode(new Uint8Array(raw)));
```

---

## 6. Custom Decoder — Per-Engine

For binary data without a named format:

```typescript
const engine = new Playlist({
  url: '/data.m3u8',
  decoder: (raw) => {
    const view = new DataView(raw);
    // ... custom binary parsing
    return parsedData;
  },
});
```

---

## 7. Prefetch Configuration

Prefetch is automatic in `getDataAtTime()`. Customize via `usePlaylist`:

```tsx
const { engine } = usePlaylist(
  { url: '/data.m3u8', prefetchCount: 4, cacheSize: 50 },
  clock,
);
```

---

## 8. Live Streaming

```tsx
function LiveDashboard() {
  const { clock, state, play, pause, seek, setPlaybackRate } = useTimeline();

  const { engine, playlist } = usePlaylist(
    { url: '/live/stream.m3u8', pollInterval: 3000 },
    clock,
  );

  const { data } = useSegment(engine, clock);

  return (
    <div>
      {playlist?.isLive && <span>LIVE</span>}
      <pre>{JSON.stringify(data, null, 2)}</pre>
      <TimelineController clock={clock} state={state}
        onPlay={play} onPause={pause} onSeek={seek} onPlaybackRateChange={setPlaybackRate} />
    </div>
  );
}
```

---

## 9. Custom View Component

Pattern: `usePlaylist` + `useSegment` + `useClockValue`.

```tsx
function SensorView({ playlistUrl, clock }: { playlistUrl: string; clock: TimelineClock }) {
  const { engine } = usePlaylist({ url: playlistUrl }, clock);
  const { data } = useSegment<{ start: number; temperature: number }[]>(engine, clock);
  const time = useClockValue(clock, 4);

  if (!data) return <div>Loading...</div>;
  const current = data.reduce((a, b) =>
    Math.abs(b.start - time) < Math.abs(a.start - time) ? b : a
  );
  return <div>{current.temperature.toFixed(1)}C</div>;
}
```

---

## 10. Canvas Track View

60fps canvas animation. Uses `useTrackReducer` for merged continuous data + `findBracket` for O(1) interpolation.

```tsx
<CanvasTrackView
  playlistUrl="/trajectory.m3u8"
  clock={clock}
  mode="both"       // 'chart' | 'path' | 'both'
  chartWindow={8}
/>
```

---

## 11. useTrackReducer — Querying Merged Data

`useTrackReducer` loads and merges segments into contiguous `Float32Array`s. It does NOT interpolate — that's up to the consumer.

```tsx
import { usePlaylist, useTrackReducer, useClockValue, findBracket } from '@vuer-ai/vuer-m3u';

function TrackViewer({ playlistUrl, clock }) {
  const { engine } = usePlaylist({ url: playlistUrl }, clock);
  const { tracks } = useTrackReducer(engine, clock);
  const time = useClockValue(clock, 30);

  const pos = tracks.get('position');
  if (!pos) return <div>Loading...</div>;

  // Query method 1: findBracket + lerp (O(1) smooth interpolation)
  const hint = useRef(0);
  const [idx, alpha] = findBracket(pos.times, time, hint.current);
  hint.current = idx;
  const x = pos.values[idx * pos.stride] + (pos.values[(idx+1) * pos.stride] - pos.values[idx * pos.stride]) * alpha;

  // Query method 2: nearest neighbor
  // const nearest = pos.times.findIndex(t => t >= time);

  // Query method 3: custom (slerp, cubic, etc.)
  // const val = myCustomInterpolate(pos.values, idx, alpha, pos.stride);

  return <div>X: {x.toFixed(2)}</div>;
}
```

---

## 12. Custom Fetch (Auth Headers)

```typescript
const engine = new Playlist({
  url: 'https://api.example.com/data.m3u8',
  fetchFn: (url, init) => fetch(url, {
    ...init,
    headers: { ...init?.headers, Authorization: `Bearer ${getToken()}` },
  }),
});
```

---

## 13. Segment Markers on Timeline

```tsx
const { playlist } = usePlaylist({ url: '/data.m3u8' }, clock);

<TimelineController clock={clock} state={state}
  onPlay={play} onPause={pause} onSeek={seek} onPlaybackRateChange={setPlaybackRate}
  markers={playlist?.segments.map((seg, i) => ({
    start: seg.startTime, end: seg.endTime,
    color: ['#3b82f6', '#10b981', '#f59e0b'][i % 3],
  }))}
/>
```

---

## M3U8 Playlist Authoring

### JSONL Track

```m3u8
#EXTM3U
#EXT-X-VERSION:3
#BSS-TRACK-TYPE:metrics
#BSS-CHUNK-FORMAT:jsonl
#EXT-X-TARGETDURATION:30

#EXTINF:30.000,segments=150
abc123.jsonl
#EXT-X-ENDLIST
```

### Live Playlist (no ENDLIST)

```m3u8
#EXTM3U
#BSS-CHUNK-FORMAT:jsonl
#EXT-X-TARGETDURATION:10

#EXTINF:10.000,segments=50
chunk-001.jsonl
#EXTINF:10.000,segments=48
chunk-002.jsonl
```

### Custom Binary

```m3u8
#EXTM3U
#BSS-CHUNK-FORMAT:bin
#EXT-X-TARGETDURATION:10

#EXTINF:10.000,
chunk-001
#EXT-X-ENDLIST
```

Use a per-engine `decoder` to handle the binary format.
