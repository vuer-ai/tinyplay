import type React from 'react';
import { Icon } from './Icon';
import { TreeCellDefault } from './TreeCellDefault';
import type { TrackRow } from './types/config';
import type { TimelineViews } from '../dtypes/types';
import type { TreeRow } from './tree';

export interface TreeColumnProps {
  rows: readonly TreeRow[];
  rowLayout: ReadonlyArray<{ y: number; h: number }>;
  visibleRange: readonly [number, number];
  totalHeight: number;
  width: number;

  collapsed: ReadonlySet<string>;
  hiddenDirect: ReadonlySet<string>;
  hiddenInherited: ReadonlyMap<string, boolean>;
  selected: string | null;
  hovered: string | null;
  views: TimelineViews;

  onToggleCollapsed(id: string): void;
  onToggleHidden(id: string): void;
  onSelect(id: string | null): void;
  onHover(id: string | null): void;
  onContextMenu?: (track: TrackRow, e: React.MouseEvent) => void;
}

export interface TreeSearchProps {
  value: string;
  onChange(s: string): void;
  caseSensitive: boolean;
  onCaseSensitiveChange(v: boolean): void;
  regex: boolean;
  onRegexChange(v: boolean): void;
  regexValid: boolean;
  /** Matching-row count. When value is non-empty and regex is valid, rendered as "N results" below the input. */
  resultCount?: number;
}

/**
 * Search input with `Aa` case-sensitive and `.*` regex toggles — mirrors
 * vuer-uikit's `TreeSearchBar` pill style (h-6 · rounded-[10px] · slot-based
 * layout).
 */
export function TreeSearch({
  value,
  onChange,
  caseSensitive,
  onCaseSensitiveChange,
  regex,
  onRegexChange,
  regexValid,
  resultCount,
}: TreeSearchProps) {
  const toggleBtn = (active: boolean) =>
    'p-1 rounded-[6px] cursor-pointer transition-colors ' +
    (active
      ? 'bg-zinc-200/80 text-zinc-900 dark:bg-zinc-700/80 dark:text-zinc-100'
      : 'text-zinc-500 hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-200 hover:bg-zinc-200/60 dark:hover:bg-zinc-800');
  const hasActiveQuery = value.trim().length > 0 && (!regex || regexValid);
  return (
    <div className="w-full">
      <div
        className={
          'flex items-center gap-1.5 w-full h-6 px-1.5 bg-zinc-100 dark:bg-zinc-800/70 overflow-hidden transition-colors hover:bg-zinc-100/80 dark:hover:bg-zinc-800/50 focus-within:bg-zinc-100 dark:focus-within:bg-zinc-800/70 [&]:rounded-[10px]'
        }
      >
        <span className="shrink-0 text-zinc-500 dark:text-zinc-400 flex items-center">
          <Icon name="search" size={14} strokeWidth={1} />
        </span>
        <input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="Search..."
          spellCheck={false}
          className={
            'flex-1 min-w-0 h-full bg-transparent border-0 outline-hidden text-[12px] placeholder:text-zinc-400 dark:placeholder:text-zinc-500 ' +
            (regex && !regexValid
              ? 'text-red-500'
              : 'text-zinc-800 dark:text-zinc-100')
          }
        />
        <button
          type="button"
          onClick={() => onCaseSensitiveChange(!caseSensitive)}
          title="Case Sensitive"
          aria-pressed={caseSensitive}
          className={toggleBtn(caseSensitive)}
        >
          <Icon name="case-sensitive" size={14} />
        </button>
        <button
          type="button"
          onClick={() => onRegexChange(!regex)}
          title="Use Regular Expression"
          aria-pressed={regex}
          className={toggleBtn(regex)}
        >
          <Icon name="regex" size={14} />
        </button>
      </div>
      {hasActiveQuery && typeof resultCount === 'number' && (
        <div className="flex justify-end px-2 pt-0.5">
          <span className="text-[10px] text-zinc-500 dark:text-zinc-400 tabular-nums">
            {resultCount} result{resultCount !== 1 ? 's' : ''}
          </span>
        </div>
      )}
    </div>
  );
}

/**
 * Virtualized left column. Dispatches through `views[track.dtype]` for
 * per-view `TreeCell` overrides; absent ones fall back to `TreeCellDefault`.
 * Group rows always use the default cell (no per-dtype override slot).
 */
export function TreeRows({
  rows,
  rowLayout,
  visibleRange,
  totalHeight,
  collapsed,
  hiddenDirect,
  hiddenInherited,
  selected,
  hovered,
  views,
  onToggleCollapsed,
  onToggleHidden,
  onSelect,
  onHover,
  onContextMenu,
}: Omit<TreeColumnProps, 'width'>) {
  const [first, last] = visibleRange;
  return (
    <div style={{ height: totalHeight, position: 'relative' }}>
      {rows.slice(first, last + 1).map((r, i) => {
        const idx = first + i;
        const layout = rowLayout[idx];
        if (!layout) return null;

        const entry = r.kind === 'track' ? views[r.track.dtype] : undefined;
        const TreeCell = entry?.treeCell ?? TreeCellDefault;
        const hoveredRow = hovered === r.id;
        const selectedRow = selected === r.id;
        const isGroup = r.kind === 'group';
        const resolvedIcon =
          r.kind === 'track'
            ? r.track.icon ?? entry?.icon
            : r.config.icon;

        return (
          <div
            key={r.id}
            className={rowWrapperClass(isGroup, selectedRow, hoveredRow)}
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
            onClick={() => onSelect(r.id)}
            onContextMenu={
              onContextMenu && r.kind === 'track'
                ? (e) => {
                    e.preventDefault();
                    onContextMenu(r.track, e);
                  }
                : undefined
            }
          >
            <TreeCell
              row={r}
              expanded={!collapsed.has(r.id)}
              hovered={hoveredRow}
              selected={selectedRow}
              hiddenDirect={hiddenDirect.has(r.id)}
              hiddenInherited={hiddenInherited.get(r.id) ?? false}
              height={layout.h}
              icon={resolvedIcon}
              onToggleExpanded={() => onToggleCollapsed(r.id)}
              onToggleHidden={() => onToggleHidden(r.id)}
            />
          </div>
        );
      })}
    </div>
  );
}

function rowWrapperClass(
  isGroup: boolean,
  selected: boolean,
  hovered: boolean,
): string {
  const base = 'transition-colors';
  if (selected) return `${base} bg-indigo-50/70 dark:bg-indigo-500/10`;
  if (hovered) return `${base} bg-zinc-100/60 dark:bg-zinc-800/40`;
  if (isGroup) return `${base} bg-zinc-50/70 dark:bg-zinc-900/40`;
  return base;
}
