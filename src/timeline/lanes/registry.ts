import type { TimelineViews } from '../../dtypes/types';
import { VideoLane } from './VideoLane';
import { LineChartLane } from './LineChartLane';
import { PillLane } from './PillLane';
import { MarkerLane } from './MarkerLane';

/**
 * Stock `TimelineContainer.views` map wired for every built-in `dtype`.
 *
 * Keyed by `DtypeId`. Generic lanes (LineChartLane, PillLane, MarkerLane)
 * appear under multiple dtypes — one lane component can serve many data
 * types. Apps override a subset by spreading and replacing:
 *
 *   <TimelineContainer
 *     views={{ ...defaultTimelineViews, joint_angles: { lane: MyQposLane } }}
 *   />
 *
 * Dtypes without an entry here are intentionally unwired — `image` has no
 * default lane, for example. A missing entry renders `PlaceholderLane`.
 */
export const defaultTimelineViews: TimelineViews = {
  video: { lane: VideoLane, icon: 'video', defaultHeight: 56 },
  // audio: reserved — no default lane shipped yet
  subtitle: { lane: PillLane, icon: 'caption', defaultHeight: 32 },
  scalar: { lane: LineChartLane, icon: 'waves', defaultHeight: 84 },
  vector: { lane: LineChartLane, icon: 'waves', defaultHeight: 84 },
  imu_6dof: { lane: LineChartLane, icon: 'waves', defaultHeight: 84 },
  joint_angles: { lane: LineChartLane, icon: 'waves', defaultHeight: 84 },
  pose_6dof: { lane: LineChartLane, icon: 'waves', defaultHeight: 84 },
  // image: reserved — no default lane shipped yet
  action_label: { lane: PillLane, icon: 'caption', defaultHeight: 32 },
  marker_event: { lane: MarkerLane, icon: 'diamond', defaultHeight: 32 },
  detection_2d: { lane: MarkerLane, icon: 'bar', defaultHeight: 32 },
  ribbon_state: { lane: PillLane, icon: 'caption', defaultHeight: 32 },
};
