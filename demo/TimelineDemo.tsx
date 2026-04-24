import { useEffect, useState } from 'react';
import {
  TimelineContainer,
  defaultTimelineViews,
  type TimelineConfig,
} from '@vuer-ai/vuer-m3u';

const BASE = '/timeline/teleop_run_037/';

/**
 * Load the mock `config.json` from the demo publicDir, rewrite each
 * track's relative `src` into an absolute URL the dev server serves, and
 * render the result inside `<TimelineContainer>`.
 */
export function TimelineDemo() {
  const [config, setConfig] = useState<TimelineConfig | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch(BASE + 'config.json')
      .then((r) => {
        if (!r.ok) throw new Error(`config.json: ${r.status}`);
        return r.json() as Promise<TimelineConfig>;
      })
      .then((c) => {
        if (cancelled) return;
        const resolved: TimelineConfig = {
          ...c,
          tracks: c.tracks.map((t) => {
            const next = { ...t };
            if (t.src) next.src = BASE + t.src;
            if (t.props) {
              const nextProps: Record<string, unknown> = { ...t.props };
              for (const key of ['thumbnails', 'poster']) {
                const val = t.props[key];
                if (typeof val === 'string' && !/^https?:|^\//.test(val)) {
                  nextProps[key] = BASE + val;
                }
              }
              next.props = nextProps;
            }
            return next;
          }),
        };
        setConfig(resolved);
      })
      .catch((e) => {
        if (cancelled) return;
        setError(e instanceof Error ? e.message : String(e));
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (error) {
    return (
      <div className="p-6 text-xs text-red-400 font-mono">
        failed to load timeline: {error}
      </div>
    );
  }
  if (!config) {
    return (
      <div className="p-6 text-xs text-zinc-500 font-mono">
        loading timeline…
      </div>
    );
  }

  return (
    <div className="p-4">
      <TimelineContainer config={config} views={defaultTimelineViews} />
    </div>
  );
}
