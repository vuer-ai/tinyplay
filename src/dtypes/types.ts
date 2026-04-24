/**
 * Data-type (`dtype`) registry types.
 *
 * A `dtype` declares **what kind of data** a track carries — joint angles,
 * IMU readings, video, annotations. It does NOT declare how the data is
 * rendered; that's the `<TimelineContainer views>` map (dtype → lane
 * component) or, for standalone views, a direct React import.
 *
 * Only four fields live here — the rest of the dtype contract (chunk
 * format, JSONL field shape, sample data, compatible views) lives in the
 * per-dtype MDX doc page. TypeScript holds only what the library actually
 * consumes at runtime.
 */

import type { FC } from 'react';
import type { LaneComponent, TreeCellProps } from '../timeline/types/lanes';

/**
 * Registry key for a dtype. Snake_case by convention — matches the upstream
 * `dreamlake-py` API (`episode.track('robot/joint_positions')`) and keeps
 * ids distinct from React component identifiers.
 */
export type DtypeId = string;

/**
 * The full runtime spec for a dtype. All semantic documentation
 * (chunk format, sample shape, etc.) lives in the doc site, not here.
 */
export interface DtypeSpec {
  /** Snake_case registry key: 'joint_angles', 'imu_6dof'. */
  id: DtypeId;
  /** Human-readable label for UI pickers and error messages. */
  name: string;
  /** One-line summary surfaced in validation errors and tooling. */
  description?: string;
  /**
   * Default lane-prop values merged into `TrackRow.props` at render time.
   * The track's own `props` always wins over these defaults.
   */
  defaults?: Record<string, unknown>;
}

/**
 * Per-group presentation override in `TimelineConfig.groups`. Keyed by
 * path prefix (e.g. `"robot/arm"`). Absent prefixes use defaults
 * (path-leaf as label, no icon, expanded = true).
 */
export interface GroupConfig {
  /** Overrides the path-leaf default label. */
  name?: string;
  color?: string;
  icon?: string;
  expanded?: boolean;
}

/**
 * One lane registration. Keyed on a `DtypeId` inside `TimelineViews`.
 *
 * Mirrors the shape of the old `LaneDefinition` so the rest of the
 * tree/lane rendering code doesn't need to change — only the dispatch key
 * (was: component name, now: dtype id).
 */
export interface TimelineViewEntry {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  lane: LaneComponent<any>;
  treeCell?: FC<TreeCellProps>;
  /** Icon name for the default tree cell. */
  icon?: string;
  /** Default row height in px when the track has no explicit `height`
   *  and the dtype has no `defaults.defaultHeight`. */
  defaultHeight?: number;
}

/**
 * Lookup map from `DtypeId` → lane registration. Supplied by the consumer
 * app as the `views` prop on `<TimelineContainer>`. `defaultTimelineViews`
 * (exported from this package) provides the stock wiring for built-ins.
 */
export type TimelineViews = Record<DtypeId, TimelineViewEntry>;
