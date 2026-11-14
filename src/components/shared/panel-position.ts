/**
 * Where the panel sits, as distances from the viewport's right and bottom edges.
 * Anchoring to the bottom-right corner keeps the collapsed launcher where the
 * panel's corner was, and matches the original default placement.
 */
export interface PanelOffset {
  readonly right: number;
  readonly bottom: number;
}

export const DEFAULT_OFFSET: PanelOffset = Object.freeze({ right: 16, bottom: 16 });
/** Closest the panel may get to any viewport edge. */
export const EDGE_MARGIN = 8;
export const NUDGE_STEP = 16;
export const NUDGE_STEP_LARGE = 64;
/** Pointer travel (px) before a press on the launcher counts as a drag instead of a click. */
export const DRAG_THRESHOLD = 4;

export interface Size { readonly width: number; readonly height: number }

const clampNumber = (value: number, min: number, max: number) => Math.min(Math.max(value, min), Math.max(min, max));

/** Keeps the whole panel on screen; if the panel is larger than the viewport, pins it to the margin. */
export function clampOffset(offset: PanelOffset, panel: Size, viewport: Size): PanelOffset {
  return {
    right: Math.round(clampNumber(offset.right, EDGE_MARGIN, viewport.width - panel.width - EDGE_MARGIN)),
    bottom: Math.round(clampNumber(offset.bottom, EDGE_MARGIN, viewport.height - panel.height - EDGE_MARGIN)),
  };
}

/** Moving the pointer right/down by dx/dy shrinks the right/bottom distances. */
export function dragOffset(start: PanelOffset, dx: number, dy: number): PanelOffset {
  return { right: start.right - dx, bottom: start.bottom - dy };
}

/** Arrow-key nudges for keyboard users. Returns null for keys that do not move the panel. */
export function nudgeOffset(offset: PanelOffset, key: string, large: boolean): PanelOffset | null {
  const step = large ? NUDGE_STEP_LARGE : NUDGE_STEP;
  switch (key) {
    case 'ArrowLeft': return { right: offset.right + step, bottom: offset.bottom };
    case 'ArrowRight': return { right: offset.right - step, bottom: offset.bottom };
    case 'ArrowUp': return { right: offset.right, bottom: offset.bottom + step };
    case 'ArrowDown': return { right: offset.right, bottom: offset.bottom - step };
    case 'Home': return DEFAULT_OFFSET;
    default: return null;
  }
}

export function isPanelOffset(value: unknown): value is PanelOffset {
  if (!value || typeof value !== 'object') return false;
  const { right, bottom } = value as Record<string, unknown>;
  return typeof right === 'number' && Number.isFinite(right) && typeof bottom === 'number' && Number.isFinite(bottom);
}

export const passedThreshold = (dx: number, dy: number) => Math.hypot(dx, dy) >= DRAG_THRESHOLD;
