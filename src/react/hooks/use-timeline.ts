import { useCallback, useEffect, useRef, useSyncExternalStore } from 'react';
import { TimelineClock } from '../../core/timeline';
import type { TimelineState } from '../../core/types';

/**
 * Create or adopt a `TimelineClock` and return React-friendly playback state.
 *
 * Two modes, picked at first render and locked thereafter:
 *
 *   - `useTimeline(duration)` — creates and owns a new clock. Destroyed
 *     on unmount. This is the root / single-owner case.
 *
 *   - `useTimeline(duration, externalClock)` — reuses the passed clock
 *     (e.g. from an outer `<ClockProvider>`). Does NOT call `destroy()`
 *     on unmount — whoever created the clock destroys it.
 *
 * Returns:
 * - `clock` — pass to player components (they subscribe at the fps they need)
 * - `state` — discrete playback state (playing, rate, loop, duration).
 *             Only re-renders when these values change (on seek events),
 *             NOT on every frame. For currentTime, use `useClockValue(clock, fps)`.
 *
 * Duration is auto-detected from playlists via `usePlaylist(options, clock)`.
 */
export function useTimeline(duration = 0, externalClock?: TimelineClock | null) {
  // Ownership + identity locked on first render. Swapping an external clock
  // mid-lifetime would orphan subscriptions on the old one, so we ignore
  // changes to `externalClock` after the first call.
  const clockRef = useRef<TimelineClock | null>(null);
  const ownsRef = useRef(false);
  if (!clockRef.current) {
    if (externalClock) {
      clockRef.current = externalClock;
      ownsRef.current = false;
    } else {
      clockRef.current = new TimelineClock(duration);
      ownsRef.current = true;
    }
  }
  const clock = clockRef.current;

  useEffect(() => {
    if (duration > 0) clock.setDuration(duration);
  }, [clock, duration]);

  useEffect(() => {
    return () => {
      if (ownsRef.current) clock.destroy();
    };
  }, [clock]);

  // State snapshot — only updates on seek events (play/pause/seek/rate/loop).
  // Does NOT include currentTime — consumers use useClockValue for that.
  const snapRef = useRef<TimelineState>({
    duration: clock.duration,
    playing: clock.playing,
    playbackRate: clock.rate,
    loop: clock.loop,
  });

  const subscribe = useCallback(
    (onStoreChange: () => void) => {
      return clock.on('seek', () => {
        const prev = snapRef.current;
        const next: TimelineState = {
          duration: clock.duration,
          playing: clock.playing,
          playbackRate: clock.rate,
          loop: clock.loop,
        };
        if (
          prev.duration !== next.duration ||
          prev.playing !== next.playing ||
          prev.playbackRate !== next.playbackRate ||
          prev.loop !== next.loop
        ) {
          snapRef.current = next;
        }
        onStoreChange();
      });
    },
    [clock],
  );

  const getSnapshot = useCallback(() => snapRef.current, []);
  const state = useSyncExternalStore(subscribe, getSnapshot);

  const play = useCallback(() => clock.play(), [clock]);
  const pause = useCallback(() => clock.pause(), [clock]);
  const seek = useCallback((t: number) => clock.seek(t), [clock]);
  const setPlaybackRate = useCallback((r: number) => clock.setRate(r), [clock]);
  const setLoop = useCallback((v: boolean) => clock.setLoop(v), [clock]);

  return { clock, state, play, pause, seek, setPlaybackRate, setLoop };
}
