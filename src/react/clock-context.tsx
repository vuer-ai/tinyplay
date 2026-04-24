import { createContext, useContext, type ReactNode } from 'react';
import type { TimelineClock } from '../core/timeline';

/**
 * Raw context — exported so container components can peek with
 * `useContext(ClockContext)` to detect whether a clock is available
 * without throwing. Prefer `useClockContext` for code that needs the
 * resolved clock.
 */
export const ClockContext = createContext<TimelineClock | null>(null);

export interface ClockProviderProps {
  clock: TimelineClock;
  children: ReactNode;
}

export function ClockProvider({ clock, children }: ClockProviderProps) {
  return <ClockContext.Provider value={clock}>{children}</ClockContext.Provider>;
}

/**
 * Pure resolver — exposed for testing and for non-hook consumers.
 * Priority: explicit argument > context value > throw.
 */
export function resolveClock(
  explicit: TimelineClock | null | undefined,
  ctx: TimelineClock | null,
): TimelineClock {
  const resolved = explicit ?? ctx;
  if (!resolved) {
    throw new Error(
      '[vuer-m3u] No TimelineClock available. Pass `clock` explicitly or wrap the tree in <ClockProvider>.',
    );
  }
  return resolved;
}

/**
 * Resolve a TimelineClock from an explicit argument or the nearest
 * `<ClockProvider>`. Throws if neither is available.
 */
export function useClockContext(explicit?: TimelineClock | null): TimelineClock {
  const ctx = useContext(ClockContext);
  return resolveClock(explicit, ctx);
}
