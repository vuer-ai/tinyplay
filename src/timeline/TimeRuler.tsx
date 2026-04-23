import { timeToX } from './coords';
import { useTimelineViewport } from './viewport';
import { Tick } from './Tick';
import { EventDot } from './EventDot';
import { formatDuration } from './duration';

export interface TimeRulerProps {
  height: number;
  /**
   * Event times to mark on the ruler as small snap dots. Typically the
   * ts/te/startTime/endTime of inline-data tracks. Safe to pass an empty
   * array if nothing is collected.
   */
  snapPoints?: readonly number[];
}

/**
 * Pick a tick step in seconds that yields labels ~80 px apart at the
 * current zoom. Rounds to visually "nice" values.
 */
function pickTickStep(pxPerSec: number): number {
  const targetPx = 80;
  const rawSec = targetPx / pxPerSec;
  const candidates = [
    0.001, 0.002, 0.005, 0.01, 0.02, 0.05, 0.1, 0.2, 0.5, 1, 2, 5, 10, 20,
    30, 60, 120, 300, 600,
  ];
  for (const s of candidates) if (s >= rawSec) return s;
  return 600;
}

/**
 * Horizontal time axis. Ticks are pill-labeled and rendered by
 * `<Tick>`; event snap points are rendered by `<EventDot>` underneath.
 * Time→pixel conversion stays in `coords` so ruler and lanes stay in
 * sync under every zoom/pan operation.
 */
export function TimeRuler({ height, snapPoints = [] }: TimeRulerProps) {
  const v = useTimelineViewport();
  const viewDuration = Math.max(1e-6, v.containerWidth / v.pxPerSecond);
  const step = pickTickStep(v.pxPerSecond);
  const viewEnd = v.viewStart + viewDuration;

  const timeToPercent = (t: number) =>
    ((timeToX(t, v)) / Math.max(1, v.containerWidth)) * 100;

  const firstTick = Math.floor(v.viewStart / step) * step;
  const ticks: number[] = [];
  for (let t = firstTick; t <= viewEnd + step; t += step) {
    if (t < 0) continue;
    if (t > v.duration + step) break;
    ticks.push(+t.toFixed(6));
  }

  return (
    <div
      aria-hidden
      style={{ height }}
      className="relative overflow-hidden select-none border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50/80 dark:bg-zinc-900/60"
    >
      {snapPoints.map((pt, i) => (
        <EventDot key={`dot-${pt}-${i}`} percent={timeToPercent(pt)} />
      ))}
      {ticks.map((t, i) => (
        <Tick
          key={t}
          time={t}
          label={formatTickLabel(t, step)}
          percent={timeToPercent(t)}
          zIndex={i < ticks.length - 1 ? 10 : 0}
        />
      ))}
    </div>
  );
}

function formatTickLabel(t: number, step: number): string {
  if (Math.abs(t) < 0.0005) return '0ms';
  if (step < 1 || Math.abs(t) < 1) return `${Math.round(t * 1000)}ms`;
  return formatDuration(t);
}
