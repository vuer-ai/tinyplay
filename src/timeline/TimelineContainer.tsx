import {
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { ClockContext, ClockProvider } from '../react/clock-context';
import { useTimeline } from '../react/hooks/use-timeline';
import type { TimelineClock } from '../core/timeline';
import type { TimelineConfig, TrackRow } from './types/config';
import type { TimelineViews } from '../dtypes/types';
import { validateTimelineConfig } from './validate';
import {
  flattenTree,
  hiddenInheritance,
  initialCollapsed,
} from './tree';
import {
  TimelineViewportProvider,
  useObservedWidth,
  useTimelineViewport,
} from './viewport';
import { TimelineHeader, type RowMode } from './TimelineHeader';
import { TimeRuler } from './TimeRuler';
import { Playhead } from './Playhead';
import { TimelineCursor } from './TimelineCursor';
import { CursorOverlay } from './CursorOverlay';
import { NavigationControls } from './NavigationControls';
import { TreeRows, TreeSearch } from './TreeColumn';
import { LaneRows } from './LaneColumn';
import { useSeekOnPointer } from './use-seek-on-pointer';
import { useTimelineWheel } from './use-timeline-wheel';
import { useAutoFollow } from './use-auto-follow';

const RULER_HEIGHT = 32;
const UNIFORM_ROW_HEIGHT = 32;
const FALLBACK_ROW_HEIGHT = 40;
const GROUP_ROW_HEIGHT = 32;
const MIN_LEFT = 180;
const MAX_LEFT = 480;
const DEFAULT_LEFT = 280;
const OVERSCAN = 6;

export interface TimelineContainerProps {
  config: TimelineConfig;
  className?: string;
  /**
   * Required dtype → lane mapping. Import `defaultTimelineViews` from
   * `@vuer-ai/vuer-m3u` for the stock wiring, or supply your own.
   */
  views: TimelineViews;
  /**
   * Optional shared `TimelineClock`. When provided (directly or via an
   * outer `<ClockProvider>`), the container reuses it instead of creating
   * its own. Use this to share a clock between a `<TimelineContainer>`
   * and a `<TrackerContainer>` so play / seek propagates across both.
   */
  clock?: TimelineClock | null;
  /**
   * Fires when the user right-clicks a track row. `preventDefault()` is
   * already called; consumers implement their own menu UI. Does not fire
   * on group rows (groups aren't server-side entities).
   */
  onRowContextMenu?: (track: TrackRow, e: React.MouseEvent) => void;
}

export function TimelineContainer({
  config,
  className,
  views,
  clock: clockProp,
  onRowContextMenu,
}: TimelineContainerProps) {
  validateTimelineConfig(config);
  // Resolve external clock: explicit prop → outer <ClockProvider> → null.
  // useTimeline adopts it if present, or creates a new internal clock.
  const ctxClock = useContext(ClockContext);
  const tl = useTimeline(config.container.duration, clockProp ?? ctxClock);

  // Viewport shares the clock's live duration, not config.container.duration.
  // Playlists call `clock.extendDuration()` as they load, so the clock can
  // grow past the configured duration — the viewport must follow or the
  // playhead falls off the right edge once `t > config.container.duration`.
  return (
    <ClockProvider clock={tl.clock}>
      <TimelineViewportProvider duration={tl.state.duration}>
        <TimelineContainerInner
          config={config}
          views={views}
          playing={tl.state.playing}
          duration={tl.state.duration}
          onPlay={tl.play}
          onPause={tl.pause}
          onSeek={tl.seek}
          className={className}
          onRowContextMenu={onRowContextMenu}
        />
      </TimelineViewportProvider>
    </ClockProvider>
  );
}

interface InnerProps {
  config: TimelineConfig;
  views: TimelineViews;
  playing: boolean;
  duration: number;
  onPlay(): void;
  onPause(): void;
  onSeek(t: number): void;
  className?: string;
  onRowContextMenu?: (track: TrackRow, e: React.MouseEvent) => void;
}

function TimelineContainerInner({
  config,
  views,
  playing,
  duration,
  onPlay,
  onPause,
  onSeek,
  className,
  onRowContextMenu,
}: InnerProps) {
  const tracks = config.tracks;
  const groups = config.groups;

  const [collapsed, setCollapsed] = useState<Set<string>>(() =>
    initialCollapsed(groups),
  );
  const [hidden, setHidden] = useState<Set<string>>(() => new Set());
  const [filter, setFilter] = useState('');
  const [caseSensitive, setCaseSensitive] = useState(false);
  const [regex, setRegex] = useState(false);
  const [selected, setSelected] = useState<string | null>(null);
  const [hovered, setHovered] = useState<string | null>(null);
  const [leftWidth, setLeftWidth] = useState(DEFAULT_LEFT);
  const [scrollTop, setScrollTop] = useState(0);
  const [viewportH, setViewportH] = useState(400);
  const [rowMode, setRowMode] = useState<RowMode>('uniform');
  // Persistent temporal markers (shift+click to drop, click to remove).
  const [tempMarkers, setTempMarkers] = useState<number[]>([]);

  const regexValid = useMemo(() => {
    if (!regex || !filter) return true;
    try {
      new RegExp(filter, caseSensitive ? '' : 'i');
      return true;
    } catch {
      return false;
    }
  }, [regex, filter, caseSensitive]);

  const rows = useMemo(
    () => flattenTree(tracks, { collapsed, groups, filter, caseSensitive, regex }),
    [tracks, collapsed, groups, filter, caseSensitive, regex],
  );

  const { rowLayout, totalHeight } = useMemo(() => {
    let y = 0;
    const layout = rows.map((r) => {
      let h: number;
      if (rowMode === 'uniform') {
        h = UNIFORM_ROW_HEIGHT;
      } else if (r.kind === 'group') {
        h = GROUP_ROW_HEIGHT;
      } else if (typeof r.track.height === 'number') {
        h = r.track.height;
      } else {
        const entry = views[r.track.dtype];
        h = entry?.defaultHeight ?? FALLBACK_ROW_HEIGHT;
      }
      const entry = { y, h };
      y += h;
      return entry;
    });
    return { rowLayout: layout, totalHeight: y };
  }, [rows, views, rowMode]);

  const visibleRange = useMemo<[number, number]>(() => {
    if (rowLayout.length === 0) return [0, 0];
    let first = 0;
    let last = rowLayout.length - 1;
    for (let i = 0; i < rowLayout.length; i++) {
      if (rowLayout[i].y + rowLayout[i].h >= scrollTop) {
        first = Math.max(0, i - OVERSCAN);
        break;
      }
    }
    for (let i = first; i < rowLayout.length; i++) {
      if (rowLayout[i].y > scrollTop + viewportH) {
        last = Math.min(rowLayout.length - 1, i + OVERSCAN);
        break;
      }
    }
    return [first, last];
  }, [rowLayout, scrollTop, viewportH]);

  const hiddenInherited = useMemo(
    () => hiddenInheritance(tracks, hidden),
    [tracks, hidden],
  );

  // Collect snap points from any track with inline `data`. Live-loaded
  // tracks don't contribute (their entries aren't available at render
  // time).
  const snapPoints = useMemo<number[]>(() => {
    const pts = new Set<number>();
    for (const t of tracks) {
      if (!Array.isArray(t.data)) continue;
      for (const e of t.data as Array<Record<string, unknown>>) {
        if (typeof e?.ts === 'number') pts.add(e.ts);
        if (typeof e?.te === 'number') pts.add(e.te);
      }
    }
    return [...pts].sort((a, b) => a - b);
  }, [tracks]);

  const toggleCollapsed = useCallback((id: string) => {
    setCollapsed((prev) => {
      const n = new Set(prev);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });
  }, []);
  const toggleHidden = useCallback((id: string) => {
    setHidden((prev) => {
      const n = new Set(prev);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });
  }, []);

  const laneAreaRef = useRef<HTMLDivElement>(null);
  const scrollerRef = useRef<HTMLDivElement>(null);
  useObservedWidth(laneAreaRef);

  const onAddMarker = useCallback((t: number) => {
    setTempMarkers((prev) => [...prev, t]);
  }, []);
  const dragScrollStartTop = useRef(0);
  const dragScrollActive = useRef(false);
  const onDragUpgrade = useCallback((dx: number, dy: number) => {
    if (Math.abs(dy) > 6 && Math.abs(dy) > Math.abs(dx) * 1.5) {
      dragScrollStartTop.current = scrollerRef.current?.scrollTop ?? 0;
      dragScrollActive.current = true;
      return true;
    }
    return false;
  }, []);
  useSeekOnPointer(laneAreaRef, { onShiftClick: onAddMarker, onDragUpgrade });

  useEffect(() => {
    const area = laneAreaRef.current;
    if (!area) return;
    let startY = 0;
    const onDown = (e: PointerEvent) => {
      if (e.button !== 0 || e.shiftKey) return;
      startY = e.clientY;
    };
    const onMove = (e: PointerEvent) => {
      if (!dragScrollActive.current) return;
      const dy = e.clientY - startY;
      const el = scrollerRef.current;
      if (el) el.scrollTop = dragScrollStartTop.current - dy;
    };
    const onUp = () => {
      dragScrollActive.current = false;
    };
    area.addEventListener('pointerdown', onDown);
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    window.addEventListener('pointercancel', onUp);
    return () => {
      area.removeEventListener('pointerdown', onDown);
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      window.removeEventListener('pointercancel', onUp);
    };
  }, []);

  useTimelineWheel(laneAreaRef);
  useAutoFollow();

  useEffect(() => {
    const el = scrollerRef.current;
    if (!el) return;
    const update = () => setViewportH(el.clientHeight);
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const onScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    setScrollTop(e.currentTarget.scrollTop);
  }, []);

  const onTreeWheel = useCallback((e: React.WheelEvent<HTMLDivElement>) => {
    if (e.metaKey || e.ctrlKey || e.shiftKey) return;
    if (Math.abs(e.deltaX) > Math.abs(e.deltaY)) return;
    if (scrollerRef.current && e.deltaY !== 0) {
      scrollerRef.current.scrollTop += e.deltaY;
    }
  }, []);

  const onResizeStart = useCallback(
    (e: React.PointerEvent) => {
      e.preventDefault();
      const startX = e.clientX;
      const startW = leftWidth;
      const onMove = (ev: PointerEvent) => {
        const next = Math.max(MIN_LEFT, Math.min(MAX_LEFT, startW + (ev.clientX - startX)));
        setLeftWidth(next);
      };
      const onUp = () => {
        window.removeEventListener('pointermove', onMove);
        window.removeEventListener('pointerup', onUp);
        document.body.style.cursor = '';
      };
      document.body.style.cursor = 'col-resize';
      window.addEventListener('pointermove', onMove);
      window.addEventListener('pointerup', onUp);
    },
    [leftWidth],
  );

  return (
    <div
      className={
        'flex flex-col border border-zinc-200 dark:border-zinc-800 rounded-xl overflow-hidden bg-white dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 min-h-0 shadow-[0_4px_16px_0_rgba(0,0,0,0.08)] dark:shadow-[0_4px_16px_0_rgba(0,0,0,0.35)]' +
        (className ? ` ${className}` : '')
      }
    >
      <TimelineHeader
        episodeId={config.container.id}
        episodeName={config.container.name}
        description={config.container.description}
        playing={playing}
        duration={duration}
        rowMode={rowMode}
        onPlay={onPlay}
        onPause={onPause}
        onSeek={onSeek}
        onRowModeChange={setRowMode}
      />

      <div className="flex flex-1 min-h-0">
        {/* TREE SIDE */}
        <div
          style={{ width: leftWidth }}
          className="shrink-0 flex flex-col bg-zinc-50/50 dark:bg-zinc-950/60"
          onWheel={onTreeWheel}
        >
          <div
            style={{ height: RULER_HEIGHT }}
            className="flex items-center px-1.5 border-b border-zinc-200 dark:border-zinc-800 shrink-0"
          >
            <TreeSearch
              value={filter}
              onChange={setFilter}
              caseSensitive={caseSensitive}
              onCaseSensitiveChange={setCaseSensitive}
              regex={regex}
              onRegexChange={setRegex}
              regexValid={regexValid}
              resultCount={rows.length}
            />
          </div>
          <div className="flex-1 overflow-hidden">
            <div
              style={{
                transform: `translateY(${-scrollTop}px)`,
                willChange: 'transform',
              }}
            >
              <TreeRows
                rows={rows}
                rowLayout={rowLayout}
                visibleRange={visibleRange}
                totalHeight={totalHeight}
                collapsed={collapsed}
                hiddenDirect={hidden}
                hiddenInherited={hiddenInherited}
                selected={selected}
                hovered={hovered}
                views={views}
                onToggleCollapsed={toggleCollapsed}
                onToggleHidden={toggleHidden}
                onSelect={setSelected}
                onHover={setHovered}
                onContextMenu={onRowContextMenu}
              />
            </div>
          </div>
        </div>

        {/* Resize bar = THE divider between tree and lane. 1 px wide line
            (no gap on either side), widens to 4 px on hover. Hit area is
            8 px via an absolute overlay that overflows into the neighbors,
            so the visible line stays flush while the drag target is
            generous. `z-30` sits above lane content + Playhead (z-20) so
            the hover grow (which bleeds ~1.5 px past the 1 px wrapper
            because of `left-1/2 -translate-x-1/2 w-1`) overlays the lane
            cleanly instead of being punched through by lane pixels. */}
        <div
          className="relative shrink-0 w-px cursor-col-resize group z-30"
          onPointerDown={onResizeStart}
          aria-label="resize tree column"
        >
          <div className="absolute inset-y-0 -left-1 -right-1 z-10" />
          <div className="absolute inset-y-0 left-1/2 -translate-x-1/2 w-px bg-zinc-200 dark:bg-zinc-800 transition-all duration-100 group-hover:w-1 group-hover:bg-indigo-400/60" />
        </div>

        {/* LANE SIDE */}
        <div
          ref={laneAreaRef}
          className="relative flex-1 min-w-0 flex flex-col overflow-hidden cursor-crosshair active:cursor-grabbing touch-none"
        >
          <div style={{ height: RULER_HEIGHT }} className="shrink-0">
            <TimeRuler height={RULER_HEIGHT} snapPoints={snapPoints} />
          </div>
          <div
            ref={scrollerRef}
            onScroll={onScroll}
            className="flex-1 overflow-y-auto overflow-x-hidden"
          >
            <LaneRows
              rows={rows}
              rowLayout={rowLayout}
              visibleRange={visibleRange}
              totalHeight={totalHeight}
              views={views}
              hiddenDirect={hidden}
              hiddenInherited={hiddenInherited}
              hovered={hovered}
              onHover={setHovered}
              onContextMenu={onRowContextMenu}
            />
          </div>
          <Playhead areaRef={laneAreaRef} />
          <TimelineCursor areaRef={laneAreaRef} snapPoints={snapPoints} />
          <TemporalMarkerLayer
            markers={tempMarkers}
            onRemove={(idx) =>
              setTempMarkers((prev) => prev.filter((_, i) => i !== idx))
            }
          />
          <NavigationControls />
        </div>
      </div>
    </div>
  );
}

/**
 * Persistent `T1 / T2 / T3…` static cursors at shift-click times. Click
 * the marker pill to remove it.
 */
function TemporalMarkerLayer({
  markers,
  onRemove,
}: {
  markers: readonly number[];
  onRemove(index: number): void;
}) {
  const v = useTimelineViewport();
  if (markers.length === 0) return null;
  return (
    <>
      {markers.map((t, i) => {
        const percent =
          ((t - v.scrollSec) * v.pxPerSecond) /
          Math.max(1, v.containerWidth) *
          100;
        if (percent < -5 || percent > 105) return null;
        return (
          <div
            key={`tm-${t}-${i}`}
            className="absolute top-0 h-full pointer-events-none"
            style={{ left: 0, right: 0, zIndex: 90 }}
          >
            <CursorOverlay
              left={percent}
              label={`T${i + 1}`}
              variant="static"
              showReadout
              zIndex={90}
            />
            <button
              type="button"
              className="absolute top-1 -translate-x-1/2 pointer-events-auto h-[18px] w-[36px] cursor-pointer"
              style={{ left: `${percent}%`, zIndex: 91 }}
              onClick={() => onRemove(i)}
              title={`Remove T${i + 1}`}
              aria-label={`Remove temporal marker T${i + 1}`}
            />
          </div>
        );
      })}
    </>
  );
}
