import { describe, it, expect } from 'vitest';
import { defaultTrackerViews } from '../src/react/default-tracker-views';
import { ActionLabelView } from '../src/react/players/ActionLabelView';
import { BarTrackView } from '../src/react/players/BarTrackView';
import { DetectionBoxView } from '../src/react/players/DetectionBoxView';
import { ImuChartView } from '../src/react/players/ImuChartView';
import { JointAngleView } from '../src/react/players/JointAngleView';
import { PoseView } from '../src/react/players/PoseView';
import { SubtitleView } from '../src/react/players/SubtitleView';
import { VideoPlayer } from '../src/react/players/VideoPlayer';

describe('defaultTrackerViews', () => {
  it('dispatches each expected dtype to its stock view component', () => {
    expect(defaultTrackerViews.video).toBe(VideoPlayer);
    expect(defaultTrackerViews.subtitle).toBe(SubtitleView);
    expect(defaultTrackerViews.scalar).toBe(BarTrackView);
    expect(defaultTrackerViews.vector).toBe(BarTrackView);
    expect(defaultTrackerViews.imu_6dof).toBe(ImuChartView);
    expect(defaultTrackerViews.joint_angles).toBe(JointAngleView);
    expect(defaultTrackerViews.pose_6dof).toBe(PoseView);
    expect(defaultTrackerViews.action_label).toBe(ActionLabelView);
    expect(defaultTrackerViews.detection_2d).toBe(DetectionBoxView);
  });

  it('intentionally omits dtypes without a stock standalone view', () => {
    // audio, image, marker_event, ribbon_state — no default standalone view
    expect(defaultTrackerViews.audio).toBeUndefined();
    expect(defaultTrackerViews.image).toBeUndefined();
    expect(defaultTrackerViews.marker_event).toBeUndefined();
    expect(defaultTrackerViews.ribbon_state).toBeUndefined();
  });
});
