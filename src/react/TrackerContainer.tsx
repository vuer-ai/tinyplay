import { useContext, type FC, type ReactNode } from 'react';
import type { TimelineClock } from '../core/timeline';
import type { DtypeId } from '../dtypes/types';
import { getDtype } from '../dtypes/registry';
import { validateTimelineConfig } from '../timeline/validate';
import type { TimelineConfig, TrackRow } from '../timeline/types/config';
import { PlaceholderLane } from '../timeline/lanes/PlaceholderLane';
import { ClockContext, ClockProvider } from './clock-context';
import { useTimeline } from './hooks/use-timeline';
import { TimelineController } from './TimelineController';

/**
 * Dtype → view-component map for `<TrackerContainer>` dispatch.
 *
 * Parallel to `TimelineViews` on the timeline side. Import
 * `defaultTrackerViews` for stock wiring or compose your own.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type TrackerViews = Record<DtypeId, FC<any>>;

export interface TrackerContainerProps {
  /**
   * Same `TimelineConfig` shape that `<TimelineContainer>` accepts. The
   * identical object can drive both containers — swap components, no
   * data transformation.
   */
  config: TimelineConfig;
  /**
   * dtype → view component. Unknown dtypes fall through to `PlaceholderLane`.
   */
  views: TrackerViews;
  /**
   * Optional shared `TimelineClock`. Resolved identically to
   * `<TimelineContainer>`: explicit prop → outer `<ClockProvider>` → new
   * internal clock. Share a clock to sync with a timeline elsewhere on
   * the page.
   */
  clock?: TimelineClock | null;
  /**
   * When true, mount a `<TimelineController>` (play / pause / seek /
   * rate / loop) below the stack of views. Defaults to `false` — most
   * apps supply one controller globally.
   */
  controller?: boolean;
  className?: string;
  /**
   * Optional per-track title renderer. Defaults to `track.name` or the
   * last segment of `track.path`. Return `null` to suppress titles.
   */
  renderTitle?: (track: TrackRow) => ReactNode;
}

/**
 * Instant-state analog of `<TimelineContainer>`. Dispatches each track in
 * the config to the matching view component from the `views` map.
 *
 * `<TrackerContainer>` and `<TimelineContainer>` take the **same**
 * `TimelineConfig`; swapping between them is a single component-name
 * change in app code.
 *
 * Layout defaults to a vertical stack (`flex flex-col gap-3`). Apps that
 * want a grid or side-by-side layout override `className` or compose
 * multiple `<TrackerContainer>`s inside a custom wrapper.
 *
 * `config.groups` is ignored — the tracker is flat. Group-header
 * sectioning is a follow-up.
 */
export function TrackerContainer({
  config,
  views,
  clock: clockProp,
  controller = false,
  className,
  renderTitle,
}: TrackerContainerProps) {
  validateTimelineConfig(config);
  const ctxClock = useContext(ClockContext);
  const tl = useTimeline(config.container.duration, clockProp ?? ctxClock);

  return (
    <ClockProvider clock={tl.clock}>
      <div className={className ?? 'flex flex-col gap-3'}>
        {config.tracks.map((track) => {
          const ViewComponent = views[track.dtype];
          const spec = getDtype(track.dtype);
          const resolvedTitle = renderTitle
            ? renderTitle(track)
            : defaultTitle(track);
          return (
            <section
              key={track.id}
              data-track-id={track.id}
              data-dtype={track.dtype}
              className="min-w-0"
            >
              {resolvedTitle != null && resolvedTitle !== false ? (
                <header className="text-[11px] font-mono uppercase tracking-wider text-zinc-500 dark:text-zinc-400 mb-1 px-0.5">
                  {resolvedTitle}
                </header>
              ) : null}
              {ViewComponent ? (
                <ViewComponent
                  src={track.src}
                  data={track.data}
                  dtype={spec}
                  {...(track.props ?? {})}
                />
              ) : (
                <PlaceholderLane track={track} />
              )}
            </section>
          );
        })}

        {controller && (
          <TimelineController
            state={tl.state}
            onPlay={tl.play}
            onPause={tl.pause}
            onSeek={tl.seek}
            onSpeedChange={tl.setPlaybackRate}
            onLoopChange={tl.setLoop}
          />
        )}
      </div>
    </ClockProvider>
  );
}

function pathLeaf(path: string): string {
  const i = path.lastIndexOf('/');
  return i < 0 ? path : path.slice(i + 1);
}

function defaultTitle(track: TrackRow): ReactNode {
  return track.name ?? pathLeaf(track.path);
}
