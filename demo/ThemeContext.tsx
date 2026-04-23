import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react';

/**
 * User-facing theme choice. `system` follows `prefers-color-scheme`; the
 * provider resolves it internally so `data-theme` on <html> is always
 * exactly `light` or `dark` — which keeps downstream Tailwind `dark:`
 * variants simple (one selector covers all three states).
 *
 * Mirrors the pattern in `doc-site-dreamlake/components/ThemeContext.tsx`
 * so toggling feels identical between the demo and the docs site.
 */
export type Theme = 'light' | 'dark' | 'system';

interface ThemeContextValue {
  theme: Theme;
  setTheme(t: Theme): void;
  /** Resolved value currently applied to `data-theme` on <html>. */
  resolved: 'light' | 'dark';
}

const STORAGE_KEY = 'theme';

const ThemeContext = createContext<ThemeContextValue>({
  theme: 'system',
  setTheme: () => {},
  resolved: 'light',
});

function systemResolved(): 'light' | 'dark' {
  if (typeof window === 'undefined') return 'light';
  return window.matchMedia('(prefers-color-scheme: dark)').matches
    ? 'dark'
    : 'light';
}

function applyAttribute(resolved: 'light' | 'dark') {
  if (typeof document === 'undefined') return;
  document.documentElement.setAttribute('data-theme', resolved);
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<Theme>('system');
  const [resolved, setResolved] = useState<'light' | 'dark'>('light');
  const themeRef = useRef<Theme>(theme);
  themeRef.current = theme;

  // Initial load: read stored preference + apply.
  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY) as Theme | null;
    const initial: Theme =
      stored === 'light' || stored === 'dark' || stored === 'system'
        ? stored
        : 'system';
    const res = initial === 'system' ? systemResolved() : initial;
    setThemeState(initial);
    setResolved(res);
    applyAttribute(res);
  }, []);

  // Track OS preference while user is on "system".
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const handler = () => {
      if (themeRef.current !== 'system') return;
      const res = mq.matches ? 'dark' : 'light';
      setResolved(res);
      applyAttribute(res);
    };
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  const setTheme = useCallback((next: Theme) => {
    setThemeState(next);
    localStorage.setItem(STORAGE_KEY, next);
    const res = next === 'system' ? systemResolved() : next;
    setResolved(res);
    applyAttribute(res);
  }, []);

  return (
    <ThemeContext.Provider value={{ theme, setTheme, resolved }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme(): ThemeContextValue {
  return useContext(ThemeContext);
}
