/**
 * Serializable display config consumed by `<TimelineContainer>`.
 *
 * Two shapes:
 *   - `TrackRow` mirrors the server-side `Track` record (id, name, path,
 *     dtype, src/data + a handful of client-only presentation overrides).
 *   - `GroupConfig` carries *overrides* for a group — not a full row.
 *     Groups are synthesized client-side from `/`-separated path prefixes;
 *     their id IS the prefix. Supply an override to rename or style one.
 *
 * This split matches the server: tracks are stored, groups exist only for
 * visualization. Hierarchy comes from `path` (e.g. `"robot/joint_angles"`),
 * not from `parentId` references — matching `dreamlake-server`'s schema.
 */

import type { DtypeId, GroupConfig } from '../../dtypes/types';

export interface TimelineMeta {
  id: string;
  name?: string;
  description?: string;
  /** Canonical duration in seconds (float). */
  duration: number;
  /** Optional wall-clock anchor (Unix seconds). */
  t0?: number;
  /** Default frame rate; lanes may override. */
  fps?: number;
  meta?: Record<string, unknown>;
}

/**
 * One data row in the timeline. Exactly one of `src` or `data` must be
 * provided — runtime validated. `dtype` names a key in the dtype registry
 * and in the `<TimelineContainer views>` map.
 */
export interface TrackRow {
  /** Stable identifier — React key. */
  id: string;
  /**
   * Hierarchy + position in the tree. Uses `/` separators, e.g.
   * `"cams/wrist_cam"` or `"robot/arm/qpos"`. Prefixes of a path become
   * synthesized group rows; style them via `TimelineConfig.groups`.
   * Root tracks (no slash) render at the top level.
   */
  path: string;
  /** Registered data dtype — e.g. `'video'`, `'joint_angles'`, `'action_label'`. */
  dtype: DtypeId;
  /** m3u8 playlist URL. Mutually exclusive with `data`. */
  src?: string;
  /** Inline data; shape determined by the dtype. Mutually exclusive with `src`. */
  data?: unknown[];
  /** Tree-label override. Defaults to the last segment of `path`. */
  name?: string;
  /** Hidden tracks skip data loading and render dimmed. Default true. */
  visible?: boolean;
  /** Row height in px; overrides the dtype / view defaults. */
  height?: number;
  color?: string;
  icon?: string;
  /**
   * Per-track lane-prop overrides. Merged on top of the dtype's `defaults`
   * — track props always win. Use for episode-specific tuning such as
   * `channelNames` on a joint_angles track.
   */
  props?: Record<string, unknown>;
}

export interface TimelineConfig {
  container: TimelineMeta;
  tracks: TrackRow[];
  /**
   * Optional per-group presentation overrides, keyed by path prefix.
   * Prefixes that appear in track paths but have no entry here use default
   * styling (path-leaf as label, no icon, expanded = true).
   *
   *   groups: {
   *     "cams":     { name: "Cameras",     color: "green" },
   *     "robot":    { name: "Robot state", color: "blue"  },
   *     "robot/arm":{ icon: "arm" },        // overrides a nested group
   *   }
   */
  groups?: Record<string, GroupConfig>;
}

/** Re-export so callers can `import type { GroupConfig } from '@vuer-ai/vuer-m3u'`. */
export type { GroupConfig } from '../../dtypes/types';
