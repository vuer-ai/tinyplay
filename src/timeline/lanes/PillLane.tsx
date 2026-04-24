import { usePlaylist } from '../../react/hooks/use-playlist';
import { useMergedEntries } from '../../react/hooks/use-merged-entries';
import { useTimelineViewport } from '../viewport';
import { assertSrcOrData } from '../validate';
import { formatDuration } from '../duration';
import {
  bgClasses,
  borderClasses,
  isSemanticColor,
  type SemanticColor,
} from '../colors';
import type { AnnotationEntry } from '../types/data';
import type { PillLaneProps, LaneComponent } from '../types/lanes';

const DEFAULT_COLOR: SemanticColor = 'blue';

interface VisualProps {
  entries: readonly AnnotationEntry[];
  color: SemanticColor;
  textField: string;
}

function resolveEntryColor(
  e: AnnotationEntry,
  fallback: SemanticColor,
): SemanticColor {
  const c = e.color;
  if (isSemanticColor(c)) return c;
  return fallback;
}

const clamp = (v: number, lo: number, hi: number) =>
  Math.min(Math.max(v, lo), hi);

function PillVisual({ entries, color: defaultColor, textField }: VisualProps) {
  const v = useTimelineViewport();
  const viewDuration = Math.max(1e-6, v.containerWidth / v.pxPerSecond);
  const toPercent = (t: number) =>
    ((t - v.scrollSec) * v.pxPerSecond) /
    Math.max(1, v.containerWidth) *
    100;

  return (
    <div className="relative h-full">
      {entries.map((e, i) => {
        if (typeof e.te !== 'number') return null; // instant events → MarkerLane
        const isHalted =
          e.halted === true ||
          e.state === 'halted' ||
          e.kind === 'halted';
        const hasStripes = e.stripes === true || e.kind === 'attempt';
        const c = resolveEntryColor(e, defaultColor);
        const text = (e[textField] as string | undefined) ?? e.label ?? '';
        const startPct = toPercent(e.ts);
        const widthPct = ((e.te - e.ts) / viewDuration) * 100;
        const viewEnd = v.scrollSec + viewDuration;
        const visibleStart = Math.max(e.ts, v.scrollSec);
        const visibleEnd = Math.min(e.te, viewEnd);
        const visibleDur = visibleEnd - visibleStart;
        const visibleWidthPct = (Math.max(0, visibleDur) / viewDuration) * 100;

        // Launch-wait dashed line: entry was enqueued at `createTime` before
        // execution started at `ts`. Rendered as a thin dashed segment with
        // vertical end caps, matching the waterfall reference.
        const waitLine =
          typeof e.createTime === 'number' && e.createTime < e.ts ? (
            <div
              key={`w-${e.ts}-${i}`}
              className="absolute top-1/2 -translate-y-1/2 h-2"
              style={{
                left: `${toPercent(e.createTime)}%`,
                width: `${((e.ts - e.createTime) / viewDuration) * 100}%`,
              }}
              aria-hidden
            >
              <div
                className={
                  'absolute top-1/2 left-0 h-2 w-px -translate-y-1/2 ' +
                  bgClasses[c]
                }
              />
              <div
                className={
                  'absolute top-1/2 w-full -translate-y-1/2 border-t border-dashed ' +
                  borderClasses[c]
                }
              />
              <div
                className={
                  'absolute top-1/2 right-0 h-2 w-px -translate-y-1/2 ' +
                  bgClasses[c]
                }
              />
            </div>
          ) : null;

        if (isHalted) {
          // Dashed line between two vertical caps + smoothly-shrinking
          // orange "Halted" pill. CSS `zoom` interpolates between 50% and
          // 100% as the visible width crosses 6–12%, so the pill shrinks
          // rather than popping to a dot.
          const haltedZoom = clamp(visibleWidthPct, 6, 12) / 12;
          const haltedShowPill = visibleWidthPct >= 7;
          return (
            <div key={`h-${e.ts}-${i}`}>
              {waitLine}
              <div
                className="absolute top-1/2 -translate-y-1/2 flex items-center h-full"
                style={{ left: `${startPct}%`, width: `${widthPct}%` }}
              >
                <div className="relative h-full w-full flex items-center justify-center">
                  <span className="absolute left-0 top-1/2 h-2 w-px -translate-y-1/2 bg-zinc-400 dark:bg-zinc-500" />
                  <span className="w-full border-t border-dashed border-zinc-400 dark:border-zinc-500" />
                  <span className="absolute right-0 top-1/2 h-2 w-px -translate-y-1/2 bg-zinc-400 dark:bg-zinc-500" />
                </div>
                <div
                  className="pointer-events-none absolute left-1/2 -translate-x-1/2 flex items-center justify-center"
                  // `zoom` is non-standard but widely supported and is the
                  // simplest way to scale the entire pill (text + padding)
                  // proportionally as the segment narrows.
                  style={{ zoom: haltedZoom } as React.CSSProperties}
                >
                  {haltedShowPill ? (
                    <span className="rounded-full bg-orange-500 px-2 py-0.5 text-[10px] font-medium text-white whitespace-nowrap">
                      Halted
                    </span>
                  ) : (
                    <span className="h-3 w-3 rounded-full bg-orange-500" />
                  )}
                </div>
              </div>
            </div>
          );
        }

        // Normal bar pill
        return (
          <div key={`p-${e.ts}-${i}`} className="absolute inset-y-0 left-0 right-0">
            {waitLine}
            {/* Execution bar */}
            <div
              className={
                'absolute top-1/2 -translate-y-1/2 h-5 rounded-full flex items-center justify-center overflow-hidden ' +
                bgClasses[c] +
                (hasStripes
                  ? ' bg-[repeating-linear-gradient(-45deg,transparent,transparent_4px,rgba(0,0,0,0.18)_4px,rgba(0,0,0,0.18)_8px)]'
                  : '')
              }
              style={{
                left: `${startPct}%`,
                width: `${widthPct}%`,
              }}
            />
            {/* Start-dot: small circle with accent border */}
            <div
              className={
                'absolute top-1/2 z-10 size-2 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 bg-white dark:bg-zinc-950 ' +
                borderClasses[c]
              }
              style={{ left: `${startPct}%` }}
              aria-hidden
            />
            {/* Centered duration label — the text label (name) lives on the
                left tree side; the bar carries only the duration, matching
                the waterfall reference. */}
            {visibleWidthPct >= 4 && (
              <div
                className="pointer-events-none absolute top-1/2 h-5 -translate-y-1/2 flex items-center justify-center"
                style={{
                  left: `${toPercent(visibleStart)}%`,
                  width: `${visibleWidthPct}%`,
                }}
              >
                <span className="text-[11px] font-medium text-white whitespace-nowrap overflow-hidden tabular-nums">
                  {formatDuration(e.te - e.ts)}
                </span>
              </div>
            )}
          </div>
        );
        void text;
      })}
    </div>
  );
}

/**
 * Interval pills in the reference waterfall style: rounded-full pill body
 * with an accent-bordered start dot and a centered label that shows the
 * duration. Entries with `halted: true` / `kind: 'halted'` / `state:
 * 'halted'` render as a dashed segment with an orange "Halted" tag
 * (matches the reference's halted-step treatment).
 *
 * Entries without `te` are skipped — point events belong on `MarkerLane`.
 */
export const PillLane: LaneComponent<PillLaneProps> = (props) => {
  assertSrcOrData(props, `PillLane${props.name ? ` "${props.name}"` : ''}`);
  if (props.src) return <PillLaneSrc {...props} src={props.src} />;
  return <PillLaneData {...props} data={props.data!} />;
};

function pickColor(color: string | undefined): SemanticColor {
  return isSemanticColor(color) ? color : DEFAULT_COLOR;
}

function PillLaneSrc({
  src,
  normalize,
  color,
  textField = 'label',
}: PillLaneProps & { src: string }) {
  const { engine } = usePlaylist({ url: src });
  const { entries } = useMergedEntries<AnnotationEntry>(
    engine,
    undefined,
    normalize ? { decode: normalize as (d: unknown) => AnnotationEntry[] } : undefined,
  );
  return (
    <PillVisual
      entries={entries}
      color={pickColor(color)}
      textField={textField}
    />
  );
}

function PillLaneData({
  data,
  color,
  textField = 'label',
}: PillLaneProps & { data: AnnotationEntry[] }) {
  return (
    <PillVisual
      entries={data}
      color={pickColor(color)}
      textField={textField}
    />
  );
}
