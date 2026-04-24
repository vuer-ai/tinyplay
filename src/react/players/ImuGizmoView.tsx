import { usePlaylist } from '../hooks/use-playlist';
import { useMergedTrack } from '../hooks/use-merged-track';
import { useTrackSample } from '../hooks/use-track-sample';
import { useClockValue } from '../hooks/use-clock-value';
import { useClockContext } from '../clock-context';
import type { TimelineClock } from '../../core/timeline';
import type { DtypeRef } from './dtype-helpers';

export interface ImuGizmoViewProps {
  src: string;
  clock?: TimelineClock | null;
  /** Optional dtype id or spec. Informational — passed by `<TrackerContainer>` during dispatch. */
  dtype?: DtypeRef;
  className?: string;
  /** Display fps. Defaults to 30. */
  fps?: number;
  /** Magnitude over which the shake ring fully saturates, in m/s². Defaults to 8. */
  shakeThreshold?: number;
  /** Gyro rate at which a component bar fills, in rad/s. Defaults to 3. */
  gyroFullScale?: number;
}

const DEG = 180 / Math.PI;

/**
 * ImuGizmoView — aviation-style attitude indicator ("artificial horizon").
 *
 * Reads the same 6-axis IMU stream as `ImuChartView` (`{ts, data:
 * [ax, ay, az, gx, gy, gz]}`) but presents it as an instrument-panel
 * gizmo:
 *  • A clipped disc with a tilted sky/earth split — horizon line rotated
 *    by roll (from accel xy plane) and translated by pitch (from accel).
 *  • A pulsing orange ring when |accel| deviates from gravity — "shake
 *    indicator".
 *  • Three horizontal bars to the right showing gyro xyz rate.
 *
 * For dense value readouts, pair this with `ImuChartView` on the same
 * clock — or just use `ImuChartView` directly.
 */
export function ImuGizmoView({
  src,
  clock,
  className,
  fps = 30,
  shakeThreshold = 8,
  gyroFullScale = 3,
}: ImuGizmoViewProps) {
  const resolvedClock = useClockContext(clock);
  const { engine } = usePlaylist({ url: src }, resolvedClock);
  const { tracks } = useMergedTrack(engine, resolvedClock);
  const time = useClockValue(fps, resolvedClock);
  const sample = useTrackSample(tracks.get('data'), time);

  const ax = sample?.[0] ?? 0;
  const ay = sample?.[1] ?? 0;
  const az = sample?.[2] ?? 9.81;
  const gx = sample?.[3] ?? 0;
  const gy = sample?.[4] ?? 0;
  const gz = sample?.[5] ?? 0;

  // Euler angles from the accel vector: gravity "down" defines tilt.
  //   roll  = rotation about +X axis, positive = right wing down
  //   pitch = rotation about +Y axis, positive = nose up
  const roll = Math.atan2(ay, az);
  const pitch = Math.atan2(-ax, Math.sqrt(ay * ay + az * az));

  // Shake = how much the accel magnitude deviates from 1g.
  const mag = Math.sqrt(ax * ax + ay * ay + az * az);
  const shake = Math.min(1, Math.abs(mag - 9.81) / shakeThreshold);

  return (
    <div className={`bg-zinc-900 text-zinc-100 text-xs font-mono ${className ?? ''}`}>
      <div className="px-3 py-1.5 flex gap-4 border-b border-zinc-800 text-[10px]">
        <span className="text-zinc-400">IMU gizmo @ {time.toFixed(2)}s</span>
      </div>
      <div className="flex" style={{ minHeight: 240 }}>
        <div className="flex-1 flex items-center justify-center">
          <AttitudeDisc roll={roll} pitch={pitch} shake={shake} />
        </div>
        <div className="w-44 shrink-0 border-l border-zinc-800 p-3 space-y-3">
          <GyroBar label="gX" value={gx} full={gyroFullScale} color="#fb923c" />
          <GyroBar label="gY" value={gy} full={gyroFullScale} color="#a78bfa" />
          <GyroBar label="gZ" value={gz} full={gyroFullScale} color="#22d3ee" />
          <div className="pt-2 border-t border-zinc-800 space-y-0.5 text-[11px]">
            <Row label="roll" value={`${(roll * DEG).toFixed(1)}°`} />
            <Row label="pitch" value={`${(pitch * DEG).toFixed(1)}°`} />
            <Row label="|a|" value={`${mag.toFixed(2)} m/s²`} />
          </div>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------

function AttitudeDisc({ roll, pitch, shake }: { roll: number; pitch: number; shake: number }) {
  const R = 100;
  // Map pitch to a vertical shift inside the disc. 60° of pitch → full radius.
  const pitchPx = (pitch / (Math.PI / 3)) * R;

  return (
    <svg viewBox="-120 -120 240 240" width="200" height="200" role="img" aria-label="Attitude indicator">
      <defs>
        <clipPath id="imu-disc">
          <circle r={R} />
        </clipPath>
        <linearGradient id="imu-sky" x1="0" y1="1" x2="0" y2="0">
          <stop offset="0" stopColor="#0ea5e9" />
          <stop offset="1" stopColor="#1e3a8a" />
        </linearGradient>
        <linearGradient id="imu-earth" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#92400e" />
          <stop offset="1" stopColor="#451a03" />
        </linearGradient>
      </defs>
      {/* Horizon group: rotated by -roll (so a positive roll tilts horizon right-down visually)
          and translated up/down by pitch. */}
      <g clipPath="url(#imu-disc)">
        <g transform={`rotate(${-roll * DEG}) translate(0 ${pitchPx})`}>
          <rect x={-400} y={-800} width={800} height={800} fill="url(#imu-sky)" />
          <rect x={-400} y={0} width={800} height={800} fill="url(#imu-earth)" />
          <line x1={-400} y1={0} x2={400} y2={0} stroke="#fef3c7" strokeWidth={2} />
          {/* Pitch ticks at ±10°, ±20°, ±30° */}
          {[-30, -20, -10, 10, 20, 30].map((deg) => {
            const y = (-deg / 60) * R;
            const major = deg % 20 === 0;
            const len = major ? 28 : 14;
            return (
              <g key={deg}>
                <line x1={-len} y1={y} x2={len} y2={y} stroke="#fef3c7" strokeWidth={1} />
                {major && (
                  <>
                    <text x={-len - 4} y={y + 3} fill="#fef3c7" fontSize={8} textAnchor="end">
                      {Math.abs(deg)}
                    </text>
                    <text x={len + 4} y={y + 3} fill="#fef3c7" fontSize={8} textAnchor="start">
                      {Math.abs(deg)}
                    </text>
                  </>
                )}
              </g>
            );
          })}
        </g>
      </g>
      {/* Disc border */}
      <circle r={R} fill="none" stroke="#52525b" strokeWidth={2} />
      {/* Roll arc (top) */}
      <g stroke="#a1a1aa" strokeWidth={1} fill="none">
        <path d={`M ${-R * Math.sin(Math.PI / 6)} ${-R * Math.cos(Math.PI / 6)} A ${R} ${R} 0 0 1 ${R * Math.sin(Math.PI / 6)} ${-R * Math.cos(Math.PI / 6)}`} />
        {/* Roll indicator triangle fixed at top */}
        <polygon points={`0,${-R + 2} -6,${-R + 12} 6,${-R + 12}`} fill="#fbbf24" stroke="none" />
      </g>
      {/* Roll reading — moving triangle rotated by roll */}
      <g transform={`rotate(${-roll * DEG})`}>
        <polygon points={`0,${-R + 14} -5,${-R + 24} 5,${-R + 24}`} fill="#e4e4e7" stroke="none" />
      </g>
      {/* Fixed airplane pip in the center */}
      <g stroke="#fbbf24" strokeWidth={3} fill="none" strokeLinecap="round">
        <line x1={-36} y1={0} x2={-10} y2={0} />
        <line x1={10} y1={0} x2={36} y2={0} />
        <circle cx={0} cy={0} r={3} fill="#fbbf24" stroke="none" />
      </g>
      {/* Shake ring */}
      {shake > 0.02 && (
        <circle r={R + 4} fill="none" stroke="#f97316" strokeWidth={3 + shake * 4} opacity={0.25 + shake * 0.65} />
      )}
    </svg>
  );
}

function GyroBar({
  label,
  value,
  full,
  color,
}: {
  label: string;
  value: number;
  full: number;
  color: string;
}) {
  const pct = Math.max(-1, Math.min(1, value / full));
  return (
    <div>
      <div className="flex justify-between mb-0.5 text-[11px]">
        <span className="text-zinc-400">{label}</span>
        <span className="tabular-nums">{value.toFixed(3)}</span>
      </div>
      <div className="h-2 relative bg-zinc-800 rounded">
        <div className="absolute top-0 bottom-0 left-1/2 w-px bg-zinc-600" />
        <div
          className="absolute top-0 bottom-0 rounded"
          style={{
            background: color,
            left: pct >= 0 ? '50%' : `${50 + pct * 50}%`,
            width: `${Math.abs(pct) * 50}%`,
          }}
        />
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between">
      <span className="text-zinc-500">{label}</span>
      <span className="tabular-nums">{value}</span>
    </div>
  );
}
