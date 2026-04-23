/**
 * Minimal inline SVG icon set — no external deps.
 *
 * Stroke-based 16×16 glyphs used by the default tree cell, timeline
 * header, and the built-in lane definitions. Consumers can bypass this
 * component entirely and pass their own icon component via a custom
 * `TreeCell` in `LaneRegistry`.
 */
export type IconName =
  | 'chevron-right'
  | 'chevron-down'
  | 'eye'
  | 'eye-off'
  | 'search'
  | 'video'
  | 'audio'
  | 'waves'
  | 'axis'
  | 'trend'
  | 'caption'
  | 'diamond'
  | 'bar'
  | 'folder'
  | 'robot'
  | 'pipeline'
  | 'play'
  | 'pause'
  | 'skip-back'
  | 'skip-fwd'
  | 'zoom-in'
  | 'zoom-out'
  | 'fit'
  | 'center'
  | 'magnet'
  | 'case-sensitive'
  | 'regex'
  | 'history'
  | 'file-code'
  | 'bot'
  | 'check-circle'
  | 'pause-circle';

export interface IconProps {
  name: IconName | string;
  size?: number;
  className?: string;
  /** Stroke width for the inline SVG. Defaults to 1.5. */
  strokeWidth?: number;
}

export function Icon({ name, size = 14, className, strokeWidth = 1.5 }: IconProps) {
  const common = {
    width: size,
    height: size,
    viewBox: '0 0 16 16',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
    className,
    'aria-hidden': true,
  };

  switch (name) {
    case 'chevron-right':
      return (
        <svg {...common}>
          <path d="M6 3l5 5-5 5" />
        </svg>
      );
    case 'chevron-down':
      return (
        <svg {...common}>
          <path d="M3 6l5 5 5-5" />
        </svg>
      );
    case 'eye':
      return (
        <svg {...common}>
          <path d="M1.5 8s2.5-4.5 6.5-4.5S14.5 8 14.5 8 12 12.5 8 12.5 1.5 8 1.5 8z" />
          <circle cx="8" cy="8" r="2" />
        </svg>
      );
    case 'eye-off':
      return (
        <svg {...common}>
          <path d="M2 2l12 12" />
          <path d="M6.5 6.5a2 2 0 0 0 2.8 2.8" />
          <path d="M3 4.7C2.1 5.6 1.5 8 1.5 8s2.5 4.5 6.5 4.5c1.1 0 2.1-.3 2.9-.7" />
          <path d="M6.8 3.6A7.1 7.1 0 0 1 8 3.5c4 0 6.5 4.5 6.5 4.5s-.7 1.2-1.9 2.4" />
        </svg>
      );
    case 'search':
      return (
        <svg {...common}>
          <circle cx="7" cy="7" r="4.5" />
          <path d="M10.5 10.5L14 14" />
        </svg>
      );
    case 'video':
      return (
        <svg {...common}>
          <rect x="1.5" y="4" width="9" height="8" rx="1.5" />
          <path d="M10.5 7l3.5-2v6l-3.5-2z" />
        </svg>
      );
    case 'audio':
      return (
        <svg {...common}>
          <path d="M3 6v4M6 4v8M9 2v12M12 5v6" />
        </svg>
      );
    case 'waves':
      return (
        <svg {...common}>
          <path d="M1.5 8c1.5-3 3-3 4.5 0s3 3 4.5 0 3-3 4.5 0" />
        </svg>
      );
    case 'axis':
      return (
        <svg {...common}>
          <path d="M2 14V2M2 14h12" />
          <path d="M2 14l4-4 3 2 5-6" />
        </svg>
      );
    case 'trend':
      return (
        <svg {...common}>
          <path d="M2 12l3-3 3 2 6-6" />
          <path d="M10 5h4v4" />
        </svg>
      );
    case 'caption':
      return (
        <svg {...common}>
          <rect x="1.5" y="3" width="13" height="10" rx="1.5" />
          <path d="M4 7.5h3M9 7.5h3M4 10h6" />
        </svg>
      );
    case 'diamond':
      return (
        <svg {...common}>
          <path d="M8 2l6 6-6 6-6-6z" />
        </svg>
      );
    case 'bar':
      return (
        <svg {...common}>
          <rect x="2" y="4" width="8" height="2.5" rx="1" />
          <rect x="5" y="8" width="9" height="2.5" rx="1" />
        </svg>
      );
    case 'folder':
      return (
        <svg {...common}>
          <path d="M1.5 5.5V12a1 1 0 0 0 1 1h11a1 1 0 0 0 1-1V6a1 1 0 0 0-1-1H7L5.5 3.5h-3a1 1 0 0 0-1 1z" />
        </svg>
      );
    case 'robot':
      return (
        <svg {...common}>
          <rect x="2.5" y="5" width="11" height="8" rx="1.5" />
          <path d="M8 2v3" />
          <circle cx="8" cy="1.5" r="1" />
          <circle cx="6" cy="9" r="0.8" fill="currentColor" />
          <circle cx="10" cy="9" r="0.8" fill="currentColor" />
        </svg>
      );
    case 'pipeline':
      return (
        <svg {...common}>
          <circle cx="3.5" cy="8" r="1.5" />
          <circle cx="12.5" cy="8" r="1.5" />
          <path d="M5 8h6" />
          <path d="M8 5v6" />
        </svg>
      );
    case 'play':
      return (
        <svg {...common}>
          <path d="M4 3l9 5-9 5z" fill="currentColor" stroke="none" />
        </svg>
      );
    case 'pause':
      return (
        <svg {...common}>
          <rect x="4" y="3" width="3" height="10" />
          <rect x="9" y="3" width="3" height="10" />
        </svg>
      );
    case 'skip-back':
      return (
        <svg {...common}>
          <path d="M13 3L5 8l8 5z" fill="currentColor" stroke="none" />
          <rect x="3" y="3" width="1.5" height="10" fill="currentColor" stroke="none" />
        </svg>
      );
    case 'skip-fwd':
      return (
        <svg {...common}>
          <path d="M3 3l8 5-8 5z" fill="currentColor" stroke="none" />
          <rect x="11.5" y="3" width="1.5" height="10" fill="currentColor" stroke="none" />
        </svg>
      );
    case 'zoom-in':
      return (
        <svg {...common}>
          <circle cx="7" cy="7" r="4.5" />
          <path d="M10.5 10.5L14 14M5 7h4M7 5v4" />
        </svg>
      );
    case 'zoom-out':
      return (
        <svg {...common}>
          <circle cx="7" cy="7" r="4.5" />
          <path d="M10.5 10.5L14 14M5 7h4" />
        </svg>
      );
    case 'fit':
      return (
        <svg {...common}>
          <path d="M2 5V2h3M14 5V2h-3M2 11v3h3M14 11v3h-3" />
        </svg>
      );
    case 'center':
      return (
        <svg {...common}>
          <circle cx="8" cy="8" r="5" />
          <circle cx="8" cy="8" r="1" fill="currentColor" stroke="none" />
        </svg>
      );
    case 'magnet':
      // U-shaped magnet: two vertical prongs bridged at the top.
      return (
        <svg {...common}>
          <path d="M4 3v5a4 4 0 0 0 8 0V3" />
          <path d="M4 3h3M9 3h3" />
          <path d="M4 8h3M9 8h3" />
        </svg>
      );
    case 'case-sensitive':
      // Uppercase A (left) + lowercase a (right) — mirrors Lucide's
      // CaseSensitive glyph, scaled from 24×24 to our 16×16 viewBox.
      return (
        <svg {...common}>
          {/* Capital A: two legs + crossbar */}
          <path d="M2 13l3-8 3 8" />
          <path d="M3 10.5h4" />
          {/* Lowercase a: body + right stem */}
          <circle cx="12" cy="11" r="2" />
          <path d="M14 9v4" />
        </svg>
      );
    case 'regex':
      // Asterisk with a dot — the "regex" glyph used in search bars.
      return (
        <svg {...common}>
          <path d="M9 4v4M7.2 5l3.6 2M7.2 7l3.6-2" />
          <circle cx="5" cy="12" r="0.8" fill="currentColor" stroke="none" />
        </svg>
      );
    case 'history':
      // Counter-clockwise arrow + clock face — "event happened in the past".
      return (
        <svg {...common}>
          <path d="M2 8a6 6 0 1 0 2-4.5" />
          <path d="M2 3v3h3" />
          <path d="M8 5v3l2 1.5" />
        </svg>
      );
    case 'file-code':
      // Document with code brackets inside.
      return (
        <svg {...common}>
          <path d="M3 2h7l3 3v9H3z" />
          <path d="M10 2v3h3" />
          <path d="M6 10l-1.5 1.5L6 13M10 10l1.5 1.5L10 13" />
        </svg>
      );
    case 'bot':
      // Robot head: rounded square + antenna + two eyes.
      return (
        <svg {...common}>
          <rect x="2" y="5" width="12" height="8" rx="2" />
          <path d="M8 2v3" />
          <circle cx="8" cy="2" r="0.6" fill="currentColor" stroke="none" />
          <circle cx="6" cy="9" r="0.9" fill="currentColor" stroke="none" />
          <circle cx="10" cy="9" r="0.9" fill="currentColor" stroke="none" />
        </svg>
      );
    case 'check-circle':
      // Circle with an inset check mark.
      return (
        <svg {...common}>
          <circle cx="8" cy="8" r="6" />
          <path d="M5 8.5l2 2 4-4" />
        </svg>
      );
    case 'pause-circle':
      // Circle with two vertical bars inside.
      return (
        <svg {...common}>
          <circle cx="8" cy="8" r="6" />
          <path d="M6.5 5.5v5M9.5 5.5v5" />
        </svg>
      );
    default:
      return (
        <svg {...common}>
          <circle cx="8" cy="8" r="1" fill="currentColor" stroke="none" />
        </svg>
      );
  }
}
