import type { TrackRow } from './types/config';
import type { GroupConfig } from '../dtypes/types';

/**
 * Tree utilities for path-based hierarchy.
 *
 * Tracks carry a `path` like `"robot/joint_angles"`; groups are synthesized
 * client-side from the `/`-separated prefixes. `TimelineConfig.groups`
 * supplies optional per-prefix styling (name override, icon, color,
 * initial expanded state).
 *
 * A row is visible iff:
 *   - all ancestor prefixes are expanded (not in `collapsed`)
 *   - either the filter is empty, or the row itself matches, or a
 *     descendant matches (ancestors stay visible so the match can be
 *     reached), or an ancestor matches (descendants stay visible under a
 *     matching ancestor).
 */

/**
 * Track row in the tree (leaf node — tracks have no descendants in this
 * model; nested tracks go under their path-prefix group).
 */
export interface TreeTrackRow {
  kind: 'track';
  /** Stable identifier — `TrackRow.id`. */
  id: string;
  track: TrackRow;
  depth: number;
  /** Always false for tracks. Kept for rendering uniformity. */
  hasChildren: false;
  isLast: boolean;
  ancestorIsLast: boolean[];
}

/**
 * Synthesized group row — emitted whenever a path prefix has at least one
 * track under it. Never stored on the server; the prefix string IS the
 * identity.
 */
export interface TreeGroupRow {
  kind: 'group';
  /** Path prefix — e.g. `"robot/arm"`. Also the `id` used for hide/collapse state. */
  id: string;
  path: string;
  /** Resolved label — `groups[prefix].name` if supplied, else path leaf. */
  name: string;
  config: GroupConfig;
  depth: number;
  hasChildren: boolean;
  isLast: boolean;
  ancestorIsLast: boolean[];
}

export type TreeRow = TreeTrackRow | TreeGroupRow;

interface PrefixInfo {
  /** The prefix itself, e.g. `"robot/arm"`. */
  path: string;
  /** Child paths (tracks or deeper prefixes), in first-appearance order. */
  childPaths: string[];
}

/**
 * Walk `tracks` once, populating a map of synthesized prefixes + an ordered
 * list of root children (top-level prefixes and slash-free tracks).
 */
function buildStructure(tracks: readonly TrackRow[]): {
  prefixes: Map<string, PrefixInfo>;
  rootChildPaths: string[];
} {
  const prefixes = new Map<string, PrefixInfo>();
  const rootSeen = new Set<string>();
  const rootChildPaths: string[] = [];

  const pushRoot = (p: string) => {
    if (!rootSeen.has(p)) {
      rootSeen.add(p);
      rootChildPaths.push(p);
    }
  };

  for (const t of tracks) {
    const segs = t.path.split('/');
    if (segs.length === 1) {
      pushRoot(t.path);
      continue;
    }

    let parentPath = '';
    let acc = '';
    for (let j = 0; j < segs.length - 1; j++) {
      acc = acc ? `${acc}/${segs[j]}` : segs[j];
      if (!prefixes.has(acc)) {
        prefixes.set(acc, { path: acc, childPaths: [] });
        if (parentPath) {
          prefixes.get(parentPath)!.childPaths.push(acc);
        } else {
          pushRoot(acc);
        }
      }
      parentPath = acc;
    }
    // Track is a leaf under its longest prefix.
    prefixes.get(parentPath)!.childPaths.push(t.path);
  }

  return { prefixes, rootChildPaths };
}

/**
 * Depth-first flatten. Skips collapsed subtrees. Filter: if non-empty, any
 * row whose label matches keeps its ancestor prefixes and its descendants
 * visible. Search is case-insensitive and substring-based by default.
 * Invalid regex yields an empty match set (no crash).
 */
export function flattenTree(
  tracks: readonly TrackRow[],
  options: {
    collapsed?: ReadonlySet<string>;
    groups?: Record<string, GroupConfig>;
    filter?: string;
    caseSensitive?: boolean;
    regex?: boolean;
  } = {},
): TreeRow[] {
  const collapsed = options.collapsed ?? new Set<string>();
  const groupsCfg = options.groups;
  const rawFilter = options.filter?.trim() ?? '';
  const { prefixes, rootChildPaths } = buildStructure(tracks);

  const byPath = new Map<string, TrackRow>();
  for (const t of tracks) byPath.set(t.path, t);

  const matchSet = rawFilter
    ? computeMatchSet(
        tracks,
        prefixes,
        groupsCfg,
        rawFilter,
        options.caseSensitive ?? false,
        options.regex ?? false,
      )
    : null;

  const rows: TreeRow[] = [];

  const walk = (
    childPaths: readonly string[],
    depth: number,
    ancestorIsLast: boolean[],
  ) => {
    const kept = matchSet ? childPaths.filter((p) => matchSet.has(p)) : childPaths;
    for (let i = 0; i < kept.length; i++) {
      const path = kept[i];
      const isLast = i === kept.length - 1;
      const track = byPath.get(path);
      if (track) {
        rows.push({
          kind: 'track',
          id: track.id,
          track,
          depth,
          hasChildren: false,
          isLast,
          ancestorIsLast,
        });
        continue;
      }
      const pi = prefixes.get(path);
      if (!pi) continue;
      const cfg = groupsCfg?.[path] ?? {};
      const leaf = path.split('/').pop() ?? path;
      const hasChildren = pi.childPaths.length > 0;
      rows.push({
        kind: 'group',
        id: path,
        path,
        name: cfg.name ?? leaf,
        config: cfg,
        depth,
        hasChildren,
        isLast,
        ancestorIsLast,
      });
      // Filter overrides collapse — matches must always be reachable.
      const shouldDescend = matchSet ? true : !collapsed.has(path);
      if (hasChildren && shouldDescend) {
        walk(pi.childPaths, depth + 1, [...ancestorIsLast, isLast]);
      }
    }
  };

  walk(rootChildPaths, 0, []);
  return rows;
}

function computeMatchSet(
  tracks: readonly TrackRow[],
  prefixes: ReadonlyMap<string, PrefixInfo>,
  groups: Readonly<Record<string, GroupConfig>> | undefined,
  filter: string,
  caseSensitive: boolean,
  regex: boolean,
): Set<string> {
  let matches: (label: string) => boolean;
  if (regex) {
    let re: RegExp | null = null;
    try {
      re = new RegExp(filter, caseSensitive ? '' : 'i');
    } catch {
      re = null;
    }
    matches = (label) => !!re && re.test(label);
  } else {
    const needle = caseSensitive ? filter : filter.toLowerCase();
    matches = (label) =>
      caseSensitive ? label.includes(needle) : label.toLowerCase().includes(needle);
  }

  const set = new Set<string>();

  // 1. Seed: direct label matches.
  for (const t of tracks) {
    const leaf = t.path.split('/').pop() ?? t.path;
    const label = t.name ?? leaf;
    if (matches(label)) set.add(t.path);
  }
  for (const [prefix] of prefixes) {
    const cfg = groups?.[prefix];
    const leaf = prefix.split('/').pop() ?? prefix;
    const label = cfg?.name ?? leaf;
    if (matches(label)) set.add(prefix);
  }

  // 2. Ancestors of each match (all proper path prefixes).
  for (const p of [...set]) {
    const segs = p.split('/');
    let acc = '';
    for (let i = 0; i < segs.length - 1; i++) {
      acc = acc ? `${acc}/${segs[i]}` : segs[i];
      set.add(acc);
    }
  }

  // 3. Descendants of each match — anything whose path is `p/...`.
  const allPaths: string[] = [];
  for (const t of tracks) allPaths.push(t.path);
  for (const [prefix] of prefixes) allPaths.push(prefix);
  for (const p of [...set]) {
    for (const cand of allPaths) {
      if (cand !== p && cand.startsWith(`${p}/`)) set.add(cand);
    }
  }

  return set;
}

/**
 * Compute hidden-inheritance for every track + group. A row is "inherited
 * hidden" when any ancestor prefix is in the `hidden` set. `hidden` holds
 * track ids AND group prefixes (the two don't overlap because group ids
 * always contain `/` unless they're top-level, and top-level prefixes are
 * group-only — a track at a top-level path is not a prefix of anything).
 */
export function hiddenInheritance(
  tracks: readonly TrackRow[],
  hidden: ReadonlySet<string>,
): Map<string, boolean> {
  // Memoize by path — every track and every prefix shares this cache.
  const { prefixes } = buildStructure(tracks);
  const pathHidden = new Map<string, boolean>();

  const checkPath = (path: string): boolean => {
    const cached = pathHidden.get(path);
    if (cached !== undefined) return cached;
    const segs = path.split('/');
    if (segs.length === 1) {
      pathHidden.set(path, false);
      return false;
    }
    const parent = segs.slice(0, -1).join('/');
    const result = hidden.has(parent) || checkPath(parent);
    pathHidden.set(path, result);
    return result;
  };

  const out = new Map<string, boolean>();
  for (const t of tracks) out.set(t.id, checkPath(t.path));
  for (const [prefix] of prefixes) out.set(prefix, checkPath(prefix));
  return out;
}

/**
 * Initial collapsed set derived from `groups[prefix].expanded === false`.
 */
export function initialCollapsed(
  groups?: Record<string, GroupConfig>,
): Set<string> {
  const s = new Set<string>();
  for (const [prefix, cfg] of Object.entries(groups ?? {})) {
    if (cfg?.expanded === false) s.add(prefix);
  }
  return s;
}
