import type { LaneRegistry } from '../types/lanes';
import { VideoLane } from './VideoLane';
import { LineChartLane } from './LineChartLane';
import { PillLane } from './PillLane';
import { MarkerLane } from './MarkerLane';
import { GroupLane } from './GroupLane';

/**
 * Default lane registry. Each entry supplies a right-side `lane`, optional
 * `treeCell` override, an `icon` name for the default tree cell, and a
 * `defaultHeight` in px.
 *
 * Step 3 adds recipe wrappers (QposLane, EventLane, NarrationLane, …) and
 * user-supplied overrides via `TimelineContainerProps.registry`.
 */
// Default row heights match the waterfall reference (32px baseline) for
// group / pill / marker rows so the tree reads as a consistent list;
// video and chart lanes get more vertical space because they carry
// meaningful detail in the y axis.
export const defaultLaneRegistry: LaneRegistry = {
  Group: { lane: GroupLane, icon: 'folder', defaultHeight: 32 },
  VideoLane: { lane: VideoLane, icon: 'video', defaultHeight: 56 },
  LineChartLane: { lane: LineChartLane, icon: 'waves', defaultHeight: 84 },
  PillLane: { lane: PillLane, icon: 'caption', defaultHeight: 32 },
  MarkerLane: { lane: MarkerLane, icon: 'diamond', defaultHeight: 32 },
};
