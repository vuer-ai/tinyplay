/**
 * Canonical data shapes consumed by timeline lane components.
 *
 * Two types cover every lane. A lane's `data` prop (or the decoded payload of
 * its `src` m3u8 chunks after `normalize`) must be one of these.
 *
 * Naming mirrors existing vuer-m3u views (`ts`, `te`, `{ts, data}`) and the
 * dreamlake server's time-field conventions — but this file intentionally does
 * NOT import server types. Adapter layers live in downstream packages.
 */

/**
 * Continuous numeric sample.
 *
 * `data` shape is described by the lane's `shape` prop:
 *   shape = []        → data: number           (scalar)
 *   shape = [N]       → data: number[]         (vector of length N)
 *   shape = [H, W]    → data: number[]         (flattened, length H*W)
 */
export interface Sample {
  ts: number;
  data: number | number[];
}

/**
 * Discrete annotation. One type serves pill/marker/ribbon lanes:
 *   - `te` present  → interval (PillLane / RibbonLane)
 *   - `te` absent   → instant  (MarkerLane)
 *
 * Extra fields pass through — lanes ignore what they do not consume.
 */
export interface AnnotationEntry {
  ts: number;
  te?: number;
  label?: string;
  /** State key for RibbonLane color lookup (e.g. 'execute', 'halted'). */
  state?: string;
  /** Free classification tag (e.g. 'milestone', 'recovery'). */
  kind?: string;
  /** Per-entry color override. */
  color?: string;
  /**
   * Optional "queued at" time for event-driven systems where a job is
   * enqueued before it begins executing. When `createTime < ts`, PillLane
   * renders a dashed wait-line segment from `createTime` to `ts` preceding
   * the execution bar. Omit if the concept doesn't apply.
   */
  createTime?: number;
  [key: string]: unknown;
}
