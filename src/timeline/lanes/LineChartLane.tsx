import { useEffect, useRef } from 'react';
import { usePlaylist } from '../../react/hooks/use-playlist';
import { useMergedTrack } from '../../react/hooks/use-merged-track';
import type { TrackSamples } from '../../core/types';
import { timeToX } from '../coords';
import { useTimelineViewport, type TimelineViewport } from '../viewport';
import { assertSrcOrData } from '../validate';
import type { Sample } from '../types/data';
import type { LineChartLaneProps, LaneComponent } from '../types/lanes';

function channelColor(c: number): string {
  return `hsl(${(c * 137.5) % 360}, 65%, 60%)`;
}

function inferShape(first: Sample): number[] {
  return typeof first.data === 'number' ? [] : [first.data.length];
}

function strideOf(shape: number[]): number {
  if (shape.length === 0) return 1;
  return shape.reduce((a, b) => a * b, 1);
}

/** Turn a flat inline `Sample[]` into the same columnar form `useMergedTrack` emits. */
function inlineToTracks(data: Sample[], shapeProp?: number[]): Map<string, TrackSamples> {
  if (data.length === 0) return new Map();
  const shape = shapeProp ?? inferShape(data[0]);
  const stride = strideOf(shape);
  const N = data.length;
  const times = new Float32Array(N);
  const values = new Float32Array(N * stride);
  for (let i = 0; i < N; i++) {
    times[i] = data[i].ts;
    const d = data[i].data;
    if (typeof d === 'number') {
      values[i] = d;
    } else {
      for (let j = 0; j < stride; j++) values[i * stride + j] = d[j] ?? 0;
    }
  }
  return new Map([['data', { times, values, stride }]]);
}

function autoRange(values: Float32Array): [number, number] {
  let min = Infinity;
  let max = -Infinity;
  for (let i = 0; i < values.length; i++) {
    const v = values[i];
    if (v < min) min = v;
    if (v > max) max = v;
  }
  if (!Number.isFinite(min) || !Number.isFinite(max) || min === max) {
    return [0, 1];
  }
  return [min, max];
}

interface DrawOptions {
  range?: readonly [number, number];
  padTop: number;
  padBottom: number;
}

function draw(
  canvas: HTMLCanvasElement,
  tracks: Map<string, TrackSamples>,
  v: TimelineViewport,
  opts: DrawOptions,
): void {
  const dpr = window.devicePixelRatio || 1;
  const cssW = canvas.clientWidth;
  const cssH = canvas.clientHeight;
  const pxW = Math.max(1, Math.floor(cssW * dpr));
  const pxH = Math.max(1, Math.floor(cssH * dpr));
  if (canvas.width !== pxW) canvas.width = pxW;
  if (canvas.height !== pxH) canvas.height = pxH;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, cssW, cssH);

  const track = tracks.get('data');
  if (!track) return;
  const { times, values, stride } = track;
  const N = times.length;
  if (N === 0) return;

  const [yMin, yMax] = opts.range ?? autoRange(values);
  const ySpan = yMax - yMin || 1;
  const plotH = cssH - opts.padTop - opts.padBottom;
  const yToScreen = (y: number) =>
    opts.padTop + plotH - ((y - yMin) / ySpan) * plotH;

  ctx.lineWidth = 1;
  ctx.lineJoin = 'round';

  // Downsample: never draw more samples than pixels. A 100Hz track over a
  // 1000px lane has ~1 sample per pixel already; zoomed-out views can have
  // 30x more samples than pixels so skip most of them.
  const approxPx = Math.max(1, Math.ceil(cssW));
  const step = Math.max(1, Math.floor(N / approxPx));

  for (let c = 0; c < stride; c++) {
    ctx.beginPath();
    ctx.strokeStyle = channelColor(c);
    for (let i = 0; i < N; i += step) {
      const x = timeToX(times[i], v);
      const y = yToScreen(values[i * stride + c]);
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();
  }
}

interface VisualProps {
  tracks: Map<string, TrackSamples>;
  range?: readonly [number, number];
  channelNames?: string[];
}

function LineChartVisual({ tracks, range, channelNames }: VisualProps) {
  const v = useTimelineViewport();
  const ref = useRef<HTMLCanvasElement>(null);
  const lastDrawArgs = useRef({ tracks, v, range });
  lastDrawArgs.current = { tracks, v, range };

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const doDraw = () => {
      const { tracks: t, v: vv, range: r } = lastDrawArgs.current;
      draw(canvas, t, vv, { range: r, padTop: 4, padBottom: 4 });
    };
    doDraw();
    // Redraw on canvas resize — covers ancestor size changes that don't
    // flow through viewport deps (e.g. a parent group collapsing and
    // re-expanding would otherwise leave the buffer at its previous size).
    if (typeof ResizeObserver !== 'undefined') {
      const ro = new ResizeObserver(doDraw);
      ro.observe(canvas);
      return () => ro.disconnect();
    }
  }, [tracks, v.pxPerSecond, v.scrollSec, v.containerWidth, range]);

  const stride = tracks.get('data')?.stride ?? 0;

  return (
    <div className="relative h-full">
      <canvas ref={ref} className="absolute inset-0 w-full h-full" />
      {channelNames && channelNames.length > 0 && stride > 0 && (
        <div className="absolute top-1 right-1 flex flex-wrap gap-x-2 gap-y-0 text-[9px] font-mono pointer-events-none">
          {channelNames.slice(0, stride).map((name, c) => (
            <span key={name} style={{ color: channelColor(c) }}>
              ● {name}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

/**
 * Multi-channel line chart. Uses `useMergedTrack` for `src` (playhead-centric
 * loading) or `data` inline (fully loaded).
 *
 * Canvas is DPR-aware. Repaints only when tracks or viewport change — not on
 * every clock tick — because lane content is static across the viewport
 * (the playhead overlay is rendered separately and updates imperatively).
 */
export const LineChartLane: LaneComponent<LineChartLaneProps> = (props) => {
  assertSrcOrData(props, `LineChartLane${props.name ? ` "${props.name}"` : ''}`);
  if (props.src) return <LineChartLaneSrc {...props} src={props.src} />;
  return <LineChartLaneData {...props} data={props.data!} />;
};
LineChartLane.__viewName = 'LineChartLane';

function LineChartLaneSrc({
  src,
  normalize,
  shape,
  range,
  channelNames,
}: LineChartLaneProps & { src: string }) {
  const { engine } = usePlaylist({ url: src });
  // `LaneDataProps<Sample>.normalize` produces `Sample[]` (the lane-level
  // shape). `useMergedTrack` expects a Normalizer that produces columnar
  // `Map<string, TrackSamples>`. Adapt by composing through `inlineToTracks`.
  // If no user normalize, pass undefined so `useMergedTrack` falls back to
  // its default `samplesNormalizer`.
  const mergeOptions = normalize
    ? { normalize: (decoded: unknown) => inlineToTracks(normalize(decoded), shape) }
    : undefined;
  const { tracks } = useMergedTrack(engine, undefined, mergeOptions);
  return <LineChartVisual tracks={tracks} range={range} channelNames={channelNames} />;
}

function LineChartLaneData({
  data,
  shape,
  range,
  channelNames,
}: LineChartLaneProps & { data: Sample[] }) {
  const tracks = inlineToTracks(data, shape);
  return <LineChartVisual tracks={tracks} range={range} channelNames={channelNames} />;
}
