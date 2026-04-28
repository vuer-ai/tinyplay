import { useEffect, useRef } from 'react';
import { usePlaylist } from '../hooks/use-playlist';
import { useMergedTrack } from '../hooks/use-merged-track';
import { useDarkMode } from '../hooks/use-dark-mode';
import { useClockContext } from '../clock-context';
import type { TimelineClock } from '../../core/timeline';
import type { DtypeRef } from './dtype-helpers';
import type { TrackSamples } from '../../core/types';

/**
 * One IMU sample. Shared schema for `ImuChartView` and `ImuGizmoView`.
 *
 * `data` is a flat 6-tuple in the order:
 *   [accel_x, accel_y, accel_z, gyro_x, gyro_y, gyro_z]
 */
export interface ImuSample {
  ts: number;
  data: [number, number, number, number, number, number];
}

export interface ImuChartViewProps {
  src: string;
  clock?: TimelineClock | null;
  /** Optional dtype id or spec. Informational — passed by `<TrackerContainer>` during dispatch. */
  dtype?: DtypeRef;
  className?: string;
  /** Rolling window width in seconds. Defaults to 5. */
  window?: number;
  /** Max |accel| for auto-scaled y-axis. Defaults to 12 m/s². */
  accelRange?: number;
  /** Max |gyro| for auto-scaled y-axis. Defaults to 1.5 rad/s. */
  gyroRange?: number;
}

const ACCEL_COLORS = ['#f87171', '#34d399', '#60a5fa']; // x y z — red green blue
const GYRO_COLORS = ['#fb923c', '#a78bfa', '#22d3ee']; // x y z — amber violet cyan
const AXIS_LABELS = ['X', 'Y', 'Z'];

interface CanvasPalette {
  panelBg: string;
  gridLine: string;
  zeroLine: string;
  axisLabel: string;
  panelLabel: string;
  emptyLabel: string;
  playhead: string;
}

const CANVAS_PALETTE_DARK: CanvasPalette = {
  panelBg: '#18181b',  // zinc-900
  gridLine: '#27272a', // zinc-800
  zeroLine: '#3f3f46', // zinc-700
  axisLabel: '#71717a', // zinc-500
  panelLabel: '#a1a1aa', // zinc-400
  emptyLabel: '#52525b', // zinc-600
  playhead: '#facc15',  // amber-300
};

const CANVAS_PALETTE_LIGHT: CanvasPalette = {
  panelBg: '#fafafa',  // zinc-50
  gridLine: '#e4e4e7', // zinc-200
  zeroLine: '#a1a1aa', // zinc-400
  axisLabel: '#71717a', // zinc-500
  panelLabel: '#52525b', // zinc-600
  emptyLabel: '#a1a1aa', // zinc-400
  playhead: '#d97706',  // amber-600 — better contrast on light bg
};

/**
 * ImuChartView — rolling time-series chart for 6-axis IMU data.
 *
 * Two stacked subplots (accel + gyro), each showing 3 colored channels
 * across a rolling time window ending at the current clock. Canvas 2D,
 * redraws on every `clock.on('tick')` for smooth scrubbing.
 *
 * ## Data format
 * JSONL lines of shape `{ ts: number, data: [ax, ay, az, gx, gy, gz] }`
 * (stride=6). Recommended source rate: 50–200 Hz.
 *
 * ## Hooks used
 * `useMergedTrack` to keep the current + neighboring chunks merged, then
 * imperative Canvas drawing driven by `clock.on('tick')` — no per-frame
 * React re-renders.
 */
export function ImuChartView({
  src,
  clock,
  className,
  window = 5,
  accelRange = 12,
  gyroRange = 1.5,
}: ImuChartViewProps) {
  const resolvedClock = useClockContext(clock);
  const { engine } = usePlaylist({ url: src }, resolvedClock);
  const { tracks } = useMergedTrack(engine, resolvedClock);
  const track = tracks.get('data');
  const isDark = useDarkMode();

  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const palette = isDark ? CANVAS_PALETTE_DARK : CANVAS_PALETTE_LIGHT;

    const draw = () => {
      const dpr = globalThis.devicePixelRatio || 1;
      const cssW = canvas.clientWidth;
      const cssH = canvas.clientHeight;
      if (canvas.width !== cssW * dpr || canvas.height !== cssH * dpr) {
        canvas.width = cssW * dpr;
        canvas.height = cssH * dpr;
      }
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, cssW, cssH);

      // Layout: 2 stacked panels
      const panelH = cssH / 2;
      drawPanel(ctx, 0, 0, cssW, panelH, track, resolvedClock.time, window, 0, 3, accelRange, 'accel (m/s²)', ACCEL_COLORS, palette);
      drawPanel(ctx, 0, panelH, cssW, panelH, track, resolvedClock.time, window, 3, 6, gyroRange, 'gyro (rad/s)', GYRO_COLORS, palette);
    };

    draw();
    const unsub = resolvedClock.on('tick', draw);
    const unsubSeek = resolvedClock.on('seek', draw);
    return () => {
      unsub();
      unsubSeek();
    };
  }, [resolvedClock, track, window, accelRange, gyroRange, isDark]);

  return (
    <div className={`flex flex-col bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 text-xs font-mono ${className ?? ''}`}>
      <div className="px-3 py-1.5 flex gap-4 border-b border-zinc-200 dark:border-zinc-800 text-[10px]">
        <span className="text-zinc-600 dark:text-zinc-400">IMU · {window}s window</span>
        <span className="ml-auto flex gap-3">
          {AXIS_LABELS.map((l, i) => (
            <span key={`a${l}`} className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-sm" style={{ background: ACCEL_COLORS[i] }} />
              <span className="text-zinc-500 dark:text-zinc-500">a{l}</span>
            </span>
          ))}
          {AXIS_LABELS.map((l, i) => (
            <span key={`g${l}`} className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-sm" style={{ background: GYRO_COLORS[i] }} />
              <span className="text-zinc-500 dark:text-zinc-500">g{l}</span>
            </span>
          ))}
        </span>
      </div>
      <canvas ref={canvasRef} className="w-full flex-1" style={{ minHeight: 220 }} />
    </div>
  );
}

/**
 * Draw N channels of a TrackSamples into a rectangle.
 * Channels at indices [chStart, chEnd) of each sample are plotted.
 */
function drawPanel(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  track: TrackSamples | undefined,
  now: number,
  window: number,
  chStart: number,
  chEnd: number,
  range: number,
  label: string,
  colors: string[],
  palette: CanvasPalette,
): void {
  // Background
  ctx.save();
  ctx.translate(x, y);

  ctx.fillStyle = palette.panelBg;
  ctx.fillRect(0, 0, w, h);

  // Plot area inset
  const padL = 32;
  const padR = 8;
  const padT = 14;
  const padB = 14;
  const plotW = w - padL - padR;
  const plotH = h - padT - padB;

  // Gridlines (horizontal zero + quarter lines)
  ctx.strokeStyle = palette.gridLine;
  ctx.lineWidth = 1;
  ctx.beginPath();
  for (let i = 0; i <= 4; i++) {
    const py = padT + (plotH * i) / 4;
    ctx.moveTo(padL, py);
    ctx.lineTo(padL + plotW, py);
  }
  ctx.stroke();

  // Zero line emphasized
  ctx.strokeStyle = palette.zeroLine;
  ctx.beginPath();
  ctx.moveTo(padL, padT + plotH / 2);
  ctx.lineTo(padL + plotW, padT + plotH / 2);
  ctx.stroke();

  // Labels
  ctx.fillStyle = palette.axisLabel;
  ctx.font = '10px ui-monospace, monospace';
  ctx.textBaseline = 'middle';
  ctx.textAlign = 'right';
  ctx.fillText(`+${range.toFixed(1)}`, padL - 4, padT);
  ctx.fillText('0', padL - 4, padT + plotH / 2);
  ctx.fillText(`-${range.toFixed(1)}`, padL - 4, padT + plotH);
  ctx.textAlign = 'left';
  ctx.fillStyle = palette.panelLabel;
  ctx.fillText(label, padL + 4, padT + 2);

  // Data
  if (track && track.times.length >= 2) {
    const { times, values, stride } = track;
    const t0 = now - window;
    const t1 = now;

    // Find start index
    let lo = 0;
    let hi = times.length - 1;
    while (lo < hi) {
      const m = (lo + hi) >> 1;
      if (times[m] < t0) lo = m + 1;
      else hi = m;
    }
    const startIdx = Math.max(0, lo - 1);

    for (let ch = chStart; ch < chEnd; ch++) {
      ctx.strokeStyle = colors[ch - chStart];
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      let started = false;
      for (let i = startIdx; i < times.length; i++) {
        const t = times[i];
        if (t > t1) break;
        const px = padL + ((t - t0) / (t1 - t0)) * plotW;
        const v = Math.max(-range, Math.min(range, values[i * stride + ch]));
        const py = padT + plotH / 2 - (v / range) * (plotH / 2);
        if (!started) {
          ctx.moveTo(px, py);
          started = true;
        } else {
          ctx.lineTo(px, py);
        }
      }
      ctx.stroke();
    }

    // Playhead on the right edge
    ctx.strokeStyle = palette.playhead;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(padL + plotW, padT);
    ctx.lineTo(padL + plotW, padT + plotH);
    ctx.stroke();
  } else {
    ctx.fillStyle = palette.emptyLabel;
    ctx.font = '11px ui-monospace, monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('waiting for samples…', padL + plotW / 2, padT + plotH / 2);
  }

  ctx.restore();
}
