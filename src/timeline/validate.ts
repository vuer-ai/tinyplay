/**
 * Runtime validation for `TimelineConfig` + per-track src/data exclusivity.
 *
 * Enforced at container render time plus re-usable by the JSX path. Errors
 * name the offending track so bad configs surface before any lane mounts.
 */

import type { TrackRow, TimelineConfig } from './types/config';
import { hasDtype, listDtypes } from '../dtypes/registry';

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
 * Validate a `path` string: non-empty; no empty segments; no leading,
 * trailing, or consecutive `/`.
 */
function validatePath(path: unknown, context: string): asserts path is string {
  if (typeof path !== 'string' || path.length === 0) {
    throw new Error(
      `[vuer-m3u timeline] ${context}: \`path\` must be a non-empty string (e.g. 'robot/joint_angles').`,
    );
  }
  if (path.startsWith('/') || path.endsWith('/') || path.includes('//')) {
    throw new Error(
      `[vuer-m3u timeline] ${context}: \`path\` "${path}" must not start or end with '/' and must not contain empty segments.`,
    );
  }
}

/**
 * Validate a single `TrackRow`. Throws on the first issue. Safe to call
 * during config hydration — the error message names the offending track
 * so broken configs surface before any component mounts.
 */
export function validateTrackRow(track: TrackRow): void {
  if (!track.id) {
    throw new Error(
      '[vuer-m3u timeline] TrackRow requires a non-empty `id` (used as React key).',
    );
  }
  const ctx = `TrackRow "${track.id}"`;
  validatePath(track.path, ctx);

  if (!track.dtype) {
    throw new Error(
      `[vuer-m3u timeline] ${ctx}: missing \`dtype\` (e.g. 'joint_angles', 'video', 'action_label'). See /vuer-m3u/dtypes/ for the list of registered dtypes.`,
    );
  }
  if (!hasDtype(track.dtype)) {
    const known = listDtypes()
      .map((d) => d.id)
      .join(', ');
    throw new Error(
      `[vuer-m3u timeline] ${ctx}: dtype "${track.dtype}" is not registered. Registered dtypes: ${known}. Add custom dtypes via registerDtype({ id, name, defaults? }) at app startup.`,
    );
  }

  assertSrcOrData(track, `${ctx} (dtype=${track.dtype})`);
}

/**
 * Validate a whole timeline config: container, every track, duplicate ids,
 * duplicate paths, and group overrides that don't match any prefix.
 * Returns silently on success; throws on the first structural issue.
 */
export function validateTimelineConfig(config: TimelineConfig): void {
  if (!config.container || !config.container.id) {
    throw new Error(
      '[vuer-m3u timeline] TimelineConfig.container requires a non-empty `id`.',
    );
  }
  if (
    typeof config.container.duration !== 'number' ||
    !(config.container.duration > 0)
  ) {
    throw new Error(
      `[vuer-m3u timeline] TimelineConfig.container "${config.container.id}": \`duration\` must be a positive number (seconds).`,
    );
  }

  const seenIds = new Set<string>();
  const seenPaths = new Set<string>();
  for (const track of config.tracks) {
    validateTrackRow(track);
    if (seenIds.has(track.id)) {
      throw new Error(
        `[vuer-m3u timeline] Duplicate track id "${track.id}" in TimelineConfig.`,
      );
    }
    seenIds.add(track.id);
    if (seenPaths.has(track.path)) {
      throw new Error(
        `[vuer-m3u timeline] Duplicate track path "${track.path}" in TimelineConfig — paths identify topics and must be unique.`,
      );
    }
    seenPaths.add(track.path);
  }

  // `groups` overrides that don't match any actual path prefix are
  // silent no-ops — emit a dev-mode warning rather than an error so config
  // authors can reuse a shared overrides table across episodes.
  const usedPrefixes = new Set<string>();
  for (const t of config.tracks) {
    const segs = t.path.split('/');
    let acc = '';
    for (let i = 0; i < segs.length - 1; i++) {
      acc = acc ? `${acc}/${segs[i]}` : segs[i];
      usedPrefixes.add(acc);
    }
  }
  for (const prefix of Object.keys(config.groups ?? {})) {
    if (!usedPrefixes.has(prefix)) {
      // eslint-disable-next-line no-console
      console.warn(
        `[vuer-m3u timeline] groups["${prefix}"] is set but no track path starts with "${prefix}/" — override is unused.`,
      );
    }
  }
}

// Legacy name for back-compat with tests/doc imports during migration.
// Prefer `validateTrackRow`.
export const validateTrackConfig = validateTrackRow;
