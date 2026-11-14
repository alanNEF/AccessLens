import { parseOpaque, toHex } from './color-suggester';

/** Enough elements to see a site's palette without slowing large pages. */
const MAX_ELEMENTS = 3000;
const MAX_COLORS = 32;
/** A color must appear this often to count as part of the design, not a one-off. */
const MIN_USES = 2;

/**
 * Opaque text and background colors the page already uses, most-used first.
 * Read-only: only computed styles are read. Our own panel lives in a shadow
 * root, which querySelectorAll does not enter, so it never adds colors.
 */
export function collectSitePalette(doc: Document | undefined = globalThis.document): string[] {
  const counts = new Map<string, number>();
  const add = (value: string) => {
    const color = parseOpaque(value);
    if (typeof color === 'string') return;
    const hex = toHex(color);
    counts.set(hex, (counts.get(hex) ?? 0) + 1);
  };
  const view = doc?.defaultView;
  if (!doc?.body || !view) return []; // no page (e.g. unit tests): no palette
  const elements = doc.body.querySelectorAll('*');
  for (let i = 0; i < elements.length && i < MAX_ELEMENTS; i++) {
    const element = elements[i];
    if (element.getClientRects().length === 0) continue; // hidden: not part of what users see
    const style = view.getComputedStyle(element);
    if (element.textContent?.trim()) add(style.color);
    add(style.backgroundColor);
  }
  return [...counts]
    .filter(([, uses]) => uses >= MIN_USES)
    .sort((a, b) => b[1] - a[1])
    .slice(0, MAX_COLORS)
    .map(([hex]) => hex);
}
