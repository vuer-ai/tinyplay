import type { TrackConfig } from './types/config';

/**
 * Tree utilities: turn a flat `TrackConfig[]` (with `parentId` pointing at
 * another track's `id`) into a depth-first sequence of visible rows, with
 * support for collapsing nodes and filtering by label substring.
 *
 * A row is visible iff:
 *   - all ancestors are expanded (not in `collapsed`)
 *   - either the filter is empty, or the node itself matches, or a
 *     descendant matches (ancestors stay visible so the match can be
 *     reached), or an ancestor matches (descendants stay visible under a
 *     matching ancestor).
 *
 * Groups (`view: 'Group'`) are ordinary parents in this tree; no special
 * handling here. LaneColumn renders null for group nodes; TreeColumn
 * renders a header cell with a chevron.
 */

export interface TreeRow {
  track: TrackConfig;
  depth: number;
  hasChildren: boolean;
  /** True when this row is the last child of its parent in the visible tree. */
  isLast: boolean;
  /**
   * Per-ancestor flag: `ancestorIsLast[i]` is true when the ancestor at depth
   * `i` is the last of its siblings. Drives the tree-guide painter: a "last"
   * ancestor contributes no vertical line to the column below it.
   */
  ancestorIsLast: boolean[];
}

/** Adjacency map: parentId → list of child tracks, in config order. */
export function buildChildren(tracks: readonly TrackConfig[]): Map<string | null, TrackConfig[]> {
  const children = new Map<string | null, TrackConfig[]>();
  for (const t of tracks) {
    const key = t.parentId ?? null;
    if (!children.has(key)) children.set(key, []);
    children.get(key)!.push(t);
  }
  return children;
}

/**
 * Depth-first walk skipping collapsed subtrees. Filter: if non-empty, any
 * node whose label matches is kept along with its ancestors and
 * descendants. Search is case-insensitive and substring-based by default;
 * pass `caseSensitive` / `regex` to change interpretation. When a filter
 * is active, `collapsed` is ignored so matches stay reachable.
 *
 * `regex` mode silently falls back to "no matches" on an invalid
 * expression so the UI can render a "bad regex" hint without crashing.
 */
export function flattenTree(
  tracks: readonly TrackConfig[],
  options: {
    collapsed?: ReadonlySet<string>;
    filter?: string;
    caseSensitive?: boolean;
    regex?: boolean;
  } = {},
): TreeRow[] {
  const collapsed = options.collapsed ?? new Set<string>();
  const rawFilter = options.filter?.trim() ?? '';
  const children = buildChildren(tracks);

  const matchSet = rawFilter
    ? computeMatchSet(tracks, rawFilter, options.caseSensitive ?? false, options.regex ?? false)
    : null;

  const rows: TreeRow[] = [];
  const walk = (
    parentId: string | null,
    depth: number,
    ancestorIsLast: boolean[],
  ) => {
    const rawKids = children.get(parentId) ?? [];
    const kids = matchSet ? rawKids.filter((t) => matchSet.has(t.id)) : rawKids;
    for (let i = 0; i < kids.length; i++) {
      const t = kids[i];
      const isLast = i === kids.length - 1;
      const hasChildren = (children.get(t.id) ?? []).length > 0;
      rows.push({ track: t, depth, hasChildren, isLast, ancestorIsLast });
      const shouldDescend = matchSet ? true : !collapsed.has(t.id);
      if (hasChildren && shouldDescend) {
        walk(t.id, depth + 1, [...ancestorIsLast, isLast]);
      }
    }
  };
  walk(null, 0, []);
  return rows;
}

function computeMatchSet(
  tracks: readonly TrackConfig[],
  filter: string,
  caseSensitive: boolean,
  regex: boolean,
): Set<string> {
  const byId = new Map(tracks.map((t) => [t.id, t]));

  // Build a matcher up front so invalid regex → zero matches without
  // throwing, and the lowercasing only happens once.
  let matches: (t: TrackConfig) => boolean;
  if (regex) {
    let re: RegExp | null = null;
    try {
      re = new RegExp(filter, caseSensitive ? '' : 'i');
    } catch {
      re = null;
    }
    matches = (t) => !!re && re.test(t.name ?? t.id);
  } else {
    const needle = caseSensitive ? filter : filter.toLowerCase();
    matches = (t) => {
      const label = t.name ?? t.id;
      return caseSensitive
        ? label.includes(needle)
        : label.toLowerCase().includes(needle);
    };
  }

  const set = new Set<string>();

  // Seed with direct matches, then expand to ancestors and descendants.
  for (const t of tracks) {
    if (matches(t)) set.add(t.id);
  }
  // Ancestors of every match.
  for (const id of [...set]) {
    let cur = byId.get(id);
    while (cur && cur.parentId != null) {
      set.add(cur.parentId);
      cur = byId.get(cur.parentId);
    }
  }
  // Descendants of every match.
  const children = buildChildren(tracks);
  const addDescendants = (id: string) => {
    for (const child of children.get(id) ?? []) {
      if (set.has(child.id)) continue;
      set.add(child.id);
      addDescendants(child.id);
    }
  };
  for (const id of [...set]) addDescendants(id);
  return set;
}

/**
 * Compute which track ids inherit a "hidden" flag from an ancestor. Used so
 * that toggling a group's visibility dims every descendant lane.
 */
export function hiddenInheritance(
  tracks: readonly TrackConfig[],
  hidden: ReadonlySet<string>,
): Map<string, boolean> {
  const byId = new Map(tracks.map((t) => [t.id, t]));
  const memo = new Map<string, boolean>();
  const check = (id: string): boolean => {
    const cached = memo.get(id);
    if (cached !== undefined) return cached;
    const t = byId.get(id);
    if (!t || t.parentId == null) {
      memo.set(id, false);
      return false;
    }
    const parentHidden = hidden.has(t.parentId) || check(t.parentId);
    memo.set(id, parentHidden);
    return parentHidden;
  };
  for (const t of tracks) check(t.id);
  return memo;
}

/** Initial collapsed Set from `expanded: false` on group nodes. */
export function initialCollapsed(tracks: readonly TrackConfig[]): Set<string> {
  const s = new Set<string>();
  for (const t of tracks) {
    if (t.view === 'Group' && t.expanded === false) s.add(t.id);
  }
  return s;
}
