import { Icon } from './Icon';
import { useClockContext } from '../react/clock-context';
import { useClockValue } from '../react/hooks/use-clock-value';
import { useTimelineViewport } from './viewport';

export type RowMode = 'uniform' | 'expanded';

export interface TimelineHeaderProps {
  episodeId: string;
  episodeName?: string;
  description?: string;
  playing: boolean;
  duration: number;
  rowMode: RowMode;
  onPlay(): void;
  onPause(): void;
  onSeek(time: number): void;
  onRowModeChange(m: RowMode): void;
}

function fmtTime(t: number): string {
  const sec = Math.max(0, t);
  const whole = Math.floor(sec);
  const frac = Math.floor((sec - whole) * 10);
  return `${whole}.${frac}s`;
}

const BTN =
  'w-7 h-7 inline-flex items-center justify-center rounded-md text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800 dark:hover:text-zinc-100 transition-colors cursor-pointer';

/**
 * Top bar layout (3-col CSS grid):
 *
 *   ┌── title ───────────┐  ┌── transport + time ──┐  ┌── density (pinned right) ──┐
 *
 * Title collapses to a single truncated string (episode name if present,
 * else id) — keeps the header readable at all widths.
 *
 * Current-time readout sits directly after the transport group (reads at
 * 10fps). The current-time span is fixed at `w-[6ch]` so the transport
 * buttons never jitter as digits change. Density toggle is alone in the
 * right 1fr cell so it stays anchored to the right edge regardless of
 * title / time widths.
 */
export function TimelineHeader({
  episodeId,
  episodeName,
  description,
  playing,
  duration,
  rowMode,
  onPlay,
  onPause,
  onSeek,
  onRowModeChange,
}: TimelineHeaderProps) {
  const v = useTimelineViewport();
  const clock = useClockContext();
  const t = useClockValue(10);

  const title = episodeName ?? episodeId;

  return (
    <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2 px-3 py-2 text-xs font-mono border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950/80 text-zinc-700 dark:text-zinc-300 min-w-0">
      {/* Left: episode title */}
      <div className="min-w-0 overflow-hidden">
        <span
          className="font-semibold text-zinc-900 dark:text-zinc-100 truncate block"
          title={description ? `${title} — ${description}` : title}
        >
          {title}
        </span>
      </div>

      {/* Center: transport + time readout. The current-time span has a
          fixed 6ch width so transport buttons stay put while the clock
          ticks. Duration is static, so the duration span flows naturally. */}
      <div className="flex items-center gap-2 shrink-0">
        <div className="flex items-center gap-0.5 shrink-0">
          <button
            className={BTN}
            onClick={() => onSeek(0)}
            aria-label="seek to start"
            title="seek to start"
          >
            <Icon name="skip-back" size={14} />
          </button>
          <button
            className={BTN}
            onClick={playing ? onPause : onPlay}
            aria-label={playing ? 'pause' : 'play'}
            title={playing ? 'pause' : 'play'}
          >
            <Icon name={playing ? 'pause' : 'play'} size={14} />
          </button>
          <button
            className={BTN}
            onClick={() => onSeek(duration)}
            aria-label="seek to end"
            title="seek to end"
          >
            <Icon name="skip-fwd" size={14} />
          </button>
          <button
            className={BTN}
            onClick={() => v.centerOn(clock.time)}
            aria-label="center on playhead"
            title="center on playhead"
          >
            <Icon name="center" size={14} />
          </button>
        </div>

        <span className="tabular-nums opacity-80 whitespace-nowrap shrink-0">
          <span className="inline-block w-[6ch] text-right">{fmtTime(t)}</span>
          {' / '}
          <span className="inline-block">{fmtTime(duration)}</span>
        </span>
      </div>

      {/* Right: density toggle (pinned right, alone in its cell so it
          doesn't wobble as title / time widths change). */}
      <div className="flex items-center justify-end min-w-0 shrink-0">
        <div className="flex items-center bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-full p-0.5 gap-0.5 shrink-0">
          <button
            type="button"
            onClick={() => onRowModeChange('uniform')}
            aria-pressed={rowMode === 'uniform'}
            className={segBtn(rowMode === 'uniform')}
            title="Uniform row height"
          >
            Uniform
          </button>
          <button
            type="button"
            onClick={() => onRowModeChange('expanded')}
            aria-pressed={rowMode === 'expanded'}
            className={segBtn(rowMode === 'expanded')}
            title="Expanded (per-type heights)"
          >
            Expanded
          </button>
        </div>
      </div>
    </div>
  );
}

function segBtn(active: boolean): string {
  return (
    'px-2.5 h-[22px] text-[11px] rounded-full font-medium leading-none cursor-pointer transition-colors ' +
    (active
      ? 'bg-white text-zinc-900 shadow-sm dark:bg-zinc-700 dark:text-zinc-100'
      : 'bg-transparent text-zinc-500 hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-200')
  );
}
