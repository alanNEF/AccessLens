import { useEffect, useMemo, useState } from 'react';

export interface TrackedRect {
  readonly top: number;
  readonly left: number;
  readonly width: number;
  readonly height: number;
}

const sameRects = (a: readonly (TrackedRect | null)[], b: readonly (TrackedRect | null)[]) =>
  a.length === b.length && a.every((rect, i) => {
    const other = b[i];
    if (!rect || !other) return rect === other;
    return rect.top === other.top && rect.left === other.left && rect.width === other.width && rect.height === other.height;
  });

function measure(elements: readonly Element[]): (TrackedRect | null)[] {
  return elements.map(element => {
    if (!element.isConnected) return null;
    const { top, left, width, height } = element.getBoundingClientRect();
    return width === 0 && height === 0 ? null : { top, left, width, height };
  });
}

/**
 * Viewport rectangles for the given elements, kept up to date on scroll, resize and layout changes.
 * Reading rects never changes the page (INS-05: non-destructive). Detached or hidden elements give null.
 * The returned array always lines up index-for-index with `elements`.
 */
export function useTrackedRects(elements: readonly Element[]): (TrackedRect | null)[] {
  const [tick, setTick] = useState(0);
  const rects = useMemo(() => measure(elements), [elements, tick]);

  useEffect(() => {
    let frame: number | undefined;
    let last = measure(elements);
    const update = () => {
      frame = undefined;
      const next = measure(elements);
      if (!sameRects(last, next)) { last = next; setTick(value => value + 1); }
    };
    const schedule = () => { if (frame === undefined) frame = requestAnimationFrame(update); };
    window.addEventListener('scroll', schedule, { capture: true, passive: true });
    window.addEventListener('resize', schedule, { passive: true });
    const resizeObserver = new ResizeObserver(schedule);
    for (const element of elements) if (element.isConnected) resizeObserver.observe(element);
    // Layout can also shift without a resize (content loading above); a slow poll catches that cheaply.
    const poll = window.setInterval(schedule, 500);
    return () => {
      window.removeEventListener('scroll', schedule, { capture: true });
      window.removeEventListener('resize', schedule);
      resizeObserver.disconnect();
      window.clearInterval(poll);
      if (frame !== undefined) cancelAnimationFrame(frame);
    };
  }, [elements]);

  return rects;
}

/** Scrolls the page so the element is in view (INS-05: clicking an issue focuses the element). */
export function revealElement(element: Element): void {
  if (element.isConnected) element.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'nearest' });
}
