import type { Playlist } from '../../core/playlist';
import type { TimelineClock } from '../../core/timeline';
import { useClockValue } from './use-clock-value';
import { useMergedTrack } from './use-merged-track';
import { useTrackSample } from './use-track-sample';
import { useClockContext } from '../clock-context';

export interface UseJointAnglesForUrdfOptions {
  /** React render rate for the returned map. Defaults to 30. */
  fps?: number;
  /** Which merged track to read the joint vector from. Defaults to `'data'`. */
  trackName?: string;
}

/**
 * Map a continuous joint-angle m3u8 stream to a `{ jointName: angle }`
 * record — the shape consumed by URDF rendering components, notably
 * `@vuer-ai/vuer`'s `<Urdf>` via its `jointValues` prop.
 *
 * The `i`-th entry of `jointNames` is bound to `sample[i]`. Joint names
 * beyond the sample's stride are skipped; extra stride components beyond
 * `jointNames.length` are ignored.
 *
 * Returns an empty object until the stream has loaded its first sample.
 *
 * @example
 * ```tsx
 * const { engine } = usePlaylist({ url: '/joints.m3u8' });
 * const jointValues = useJointAnglesForUrdf(engine, [
 *   'shoulder_pan', 'shoulder_lift', 'elbow',
 *   'wrist_1', 'wrist_2', 'wrist_3', 'gripper',
 * ]);
 * return <Urdf src="/robot.urdf" jointValues={jointValues} />;
 * ```
 */
export function useJointAnglesForUrdf(
  engine: Playlist | null,
  jointNames: string[],
  clock?: TimelineClock | null,
  options?: UseJointAnglesForUrdfOptions,
): Record<string, number> {
  const resolvedClock = useClockContext(clock);
  const { fps = 30, trackName = 'data' } = options ?? {};
  const { tracks } = useMergedTrack(engine, resolvedClock);
  const time = useClockValue(fps, resolvedClock);
  const sample = useTrackSample(tracks.get(trackName), time);

  const out: Record<string, number> = {};
  if (!sample) return out;
  const n = Math.min(jointNames.length, sample.length);
  for (let i = 0; i < n; i++) {
    out[jointNames[i]] = sample[i];
  }
  return out;
}
