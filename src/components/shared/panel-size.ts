import { EDGE_MARGIN, type PanelOffset, type Size } from './panel-position';

/** Which edge or corner is being dragged (compass directions). */
export type ResizeEdge = 'n' | 's' | 'e' | 'w' | 'ne' | 'nw' | 'se' | 'sw';
export const RESIZE_EDGES: readonly ResizeEdge[] = ['n', 's', 'e', 'w', 'ne', 'nw', 'se', 'sw'];

/** Smallest usable panel: the header, tabs and a few rows of content stay readable. */
export const MIN_SIZE: Size = Object.freeze({ width: 300, height: 260 });
export const RESIZE_STEP = 16;
export const RESIZE_STEP_LARGE = 64;

/** The panel's on-screen box: offsets from the viewport's right/bottom edges plus its size. */
export interface PanelBox {
  readonly offset: PanelOffset;
  readonly size: Size;
}

const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(value, max));

/**
 * Moves only the dragged edge(s) by dx/dy; the opposite edges stay where they are.
 * The panel never gets smaller than MIN_SIZE (or the viewport, if that is smaller)
 * and never closer than EDGE_MARGIN to any viewport edge.
 */
export function resizeBox(start: PanelBox, edge: ResizeEdge, dx: number, dy: number, viewport: Size): PanelBox {
  const minWidth = Math.min(MIN_SIZE.width, viewport.width - 2 * EDGE_MARGIN);
  const minHeight = Math.min(MIN_SIZE.height, viewport.height - 2 * EDGE_MARGIN);
  let right = viewport.width - start.offset.right;
  let bottom = viewport.height - start.offset.bottom;
  let left = right - start.size.width;
  let top = bottom - start.size.height;
  if (edge.includes('w')) left = clamp(left + dx, EDGE_MARGIN, right - minWidth);
  if (edge.includes('e')) right = clamp(right + dx, left + minWidth, viewport.width - EDGE_MARGIN);
  if (edge.includes('n')) top = clamp(top + dy, EDGE_MARGIN, bottom - minHeight);
  if (edge.includes('s')) bottom = clamp(bottom + dy, top + minHeight, viewport.height - EDGE_MARGIN);
  return {
    offset: { right: Math.round(viewport.width - right), bottom: Math.round(viewport.height - bottom) },
    size: { width: Math.round(right - left), height: Math.round(bottom - top) },
  };
}

/**
 * Keyboard resizing from the top-left corner, so the panel's anchored
 * bottom-right corner stays put: Left/Up grow, Right/Down shrink.
 * Returns null for keys that do not resize.
 */
export function resizeByKey(start: PanelBox, key: string, large: boolean, viewport: Size): PanelBox | null {
  const step = large ? RESIZE_STEP_LARGE : RESIZE_STEP;
  const delta = { ArrowLeft: [-step, 0], ArrowRight: [step, 0], ArrowUp: [0, -step], ArrowDown: [0, step] }[key];
  return delta ? resizeBox(start, 'nw', delta[0], delta[1], viewport) : null;
}

export function isPanelSize(value: unknown): value is Size {
  if (!value || typeof value !== 'object') return false;
  const { width, height } = value as Record<string, unknown>;
  return typeof width === 'number' && Number.isFinite(width) && width > 0
    && typeof height === 'number' && Number.isFinite(height) && height > 0;
}
