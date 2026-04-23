/**
 * Runtime validation shared between the JSX path (lane component props) and
 * the config-hydration path (TrackConfig entries).
 *
 * Both paths must enforce the same src/data mutual-exclusion rule, so
 * callers get consistent errors regardless of how they authored the track.
 */

import type { TrackConfig, TimelineConfig } from './types/config';

/**
 * Assert that a set of lane-like props carries exactly one of src / data.
 *
 * `context` is embedded in the error message (track id, view name, etc.)
 * so the thrown error is actionable without reading the caller.
 */
export function assertSrcOrData(
  props: { src?: unknown; data?: unknown },
  context: string,
): void {
  const hasSrc = props.src !== undefined && props.src !== null;
  const hasData = props.data !== undefined && props.data !== null;

  if (hasSrc && hasData) {
    throw new Error(
      `[vuer-m3u timeline] ${context}: provide either \`src\` or \`data\`, not both.`,
    );
  }
  if (!hasSrc && !hasData) {
    throw new Error(
      `[vuer-m3u timeline] ${context}: must provide either \`src\` (m3u8 URL) or \`data\` (inline array).`,
    );
  }
}

/**
 * Validate a single TrackConfig. Throws on the first issue. Safe to call
 * during config hydration — the error message names the offending track so
 * broken configs surface before any component mounts.
 */
export function validateTrackConfig(track: TrackConfig): void {
  if (!track.id) {
    throw new Error(
      '[vuer-m3u timeline] TrackConfig requires a non-empty `id` (used as React key).',
    );
  }
  if (!track.view) {
    throw new Error(
      `[vuer-m3u timeline] TrackConfig "${track.id}": missing \`view\` (registry key, e.g. 'LineChartLane').`,
    );
  }
  // Group nodes are structural — they must not carry data.
  if (track.view === 'Group') {
    if (track.src !== undefined || track.data !== undefined) {
      throw new Error(
        `[vuer-m3u timeline] TrackConfig "${track.id}" (view=Group): groups must not have \`src\` or \`data\`.`,
      );
    }
    return;
  }
  assertSrcOrData(track, `TrackConfig "${track.id}" (view=${track.view})`);
}

/**
 * Validate a whole timeline at once and surface duplicate ids. Returns
 * silently on success; throws on the first issue.
 */
export function validateTimelineConfig(config: TimelineConfig): void {
  if (!config.container || !config.container.id) {
    throw new Error(
      '[vuer-m3u timeline] TimelineConfig.container requires a non-empty `id`.',
    );
  }
  if (typeof config.container.duration !== 'number' || !(config.container.duration > 0)) {
    throw new Error(
      `[vuer-m3u timeline] TimelineConfig.container "${config.container.id}": \`duration\` must be a positive number (seconds).`,
    );
  }

  const seen = new Set<string>();
  for (const track of config.tracks) {
    validateTrackConfig(track);
    if (seen.has(track.id)) {
      throw new Error(
        `[vuer-m3u timeline] Duplicate track id "${track.id}" in TimelineConfig.`,
      );
    }
    seen.add(track.id);
  }
  // parentId must reference an existing track; cycles are not allowed.
  for (const t of config.tracks) {
    if (t.parentId != null && !seen.has(t.parentId)) {
      throw new Error(
        `[vuer-m3u timeline] TrackConfig "${t.id}" has parentId "${t.parentId}" which does not match any track id.`,
      );
    }
  }
  const byId = new Map(config.tracks.map((t) => [t.id, t]));
  for (const t of config.tracks) {
    let cur: TrackConfig | undefined = t;
    const visited = new Set<string>();
    while (cur && cur.parentId != null) {
      if (visited.has(cur.id)) {
        throw new Error(
          `[vuer-m3u timeline] parentId cycle detected involving "${t.id}".`,
        );
      }
      visited.add(cur.id);
      cur = byId.get(cur.parentId);
    }
  }
}
