import { useState, type ReactNode } from 'react';
import { useTheme, type Theme } from './ThemeContext';

const ICON_SIZE = 28;
const GAP = 2;

function SunIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2" />
      <path d="M12 20v2" />
      <path d="m4.93 4.93 1.41 1.41" />
      <path d="m17.66 17.66 1.41 1.41" />
      <path d="M2 12h2" />
      <path d="M20 12h2" />
      <path d="m6.34 17.66-1.41 1.41" />
      <path d="m19.07 4.93-1.41 1.41" />
    </svg>
  );
}

function MoonIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z" />
    </svg>
  );
}

function SunMoonIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M12 8a2.83 2.83 0 0 0 4 4 4 4 0 1 1-4-4" />
      <path d="M12 2v2" />
      <path d="M12 20v2" />
      <path d="m4.9 4.9 1.4 1.4" />
      <path d="m17.7 17.7 1.4 1.4" />
      <path d="M2 12h2" />
      <path d="M20 12h2" />
      <path d="m6.3 17.7-1.4 1.4" />
      <path d="m19.1 4.9-1.4 1.4" />
    </svg>
  );
}

const THEMES: { value: Theme; icon: ReactNode; label: string }[] = [
  { value: 'light', icon: <SunIcon />, label: 'Light' },
  { value: 'dark', icon: <MoonIcon />, label: 'Dark' },
  { value: 'system', icon: <SunMoonIcon />, label: 'System' },
];

/**
 * 3-state sliding theme toggle — same interaction as the doc-site Navbar:
 * collapsed it shows only the current selection; on hover the other two
 * options slide in and a highlight pill marks the active one.
 *
 * Visuals use Tailwind with the `dark:` variant bound to `data-theme="dark"`
 * (configured in `src/styles.css`), so the toggle itself reacts instantly
 * to its own state changes.
 */
export function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const [hovered, setHovered] = useState(false);
  const currentIndex = THEMES.findIndex((t) => t.value === theme);
  const expandedWidth = ICON_SIZE * THEMES.length + GAP * (THEMES.length - 1);

  return (
    <div
      className="relative overflow-hidden rounded-full bg-zinc-100 dark:bg-zinc-800"
      style={{
        width: hovered ? expandedWidth : ICON_SIZE,
        height: ICON_SIZE,
        transition: 'width 350ms cubic-bezier(0.4, 0, 0.2, 1)',
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <div
        className="absolute top-0 left-0 flex items-center"
        style={{
          height: ICON_SIZE,
          gap: GAP,
          transition: 'transform 350ms cubic-bezier(0.4, 0, 0.2, 1)',
          transform: hovered
            ? 'translateX(0)'
            : `translateX(-${currentIndex * (ICON_SIZE + GAP)}px)`,
        }}
      >
        {/* Active-pill highlight */}
        <div
          className="absolute rounded-full bg-indigo-100 dark:bg-indigo-500/20"
          style={{
            left: currentIndex * (ICON_SIZE + GAP),
            width: ICON_SIZE,
            height: ICON_SIZE,
            transition: 'left 350ms cubic-bezier(0.4, 0, 0.2, 1)',
          }}
        />

        {THEMES.map((t) => {
          const active = t.value === theme;
          return (
            <button
              key={t.value}
              onClick={() => setTheme(t.value)}
              aria-label={`${t.label} theme`}
              title={`${t.label} theme`}
              className={
                'relative z-10 flex items-center justify-center bg-transparent border-0 p-0 cursor-pointer ' +
                (active
                  ? 'text-indigo-600 dark:text-indigo-300'
                  : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200')
              }
              style={{ width: ICON_SIZE, height: ICON_SIZE }}
            >
              {t.icon}
            </button>
          );
        })}
      </div>
    </div>
  );
}
