/**
 * Public entry for the timeline submodule.
 *
 * Step 3 scope: types + runtime validation + display components
 * (`<TimelineContainer>` + core lane primitives + tree + virtualization +
 * engine registry + supporting viewport / coords utilities).
 *
 * Business-name recipes (QposLane, EventLane, ...) and doc-site pages
 * remain for later.
 */

// Canonical data shapes
export type { Sample, AnnotationEntry } from './types/data';

// Display config (canonical serializable form)
export type {
  TimelineConfig,
  TrackConfig,
  TimelineMeta,
} from './types/config';

// Lane prop types + registry
export type {
  LaneVisualProps,
  LaneDataProps,
  LaneRegistry,
  LaneDefinition,
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

// Runtime validation
export {
  assertSrcOrData,
  validateTrackConfig,
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

// Auto-follow hook (keeps playhead visible during playback)
export { useAutoFollow } from './use-auto-follow';

// Tree utilities (parentId-based hierarchy)
export {
  buildChildren,
  flattenTree,
  hiddenInheritance,
  initialCollapsed,
} from './tree';
export type { TreeRow } from './tree';

// Hover guide — legacy amber line (kept for back-compat; TimelineCursor is
// the current default used by <TimelineContainer>).
export { HoverGuide } from './HoverGuide';
export type { HoverGuideProps } from './HoverGuide';

// Ruler primitives
export { Tick } from './Tick';
export { EventDot } from './EventDot';

// Cursor overlay (line + readout pill) + host component that wires it to
// pointer moves over the lane area
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

// Tree cell (default implementation)
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
export { GroupLane } from './lanes/GroupLane';

// Default lane registry
export { defaultLaneRegistry } from './lanes/registry';

// Root component
export { TimelineContainer } from './TimelineContainer';
export type { TimelineContainerProps } from './TimelineContainer';
