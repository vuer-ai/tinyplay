/**
 * Public entry for the timeline submodule.
 *
 * TimelineContainer + 4 lane primitives + tree + viewport utilities. Plus
 * the dtype registry (re-exported from `../dtypes`) so consumers can
 * `import { registerDtype, defaultTimelineViews } from '@vuer-ai/vuer-m3u'`.
 */

// Canonical data shapes
export type { Sample, AnnotationEntry } from './types/data';

// Display config
export type {
  TimelineConfig,
  TrackRow,
  TimelineMeta,
  GroupConfig,
} from './types/config';

// Lane prop types + tree-cell contract
export type {
  LaneVisualProps,
  LaneDataProps,
  LaneComponent,
  TreeCellProps,
  VideoLaneProps,
  AudioLaneProps,
  LineChartLaneProps,
  AreaChartLaneProps,
  PillLaneProps,
  MarkerLaneProps,
  RibbonLaneProps,
} from './types/lanes';

// Dtype registry
export {
  registerDtype,
  getDtype,
  listDtypes,
  hasDtype,
  BUILTIN_DTYPES,
} from '../dtypes';
export type {
  DtypeId,
  DtypeSpec,
  TimelineViews,
  TimelineViewEntry,
} from '../dtypes';

// Runtime validation
export {
  assertSrcOrData,
  validateTrackRow,
  validateTimelineConfig,
} from './validate';

// Coords utilities
export {
  MIN_PX_PER_SEC,
  MAX_PX_PER_SEC,
  clampPxPerSec,
  clampScrollSec,
  timeToX,
  xToTime,
  zoomAtCursor,
  fitViewport,
} from './coords';
export type { ViewportCoords } from './coords';

// Viewport provider / hook
export {
  TimelineViewportProvider,
  useTimelineViewport,
  useObservedWidth,
} from './viewport';
export type {
  TimelineViewport,
  TimelineViewportProviderProps,
} from './viewport';

// Auto-follow hook
export { useAutoFollow } from './use-auto-follow';

// Tree utilities (path-based)
export {
  flattenTree,
  hiddenInheritance,
  initialCollapsed,
} from './tree';
export type { TreeRow, TreeTrackRow, TreeGroupRow } from './tree';

// Hover guide — legacy
export { HoverGuide } from './HoverGuide';
export type { HoverGuideProps } from './HoverGuide';

// Ruler primitives
export { Tick } from './Tick';
export { EventDot } from './EventDot';

// Cursor overlay + hover cursor
export { CursorOverlay } from './CursorOverlay';
export type { CursorOverlayProps } from './CursorOverlay';
export { TimelineCursor } from './TimelineCursor';
export type { TimelineCursorProps } from './TimelineCursor';

// Bottom navigation capsule
export { NavigationControls } from './NavigationControls';
export type { NavigationControlsProps } from './NavigationControls';

// Off-screen wedge indicators
export { LeftWedge, RightWedge } from './Wedges';
export type { WedgeProps } from './Wedges';

// Shared color palette + duration formatter
export {
  isSemanticColor,
  resolveColor,
  bgClasses,
  textClasses,
  borderClasses,
  leftWedgeClasses,
  rightWedgeClasses,
} from './colors';
export type { SemanticColor } from './colors';
export { formatDuration } from './duration';

// Icons
export { Icon } from './Icon';
export type { IconName, IconProps } from './Icon';

// Tree cell (default)
export { TreeCellDefault } from './TreeCellDefault';

// Lane fallback + shared hatch overlay
export { PlaceholderLane } from './lanes/PlaceholderLane';
export type { PlaceholderLaneProps } from './lanes/PlaceholderLane';
export { UnloadedHatch } from './lanes/UnloadedHatch';
export type { UnloadedHatchProps } from './lanes/UnloadedHatch';

// Core lane primitives
export { VideoLane } from './lanes/VideoLane';
export { LineChartLane } from './lanes/LineChartLane';
export { PillLane } from './lanes/PillLane';
export { MarkerLane } from './lanes/MarkerLane';

// Default dtype → lane mapping for `<TimelineContainer views>`
export { defaultTimelineViews } from './lanes/registry';

// Root component
export { TimelineContainer } from './TimelineContainer';
export type { TimelineContainerProps } from './TimelineContainer';
