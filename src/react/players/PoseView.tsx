import { useMemo } from 'react';
import { usePlaylist } from '../hooks/use-playlist';
import { useMergedTrack } from '../hooks/use-merged-track';
import { useTrackSample } from '../hooks/use-track-sample';
import { useClockValue } from '../hooks/use-clock-value';
import { useClockContext } from '../clock-context';
import { slerpQuat } from '../../core/interpolators';
import type { Normalizer } from '../../core/normalize';
import type { ContinuousSample } from '../../core/samples';
import type { TimelineClock } from '../../core/timeline';
import type { DtypeRef } from './dtype-helpers';

/**
 * One 6-DoF pose sample. `data` is `[x, y, z, qx, qy, qz, qw]`.
 * Translation in meters (convention); quaternion unit-length, scalar last.
 */
export interface PoseSample {
  ts: number;
  data: [number, number, number, number, number, number, number];
}

export interface PoseViewProps {
  src: string;
  clock?: TimelineClock | null;
  /** Optional dtype id or spec. Informational — passed by `<TrackerContainer>` during dispatch. */
  dtype?: DtypeRef;
  className?: string;
  /** Display fps. Defaults to 30. */
  fps?: number;
  /** XY extent (± meters) shown on the top-down grid. Defaults to 1. */
  gridExtent?: number;
}

// Split 7-tuple into position (stride 3, lerp) + orientation (stride 4, slerpQuat).
const poseNormalizer: Normalizer<ContinuousSample[]> = (samples) => {
  if (!samples || samples.length === 0) return null;
  const first = samples[0];
  if (first == null || !Array.isArray(first.data) || first.data.length !== 7) return null;

  const n = samples.length;
  const times = new Float32Array(n);
  const pos = new Float32Array(n * 3);
  const quat = new Float32Array(n * 4);

  for (let i = 0; i < n; i++) {
    const s = samples[i];
    times[i] = s.ts;
    const d = s.data as number[];
    pos[i * 3] = d[0];
    pos[i * 3 + 1] = d[1];
    pos[i * 3 + 2] = d[2];
    quat[i * 4] = d[3];
    quat[i * 4 + 1] = d[4];
    quat[i * 4 + 2] = d[5];
    quat[i * 4 + 3] = d[6];
  }

  return new Map([
    ['position', { times, values: pos, stride: 3 }],
    ['orientation', { times, values: quat, stride: 4 }],
  ]);
};

/**
 * PoseView — rotating colored cube + top-down XY grid with a yaw-aware marker.
 *
 * Left: a 3D-looking cube drawn in SVG, with six face colors keyed to
 * world axes (X=red, Y=green, Z=blue; negative variants darker). The cube
 * is rotated by the current quaternion using painter's-algorithm face
 * sorting. Right: a top-down position grid with a trail and a triangular
 * marker oriented by yaw.
 *
 * ## Data format
 * JSONL lines of shape `{ ts: number, data: [x, y, z, qx, qy, qz, qw] }`.
 * Quaternion is scalar-last (`qw` at index 6) and must be unit-length.
 *
 * ## Hooks used
 * `useMergedTrack` with a normalizer that splits each 7-tuple into
 * `"position"` (stride 3) and `"orientation"` (stride 4) tracks. Position
 * uses `lerp`; orientation uses `slerpQuat`.
 */
export function PoseView({
  src,
  clock,
  className,
  fps = 30,
  gridExtent = 1,
}: PoseViewProps) {
  const resolvedClock = useClockContext(clock);
  const { engine } = usePlaylist({ url: src }, resolvedClock);
  const mergeOptions = useMemo(() => ({ normalize: poseNormalizer }), []);
  const { tracks } = useMergedTrack(engine, resolvedClock, mergeOptions);
  const time = useClockValue(fps, resolvedClock);
  const posTrack = tracks.get('position');
  const orientTrack = tracks.get('orientation');
  const position = useTrackSample(posTrack, time);
  const orientation = useTrackSample(orientTrack, time, slerpQuat);

  // Everything below is computed inline each render — `position` and
  // `orientation` are reused Float32Arrays with stable references but
  // mutated contents, so useMemo deps don't detect changes.
  const trail = buildTrail(posTrack, time, 80);
  const yaw = orientation ? yawFromQuat(orientation) : 0;

  return (
    <div className={`bg-zinc-900 text-zinc-100 text-xs font-mono ${className ?? ''}`}>
      <div className="px-3 py-1.5 flex gap-4 border-b border-zinc-800 text-[10px]">
        <span className="text-zinc-400">Pose @ {time.toFixed(2)}s</span>
        <span className="ml-auto flex gap-3">
          <LegendSwatch color="#ef4444" label="+X" />
          <LegendSwatch color="#22c55e" label="+Y" />
          <LegendSwatch color="#3b82f6" label="+Z" />
        </span>
      </div>
      <div className="grid grid-cols-2" style={{ minHeight: 260 }}>
        <div className="border-r border-zinc-800 flex items-center justify-center p-3">
          <OrientationCube q={orientation} />
        </div>
        <TopDownGrid
          extent={gridExtent}
          trail={trail}
          x={position ? position[0] : null}
          y={position ? position[1] : null}
          z={position ? position[2] : null}
          yaw={yaw}
        />
      </div>
      <div className="px-3 py-2 border-t border-zinc-800 grid grid-cols-2 gap-x-6 gap-y-0.5 text-[11px]">
        <div className="space-y-0.5">
          <div className="text-zinc-400">position (m)</div>
          {(['x', 'y', 'z'] as const).map((l, i) => (
            <div key={l} className="flex justify-between">
              <span className="text-zinc-500">{l}</span>
              <span className="tabular-nums">{position ? position[i].toFixed(3) : '—'}</span>
            </div>
          ))}
        </div>
        <div className="space-y-0.5">
          <div className="text-zinc-400">orientation (xyzw)</div>
          {(['qx', 'qy', 'qz', 'qw'] as const).map((l, i) => (
            <div key={l} className="flex justify-between">
              <span className="text-zinc-500">{l}</span>
              <span className="tabular-nums">{orientation ? orientation[i].toFixed(3) : '—'}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ---- orientation cube -----------------------------------------------------

function LegendSwatch({ color, label }: { color: string; label: string }) {
  return (
    <span className="flex items-center gap-1">
      <span className="w-2 h-2 rounded-sm" style={{ background: color }} />
      <span className="text-zinc-500">{label}</span>
    </span>
  );
}

const CUBE_CORNERS: Array<[number, number, number]> = [
  [-1, -1, -1], [ 1, -1, -1], [ 1,  1, -1], [-1,  1, -1],
  [-1, -1,  1], [ 1, -1,  1], [ 1,  1,  1], [-1,  1,  1],
];

interface CubeFace {
  idx: [number, number, number, number]; // winding order — CCW viewed from outside
  color: string;
  label: string;
}

// Face colors: primary (bright) for +axis, darker for -axis.
const CUBE_FACES: CubeFace[] = [
  { idx: [5, 6, 2, 1], color: '#ef4444', label: '+X' }, // +X (right)
  { idx: [0, 3, 7, 4], color: '#7f1d1d', label: '-X' }, // -X
  { idx: [7, 3, 2, 6], color: '#22c55e', label: '+Y' }, // +Y (top)
  { idx: [0, 4, 5, 1], color: '#166534', label: '-Y' }, // -Y
  { idx: [4, 7, 6, 5], color: '#3b82f6', label: '+Z' }, // +Z (front)
  { idx: [0, 1, 2, 3], color: '#1e3a8a', label: '-Z' }, // -Z
];

function OrientationCube({ q }: { q: Float32Array | null }) {
  // Rotate 8 corners; apply a fixed view tilt so users see the cube in 3/4
  // perspective rather than edge-on in the identity pose.
  const rotated = CUBE_CORNERS.map(([x, y, z]) => {
    const [rx, ry, rz] = q ? rotateByQuat(q, [x, y, z]) : [x, y, z];
    return viewTilt(rx, ry, rz);
  });

  const scale = 68;
  const projected = rotated.map(([x, y, z]) => ({
    px: x * scale,
    py: -y * scale, // SVG y-down
    pz: z,
  }));

  // Average Z per face for painter's algorithm (higher z = closer to camera).
  const faces = CUBE_FACES.map((f, fi) => {
    const zAvg = (projected[f.idx[0]].pz + projected[f.idx[1]].pz + projected[f.idx[2]].pz + projected[f.idx[3]].pz) / 4;
    return { ...f, zAvg, fi };
  });
  faces.sort((a, b) => a.zAvg - b.zAvg); // farther first

  return (
    <svg viewBox="-120 -120 240 240" width="220" height="220" role="img" aria-label="Orientation cube">
      {/* Ghost floor */}
      <g stroke="#27272a" strokeWidth={1} fill="none">
        <line x1={-100} y1={0} x2={100} y2={0} />
        <line x1={0} y1={-100} x2={0} y2={100} />
        <circle r={100} />
      </g>
      {faces.map((f) => {
        const points = f.idx.map((i) => `${projected[i].px.toFixed(1)},${projected[i].py.toFixed(1)}`).join(' ');
        const [cx, cy] = faceCenter(projected, f.idx);
        return (
          <g key={f.label}>
            <polygon points={points} fill={f.color} stroke="#18181b" strokeWidth={1} strokeLinejoin="round" />
            <text
              x={cx}
              y={cy + 3}
              fill="rgba(255,255,255,0.9)"
              fontSize={10}
              fontFamily="ui-monospace, monospace"
              textAnchor="middle"
              pointerEvents="none"
            >
              {f.label}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

function faceCenter(
  proj: Array<{ px: number; py: number; pz: number }>,
  idx: [number, number, number, number],
): [number, number] {
  const cx = (proj[idx[0]].px + proj[idx[1]].px + proj[idx[2]].px + proj[idx[3]].px) / 4;
  const cy = (proj[idx[0]].py + proj[idx[1]].py + proj[idx[2]].py + proj[idx[3]].py) / 4;
  return [cx, cy];
}

/** Rotate vec by quat `[qx, qy, qz, qw]`. Returns `[x, y, z]`. */
function rotateByQuat(q: Float32Array, v: [number, number, number]): [number, number, number] {
  const qx = q[0], qy = q[1], qz = q[2], qw = q[3];
  const [vx, vy, vz] = v;
  // t = 2 * (q.xyz × v)
  const tx = 2 * (qy * vz - qz * vy);
  const ty = 2 * (qz * vx - qx * vz);
  const tz = 2 * (qx * vy - qy * vx);
  // v' = v + qw * t + q.xyz × t
  return [
    vx + qw * tx + (qy * tz - qz * ty),
    vy + qw * ty + (qz * tx - qx * tz),
    vz + qw * tz + (qx * ty - qy * tx),
  ];
}

/** Fixed camera tilt so the cube reads as 3D in the identity pose. */
function viewTilt(x: number, y: number, z: number): [number, number, number] {
  // Rotate around world X by -25°, then around world Y by 30°.
  const rx = -25 * Math.PI / 180;
  const ry = 30 * Math.PI / 180;
  // Rx
  let x1 = x;
  let y1 = y * Math.cos(rx) - z * Math.sin(rx);
  let z1 = y * Math.sin(rx) + z * Math.cos(rx);
  // Ry
  const x2 = x1 * Math.cos(ry) + z1 * Math.sin(ry);
  const y2 = y1;
  const z2 = -x1 * Math.sin(ry) + z1 * Math.cos(ry);
  return [x2, y2, z2];
}

/** Yaw (rotation about world Z) from a quaternion — good for a top-down marker. */
function yawFromQuat(q: Float32Array): number {
  // Project the rotated +X axis onto the XY plane, take atan2.
  const fwd = rotateByQuat(q, [1, 0, 0]);
  return Math.atan2(fwd[1], fwd[0]);
}

// ---- top-down grid --------------------------------------------------------

function buildTrail(
  posTrack: { times: Float32Array; values: Float32Array; stride: number } | undefined,
  now: number,
  maxPoints: number,
): Array<{ x: number; y: number }> {
  if (!posTrack || posTrack.times.length < 2) return [];
  const { times, values, stride } = posTrack;
  const tail: Array<{ x: number; y: number }> = [];
  const tailWindow = 5; // seconds
  const t0 = now - tailWindow;
  const step = Math.max(1, Math.floor((times.length - 1) / maxPoints));
  for (let i = 0; i < times.length; i += step) {
    const t = times[i];
    if (t < t0) continue;
    if (t > now) break;
    tail.push({ x: values[i * stride], y: values[i * stride + 1] });
  }
  return tail;
}

function TopDownGrid({
  extent,
  trail,
  x,
  y,
  z,
  yaw,
}: {
  extent: number;
  trail: Array<{ x: number; y: number }>;
  x: number | null;
  y: number | null;
  z: number | null;
  yaw: number;
}) {
  const W = 200;
  const H = 200;
  const scaleX = (v: number) => (v / extent) * (W / 2) + W / 2;
  const scaleY = (v: number) => -((v / extent) * (H / 2)) + H / 2;

  const path = trail.length
    ? trail.map((p, i) => `${i === 0 ? 'M' : 'L'}${scaleX(p.x).toFixed(1)},${scaleY(p.y).toFixed(1)}`).join(' ')
    : '';

  return (
    <div className="relative flex-1">
      <svg viewBox={`0 0 ${W} ${H}`} width="100%" height="100%" style={{ maxHeight: 260 }}>
        {/* Grid */}
        <g stroke="#27272a" strokeWidth={1}>
          {[0.25, 0.5, 0.75].map((f) => (
            <g key={f}>
              <line x1={W * f} y1={0} x2={W * f} y2={H} />
              <line x1={0} y1={H * f} x2={W} y2={H * f} />
            </g>
          ))}
        </g>
        <g stroke="#3f3f46" strokeWidth={1}>
          <line x1={W / 2} y1={0} x2={W / 2} y2={H} />
          <line x1={0} y1={H / 2} x2={W} y2={H / 2} />
        </g>
        {/* Trail */}
        {path && <path d={path} stroke="#fbbf24" strokeWidth={1.5} fill="none" opacity={0.75} />}
        {/* Yaw-aware marker — triangle */}
        {x != null && y != null && (
          <g transform={`translate(${scaleX(x).toFixed(1)} ${scaleY(y).toFixed(1)}) rotate(${-yaw * 180 / Math.PI})`}>
            <polygon points="11,0 -7,-6 -7,6" fill="#facc15" stroke="#18181b" strokeWidth={1} />
            <circle r={14} fill="none" stroke="#facc15" strokeWidth={1} opacity={0.4} />
          </g>
        )}
        {/* Extent label */}
        <text x={6} y={12} fill="#71717a" fontSize={9}>±{extent.toFixed(1)} m (xy) · ↑ = heading</text>
      </svg>
      {/* Z altitude bar */}
      {z != null && (
        <div className="absolute top-2 right-2 bottom-2 w-1.5 bg-zinc-800 rounded">
          <div
            className="absolute left-0 right-0 bg-blue-400 rounded"
            style={{
              top: '50%',
              height: Math.min(50, Math.abs(z / extent) * 50) + '%',
              transform: z >= 0 ? 'translateY(-100%)' : 'translateY(0)',
            }}
          />
          <div className="absolute -left-6 top-0 text-zinc-500 text-[9px]">+z</div>
          <div className="absolute -left-6 bottom-0 text-zinc-500 text-[9px]">-z</div>
        </div>
      )}
    </div>
  );
}
