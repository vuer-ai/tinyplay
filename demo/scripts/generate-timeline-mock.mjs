#!/usr/bin/env node
/**
 * Mock timeline data generator.
 *
 * Emits a self-contained `teleop_run_037/` directory inside the demo's
 * public mock-data tree so Vite serves it at `/timeline/teleop_run_037/`:
 *
 *   demo/mock-data/timeline/teleop_run_037/
 *     config.json                       TimelineConfig (canonical)
 *     video/wrist_cam/playlist.m3u8     HLS (placeholder chunks)
 *     track/arm_qpos/playlist.m3u8      JSONL chunks of {ts, data:[7 floats]}
 *     text/operator/playlist.m3u8       JSONL chunks of {ts, te, label}
 *
 * Four tracks exercise the two data-loading paths:
 *   - wrist_cam / arm_qpos / operator — streaming via m3u8 `src`
 *   - events                          — inline `data` on the config
 *
 * Run: `node demo/scripts/generate-timeline-mock.mjs` from the vuer-m3u package root.
 */

import { mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
// Write into the demo's publicDir (../mock-data) so Vite serves the files.
const OUT = join(HERE, '..', 'mock-data', 'timeline', 'teleop_run_037');

const DURATION = 30;               // seconds
const CHUNK_SECONDS = 10;          // chunk duration
const CHUNK_COUNT = DURATION / CHUNK_SECONDS;
const QPOS_HZ = 30;                // sample rate for arm_qpos
const QPOS_CHANNELS = 7;

// ---------------------------------------------------------------------------
// helpers

function ensureCleanDir(path) {
  rmSync(path, { recursive: true, force: true });
  mkdirSync(path, { recursive: true });
}

function writeFile(relPath, contents) {
  const full = join(OUT, relPath);
  mkdirSync(dirname(full), { recursive: true });
  writeFileSync(full, contents);
}

function m3u8Playlist(chunkNames, chunkSeconds) {
  const lines = [
    '#EXTM3U',
    '#EXT-X-VERSION:3',
    `#EXT-X-TARGETDURATION:${Math.ceil(chunkSeconds)}`,
    '#EXT-X-MEDIA-SEQUENCE:0',
    '',
  ];
  for (const name of chunkNames) {
    lines.push(`#EXTINF:${chunkSeconds.toFixed(3)},`);
    lines.push(name);
  }
  lines.push('#EXT-X-ENDLIST', '');
  return lines.join('\n');
}

function jsonlOf(rows) {
  return rows.map((r) => JSON.stringify(r)).join('\n') + '\n';
}

// ---------------------------------------------------------------------------
// track generators

/**
 * Video tracks — placeholder mpeg-ts chunks (0 bytes). The VideoLane reads
 * playlist.segments only, no chunk bytes, so size doesn't matter.
 *
 * Also emits procedural SVG thumbnails + a WebVTT thumbnail track so the
 * demo shows scrubber-style previews without needing real decoded frames.
 * Shape of the VTT matches what BSS will serve in production:
 *
 *   WEBVTT
 *
 *   00:00:00.000 --> 00:00:10.000
 *   thumb-001.svg
 */
function emitVideoTrack(name, accent) {
  const dir = `video/${name}`;
  const chunks = Array.from({ length: CHUNK_COUNT }, (_, i) =>
    `chunk-${String(i + 1).padStart(3, '0')}.ts`,
  );
  for (const c of chunks) {
    writeFile(join(dir, c), Buffer.alloc(0));
  }
  writeFile(join(dir, 'playlist.m3u8'), m3u8Playlist(chunks, CHUNK_SECONDS));

  // One thumbnail per segment. Generator mirrors dreamlake's current
  // "one thumbnail per chunk" cadence — refine later by emitting finer
  // cues in the VTT without changing the VideoLane contract.
  const thumbNames = [];
  for (let i = 0; i < CHUNK_COUNT; i++) {
    const startT = i * CHUNK_SECONDS;
    const endT = startT + CHUNK_SECONDS;
    const file = `thumb-${String(i + 1).padStart(3, '0')}.svg`;
    writeFile(join(dir, file), thumbnailSvg({
      cameraName: name,
      segIdx: i,
      segCount: CHUNK_COUNT,
      startT,
      endT,
      accent,
    }));
    thumbNames.push({ file, startT, endT });
  }
  writeFile(join(dir, 'thumbnails.vtt'), thumbnailsVtt(thumbNames));
}

/** Build the WebVTT thumbnail track. Cues list URLs relative to the VTT file. */
function thumbnailsVtt(thumbs) {
  const lines = ['WEBVTT', ''];
  for (const t of thumbs) {
    lines.push(fmtVttTime(t.startT) + ' --> ' + fmtVttTime(t.endT));
    lines.push(t.file);
    lines.push('');
  }
  return lines.join('\n');
}

function fmtVttTime(sec) {
  const hh = Math.floor(sec / 3600);
  const mm = Math.floor((sec % 3600) / 60);
  const ss = Math.floor(sec % 60);
  const ms = Math.round((sec - Math.floor(sec)) * 1000);
  return (
    String(hh).padStart(2, '0') + ':' +
    String(mm).padStart(2, '0') + ':' +
    String(ss).padStart(2, '0') + '.' +
    String(ms).padStart(3, '0')
  );
}

/**
 * Procedural SVG thumbnail: dark gradient background + a "gripper" shape
 * that advances horizontally across segments so the sequence reads as
 * continuous motion (reach → grasp → release → home).
 */
function thumbnailSvg({ cameraName, segIdx, segCount, startT, endT, accent }) {
  const frac = segCount <= 1 ? 0.5 : segIdx / (segCount - 1);
  const blockX = 24 + frac * 112; // left → right across 160px wide
  return [
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 160 90" width="160" height="90">',
    '  <defs>',
    '    <linearGradient id="g" x1="0" y1="0" x2="0" y2="1">',
    `      <stop offset="0" stop-color="${accent}" stop-opacity="0.25"/>`,
    '      <stop offset="1" stop-color="#0a0a0a" stop-opacity="1"/>',
    '    </linearGradient>',
    '  </defs>',
    '  <rect width="160" height="90" fill="#141414"/>',
    '  <rect width="160" height="90" fill="url(#g)"/>',
    `  <line x1="0" y1="78" x2="160" y2="78" stroke="${accent}" stroke-opacity="0.45" stroke-width="1.5"/>`,
    `  <g stroke="${accent}" stroke-width="1.5" fill="none">`,
    `    <line x1="${blockX.toFixed(1)}" y1="78" x2="${blockX.toFixed(1)}" y2="42"/>`,
    `    <rect x="${(blockX - 9).toFixed(1)}" y="32" width="18" height="12" fill="${accent}" fill-opacity="0.7" stroke-opacity="0.9"/>`,
    '  </g>',
    `  <text x="5" y="11" fill="#ffffff" fill-opacity="0.88" font-family="ui-monospace,monospace" font-size="8">${cameraName}</text>`,
    `  <text x="155" y="11" fill="#ffffff" fill-opacity="0.65" font-family="ui-monospace,monospace" font-size="8" text-anchor="end">${startT.toFixed(0)}s–${endT.toFixed(0)}s</text>`,
    '</svg>',
  ].join('\n');
}

/**
 * arm_qpos — 7-channel joint angles. Each channel a phase-shifted sinusoid
 * with a small noise component so charts render something organic.
 */
function qposSample(t) {
  const amp = Math.PI;                                   // ±π envelope
  const data = [];
  for (let c = 0; c < QPOS_CHANNELS; c++) {
    const phase = (c * Math.PI) / QPOS_CHANNELS;
    const freq = 0.3 + 0.1 * c;                          // 0.3..0.9 Hz
    const noise = (Math.sin(t * 53 + c * 7) + Math.sin(t * 17 + c * 3)) * 0.02;
    const raw = amp * 0.8 * Math.sin(2 * Math.PI * freq * t + phase);
    data.push(+(raw + noise).toFixed(4));
  }
  return data;
}

function emitQposTrack() {
  emitSampleTrack('track/arm_qpos', QPOS_HZ, qposSample);
}

/**
 * ee_pose — end-effector pose: [x, y, z, qx, qy, qz, qw]. xyz traces a
 * smooth pick-and-place path; quaternion rotates gently around y-axis so
 * the chart shows all 4 quat components with perceptible movement.
 */
function eePoseSample(t) {
  // xyz in meters — a slow figure-8 over the run.
  const x = 0.35 + 0.15 * Math.sin(0.25 * t);
  const y = 0.0 + 0.1 * Math.sin(0.5 * t);
  const z = 0.2 + 0.08 * Math.cos(0.2 * t);
  // quaternion around y-axis, angle oscillating ±30deg.
  const angle = (Math.PI / 6) * Math.sin(0.3 * t);
  const qx = 0;
  const qy = Math.sin(angle / 2);
  const qz = 0;
  const qw = Math.cos(angle / 2);
  return [x, y, z, qx, qy, qz, qw].map((v) => +v.toFixed(4));
}

/**
 * gripper_force — scalar Newtons. Zero most of the run with a pulse while
 * holding an object (roughly aligned to the narration "grasp" → "release"
 * window: ~7-22s).
 */
function gripperForceSample(t) {
  const onset = 6.8;
  const offset = 22.2;
  const rise = 1.2;
  let f = 0;
  if (t >= onset - rise && t < onset) {
    f = ((t - (onset - rise)) / rise) * 8; // ramp in
  } else if (t >= onset && t < offset) {
    f = 8 + 0.6 * Math.sin(2 * Math.PI * 0.7 * (t - onset)); // plateau + wobble
  } else if (t >= offset && t < offset + rise) {
    f = (1 - (t - offset) / rise) * 8; // ramp out
  }
  return +f.toFixed(4);
}

/**
 * Generic continuous-track emitter: produces jsonl chunks + m3u8 playlist
 * under `relDir`. `sample(t)` returns either a number or a number[].
 */
function emitSampleTrack(relDir, hz, sample) {
  const chunkNames = [];
  for (let c = 0; c < CHUNK_COUNT; c++) {
    const startT = c * CHUNK_SECONDS;
    const rows = [];
    const samplesPerChunk = hz * CHUNK_SECONDS;
    for (let i = 0; i < samplesPerChunk; i++) {
      const ts = +(startT + i / hz).toFixed(4);
      rows.push({ ts, data: sample(ts) });
    }
    const name = `chunk-${String(c + 1).padStart(3, '0')}.jsonl`;
    writeFile(join(relDir, name), jsonlOf(rows));
    chunkNames.push(name);
  }
  writeFile(join(relDir, 'playlist.m3u8'), m3u8Playlist(chunkNames, CHUNK_SECONDS));
}

/**
 * operator narration — 8 caption segments spanning the run, labels borrowed
 * from the screenshot (Approaching / Closing / Lifting / Control /
 * Back / Aligning / Releasing / Returning).
 */
function narrationEntries() {
  return [
    { ts: 0.4,  te: 4.4,  label: 'Approaching target' },
    { ts: 5.0,  te: 8.0,  label: 'Closing gripper' },
    { ts: 9.0,  te: 12.0, label: 'Lifting object' },
    { ts: 12.2, te: 15.2, label: 'Controlled move' },
    { ts: 15.4, te: 18.4, label: 'Back to waypoint' },
    { ts: 18.6, te: 21.6, label: 'Aligning over goal' },
    { ts: 21.8, te: 24.8, label: 'Releasing grip' },
    { ts: 25.0, te: 29.0, label: 'Returning home' },
  ];
}

/**
 * Chunk narration entries into 10s playlist segments. Entries straddling a
 * boundary stay in the chunk containing their `ts`.
 */
function emitTextTrack() {
  const dir = 'text/operator';
  const entries = narrationEntries();
  const chunkNames = [];
  for (let c = 0; c < CHUNK_COUNT; c++) {
    const start = c * CHUNK_SECONDS;
    const end = start + CHUNK_SECONDS;
    const rows = entries.filter((e) => e.ts >= start && e.ts < end);
    const name = `chunk-${String(c + 1).padStart(3, '0')}.jsonl`;
    writeFile(join(dir, name), jsonlOf(rows));
    chunkNames.push(name);
  }
  writeFile(join(dir, 'playlist.m3u8'), m3u8Playlist(chunkNames, CHUNK_SECONDS));
}

// ---------------------------------------------------------------------------
// config

const events = [
  { ts: 0.3,  label: 'episode start',   kind: 'milestone', color: 'purple' },
  { ts: 6.8,  label: 'grasp',           kind: 'action',    color: 'green' },
  { ts: 11.6, label: 'fault recovered', kind: 'recovery',  color: 'orange' },
  { ts: 22.2, label: 'release',         kind: 'action',    color: 'green' },
  { ts: 29.4, label: 'episode end',     kind: 'milestone', color: 'purple' },
];

const JOINT_NAMES = [
  'shoulder_pan',
  'shoulder_lift',
  'upper_arm_roll',
  'elbow_flex',
  'forearm_roll',
  'wrist_flex',
  'wrist_roll',
];

function writeConfig() {
  const config = {
    container: {
      id: 'teleop_run_037',
      name: 'teleop_run_037',
      duration: DURATION,
    },
    // One lane of each display style, all with robot-grounded content.
    tracks: [
      // Cameras group → VideoLane demo
      { id: 'cams', parentId: null, view: 'Group', name: 'Cameras', expanded: true, color: 'green', icon: 'video' },
      {
        id: 'wrist_cam',
        parentId: 'cams',
        view: 'VideoLane',
        src: 'video/wrist_cam/playlist.m3u8',
        name: 'wrist_cam',
        color: 'green',
        props: { thumbnails: 'video/wrist_cam/thumbnails.vtt' },
      },

      // Robot state group → LineChartLane demo
      { id: 'robot', parentId: null, view: 'Group', name: 'Robot state', expanded: true, color: 'blue', icon: 'robot' },
      {
        id: 'arm_qpos',
        parentId: 'robot',
        view: 'LineChartLane',
        src: 'track/arm_qpos/playlist.m3u8',
        name: 'arm / qpos',
        color: 'blue',
        icon: 'waves',
        props: {
          shape: [QPOS_CHANNELS],
          channelNames: JOINT_NAMES,
          range: [-Math.PI, Math.PI],
          unit: 'rad',
        },
      },

      // Narration group → PillLane demo (text segments from m3u8)
      { id: 'narr', parentId: null, view: 'Group', name: 'Narration', expanded: true, color: 'purple', icon: 'caption' },
      {
        id: 'operator',
        parentId: 'narr',
        view: 'PillLane',
        src: 'text/operator/playlist.m3u8',
        name: 'operator',
        color: 'purple',
        icon: 'caption',
      },

      // Pipeline group → PillLane demo (inline gantt bars with halted
      // state and stripes). Uses the robot teleop lifecycle, not the
      // waterfall reference's generic report-pipeline vocabulary.
      { id: 'pipe', parentId: null, view: 'Group', name: 'Pipeline', expanded: true, color: 'blue', icon: 'pipeline' },
      {
        id: 'teleop_run',
        parentId: 'pipe',
        view: 'PillLane',
        name: 'teleop_run',
        color: 'blue',
        icon: 'bot',
        data: [
          // Overall episode phases: planning → executing (striped) → halt
          // (controller fault) → postprocess.
          { ts: 0.3, te: 1.2, color: 'green' },            // plan
          { ts: 1.2, te: 11.8, color: 'blue', stripes: true }, // execute
          { ts: 11.8, te: 13.4, halted: true },            // fault window
          { ts: 13.4, te: 24.0, color: 'blue' },           // resume
          { ts: 24.0, te: 29.5, color: 'green' },          // postprocess
        ],
      },

      // MarkerLane demo — robot key events (grasp, fault, release, ...)
      {
        id: 'events',
        parentId: null,
        view: 'MarkerLane',
        name: 'Events',
        color: 'purple',
        icon: 'diamond',
        data: events,
      },
    ],
  };
  writeFile('config.json', JSON.stringify(config, null, 2) + '\n');
}

// ---------------------------------------------------------------------------
// main

function main() {
  ensureCleanDir(OUT);
  // One representative per lane type:
  //   VideoLane     → wrist_cam
  //   LineChartLane → arm_qpos
  //   PillLane      → operator narration  +  teleop_run bars (inline)
  //   MarkerLane    → events (inline) + episode-level marker
  // eePose / gripperForce / sceneCam generators are kept for downstream
  // experimentation but aren't emitted by default to keep the demo
  // focused.
  emitVideoTrack('wrist_cam', '#10b981'); // emerald-500
  emitQposTrack();
  emitTextTrack();
  // Reference the unused sample generators so tree-shaking / linters stay
  // happy without deleting them outright.
  void eePoseSample;
  void gripperForceSample;
  writeConfig();
  console.log(`mock timeline written → ${OUT}`);
}

main();
