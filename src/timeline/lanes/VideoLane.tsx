import { useEffect, useState } from 'react';
import { usePlaylist } from '../../react/hooks/use-playlist';
import { timeToX } from '../coords';
import { useTimelineViewport } from '../viewport';
import type { VideoLaneProps, LaneComponent } from '../types/lanes';

const DEFAULT_ACCENT = '#10b981'; // emerald-500

/**
 * Segment-card strip. Reads `playlist.segments` metadata only — never
 * decodes a chunk. Two visual modes:
 *
 *   - Default (no `thumbnails` prop): simple accent-bordered card per
 *     segment with a timestamp label. Signals "video content" without
 *     pretending to show frames.
 *
 *   - Thumbnail mode (`thumbnails` URL given): fetch that WebVTT thumbnail
 *     track and render one image per cue at its time range. Standard
 *     WebVTT thumbnails track (YouTube/Vimeo/Bitmovin-style) — cues may
 *     optionally include a `#xywh=x,y,w,h` fragment for sprite crops.
 *     Cue cadence is independent of m3u8 segments, so thumbnails can be
 *     finer-grained than segment length.
 */
export const VideoLane: LaneComponent<VideoLaneProps> = ({
  src,
  color,
  name,
  thumbnails,
}) => {
  const v = useTimelineViewport();
  const { playlist } = usePlaylist({ url: src });
  const accent = color ?? DEFAULT_ACCENT;
  const cues = useThumbnailCues(thumbnails);

  if (!playlist) {
    return (
      <div className="h-full flex items-center justify-center text-[10px] text-zinc-500 dark:text-zinc-500 font-mono">
        loading {name ?? 'video'}…
      </div>
    );
  }

  // Thumbnail mode — one tile per VTT cue.
  if (cues) {
    return (
      <div className="relative h-full overflow-hidden">
        {cues.map((cue, i) => {
          const x = timeToX(cue.ts, v);
          const w = (cue.te - cue.ts) * v.pxPerSecond;
          if (w < 3) return null;
          return (
            <ThumbnailTile
              key={`${cue.ts}-${i}`}
              x={x}
              width={w}
              ts={cue.ts}
              url={cue.url}
              crop={cue.crop}
              accent={accent}
            />
          );
        })}
      </div>
    );
  }

  // Plain mode — segment "film-strip" cards. Each segment gets a diagonal
  // gradient using the accent color (evokes a video frame without
  // pretending to show pixels), a subtle repeating-stripe overlay for a
  // film-reel feel, and rounded corners. Reads correctly on both light
  // and dark themes because the card paints with the accent color rather
  // than fighting the lane-row background.
  return (
    <div className="relative h-full overflow-hidden">
      {playlist.segments.map((seg) => {
        const x = timeToX(seg.startTime, v);
        const w = seg.duration * v.pxPerSecond;
        if (w < 3) return null;
        return (
          <div
            key={seg.index}
            className="absolute top-1 bottom-1 rounded-md overflow-hidden flex items-center px-1.5 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.08)]"
            style={{
              left: x,
              width: w,
              backgroundImage: `linear-gradient(135deg, ${accent}38 0%, ${accent}1f 50%, ${accent}38 100%), repeating-linear-gradient(45deg, rgba(255,255,255,0.06) 0 6px, transparent 6px 12px)`,
              border: `1px solid ${accent}66`,
            }}
          >
            {w >= 24 && (
              <span
                className="text-[10px] font-mono tabular-nums drop-shadow-[0_1px_0_rgba(0,0,0,0.4)]"
                style={{ color: accent }}
              >
                {seg.startTime.toFixed(0)}s
              </span>
            )}
          </div>
        );
      })}
    </div>
  );
};

// ---------------------------------------------------------------------------
// Thumbnail plumbing

interface ThumbCue {
  ts: number;
  te: number;
  url: string;
  crop?: { x: number; y: number; w: number; h: number };
}

/**
 * Fetch a WebVTT thumbnail track once, keep cues in state. Returns null
 * while loading or on error (caller falls back to plain mode); returns
 * parsed cues on success.
 */
function useThumbnailCues(vttUrl: string | undefined): ThumbCue[] | null {
  const [cues, setCues] = useState<ThumbCue[] | null>(null);
  useEffect(() => {
    if (!vttUrl) {
      setCues(null);
      return;
    }
    let cancelled = false;
    fetch(vttUrl)
      .then((r) => (r.ok ? r.text() : Promise.reject(new Error(String(r.status)))))
      .then((txt) => {
        if (cancelled) return;
        setCues(parseThumbnailVtt(txt, vttUrl));
      })
      .catch(() => {
        if (cancelled) return;
        setCues(null);
      });
    return () => {
      cancelled = true;
    };
  }, [vttUrl]);
  return cues;
}

/**
 * Minimal WebVTT thumbnail parser. Each cue's payload is a relative or
 * absolute URL, optionally followed by `#xywh=x,y,w,h` for sprite crop.
 */
function parseThumbnailVtt(vtt: string, baseUrl: string): ThumbCue[] {
  const cues: ThumbCue[] = [];
  const blocks = vtt.split(/\r?\n\r?\n/);
  for (const block of blocks) {
    const lines = block
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter(Boolean);
    const timingIdx = lines.findIndex((l) => l.includes('-->'));
    if (timingIdx < 0) continue;
    const [startStr, endRest] = lines[timingIdx].split('-->');
    const endStr = endRest.trim().split(/\s+/)[0];
    const ts = parseVttTime(startStr);
    const te = parseVttTime(endStr);
    if (ts === null || te === null) continue;
    const payload = lines[timingIdx + 1];
    if (!payload) continue;
    const [rawUrl, fragment] = payload.split('#');
    const url = resolveUrl(rawUrl, baseUrl);
    const crop = parseXywh(fragment);
    cues.push({ ts, te, url, crop });
  }
  return cues;
}

function parseVttTime(s: string): number | null {
  const m = s.trim().match(/^(?:(\d+):)?(\d+):(\d+)\.(\d+)$/);
  if (!m) return null;
  const hh = +(m[1] ?? '0');
  const mm = +m[2];
  const ss = +m[3];
  const ms = +m[4];
  return hh * 3600 + mm * 60 + ss + ms / 1000;
}

function parseXywh(fragment: string | undefined): ThumbCue['crop'] {
  if (!fragment) return undefined;
  const m = fragment.match(/^xywh=(\d+),(\d+),(\d+),(\d+)$/);
  if (!m) return undefined;
  return { x: +m[1], y: +m[2], w: +m[3], h: +m[4] };
}

function resolveUrl(rawUrl: string, baseUrl: string): string {
  try {
    return new URL(rawUrl, new URL(baseUrl, window.location.href)).toString();
  } catch {
    return rawUrl;
  }
}

interface TileProps {
  x: number;
  width: number;
  ts: number;
  url: string;
  crop?: ThumbCue['crop'];
  accent: string;
}

function ThumbnailTile({ x, width, ts, url, crop, accent }: TileProps) {
  // Non-crop case: stretch image to fill tile (object-fit cover).
  // Crop case: compute background-size so the crop region fills the tile.
  // We don't know the sprite's full dimensions up front, so approximate by
  // treating crop.w / crop.h as the natural tile viewport and letting
  // background-size scale proportionally to the tile's displayed size.
  const style: React.CSSProperties = {
    left: x,
    width,
    borderColor: `${accent}55`,
  };
  let inner: React.ReactNode;
  if (crop) {
    // With a sprite: use background-image + background-position + -size.
    // tileHeight is set by parent; we need to scale sprite so crop.w * scale
    // = tile displayed width and crop.h * scale = tile displayed height.
    // CSS handles proportional scaling via background-size if we set width
    // based on crop.w and height based on crop.h equivalently.
    const bgSizeX = `${(width / crop.w) * 9999}px`; // placeholder, overridden by spriteW below
    const scale = width / crop.w;
    inner = (
      <div
        className="absolute inset-0"
        style={{
          backgroundImage: `url(${url})`,
          backgroundRepeat: 'no-repeat',
          // Scale entire sprite so crop.w maps to tile width.
          // We don't know sprite's natural width here, but the browser
          // will compute based on image intrinsic width × scale factor.
          backgroundSize: `auto ${crop.h * scale}px`,
          backgroundPosition: `-${crop.x * scale}px -${crop.y * scale}px`,
        }}
      />
    );
    void bgSizeX;
  } else {
    inner = (
      <img
        src={url}
        alt=""
        draggable={false}
        className="absolute inset-0 w-full h-full object-cover"
        loading="lazy"
      />
    );
  }

  return (
    <div
      className="absolute top-0.5 bottom-0.5 rounded-sm border overflow-hidden"
      style={style}
    >
      {inner}
      <span
        className="absolute top-1 left-1.5 text-[9px] font-mono tabular-nums text-white/90"
        style={{ textShadow: '0 0 3px rgba(0,0,0,0.7)' }}
      >
        {ts.toFixed(0)}s
      </span>
    </div>
  );
}
