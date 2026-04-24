import { ActionLabelView } from './players/ActionLabelView';
import { BarTrackView } from './players/BarTrackView';
import { DetectionBoxView } from './players/DetectionBoxView';
import { ImuChartView } from './players/ImuChartView';
import { JointAngleView } from './players/JointAngleView';
import { PoseView } from './players/PoseView';
import { SubtitleView } from './players/SubtitleView';
import { VideoPlayer } from './players/VideoPlayer';
import type { TrackerViews } from './TrackerContainer';

/**
 * Stock `dtype → standalone-view` mapping for `<TrackerContainer>`.
 *
 * Parallel to `defaultTimelineViews` on the timeline side. Apps override
 * a subset by spreading:
 *
 * ```tsx
 * <TrackerContainer
 *   config={config}
 *   views={{ ...defaultTrackerViews, joint_angles: MyCustomJointView }}
 * />
 * ```
 *
 * Dtypes without an entry here render `<PlaceholderLane>` inside the
 * tracker — `audio`, `image`, `marker_event`, `ribbon_state` are the
 * built-in dtypes that ship without a default standalone view.
 */
export const defaultTrackerViews: TrackerViews = {
  video: VideoPlayer,
  subtitle: SubtitleView,
  scalar: BarTrackView,
  vector: BarTrackView,
  imu_6dof: ImuChartView,
  joint_angles: JointAngleView,
  pose_6dof: PoseView,
  action_label: ActionLabelView,
  detection_2d: DetectionBoxView,
  // audio, image, marker_event, ribbon_state — no default standalone view
};
