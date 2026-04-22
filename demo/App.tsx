import {
  useTimeline,
  ClockProvider,
  TimelineController,
  VideoPlayer,
  ActionLabelView,
  BarTrackView,
  SubtitleView,
  DetectionBoxView,
  ImuChartView,
  ImuGizmoView,
  JointAngleView,
  PoseView,
} from '@vuer-ai/vuer-m3u';

const VIDEO_URL = '/video/playlist.m3u8';
const ANNOTATIONS_URL = '/annotations/playlist.m3u8';
const TRAJECTORY_URL = '/trajectory/playlist.m3u8';
const SUBTITLES_URL = '/subtitles/playlist.m3u8';
const DETECTIONS_URL = '/detections/playlist.m3u8';
const IMU_URL = '/imu/playlist.m3u8';
const JOINTS_URL = '/joints/playlist.m3u8';
const POSE_URL = '/pose/playlist.m3u8';

type SectionProps = {
  title: string;
  description?: string;
  children: React.ReactNode;
};

function Section({ title, description, children }: SectionProps) {
  return (
    <section className="bg-zinc-900 rounded-xl border border-zinc-800 overflow-hidden">
      <header className="px-4 py-3 border-b border-zinc-800">
        <h2 className="text-sm font-medium text-zinc-100">{title}</h2>
        {description ? (
          <p className="text-xs text-zinc-500 mt-1">{description}</p>
        ) : null}
      </header>
      {children}
    </section>
  );
}

type WithControllerProps = {
  children: (clock: ReturnType<typeof useTimeline>['clock']) => React.ReactNode;
};

function WithController({ children }: WithControllerProps) {
  const { clock, state, play, pause, seek, setPlaybackRate, setLoop } =
    useTimeline();

  return (
    <ClockProvider clock={clock}>
      {children(clock)}
      <div className="p-4 border-t border-zinc-800">
        <TimelineController
          state={state}
          onPlay={play}
          onPause={pause}
          onSeek={seek}
          onSpeedChange={setPlaybackRate}
          onLoopChange={setLoop}
        />
      </div>
    </ClockProvider>
  );
}

export function App() {
  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      <header className="border-b border-zinc-800 px-6 py-5">
        <h1 className="text-lg font-semibold">vuer-m3u demo</h1>
        <p className="text-sm text-zinc-500 mt-1">
          A gallery of the pre-built views in{' '}
          <code className="text-sky-300">@vuer-ai/vuer-m3u</code>. Each panel has
          its own <code className="text-sky-300">TimelineClock</code>, matching
          the per-view demos in the docs.
        </p>
      </header>

      <main className="max-w-7xl mx-auto p-6 grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Section
          title="VideoPlayer"
          description="HLS video playback via hls.js. Timeline duration is auto-synced to the <video> element."
        >
          <WithController>
            {() => (
              <div className="aspect-video bg-black">
                <VideoPlayer src={VIDEO_URL} className="w-full h-full" />
              </div>
            )}
          </WithController>
        </Section>

        <Section
          title="DetectionBoxView over VideoPlayer"
          description="Bounding boxes overlay. Coordinates are in pixel space of the video."
        >
          <WithController>
            {() => (
              <div className="relative aspect-video bg-black">
                <VideoPlayer src={VIDEO_URL} className="w-full h-full" />
                <DetectionBoxView src={DETECTIONS_URL} />
              </div>
            )}
          </WithController>
        </Section>

        <Section
          title="ActionLabelView"
          description="Discrete action annotations ({ts, te, label, ...}) rendered as labeled segments."
        >
          <WithController>
            {() => (
              <div className="h-[280px] overflow-auto">
                <ActionLabelView src={ANNOTATIONS_URL} />
              </div>
            )}
          </WithController>
        </Section>

        <Section
          title="BarTrackView"
          description="Generic N-channel time-series rendered as bars. Trajectory fixtures use 3 channels (X, Y, Z)."
        >
          <WithController>
            {() => (
              <BarTrackView
                src={TRAJECTORY_URL}
                title="Trajectory"
                channelNames={['X', 'Y', 'Z']}
                range={100}
              />
            )}
          </WithController>
        </Section>

        <Section
          title="SubtitleView"
          description="WebVTT cues; one active cue displayed at a time."
        >
          <WithController>
            {() => (
              <div className="h-24 flex items-center justify-center bg-zinc-900">
                <SubtitleView src={SUBTITLES_URL} />
              </div>
            )}
          </WithController>
        </Section>

        <Section
          title="ImuChartView"
          description="6-axis IMU (accel + gyro) continuous readout."
        >
          <WithController>{() => <ImuChartView src={IMU_URL} />}</WithController>
        </Section>

        <Section
          title="ImuGizmoView"
          description="Same IMU data, rendered as an orientation gizmo."
        >
          <WithController>{() => <ImuGizmoView src={IMU_URL} />}</WithController>
        </Section>

        <Section
          title="JointAngleView"
          description="Per-joint angles displayed as a live bar readout."
        >
          <WithController>
            {() => (
              <JointAngleView
                src={JOINTS_URL}
                jointNames={[
                  'shoulder_pan',
                  'shoulder_lift',
                  'elbow',
                  'wrist_1',
                  'wrist_2',
                  'wrist_3',
                  'gripper',
                ]}
              />
            )}
          </WithController>
        </Section>

        <Section
          title="PoseView"
          description="6-DoF pose (position + quaternion) displayed as a live readout. Interpolation is slerp-aware."
        >
          <WithController>{() => <PoseView src={POSE_URL} />}</WithController>
        </Section>
      </main>
    </div>
  );
}
