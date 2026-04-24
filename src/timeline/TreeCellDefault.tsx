import { Icon } from './Icon';
import type { TreeCellProps } from './types/lanes';

const INDENT_PX = 20;
const KEEP_END_CHARS = 9;

/**
 * Default left-side row renderer with waterfall-style L-shaped tree guides.
 *
 * Works for both track rows and synthesized group rows. Group rows carry
 * a bolder label + no eye toggle on leaves; track rows carry their dtype
 * icon chip. Long labels keep the final `KEEP_END_CHARS` characters
 * visible and truncate the middle (tail carries distinguishing suffixes).
 */
export function TreeCellDefault({
  row,
  expanded,
  hovered,
  hiddenDirect,
  hiddenInherited,
  height,
  icon,
  onToggleExpanded,
  onToggleHidden,
}: TreeCellProps) {
  const showEye = hovered || hiddenDirect || hiddenInherited;
  const isGroup = row.kind === 'group';
  const dimmed = hiddenDirect || hiddenInherited;

  const depth = row.depth;
  const isLast = row.isLast;
  const ancestorIsLast = row.ancestorIsLast;

  const label = isGroup ? row.name : row.track.name ?? leafOf(row.track.path);
  const titleAttr = isGroup ? row.path : row.track.path;
  const color = isGroup ? row.config.color : row.track.color;

  return (
    <div
      className={
        'flex items-stretch h-full pr-2 relative group ' +
        (dimmed ? 'opacity-50' : '')
      }
      style={{ height }}
    >
      {/* Depth guides: vertical lines through non-last ancestors */}
      <div className="flex shrink-0" aria-hidden>
        {Array.from({ length: depth }).map((_, i) => {
          const parentIsLast = ancestorIsLast?.[i] ?? false;
          return (
            <span
              key={i}
              className="inline-block relative"
              style={{ width: INDENT_PX }}
            >
              {!parentIsLast && i < depth - 1 ? (
                <span className="absolute inset-y-0 left-[14px] border-l border-zinc-200/70 dark:border-zinc-700/60" />
              ) : null}
              {i === depth - 1 ? (
                <span className="absolute inset-0">
                  {isLast ? (
                    /* Rounded L-corner for the last child: one element with
                       border-left + border-bottom + rounded-bl so the join
                       curves instead of being a sharp 90°. */
                    <span
                      className="absolute top-0 left-[14px] border-l border-b border-zinc-200/70 dark:border-zinc-700/60 rounded-bl-md"
                      style={{ height: '50%', width: 12 }}
                    />
                  ) : (
                    /* T-junction: full-height vertical + horizontal connector */
                    <>
                      <span className="absolute top-0 bottom-0 left-[14px] w-px bg-zinc-200/70 dark:bg-zinc-700/60" />
                      <span
                        className="absolute top-1/2 left-[14px] h-px bg-zinc-200/70 dark:bg-zinc-700/60"
                        style={{ width: 12 }}
                      />
                    </>
                  )}
                </span>
              ) : null}
            </span>
          );
        })}
      </div>

      <div className="flex items-center gap-1 flex-1 min-w-0 pl-1.5">
        {/* Chevron: rendered only for rows with children. */}
        {row.hasChildren && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onToggleExpanded();
            }}
            aria-label={expanded ? 'collapse' : 'expand'}
            className="w-4 h-4 shrink-0 flex items-center justify-center rounded text-zinc-500 dark:text-zinc-400 hover:bg-zinc-200/60 dark:hover:bg-zinc-800 hover:text-zinc-900 dark:hover:text-zinc-100 cursor-pointer"
          >
            <Icon
              name="chevron-down"
              size={12}
              strokeWidth={1.5}
              className={
                'transition-transform duration-150 ' +
                (expanded ? '' : '-rotate-90')
              }
            />
          </button>
        )}

        <span
          className={
            'w-4 h-4 flex items-center justify-center rounded-[3px] shrink-0 ' +
            colorStyles(color)
          }
        >
          <Icon name={icon ?? (isGroup ? 'folder' : 'diamond')} size={13} />
        </span>

        <TruncatedLabel label={label} isGroup={isGroup} dimmed={dimmed} title={titleAttr} />

        <div
          className="flex gap-0.5 shrink-0"
          style={{ opacity: showEye ? 1 : 0, transition: 'opacity 80ms' }}
        >
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onToggleHidden();
            }}
            className="w-5 h-5 flex items-center justify-center rounded text-zinc-500 dark:text-zinc-400 hover:bg-zinc-200/60 dark:hover:bg-zinc-800 hover:text-zinc-900 dark:hover:text-zinc-100 cursor-pointer"
            aria-label={hiddenDirect ? 'show' : 'hide'}
            title={hiddenDirect ? 'show' : 'hide'}
          >
            <Icon name={hiddenDirect ? 'eye-off' : 'eye'} size={13} />
          </button>
        </div>
      </div>
    </div>
  );
}

function leafOf(path: string): string {
  const i = path.lastIndexOf('/');
  return i < 0 ? path : path.slice(i + 1);
}

/**
 * Keep the last `KEEP_END_CHARS` of the label pinned on the right; the
 * rest truncates in the middle when the row narrows.
 */
function TruncatedLabel({
  label,
  isGroup,
  dimmed,
  title,
}: {
  label: string;
  isGroup: boolean;
  dimmed: boolean;
  title: string;
}) {
  const base =
    'text-xs select-none ' +
    (isGroup
      ? 'font-semibold text-zinc-800 dark:text-zinc-200'
      : 'text-zinc-800 dark:text-zinc-200') +
    (dimmed ? ' text-zinc-500 dark:text-zinc-500' : '');

  if (label.length <= KEEP_END_CHARS) {
    return (
      <span className={'flex-1 min-w-0 truncate ' + base} title={title}>
        {label}
      </span>
    );
  }

  const head = label.slice(0, label.length - KEEP_END_CHARS);
  const tail = label.slice(label.length - KEEP_END_CHARS);
  return (
    <span
      className={'flex min-w-0 flex-1 whitespace-nowrap ' + base}
      title={title}
    >
      <span className="min-w-0 truncate">{head}</span>
      <span className="shrink-0">{tail}</span>
    </span>
  );
}

function colorStyles(color: string | undefined): string {
  switch (color) {
    case 'blue':
      return 'text-blue-600 bg-blue-100 dark:text-blue-300 dark:bg-blue-500/15';
    case 'green':
      return 'text-green-600 bg-green-100 dark:text-green-300 dark:bg-green-500/15';
    case 'orange':
      return 'text-orange-600 bg-orange-100 dark:text-orange-300 dark:bg-orange-500/15';
    case 'purple':
      return 'text-purple-600 bg-purple-100 dark:text-purple-300 dark:bg-purple-500/15';
    case 'gray-light':
      return 'text-zinc-500 bg-zinc-100 dark:text-zinc-400 dark:bg-zinc-800';
    case 'gray-medium':
      return 'text-zinc-700 bg-zinc-200 dark:text-zinc-200 dark:bg-zinc-700';
    default:
      return 'text-zinc-500 dark:text-zinc-400';
  }
}
