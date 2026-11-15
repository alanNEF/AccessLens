import { isLargeText } from '../inspector/contrast-mapping';
import { contrastRatio, parseOpaque, toHex } from './color-suggester';
import type { VerifiedContrastFailure } from '../../shared/types';

/** Conservative read-back for unattended corrections; ambiguous composition is skipped. */
export function readSolidContrast(element: Element) {
  if (!element.isConnected) return null;
  const textStyle = getComputedStyle(element);
  const text = parseOpaque(textStyle.color);
  if (typeof text === 'string' || (textStyle.textShadow && textStyle.textShadow !== 'none')) return null;
  let background: string | undefined;
  for (let node: Element | null = element; node; node = node.parentElement) {
    const style = getComputedStyle(node);
    if ((style.opacity && Number(style.opacity) !== 1) ||
      (style.filter && style.filter !== 'none') ||
      (style.mixBlendMode && style.mixBlendMode !== 'normal')) return null;
    if (background) continue;
    if (style.backgroundImage && style.backgroundImage !== 'none') return null;
    const color = style.backgroundColor;
    if (!color || color === 'transparent' || /^rgba\(.*,\s*0\)$/.test(color)) continue;
    const parsed = parseOpaque(color);
    if (typeof parsed === 'string') return null;
    background = toHex(parsed);
  }
  if (!background) return null;
  const foreground = toHex(text);
  return {
    foreground, background,
    ratio: contrastRatio(foreground, background),
    requiredRatio: isLargeText(Number.parseFloat(textStyle.fontSize), textStyle.fontWeight) ? 3 : 4.5,
  };
}

export function matchesOriginalContrast(element: Element, issue: VerifiedContrastFailure): boolean {
  const context = readSolidContrast(element);
  const foreground = parseOpaque(issue.textColor);
  const background = parseOpaque(issue.backgroundColor);
  return Boolean(context && typeof foreground !== 'string' && typeof background !== 'string' &&
    context.foreground === toHex(foreground) && context.background === toHex(background) &&
    issue.requiredRatio >= context.requiredRatio);
}
