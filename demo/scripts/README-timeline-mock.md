# timeline-mock

Synthetic data for the multi-track timeline demo. Four tracks that exercise
both data-loading paths:

| Track       | Lane view        | Source path                                    |
|-------------|------------------|------------------------------------------------|
| `wrist_cam` | `VideoLane`      | `src` → `video/wrist_cam/playlist.m3u8`        |
| `arm_qpos`  | `LineChartLane`  | `src` → `track/arm_qpos/playlist.m3u8`         |
| `operator`  | `PillLane`       | `src` → `text/operator/playlist.m3u8`          |
| `events`    | `MarkerLane`     | inline `data` on `config.json`                 |

## Generate

The generator writes into the demo's publicDir so Vite serves everything at
`/timeline/teleop_run_037/*`. The output is committed to the repo —
downstream contributors consume it directly without a build step. Re-run
the generator only when you change the sample shape, scenario, or track
count:

```bash
node demo/scripts/generate-timeline-mock.mjs
```

It rewrites the output from scratch (safe; no external state). Commit the
resulting diff alongside the generator change.

## Output layout

```
demo/mock-data/timeline/teleop_run_037/
  config.json                         TimelineConfig (canonical)
  video/wrist_cam/
    playlist.m3u8                     3 × 10s segments
    chunk-{001,002,003}.ts            zero-byte placeholders
  track/arm_qpos/
    playlist.m3u8
    chunk-{001,002,003}.jsonl         30 Hz × 10 s = 300 rows each
                                      {ts: number, data: [7 floats]}
  text/operator/
    playlist.m3u8
    chunk-{001,002,003}.jsonl         narration pills
                                      {ts, te, label}
```

## Extending

Add a track by appending to the `tracks` array in `writeConfig()` inside
`generate-timeline-mock.mjs`:

- `src` tracks need chunk files and a playlist under a topic-like directory
- inline `data` tracks drop their array straight into `config.json`
- the `view` string must name a component the runtime registers — see
  `src/timeline/lanes/registry.ts` for the current default registry

Phase 2 will grow this to 16 tracks matching the `teleop_run_037`
screenshot — `scene_cam`, mic audio, `ee_pose` (LineChartLane w/
`channelGroups`), `gripper_force` (AreaChartLane), pipeline spans
(RibbonLane), etc.
