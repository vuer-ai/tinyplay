/**
 * Semantic color palette shared between timeline lanes and tree icons.
 *
 * Names mirror the vuer-uikit waterfall reference so the same palette
 * reads consistently between the two UIs. Consumers can still pass any
 * CSS color string to `TrackConfig.color` — semantic names are mapped
 * here; arbitrary strings are used verbatim (see `resolveColor`).
 */

export type SemanticColor =
  | 'blue'
  | 'green'
  | 'orange'
  | 'purple'
  | 'gray-light'
  | 'gray-medium';

/** Background (solid) Tailwind class per semantic color. */
export const bgClasses: Record<SemanticColor, string> = {
  blue: 'bg-blue-500',
  green: 'bg-green-500',
  orange: 'bg-orange-500',
  purple: 'bg-purple-500',
  'gray-light': 'bg-zinc-200 dark:bg-zinc-700',
  'gray-medium': 'bg-zinc-400 dark:bg-zinc-600',
};

/** Text color Tailwind class per semantic color. */
export const textClasses: Record<SemanticColor, string> = {
  blue: 'text-blue-600 dark:text-blue-300',
  green: 'text-green-600 dark:text-green-300',
  orange: 'text-orange-600 dark:text-orange-300',
  purple: 'text-purple-600 dark:text-purple-300',
  'gray-light': 'text-zinc-600 dark:text-zinc-300',
  'gray-medium': 'text-zinc-700 dark:text-zinc-200',
};

/** Border color Tailwind class per semantic color. */
export const borderClasses: Record<SemanticColor, string> = {
  blue: 'border-blue-500',
  green: 'border-green-500',
  orange: 'border-orange-500',
  purple: 'border-purple-500',
  'gray-light': 'border-zinc-300 dark:border-zinc-600',
  'gray-medium': 'border-zinc-400 dark:border-zinc-500',
};

/** Left-wedge (off-screen-left indicator). */
export const leftWedgeClasses: Record<SemanticColor, string> = {
  blue: 'border-r-blue-500',
  green: 'border-r-green-500',
  orange: 'border-r-orange-500',
  purple: 'border-r-purple-500',
  'gray-light': 'border-r-zinc-300 dark:border-r-zinc-600',
  'gray-medium': 'border-r-zinc-400 dark:border-r-zinc-500',
};

/** Right-wedge (off-screen-right indicator). */
export const rightWedgeClasses: Record<SemanticColor, string> = {
  blue: 'border-l-blue-500',
  green: 'border-l-green-500',
  orange: 'border-l-orange-500',
  purple: 'border-l-purple-500',
  'gray-light': 'border-l-zinc-300 dark:border-l-zinc-600',
  'gray-medium': 'border-l-zinc-400 dark:border-l-zinc-500',
};

/** True when `color` is one of the semantic names in the palette. */
export function isSemanticColor(color: unknown): color is SemanticColor {
  return (
    color === 'blue' ||
    color === 'green' ||
    color === 'orange' ||
    color === 'purple' ||
    color === 'gray-light' ||
    color === 'gray-medium'
  );
}

/**
 * When lanes render inline styles (CSS color values rather than Tailwind
 * classes), map the semantic name onto its hex. Arbitrary CSS strings are
 * returned verbatim.
 */
const hexFor: Record<SemanticColor, string> = {
  blue: '#3b82f6',
  green: '#22c55e',
  orange: '#f97316',
  purple: '#a855f7',
  'gray-light': '#d4d4d8',
  'gray-medium': '#a1a1aa',
};

export function resolveColor(color: string | undefined, fallback: string): string {
  if (!color) return fallback;
  if (isSemanticColor(color)) return hexFor[color];
  return color;
}
