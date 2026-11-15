import { isLargeText } from '../inspector/contrast-mapping';
import { contrastRatio, parseOpaque, renderedColor, toHex } from './color-suggester';
import type { VerifiedContrastFailure } from '../../shared/types';

const isClear = (color: string) => !color || color === 'transparent' || /^rgba\(.*,\s*0\)$/.test(color);

/**
 * Walks from the text up to the layer that paints its background.
 * `opacity`: combined CSS opacity of the text's layers below that background.
 * `background`: its solid color, or undefined for a background image (or none found).
 * `effects`: a filter or blend mode somewhere above the text.
 * Undefined when the background layer (or anything above it) is faded too: text and
 * background then fade together, which no fix here models.
 */
function readLayers(element: Element) {
  let opacity = 1;
  let painter: CSSStyleDeclaration | undefined;
  let effects = false;
  for (let node: Element | null = element; node; node = node.parentElement) {
    const style = getComputedStyle(node);
    const own = style.opacity === '' ? 1 : Number(style.opacity);
    effects ||= (Boolean(style.filter) && style.filter !== 'none') || (Boolean(style.mixBlendMode) && style.mixBlendMode !== 'normal');
    if (!painter && ((style.backgroundImage && style.backgroundImage !== 'none') || !isClear(style.backgroundColor))) painter = style;
    if (!painter) opacity *= own;
    else if (own < 1) return undefined;
  }
  const background = painter && (!painter.backgroundImage || painter.backgroundImage === 'none') ? painter.backgroundColor : undefined;
  return { opacity, background, effects };
}

/** Combined CSS opacity the text is drawn with; undefined when its background is faded too. */
export function readDrawnOpacity(element: Element): number | undefined {
  return readLayers(element)?.opacity;
}

/** Conservative read-back for unattended corrections: the solid colors actually drawn, text faded by its opacity. Ambiguous composition is skipped. */
export function readSolidContrast(element: Element) {
  if (!element.isConnected) return null;
  const textStyle = getComputedStyle(element);
  const text = parseOpaque(textStyle.color);
  if (typeof text === 'string' || (textStyle.textShadow && textStyle.textShadow !== 'none')) return null;
  const layers = readLayers(element);
  if (!layers || layers.effects || !layers.background) return null;
  const parsed = parseOpaque(layers.background);
  if (typeof parsed === 'string') return null;
  const background = toHex(parsed);
  const foreground = renderedColor(text, parsed, layers.opacity);
  return {
    foreground, background,
    ratio: contrastRatio(foreground, background),
    requiredRatio: isLargeText(Number.parseFloat(textStyle.fontSize), textStyle.fontWeight) ? 3 : 4.5,
  };
}

/** Same color within rounding: blending faded text can land one step away from Inspector's value. */
function sameColor(a: string, b: string): boolean {
  const channels = (hex: string) => [1, 3, 5].map(i => Number.parseInt(hex.slice(i, i + 2), 16));
  const [x, y] = [channels(a), channels(b)];
  return x.every((value, i) => Math.abs(value - y[i]) <= 2);
}

export function matchesOriginalContrast(element: Element, issue: VerifiedContrastFailure): boolean {
  const context = readSolidContrast(element);
  const foreground = parseOpaque(issue.textColor);
  const background = parseOpaque(issue.backgroundColor);
  return Boolean(context && typeof foreground !== 'string' && typeof background !== 'string' &&
    sameColor(context.foreground, toHex(foreground)) && context.background === toHex(background) &&
    issue.requiredRatio >= context.requiredRatio);
}
