import {
  isSemanticColor,
  leftWedgeClasses,
  rightWedgeClasses,
  type SemanticColor,
} from './colors';

export interface WedgeProps {
  /** Color of the indicator. Only semantic names produce a colored wedge;
   *  arbitrary hex falls back to gray-medium. */
  color?: string;
}

function pickColor(c: string | undefined): SemanticColor {
  if (isSemanticColor(c)) return c;
  return 'gray-medium';
}

/**
 * Right-pointing triangle shown at the left edge of the lane when an
 * item is entirely off-screen to the left. Clicking could pan (TODO);
 * for now it is decorative.
 */
export function LeftWedge({ color }: WedgeProps) {
  const cls = leftWedgeClasses[pickColor(color)];
  return (
    <div
      aria-hidden
      className={`my-auto border-y-[6px] border-y-transparent border-r-[5px] ${cls}`}
    />
  );
}

/**
 * Left-pointing triangle shown at the right edge of the lane when an
 * item is entirely off-screen to the right.
 */
export function RightWedge({ color }: WedgeProps) {
  const cls = rightWedgeClasses[pickColor(color)];
  return (
    <div
      aria-hidden
      className={`my-auto border-y-[6px] border-y-transparent border-l-[5px] ${cls}`}
    />
  );
}
