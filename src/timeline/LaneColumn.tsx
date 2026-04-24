import { createElement } from 'react';
import type React from 'react';
import type { TrackRow } from './types/config';
import type { TimelineViews } from '../dtypes/types';
import { getDtype } from '../dtypes/registry';
import type { TreeRow } from './tree';
import { PlaceholderLane } from './lanes/PlaceholderLane';

export interface LaneRowsProps {
  rows: readonly TreeRow[];
  rowLayout: ReadonlyArray<{ y: number; h: number }>;
  visibleRange: readonly [number, number];
  totalHeight: number;
  views: TimelineViews;
  hiddenDirect: ReadonlySet<string>;
  hiddenInherited: ReadonlyMap<string, boolean>;
  hovered: string | null;
  onHover(id: string | null): void;
  onContextMenu?: (track: TrackRow, e: React.MouseEvent) => void;
}

/**
 * Flatten a `TrackRow` into the shape a lane component expects. Merge
 * order: identity (id, name, path, visible, height, color, icon, src,
 * data) → dtype.defaults → track.props → `dtype` + `path` injected props.
 * Track-level `props` always wins over dtype defaults.
 */
function laneProps(t: TrackRow): Record<string, unknown> {
  const spec = getDtype(t.dtype);
  const leaf = t.path.split('/').pop() ?? t.path;
  const base: Record<string, unknown> = {
    id: t.id,
    name: t.name ?? leaf,
    path: t.path,
    visible: t.visible,
    height: t.height,
    color: t.color,
    icon: t.icon,
  };
  if (t.src !== undefined) base.src = t.src;
  if (t.data !== undefined) base.data = t.data;
  return {
    ...base,
    ...(spec?.defaults ?? {}),
    ...(t.props ?? {}),
    dtype: spec,
  };
}

/**
 * Virtualized right-side rows. Only rows inside `visibleRange` are rendered;
 * off-screen lanes are unmounted. Group rows have no lane body — the
 * tree-side header carries the visual weight.
 */
export function LaneRows({
  rows,
  rowLayout,
  visibleRange,
  totalHeight,
  views,
  hiddenDirect,
  hiddenInherited,
  hovered,
  onHover,
  onContextMenu,
}: LaneRowsProps) {
  const [first, last] = visibleRange;
  return (
    <div style={{ height: totalHeight, position: 'relative' }}>
      {rows.slice(first, last + 1).map((r, i) => {
        const idx = first + i;
        const layout = rowLayout[idx];
        if (!layout) return null;

        const isGroup = r.kind === 'group';
        const hiddenRow =
          hiddenDirect.has(r.id) ||
          (hiddenInherited.get(r.id) ?? false);
        const hoveredRow = hovered === r.id;

        let body: React.ReactNode = null;
        if (r.kind === 'track') {
          const entry = views[r.track.dtype];
          const Lane = entry?.lane;
          body = Lane
            ? createElement(Lane, laneProps(r.track))
            : <PlaceholderLane track={r.track} />;
        }

        return (
          <div
            key={r.id}
            className={laneRowClass(isGroup, hoveredRow, hiddenRow)}
            style={{
              position: 'absolute',
              left: 0,
              right: 0,
              top: layout.y,
              height: layout.h,
              overflow: 'hidden',
            }}
            onMouseEnter={() => onHover(r.id)}
            onMouseLeave={() => onHover(null)}
            onContextMenu={
              onContextMenu && r.kind === 'track'
                ? (e) => {
                    e.preventDefault();
                    onContextMenu(r.track, e);
                  }
                : undefined
            }
          >
            <div className="relative h-full">{body}</div>
          </div>
        );
      })}
    </div>
  );
}

function laneRowClass(
  isGroup: boolean,
  hovered: boolean,
  hidden: boolean,
): string {
  let cls = 'transition-colors';
  if (isGroup) {
    cls += ' bg-zinc-50/80 dark:bg-zinc-900/30';
  } else if (hovered) {
    cls += ' bg-zinc-50/60 dark:bg-zinc-900/30';
  }
  if (hidden) cls += ' opacity-30 saturate-50';
  return cls;
}
