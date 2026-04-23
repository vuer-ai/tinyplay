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
  'px-2 py-1 rounded text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800 dark:hover:text-zinc-100 transition-colors leading-none';

/**
 * Top bar: episode identity · density toggle · transport · time display.
 *
 * Zoom / pan controls live in `<NavigationControls>` at the bottom of
 * the timeline body — that capsule is always visible and zoom/pan are
 * temporally-anchored operations that belong near the ruler. Pulls the
 * live playhead time at 10fps via `useClockValue` so the header's
 * re-render rate stays low.
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

  return (
    <div className="flex items-center gap-2 px-3 py-2 text-xs font-mono border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950/80 text-zinc-700 dark:text-zinc-300 min-w-0">
      {/* Left: episode identity. Occupies the slack and truncates when
          narrow. `min-w-0` is load-bearing — without it the truncate
          inside won't engage because the flex parent sizes to content. */}
      <div className="flex items-center gap-2 min-w-0 flex-1 overflow-hidden">
        <span className="opacity-60 shrink-0 hidden sm:inline">EPISODE</span>
        <span className="font-semibold text-zinc-900 dark:text-zinc-100 whitespace-nowrap shrink-0 truncate max-w-[24ch]">
          {episodeId}
        </span>
        {episodeName && episodeName !== episodeId && (
          <span className="opacity-70 truncate min-w-0 hidden md:inline">
            · {episodeName}
          </span>
        )}
        {description && (
          <span className="opacity-50 truncate min-w-0 hidden lg:inline">
            · {description}
          </span>
        )}
      </div>

      {/* Right: controls. Never shrinks — wraps drift ends here. */}
      <div className="flex items-center gap-2 shrink-0">
        {/* Uniform / Expanded density toggle */}
        <div className="flex items-center bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded p-0.5 gap-0.5 shrink-0">
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

        <span
          className="inline-block w-px h-4 bg-zinc-200 dark:bg-zinc-700 shrink-0"
          aria-hidden
        />

        <div className="flex items-center gap-0.5 shrink-0">
          <button
            className={BTN}
            onClick={() => onSeek(0)}
            aria-label="seek to start"
            title="seek to start"
          >
            ⏮
          </button>
          <button
            className={BTN}
            onClick={playing ? onPause : onPlay}
            aria-label={playing ? 'pause' : 'play'}
            title={playing ? 'pause' : 'play'}
          >
            {playing ? '⏸' : '▶'}
          </button>
          <button
            className={BTN}
            onClick={() => onSeek(duration)}
            aria-label="seek to end"
            title="seek to end"
          >
            ⏭
          </button>
          <button
            className={BTN}
            onClick={() => v.centerOn(clock.time)}
            aria-label="center on playhead"
            title="center on playhead"
          >
            ⊕
          </button>
        </div>

        <span className="tabular-nums opacity-80 whitespace-nowrap shrink-0 text-right">
          {fmtTime(t)} / {fmtTime(duration)}
        </span>
      </div>
    </div>
  );
}

function segBtn(active: boolean): string {
  return (
    'px-2.5 h-[22px] text-[11px] rounded font-medium leading-none cursor-pointer transition-colors ' +
    (active
      ? 'bg-white text-zinc-900 shadow-sm dark:bg-zinc-700 dark:text-zinc-100'
      : 'bg-transparent text-zinc-500 hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-200')
  );
}
