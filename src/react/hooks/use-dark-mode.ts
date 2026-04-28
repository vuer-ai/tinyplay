import { useEffect, useState } from 'react';

/**
 * Reactive `data-theme` reader. Returns `true` when the closest ancestor
 * (or `<html>`) carries `data-theme="dark"`.
 *
 * `styles.css` binds Tailwind's `dark:` variant to that attribute, so HTML
 * elements can theme themselves with class strings alone. This hook is for
 * the cases that can't — Canvas paint code and SVG attributes that aren't
 * easily expressed as Tailwind utilities — so they can pick the right
 * colors and re-render when the theme flips.
 */
export function useDarkMode(): boolean {
  const [isDark, setIsDark] = useState<boolean>(readIsDark);

  useEffect(() => {
    if (typeof document === 'undefined') return;
    const root = document.documentElement;
    const update = () => setIsDark(readIsDark());
    const obs = new MutationObserver(update);
    obs.observe(root, { attributes: true, attributeFilter: ['data-theme'] });
    update();
    return () => obs.disconnect();
  }, []);

  return isDark;
}

function readIsDark(): boolean {
  if (typeof document === 'undefined') return false;
  return document.documentElement.getAttribute('data-theme') === 'dark';
}
