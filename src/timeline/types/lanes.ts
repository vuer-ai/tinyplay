/**
 * Lane component prop types.
 *
 * Lanes are classified by *display pattern*, not by business meaning. The
 * seven primitives below render every row shape in the teleop_run_037
 * reference. Business names (`QposLane`, `EventLane`, `NarrationLane`) are
 * one-line recipe wrappers — ship them as demo examples, not core API.
 *
 * Data contract: each lane declares the data shape it expects via
 * `LaneDataProps<T>`. `src` and `data` are mutually exclusive; exactly one
 * must be provided. `normalize` is JSX-only (not serializable into
 * TimelineConfig).
 *
 * Dispatch at `<TimelineContainer>` is keyed on a `DtypeId`, not a lane
 * component name. See `../../dtypes/types.ts` for `TimelineViews` /
 * `TimelineViewEntry`.
 */

import type { FC } from 'react';
import type { Sample, AnnotationEntry } from './data';
import type { DtypeSpec } from '../../dtypes/types';
import type { TreeRow } from '../tree';

// ---------------------------------------------------------------------------
// Base mixins

/** Visual / identity fields shared by every lane. */
export interface LaneVisualProps {
  /** Stable identifier — supplied by the outer `TrackRow.id`. */
  id?: string;
  /** Tree-label — supplied by `TrackRow.name` or the path-leaf fallback. */
  name?: string;
  /** Track path — injected by `TimelineContainer` so lanes can introspect. */
  path?: string;
  height?: number;
  /** Hidden lanes skip data loading. Default true. */
  visible?: boolean;
  /** Accent color (hex or CSS named). */
  color?: string;
  /** Tree-row icon (lucide icon name or URL). */
  icon?: string;
  /** Dtype spec — injected by `TimelineContainer`. Lanes may introspect
   *  (e.g. defaults) or ignore it. */
  dtype?: DtypeSpec;
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
// Tree cell + lane component types

/**
 * Props a `TreeCell` receives. The row is either a data track or a
 * synthesized group (`row.kind` discriminates). Per-view overrides are
 * supplied via `TimelineViewEntry.treeCell`.
 */
export interface TreeCellProps {
  row: TreeRow;
  expanded: boolean;
  selected: boolean;
  hovered: boolean;
  hiddenDirect: boolean;
  hiddenInherited: boolean;
  height: number;
  /** Resolved icon — TrackRow.icon / GroupConfig.icon / TimelineViewEntry.icon. */
  icon?: string;
  onToggleExpanded(): void;
  onToggleHidden(): void;
}

/**
 * A lane component. Just `FC<P>` — no static `__viewName` any longer
 * (dispatch goes through the `views` map keyed on dtype, not on component
 * identity).
 */
export type LaneComponent<P = unknown> = FC<P>;
