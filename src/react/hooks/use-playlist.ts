import { useEffect, useRef, useState } from 'react';
import { Playlist } from '../../core/playlist';
import type { TimelineClock } from '../../core/timeline';
import type { ParsedPlaylist, PlaylistOptions } from '../../core/types';

/**
 * Creates and manages a Playlist. Optionally syncs duration to a clock.
 *
 * When `clock` is provided:
 * - clock.duration is auto-extended from playlist.totalDuration on init
 * - clock.duration is auto-extended when live playlist discovers new segments
 */
export function usePlaylist(
  options: PlaylistOptions,
  clock?: TimelineClock,
) {
  const [playlist, setPlaylist] = useState<ParsedPlaylist | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const engineRef = useRef<Playlist | null>(null);
  const clockRef = useRef(clock);
  clockRef.current = clock;

  useEffect(() => {
    const engine = new Playlist(options);
    engineRef.current = engine;

    const syncDuration = (pl: ParsedPlaylist) => {
      clockRef.current?.extendDuration(pl.totalDuration);
    };

    const handleUpdate = (e: Event) => {
      const updated = (e as CustomEvent<ParsedPlaylist>).detail;
      setPlaylist(updated);
      syncDuration(updated);
    };
    const handleError = (e: Event) => {
      setError((e as CustomEvent<Error>).detail);
    };
    engine.addEventListener('playlist-updated', handleUpdate);
    engine.addEventListener('error', handleError);

    setLoading(true);
    setError(null);

    engine
      .init()
      .then((parsed) => {
        setPlaylist(parsed);
        setLoading(false);
        syncDuration(parsed);
      })
      .catch((err) => {
        setError(err instanceof Error ? err : new Error(String(err)));
        setLoading(false);
      });

    return () => {
      engine.removeEventListener('playlist-updated', handleUpdate);
      engine.removeEventListener('error', handleError);
      engine.destroy();
      engineRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [options.url]);

  return { engine: engineRef.current, playlist, loading, error };
}
