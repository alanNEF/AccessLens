import { useCallback, useEffect, useRef, useState, type KeyboardEvent, type PointerEvent } from 'react';
import { browser } from 'wxt/browser';
import { clampOffset, DEFAULT_OFFSET, dragOffset, isPanelOffset, nudgeOffset, passedThreshold, type PanelOffset } from './panel-position';

const STORAGE_KEY = 'accesslens.position';

/**
 * Lets the user move the panel by dragging (pointer) or with arrow keys.
 * The position is applied as CSS custom properties on our own shadow host, which
 * the :host rule reads; the page's DOM and styles are never touched.
 * Pass `rootEl` = any element inside the shadow root (as state, so effects re-run once it exists).
 */
export function usePanelPosition(rootEl: HTMLElement | null) {
  const [offset, setOffset] = useState<PanelOffset>(DEFAULT_OFFSET);
  const offsetRef = useRef(offset);
  offsetRef.current = offset;
  const [dragging, setDragging] = useState(false);
  const drag = useRef<{ id: number; x: number; y: number; start: PanelOffset; moved: boolean } | null>(null);
  /** Set when a drag just ended on the launcher, so the following click does not expand it. */
  const suppressClick = useRef(false);

  const host = useCallback(() => {
    const root = rootEl?.getRootNode();
    return root instanceof ShadowRoot ? (root.host as HTMLElement) : null;
  }, [rootEl]);

  const clamp = useCallback((next: PanelOffset) => {
    const el = host();
    if (!el) return next;
    const rect = el.getBoundingClientRect();
    const doc = document.documentElement;
    return clampOffset(next, rect, { width: doc.clientWidth || innerWidth, height: doc.clientHeight || innerHeight });
  }, [host]);

  const save = (next: PanelOffset) => { void browser.storage.local.set({ [STORAGE_KEY]: next }).catch(() => undefined); };

  // Restore the saved position once, clamped to this page's viewport.
  useEffect(() => {
    let mounted = true;
    void browser.storage.local.get(STORAGE_KEY).then(result => {
      const saved = result[STORAGE_KEY];
      if (mounted && isPanelOffset(saved)) setOffset(clamp(saved));
    }).catch(() => undefined);
    return () => { mounted = false; };
  }, [clamp]);

  // Apply to the host. Runs after every change, so size changes (collapse, tab switch) can re-clamp.
  useEffect(() => {
    const el = host();
    if (!el) return;
    el.style.setProperty('--accesslens-right', `${offset.right}px`);
    el.style.setProperty('--accesslens-bottom', `${offset.bottom}px`);
  }, [offset, host]);

  // Keep the panel on screen when the window shrinks or the panel grows.
  useEffect(() => {
    const el = host();
    if (!el) return;
    const recheck = () => setOffset(current => {
      const next = clamp(current);
      return next.right === current.right && next.bottom === current.bottom ? current : next;
    });
    const observer = new ResizeObserver(recheck);
    observer.observe(el);
    addEventListener('resize', recheck);
    return () => { observer.disconnect(); removeEventListener('resize', recheck); };
  }, [host, clamp]);

  // Remove our variables when the panel unmounts so a re-mount starts clean.
  useEffect(() => () => {
    const el = host();
    el?.style.removeProperty('--accesslens-right');
    el?.style.removeProperty('--accesslens-bottom');
  }, [host]);

  function onPointerDown(event: PointerEvent<HTMLElement>) {
    if (event.button !== 0 || !event.isPrimary) return;
    // Presses that start on the header's own buttons and switches keep working normally.
    const interactive = (event.target as Element).closest('button, [role="switch"], [role="tab"], a, input');
    if (interactive && interactive !== event.currentTarget && !interactive.hasAttribute('data-drag-handle')) return;
    suppressClick.current = false;
    drag.current = { id: event.pointerId, x: event.clientX, y: event.clientY, start: offsetRef.current, moved: false };
    event.currentTarget.setPointerCapture(event.pointerId);
  }

  function onPointerMove(event: PointerEvent<HTMLElement>) {
    const d = drag.current;
    if (!d || d.id !== event.pointerId) return;
    const dx = event.clientX - d.x;
    const dy = event.clientY - d.y;
    if (!d.moved && !passedThreshold(dx, dy)) return;
    if (!d.moved) { d.moved = true; setDragging(true); }
    event.preventDefault();
    setOffset(clamp(dragOffset(d.start, dx, dy)));
  }

  function onPointerEnd(event: PointerEvent<HTMLElement>) {
    const d = drag.current;
    if (!d || d.id !== event.pointerId) return;
    drag.current = null;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
    if (d.moved) {
      // Only the launcher is both a drag handle and a button; swallow the click that ends its drag.
      if ((event.currentTarget as Element).matches('button')) suppressClick.current = true;
      setDragging(false);
      save(offsetRef.current);
    }
  }

  function onKeyDown(event: KeyboardEvent<HTMLElement>) {
    const next = nudgeOffset(offsetRef.current, event.key, event.shiftKey);
    if (!next) return;
    event.preventDefault();
    const clamped = clamp(next);
    setOffset(clamped);
    save(clamped);
  }

  function reset() {
    const next = clamp(DEFAULT_OFFSET);
    setOffset(next);
    save(next);
  }

  /** Wrap a click handler so it is skipped right after a drag. */
  function guardClick(handler: () => void) {
    return () => {
      if (suppressClick.current) { suppressClick.current = false; return; }
      handler();
    };
  }

  const dragHandlers = { onPointerDown, onPointerMove, onPointerUp: onPointerEnd, onPointerCancel: onPointerEnd };
  return { offset, dragging, dragHandlers, onKeyDown, reset, guardClick };
}
