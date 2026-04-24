import type { DtypeSpec } from './types';

/**
 * Stock dtype specs shipped with `@vuer-ai/vuer-m3u`. Registered at module
 * load in `./index.ts`. Full semantic documentation (chunk format, JSONL
 * field shape, sample data, compatible views) lives on the per-dtype MDX
 * pages — this file holds only what the library executes.
 */
export const BUILTIN_DTYPES: readonly DtypeSpec[] = [
  {
    id: 'video',
    name: 'Video',
    description: 'HLS video segments (MPEG-TS or fMP4).',
    defaults: { defaultHeight: 56 },
  },
  {
    id: 'audio',
    name: 'Audio',
    description: 'HLS audio segments (AAC).',
  },
  {
    id: 'subtitle',
    name: 'Subtitle',
    description: 'W3C WebVTT captions.',
    defaults: { textField: 'text' },
  },
  {
    id: 'scalar',
    name: 'Scalar time-series',
    description: 'Single-channel numeric samples — `{ts, data: number}`.',
  },
  {
    id: 'vector',
    name: 'Vector time-series',
    description: 'Multi-channel numeric samples — `{ts, data: number[]}`.',
  },
  {
    id: 'imu_6dof',
    name: 'IMU (6-DoF)',
    description: '6-axis accelerometer + gyroscope — `{ts, data: [ax,ay,az,gx,gy,gz]}`.',
    defaults: {
      shape: [6],
      channelGroups: [
        ['ax', 'ay', 'az'],
        ['gx', 'gy', 'gz'],
      ],
    },
  },
  {
    id: 'joint_angles',
    name: 'Joint angles',
    description: 'N-DoF joint state in radians — `{ts, data: number[]}`.',
    defaults: {
      range: [-Math.PI, Math.PI],
      unit: 'rad',
    },
  },
  {
    id: 'pose_6dof',
    name: 'Pose (6-DoF)',
    description: 'Position + unit-quaternion — `{ts, data: [x,y,z,qx,qy,qz,qw]}`.',
    defaults: {
      shape: [7],
      channelGroups: [
        ['x', 'y', 'z'],
        ['qx', 'qy', 'qz', 'qw'],
      ],
    },
  },
  {
    id: 'image',
    name: 'Image',
    description: 'Single-frame or frame-series image data. Reserved — no default lane.',
  },
  {
    id: 'action_label',
    name: 'Action label',
    description: 'Interval annotations — `{ts, te, label, ...}`.',
    defaults: { textField: 'label' },
  },
  {
    id: 'marker_event',
    name: 'Marker event',
    description: 'Instant events — `{ts, label, ...}`.',
    defaults: { markerShape: 'diamond' },
  },
  {
    id: 'detection_2d',
    name: '2D detection',
    description: 'Bounding-box detections — `{ts, te, label, bbox: [x,y,w,h]}`.',
  },
  {
    id: 'ribbon_state',
    name: 'Ribbon state',
    description: 'State-segmented annotations — `{ts, te, state, ...}`.',
    defaults: { stateField: 'state' },
  },
];
