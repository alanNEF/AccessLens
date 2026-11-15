import { useCallback, useEffect, useRef, useState, type KeyboardEvent, type PointerEvent } from 'react';
import { browser } from 'wxt/browser';
import { clampOffset, DEFAULT_OFFSET, dragOffset, EDGE_MARGIN, isPanelOffset, nudgeOffset, passedThreshold, type PanelOffset, type Size } from './panel-position';
import { isPanelSize, MIN_SIZE, resizeBox, resizeByKey, type PanelBox, type ResizeEdge } from './panel-size';

const STORAGE_KEY = 'accesslens.position';
const SIZE_STORAGE_KEY = 'accesslens.size';

const viewportSize = (): Size => {
  const doc = document.documentElement;
  return { width: doc.clientWidth || innerWidth, height: doc.clientHeight || innerHeight };
};

/** A saved size can be too big for a smaller window: shrink it to fit, never below MIN_SIZE. */
function fitSize(size: Size, viewport: Size): Size {
  const fit = (value: number, min: number, room: number) => Math.round(Math.max(Math.min(min, room), Math.min(value, room)));
  return { width: fit(size.width, MIN_SIZE.width, viewport.width - 2 * EDGE_MARGIN), height: fit(size.height, MIN_SIZE.height, viewport.height - 2 * EDGE_MARGIN) };
}

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
  /** User-chosen panel size; null means the default size from CSS. */
  const [size, setSize] = useState<Size | null>(null);
  const [resizing, setResizing] = useState(false);
  const resize = useRef<{ id: number; x: number; y: number; edge: ResizeEdge; start: PanelBox; last?: PanelBox } | null>(null);

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
  const saveSize = (next: Size | null) => {
    const store = browser.storage.local;
    void (next ? store.set({ [SIZE_STORAGE_KEY]: next }) : store.remove(SIZE_STORAGE_KEY)).catch(() => undefined);
  };

  // Restore the saved position and size once, fitted to this page's viewport.
  useEffect(() => {
    let mounted = true;
    void browser.storage.local.get([STORAGE_KEY, SIZE_STORAGE_KEY]).then(result => {
      if (!mounted) return;
      const savedSize = result[SIZE_STORAGE_KEY];
      if (isPanelSize(savedSize)) setSize(fitSize(savedSize, viewportSize()));
      const saved = result[STORAGE_KEY];
      if (isPanelOffset(saved)) setOffset(clamp(saved));
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

  // Size variables are read by .accesslens-panel; removing them restores the CSS default.
  useEffect(() => {
    const el = host();
    if (!el) return;
    if (size) {
      el.style.setProperty('--accesslens-width', `${size.width}px`);
      el.style.setProperty('--accesslens-height', `${size.height}px`);
    } else {
      el.style.removeProperty('--accesslens-width');
      el.style.removeProperty('--accesslens-height');
    }
  }, [size, host]);

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
    el?.style.removeProperty('--accesslens-width');
    el?.style.removeProperty('--accesslens-height');
  }, [host]);

  /** The panel's current box, measured from the expanded panel itself. */
  function currentBox(): PanelBox | null {
    const panel = rootEl?.querySelector('.accesslens-panel');
    if (!panel) return null;
    const rect = panel.getBoundingClientRect();
    return { offset: offsetRef.current, size: { width: rect.width, height: rect.height } };
  }

  function applyBox(box: PanelBox) {
    setSize(box.size);
    setOffset(box.offset);
  }

  /** Pointer handlers for one invisible edge or corner grab zone. */
  function resizeHandlers(edge: ResizeEdge) {
    return {
      onPointerDown(event: PointerEvent<HTMLElement>) {
        if (event.button !== 0 || !event.isPrimary) return;
        const start = currentBox();
        if (!start) return;
        event.preventDefault();
        event.stopPropagation();
        resize.current = { id: event.pointerId, x: event.clientX, y: event.clientY, edge, start };
        event.currentTarget.setPointerCapture(event.pointerId);
        setResizing(true);
      },
      onPointerMove(event: PointerEvent<HTMLElement>) {
        const r = resize.current;
        if (!r || r.id !== event.pointerId) return;
        event.preventDefault();
        r.last = resizeBox(r.start, r.edge, event.clientX - r.x, event.clientY - r.y, viewportSize());
        applyBox(r.last);
      },
      onPointerUp: endResize,
      onPointerCancel: endResize,
    };
  }

  function endResize(event: PointerEvent<HTMLElement>) {
    const r = resize.current;
    if (!r || r.id !== event.pointerId) return;
    resize.current = null;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
    setResizing(false);
    // Save the last computed box, not a DOM measurement React may not have painted yet.
    if (r.last) { saveSize(r.last.size); save(r.last.offset); }
  }

  /** Arrow keys on the resize handle: Left/Up grow, Right/Down shrink, Home restores the default size. */
  function onResizeKeyDown(event: KeyboardEvent<HTMLElement>) {
    if (event.key === 'Home') {
      event.preventDefault();
      setSize(null);
      saveSize(null);
      return;
    }
    const start = currentBox();
    const next = start && resizeByKey(start, event.key, event.shiftKey, viewportSize());
    if (!next) return;
    event.preventDefault();
    applyBox(next);
    saveSize(next.size);
    save(next.offset);
  }

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

  /** Double-click on the header: default position and default size. */
  function reset() {
    const next = clamp(DEFAULT_OFFSET);
    setOffset(next);
    save(next);
    setSize(null);
    saveSize(null);
  }

  /** Wrap a click handler so it is skipped right after a drag. */
  function guardClick(handler: () => void) {
    return () => {
      if (suppressClick.current) { suppressClick.current = false; return; }
      handler();
    };
  }

  const dragHandlers = { onPointerDown, onPointerMove, onPointerUp: onPointerEnd, onPointerCancel: onPointerEnd };
  return { offset, dragging, dragHandlers, onKeyDown, reset, guardClick, resizing, resizeHandlers, onResizeKeyDown };
}
