import { Icon } from './Icon';

export interface CursorOverlayProps {
  /** Position as percentage (0-100) across the lane area. */
  left: number;
  /** Readout text shown in the pill at the top of the cursor line. */
  label?: string;
  /** Cursor line color; defaults depend on `variant`. */
  color?: string;
  /** Show the label readout pill. */
  showReadout?: boolean;
  /** Show the magnet icon inside the readout (snap active). */
  showMagnet?: boolean;
  /** `active` for the live hover cursor, `static` for placed markers. */
  variant?: 'active' | 'static';
  /** Z-index override. */
  zIndex?: number;
}

/**
 * Vertical cursor line + optional readout pill. Replaces the amber
 * `HoverGuide` with the visual treatment from vuer-uikit's waterfall:
 * readout anchored at the top, snap-magnet icon when the cursor is
 * magnetized to a nearby event, crisp pill background that reads on
 * both themes.
 *
 * Two variants:
 *   - `active` (default): red line, white pill with border — the
 *      interactive "hover cursor" driven by pointer moves.
 *   - `static`: muted gray line, semi-transparent pill — used for
 *      placed temporal markers that persist after the cursor leaves.
 */
export function CursorOverlay({
  left,
  label,
  color,
  showReadout = false,
  showMagnet = false,
  variant = 'active',
  zIndex = 20,
}: CursorOverlayProps) {
  const lineColor =
    color ?? (variant === 'active' ? 'rgb(239 68 68)' : 'rgb(148 163 184)');
  const leftValue = `${left}%`;

  return (
    <>
      <div
        aria-hidden
        className="absolute top-0 h-full w-px pointer-events-none"
        style={{ left: leftValue, backgroundColor: lineColor, zIndex }}
      />
      {showReadout && (
        <div
          className={
            variant === 'active'
              ? 'absolute top-1 flex items-center justify-center px-2 py-0.5 text-xs font-mono tabular-nums border rounded-md shadow-md pointer-events-none bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-700 text-zinc-800 dark:text-zinc-100'
              : 'absolute top-1 flex items-center justify-center px-2 py-0.5 text-xs font-mono tabular-nums rounded-md pointer-events-auto bg-zinc-200/80 dark:bg-zinc-800/80 text-zinc-700 dark:text-zinc-300 backdrop-blur-sm'
          }
          style={{
            left: leftValue,
            transform: 'translateX(-50%)',
            minWidth: '6ch',
            zIndex,
          }}
        >
          {showMagnet && (
            <span className="mr-1 text-zinc-500 dark:text-zinc-400">
              <Icon name="magnet" size={11} />
            </span>
          )}
          <span>{label}</span>
        </div>
      )}
    </>
  );
}
