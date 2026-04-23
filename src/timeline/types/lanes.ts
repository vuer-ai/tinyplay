/**
 * Lane component prop types.
 *
 * Lanes are classified by *display pattern*, not by business meaning. The
 * seven core primitives below render every track shape in the teleop_run_037
 * screenshot. Business names (`QposLane`, `EventLane`, `NarrationLane`, etc.)
 * are one-line recipe wrappers around these primitives — ship them as demo
 * examples, not as core API surface.
 *
 * Data contract: each lane declares the data shape it expects via
 * `LaneDataProps<T>`. `src` and `data` are mutually exclusive; exactly one
 * must be provided. `normalize` is JSX-only (not serializable into
 * TimelineConfig).
 */

import type { FC } from 'react';
import type { Sample, AnnotationEntry } from './data';

// ---------------------------------------------------------------------------
// Base mixins

/** Visual / identity fields shared by every lane. */
export interface LaneVisualProps {
  /** Stable identifier — if omitted, the outer TrackConfig supplies it. */
  id?: string;
  name?: string;
  height?: number;
  /** Hidden lanes skip data loading. Default true. */
  visible?: boolean;
  /** Accent color (hex or CSS named). */
  color?: string;
  /** Tree-row icon (lucide icon name or URL). */
  icon?: string;
}

/**
 * src / data / normalize three-piece data contract.
 * Exactly one of `src` or `data` must be provided — runtime validated.
 */
export interface LaneDataProps<T> {
  /** m3u8 URL. Chunks are decoded through the Playlist engine. */
  src?: string;
  /** Inline data. Not serialization-limited — put it straight into a
   *  TimelineConfig if you want config-path rendering of small datasets. */
  data?: T[];
  /** Custom decoder for unusual chunk shapes. JSX-only — this function is
   *  not representable in a serializable TimelineConfig. */
  normalize?: (decoded: unknown) => T[];
}

// ---------------------------------------------------------------------------
// Core primitives (7)

export interface VideoLaneProps extends LaneVisualProps {
  /** Required. HLS playlist URL; no inline video form supported. */
  src: string;
  poster?: string;
  /**
   * Optional WebVTT thumbnail track URL. Each cue maps a time range to an
   * image (optionally a sprite crop via `#xywh=` fragment). Works like
   * YouTube/Vimeo/Bitmovin scrubber previews. Thumbnail cadence is
   * independent of m3u8 segment boundaries.
   */
  thumbnails?: string;
}

export interface AudioLaneProps extends LaneVisualProps {
  /** Required. HLS audio playlist URL. */
  src: string;
  /** Playback gain multiplier (1.0 = passthrough). */
  gain?: number;
}

export interface LineChartLaneProps
  extends LaneVisualProps,
    LaneDataProps<Sample> {
  /** Sample layout. Omit to infer from the first sample. */
  shape?: number[];
  /** Flat channel labels for the legend. */
  channelNames?: string[];
  /** Visually group channels (e.g. [['x','y','z'],['qx','qy','qz','qw']]). */
  channelGroups?: string[][];
  /** Y-axis clamp; auto-scaled if omitted. */
  range?: [number, number];
  unit?: string;
}

export interface AreaChartLaneProps
  extends LaneVisualProps,
    LaneDataProps<Sample> {
  range?: [number, number];
  unit?: string;
  fill?: string;
}

export interface PillLaneProps
  extends LaneVisualProps,
    LaneDataProps<AnnotationEntry> {
  /** Field on AnnotationEntry to display. Defaults to 'label'. */
  textField?: string;
}

export interface MarkerLaneProps
  extends LaneVisualProps,
    LaneDataProps<AnnotationEntry> {
  /** Glyph for each marker. Defaults to 'diamond'. */
  shape?: 'diamond' | 'circle' | 'triangle';
}

export interface RibbonLaneProps
  extends LaneVisualProps,
    LaneDataProps<AnnotationEntry> {
  /** State key → CSS color. */
  stateColors?: Record<string, string>;
  /** Field on AnnotationEntry holding the state key. Defaults to 'state'. */
  stateField?: string;
}

// ---------------------------------------------------------------------------
// Registry

/**
 * Props a TreeCell component receives. TreeCells render the left-side row
 * for one track; per-view overrides are supplied through `LaneDefinition`.
 */
export interface TreeCellProps {
  track: import('./config').TrackConfig;
  depth: number;
  hasChildren: boolean;
  expanded: boolean;
  selected: boolean;
  hovered: boolean;
  hiddenDirect: boolean;
  hiddenInherited: boolean;
  height: number;
  icon?: string;
  /** True when this row is the last child of its parent in the visible tree. */
  isLast?: boolean;
  /** Per-ancestor last-child flags, from root down. Drives guide-line painting. */
  ancestorIsLast?: boolean[];
  onToggleExpanded(): void;
  onToggleHidden(): void;
}

/**
 * One entry in the lane registry.
 *
 * `lane` is the right-side renderer (required). `treeCell` is an optional
 * override for the left-side row — most lanes use the default cell.
 * `icon` selects an icon name for the default cell; `defaultHeight` sets
 * the row height when `TrackConfig.height` is absent.
 */
export interface LaneDefinition {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  lane: FC<any>;
  treeCell?: FC<TreeCellProps>;
  /** Icon name for the default tree cell. */
  icon?: string;
  /** Default row height in px when the track has no explicit `height`. */
  defaultHeight?: number;
}

/**
 * Lookup map: view-name string → lane definition. TimelineContainer reads
 * `TrackConfig.view` and dispatches through this registry. Recipe
 * wrappers and custom lanes register under their own keys; unknown views
 * fall through to `PlaceholderLane`.
 */
export type LaneRegistry = Record<string, LaneDefinition>;

/**
 * Static field a lane component exposes so the JSX walker in
 * `<TimelineContainer>` can recover its registry name from a React element
 * without round-tripping through the registry.
 *
 *   (VideoLane as LaneComponent).__viewName === 'VideoLane'
 */
export interface LaneComponent<P = unknown> extends FC<P> {
  __viewName?: string;
}
