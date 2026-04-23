import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useReducer,
  useRef,
  type ReactNode,
  type RefObject,
} from 'react';
import {
  type ViewportCoords,
  clampPxPerSec,
  clampScrollSec,
  zoomAtCursor as zoomAtCursorPure,
  fitViewport,
} from './coords';

/**
 * Viewport state + derived bounds + imperative api surface, exposed via
 * React context so ruler, playhead, tree column, every lane, and all
 * interaction handlers read from a single source of truth.
 */
export interface TimelineViewport extends ViewportCoords {
  /** Derived: first visible second. */
  viewStart: number;
  /** Derived: last visible second. */
  viewEnd: number;

  setPxPerSecond(v: number): void;
  setScrollSec(v: number): void;
  zoomAtCursor(factor: number, cursorX: number): void;
  fit(): void;
  /** Scroll so that `time` sits at the horizontal center of the viewport. */
  centerOn(time: number): void;
  setContainerWidth(w: number): void;
}

const Ctx = createContext<TimelineViewport | null>(null);

export function useTimelineViewport(): TimelineViewport {
  const ctx = useContext(Ctx);
  if (!ctx) {
    throw new Error(
      'useTimelineViewport must be used inside <TimelineViewportProvider>',
    );
  }
  return ctx;
}

// ---------------------------------------------------------------------------
// Reducer

type Action =
  | { type: 'setPxPerSec'; value: number }
  | { type: 'setScrollSec'; value: number }
  | { type: 'setContainerWidth'; value: number }
  | { type: 'zoomAtCursor'; factor: number; cursorX: number }
  | { type: 'fit' }
  | { type: 'centerOn'; time: number }
  | { type: 'setDuration'; value: number };

function reducer(state: ViewportCoords, action: Action): ViewportCoords {
  switch (action.type) {
    case 'setPxPerSec': {
      const pxPerSecond = clampPxPerSec(action.value);
      const scrollSec = clampScrollSec(
        state.scrollSec,
        state.duration,
        pxPerSecond,
        state.containerWidth,
      );
      return { ...state, pxPerSecond, scrollSec };
    }
    case 'setScrollSec': {
      const scrollSec = clampScrollSec(
        action.value,
        state.duration,
        state.pxPerSecond,
        state.containerWidth,
      );
      return { ...state, scrollSec };
    }
    case 'setContainerWidth': {
      const containerWidth = Math.max(0, action.value);
      // Width changes can invalidate scrollSec clamp.
      const scrollSec = clampScrollSec(
        state.scrollSec,
        state.duration,
        state.pxPerSecond,
        containerWidth,
      );
      return { ...state, containerWidth, scrollSec };
    }
    case 'zoomAtCursor': {
      const next = zoomAtCursorPure(state, action.factor, action.cursorX);
      return { ...state, ...next };
    }
    case 'fit': {
      const next = fitViewport(state.duration, state.containerWidth);
      return { ...state, ...next };
    }
    case 'centerOn': {
      const halfSpan =
        state.pxPerSecond > 0
          ? state.containerWidth / state.pxPerSecond / 2
          : 0;
      const scrollSec = clampScrollSec(
        action.time - halfSpan,
        state.duration,
        state.pxPerSecond,
        state.containerWidth,
      );
      return { ...state, scrollSec };
    }
    case 'setDuration': {
      const duration = Math.max(0, action.value);
      const scrollSec = clampScrollSec(
        state.scrollSec,
        duration,
        state.pxPerSecond,
        state.containerWidth,
      );
      return { ...state, duration, scrollSec };
    }
  }
}

// ---------------------------------------------------------------------------
// Provider

export interface TimelineViewportProviderProps {
  duration: number;
  children: ReactNode;
  /** Initial zoom level; defaults to 36 px/s (matches screenshot baseline). */
  initialPxPerSec?: number;
}

export function TimelineViewportProvider({
  duration,
  initialPxPerSec = 36,
  children,
}: TimelineViewportProviderProps) {
  const [state, dispatch] = useReducer(reducer, undefined, () => ({
    pxPerSecond: clampPxPerSec(initialPxPerSec),
    scrollSec: 0,
    containerWidth: 0,
    duration,
  }));

  // Keep duration in sync if the parent changes it mid-lifetime.
  useEffect(() => {
    dispatch({ type: 'setDuration', value: duration });
  }, [duration]);

  const setPxPerSecond = useCallback(
    (v: number) => dispatch({ type: 'setPxPerSec', value: v }),
    [],
  );
  const setScrollSec = useCallback(
    (v: number) => dispatch({ type: 'setScrollSec', value: v }),
    [],
  );
  const setContainerWidth = useCallback(
    (v: number) => dispatch({ type: 'setContainerWidth', value: v }),
    [],
  );
  const zoomAtCursor = useCallback(
    (factor: number, cursorX: number) =>
      dispatch({ type: 'zoomAtCursor', factor, cursorX }),
    [],
  );
  const fit = useCallback(() => dispatch({ type: 'fit' }), []);
  const centerOn = useCallback(
    (time: number) => dispatch({ type: 'centerOn', time }),
    [],
  );

  const viewStart = state.scrollSec;
  const viewEnd =
    state.pxPerSecond > 0
      ? state.scrollSec + state.containerWidth / state.pxPerSecond
      : state.scrollSec;

  const value = useMemo<TimelineViewport>(
    () => ({
      ...state,
      viewStart,
      viewEnd,
      setPxPerSecond,
      setScrollSec,
      setContainerWidth,
      zoomAtCursor,
      fit,
      centerOn,
    }),
    [
      state,
      viewStart,
      viewEnd,
      setPxPerSecond,
      setScrollSec,
      setContainerWidth,
      zoomAtCursor,
      fit,
      centerOn,
    ],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

// ---------------------------------------------------------------------------
// Container-width observer helper

/**
 * Wire up a ref to report its measured width back to the viewport. Install
 * once on the lane-area container; the Provider keeps `containerWidth` in
 * sync as the element resizes.
 */
export function useObservedWidth(ref: RefObject<HTMLElement | null>): void {
  const vp = useTimelineViewport();
  const setRef = useRef(vp.setContainerWidth);
  setRef.current = vp.setContainerWidth;

  useEffect(() => {
    const el = ref.current;
    if (!el || typeof ResizeObserver === 'undefined') return;
    const initial = el.getBoundingClientRect().width;
    setRef.current(initial);
    const ro = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setRef.current(entry.contentRect.width);
      }
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, [ref]);
}
