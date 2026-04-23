import { createElement } from 'react';
import type { TrackConfig } from './types/config';
import type { LaneRegistry } from './types/lanes';
import type { TreeRow } from './tree';
import { PlaceholderLane } from './lanes/PlaceholderLane';

export interface LaneRowsProps {
  rows: readonly TreeRow[];
  rowLayout: ReadonlyArray<{ y: number; h: number }>;
  visibleRange: readonly [number, number];
  totalHeight: number;
  registry: LaneRegistry;
  hiddenDirect: ReadonlySet<string>;
  hiddenInherited: ReadonlyMap<string, boolean>;
  hovered: string | null;
  onHover(id: string | null): void;
  onContextMenu?: (track: TrackConfig, e: React.MouseEvent) => void;
}

/**
 * Flatten a TrackConfig into the shape a lane component expects. Visual
 * fields sit at the top; `props` spreads last so per-view overrides tune
 * rendering without clobbering identity.
 */
function laneProps(t: TrackConfig): Record<string, unknown> {
  const base: Record<string, unknown> = {
    id: t.id,
    name: t.name,
    visible: t.visible,
    height: t.height,
    color: t.color,
    icon: t.icon,
  };
  if (t.src !== undefined) base.src = t.src;
  if (t.data !== undefined) base.data = t.data;
  return { ...base, ...(t.props ?? {}) };
}

/**
 * Virtualized right-side rows. Only rows inside `visibleRange` are
 * rendered; off-screen lanes are unmounted to keep the DOM small. The
 * engine registry (see `engine-registry.tsx`) keeps Playlist caches
 * alive across this churn so re-entry is instant.
 */
export function LaneRows({
  rows,
  rowLayout,
  visibleRange,
  totalHeight,
  registry,
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
        const def = registry[r.track.view];
        const Lane = def?.lane;
        const isGroup = r.track.view === 'Group';
        const hiddenRow =
          hiddenDirect.has(r.track.id) ||
          (hiddenInherited.get(r.track.id) ?? false);
        const hoveredRow = hovered === r.track.id;
        return (
          <div
            key={r.track.id}
            className={laneRowClass(isGroup, hoveredRow, hiddenRow)}
            style={{
              position: 'absolute',
              left: 0,
              right: 0,
              top: layout.y,
              height: layout.h,
              overflow: 'hidden',
            }}
            onMouseEnter={() => onHover(r.track.id)}
            onMouseLeave={() => onHover(null)}
            onContextMenu={
              onContextMenu
                ? (e) => {
                    e.preventDefault();
                    onContextMenu(r.track, e);
                  }
                : undefined
            }
          >
            <div className="relative h-full">
              {Lane
                ? createElement(Lane, laneProps(r.track))
                : <PlaceholderLane track={r.track} />}
            </div>
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
  // No border between lanes — matches the reference's airy density.
  let cls = 'transition-colors';
  if (isGroup) {
    cls += ' bg-zinc-50/80 dark:bg-zinc-900/30';
  } else if (hovered) {
    cls += ' bg-zinc-50/60 dark:bg-zinc-900/30';
  }
  if (hidden) cls += ' opacity-30 saturate-50';
  return cls;
}
