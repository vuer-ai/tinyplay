import { usePlaylist } from '../../react/hooks/use-playlist';
import { useMergedEntries } from '../../react/hooks/use-merged-entries';
import { useTimelineViewport } from '../viewport';
import { assertSrcOrData } from '../validate';
import {
  bgClasses,
  isSemanticColor,
  type SemanticColor,
} from '../colors';
import type { AnnotationEntry } from '../types/data';
import type { MarkerLaneProps, LaneComponent } from '../types/lanes';

const DEFAULT_COLOR: SemanticColor = 'purple';

interface VisualProps {
  entries: readonly AnnotationEntry[];
  color: SemanticColor;
}

function resolveEntryColor(
  e: AnnotationEntry,
  fallback: SemanticColor,
): SemanticColor {
  const c = e.color;
  if (isSemanticColor(c)) return c;
  return fallback;
}

function MarkerVisual({ entries, color: defaultColor }: VisualProps) {
  const v = useTimelineViewport();
  const toPercent = (t: number) =>
    ((t - v.scrollSec) * v.pxPerSecond) /
    Math.max(1, v.containerWidth) *
    100;

  return (
    <div className="relative h-full">
      {entries.map((e, i) => {
        const c = resolveEntryColor(e, defaultColor);
        const percent = toPercent(e.ts);
        if (percent < -5 || percent > 105) return null;
        return (
          <div
            key={`m-${e.ts}-${i}`}
            className={
              'absolute top-1/2 -translate-x-1/2 -translate-y-1/2 h-3 w-3 border-2 border-white dark:border-zinc-950 cursor-pointer transition-transform duration-150 rotate-45 hover:scale-[1.25] ' +
              bgClasses[c]
            }
            style={{ left: `${percent}%` }}
            title={e.label}
          />
        );
      })}
    </div>
  );
}

/**
 * Instant-event diamonds in the reference waterfall style: accent fill,
 * 2 px background-matched border ring so the diamond pops against the
 * lane background on either theme. Accepts `data` inline or `src` m3u8.
 */
export const MarkerLane: LaneComponent<MarkerLaneProps> = (props) => {
  assertSrcOrData(props, `MarkerLane${props.name ? ` "${props.name}"` : ''}`);
  if (props.src) return <MarkerLaneSrc {...props} src={props.src} />;
  return <MarkerLaneData {...props} data={props.data!} />;
};
MarkerLane.__viewName = 'MarkerLane';

function pickColor(color: string | undefined): SemanticColor {
  return isSemanticColor(color) ? color : DEFAULT_COLOR;
}

function MarkerLaneSrc({
  src,
  normalize,
  color,
}: MarkerLaneProps & { src: string }) {
  const { engine } = usePlaylist({ url: src });
  const { entries } = useMergedEntries<AnnotationEntry>(
    engine,
    undefined,
    normalize ? { decode: normalize as (d: unknown) => AnnotationEntry[] } : undefined,
  );
  return <MarkerVisual entries={entries} color={pickColor(color)} />;
}

function MarkerLaneData({
  data,
  color,
}: MarkerLaneProps & { data: AnnotationEntry[] }) {
  return <MarkerVisual entries={data} color={pickColor(color)} />;
}
