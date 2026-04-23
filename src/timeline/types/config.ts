/**
 * Serializable display config. This is the canonical form a
 * `<TimelineContainer>` consumes — both the JSX composition path and the
 * config-hydration path resolve into this shape before rendering.
 *
 * All fields must JSON-serialize round-trip. `normalize` functions from
 * lane props intentionally have no slot here; use the JSX path when a
 * custom decoder is needed.
 */

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
 * One row in the timeline. Exactly one of `src` or `data` must be provided
 * — runtime validated. `view` names a component in the LaneRegistry.
 */
export interface TrackConfig {
  /** Required. Used as React key; never auto-slugified. */
  id: string;
  /** Registry key — 'VideoLane', 'LineChartLane', 'Group', etc. */
  view: string;
  /**
   * Parent node id in the tree. `null` / undefined means the node is at the
   * root. Any track (including group nodes) can be nested under any other
   * group — there is no depth limit.
   */
  parentId?: string | null;
  /**
   * For `view: 'Group'` nodes: initial expanded state. Defaults to `true`
   * (open). Ignored for leaf tracks.
   */
  expanded?: boolean;
  /** m3u8 URL. Groups have neither src nor data. */
  src?: string;
  /** Inline data. Shape determined by the chosen `view`. */
  data?: unknown[];
  name?: string;
  /** Default true. Hidden tracks skip data loading (renders dimmed). */
  visible?: boolean;
  height?: number;
  color?: string;
  icon?: string;
  /** Schema-reserved; v0 renderer ignores. */
  offset?: number;
  /** Schema-reserved; v0 renderer ignores. */
  duration?: number;
  /** Forwarded as-is to the lane component (shape, channelNames, etc.). */
  props?: Record<string, unknown>;
}

export interface TimelineConfig {
  container: TimelineMeta;
  tracks: TrackConfig[];
}
