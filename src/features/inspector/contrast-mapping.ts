import type { ContrastIssue, ContrastLevel, ContrastStatus } from '../../shared/types';

/**
 * Pure helpers that turn axe-core color-contrast check data into ContrastIssue objects.
 * No DOM or axe imports here, so this file can be unit-tested directly with Node.
 */

/** The `data` object axe attaches to a color-contrast check. Every field may be missing. */
export interface AxeContrastData {
  fgColor?: string | null;
  bgColor?: string | null;
  contrastRatio?: number | null;
  expectedContrastRatio?: string | null;
  fontSize?: string | null;
  fontWeight?: string | null;
  messageKey?: string | null;
}

export const NORMAL_TEXT_RATIO = 4.5;
export const LARGE_TEXT_RATIO = 3;
/** WCAG 1.4.6 (AAA, "enhanced contrast"): recommended for low vision and reduced contrast sensitivity. */
export const ENHANCED_NORMAL_RATIO = 7;
export const ENHANCED_LARGE_RATIO = 4.5;
/** WCAG 1.4.1 via axe link-in-text-block: a link needs 3:1 against the surrounding text, or a non-color cue. */
export const LINK_TEXT_RATIO = 3;

export function thresholdsFor(level: ContrastLevel): { normal: number; large: number } {
  return level === 'AAA' ? { normal: ENHANCED_NORMAL_RATIO, large: ENHANCED_LARGE_RATIO } : { normal: NORMAL_TEXT_RATIO, large: LARGE_TEXT_RATIO };
}

/** Plain-language explanations for axe's "incomplete" message keys (INS-06). */
const REVIEW_REASONS: Record<string, string> = {
  bgImage: 'The text sits on a background image, so its background color cannot be measured.',
  bgGradient: 'The text sits on a gradient, so there is no single background color to measure.',
  imgNode: 'The text sits on top of an image element.',
  bgOverlap: 'Another element overlaps this text, so its background cannot be determined.',
  fgAlpha: 'The text color is partly transparent.',
  elmPartiallyObscured: 'The text is partly hidden behind another element.',
  elmPartiallyObscuring: 'The text partly covers another element.',
  outsideViewport: 'The text is outside the visible area of the page.',
  equalRatio: 'The text and background are the same color, which usually means hidden or decorative text.',
  shortTextContent: 'The text is too short to tell whether it is real content.',
  nonBmp: 'The text is made of icon or symbol characters.',
  pseudoContent: 'A ::before or ::after pseudo-element affects the background.',
  shadowOnText: 'A text shadow changes how readable the text is.',
  colorParse: 'One of the colors could not be read.',
};
const DEFAULT_REVIEW_REASON = 'Perspective could not reliably determine this text’s colors.';

export function reviewReasonFor(messageKey: string | null | undefined): string {
  return (messageKey && REVIEW_REASONS[messageKey]) || DEFAULT_REVIEW_REASON;
}

/** Reads "18.0pt (24px)" → 24. */
export function parseFontPx(fontSize: string | null | undefined): number | null {
  const match = fontSize?.match(/\(([\d.]+)px\)/);
  return match ? Number(match[1]) : null;
}

/** WCAG large text: at least 24px, or at least 18.66px (14pt) and bold. */
export function isLargeText(fontPx: number | null, fontWeight: string | null | undefined): boolean {
  if (fontPx === null) return false;
  const bold = fontWeight === 'bold' || fontWeight === 'bolder' || Number(fontWeight) >= 700;
  return fontPx >= 24 || (bold && fontPx >= 18.66);
}

/** Uses axe's own threshold when given ("4.5:1"), otherwise works it out from the font. */
export function requiredRatioFor(data: AxeContrastData, level: ContrastLevel = 'AA'): { requiredRatio: number; isLargeText: boolean } {
  const { normal, large: largeRatio } = thresholdsFor(level);
  const large = isLargeText(parseFontPx(data.fontSize), data.fontWeight);
  const parsed = data.expectedContrastRatio ? Number.parseFloat(data.expectedContrastRatio) : Number.NaN;
  if (parsed === largeRatio || parsed === normal) {
    return { requiredRatio: parsed, isLargeText: parsed === largeRatio };
  }
  return { requiredRatio: large ? largeRatio : normal, isLargeText: large };
}

/** `<p> "Sells out by 11 am most…"` */
export function describeElement(tagName: string, text: string | null | undefined): string {
  const tag = `<${tagName.toLowerCase()}>`;
  const clean = (text ?? '').replace(/\s+/g, ' ').trim();
  if (!clean) return tag;
  return `${tag} “${clean.length > 40 ? `${clean.slice(0, 40).trimEnd()}…` : clean}”`;
}

/** axe targets can contain nested arrays for shadow DOM; join them into one readable selector. */
export function selectorFromTarget(target: ReadonlyArray<string | ReadonlyArray<string>>): string {
  return target.map(part => (typeof part === 'string' ? part : part.join(' >>> '))).join(' ');
}

const usableColor = (value: string | null | undefined) => (value && value.trim() ? value : null);
const usableRatio = (value: number | null | undefined) => (typeof value === 'number' && Number.isFinite(value) && value > 0 ? value : null);

export function toContrastIssue(input: {
  id: string;
  status: ContrastStatus;
  selector: string;
  elementLabel: string;
  data: AxeContrastData | null | undefined;
  level?: ContrastLevel;
}): ContrastIssue {
  const data = input.data ?? {};
  const level = input.level ?? 'AA';
  const { requiredRatio, isLargeText: large } = requiredRatioFor(data, level);
  let status = input.status;
  const textColor = usableColor(data.fgColor);
  const backgroundColor = usableColor(data.bgColor);
  const contrastRatio = usableRatio(data.contrastRatio);
  // Never claim a failure we cannot back with numbers (INS-06).
  if (status === 'failed' && (textColor === null || backgroundColor === null || contrastRatio === null)) status = 'needs-review';
  return {
    id: input.id,
    selector: input.selector,
    elementLabel: input.elementLabel,
    textColor,
    backgroundColor,
    contrastRatio,
    requiredRatio,
    isLargeText: large,
    status,
    ...(status === 'needs-review' ? { reviewReason: reviewReasonFor(data.messageKey) } : {}),
    wcagCriterion: level === 'AAA' ? '1.4.6' : '1.4.3',
    kind: 'text-contrast',
  };
}

/** The `data` axe attaches to its link-in-text-block check. Every field may be missing. */
export interface AxeLinkData {
  contrastRatio?: number | null;
  requiredContrastRatio?: number | null;
  nodeColor?: string | null;
  parentColor?: string | null;
  messageKey?: string | null;
}

/**
 * A link inside a block of text that is distinguished from that text only by color (WCAG 1.4.1).
 * Colors come from axe when it reports them, otherwise from the computed styles passed in.
 */
export function toLinkIssue(input: {
  id: string;
  status: ContrastStatus;
  selector: string;
  elementLabel: string;
  data: AxeLinkData | null | undefined;
  /** Computed `color` of the link and of its surrounding text, used when axe gives no colors. */
  computedLinkColor?: string | null;
  computedTextColor?: string | null;
}): ContrastIssue {
  const data = input.data ?? {};
  const linkColor = usableColor(data.nodeColor) ?? usableColor(input.computedLinkColor);
  const textColor = usableColor(data.parentColor) ?? usableColor(input.computedTextColor);
  let ratio = usableRatio(data.contrastRatio);
  if (ratio === null && linkColor && textColor) ratio = cssContrastRatio(linkColor, textColor);
  let status = input.status;
  if (status === 'failed' && (linkColor === null || textColor === null)) status = 'needs-review';
  return {
    id: input.id,
    selector: input.selector,
    elementLabel: input.elementLabel,
    textColor: linkColor,
    backgroundColor: textColor,
    contrastRatio: ratio,
    requiredRatio: LINK_TEXT_RATIO,
    isLargeText: false,
    status,
    ...(status === 'needs-review' ? { reviewReason: reviewReasonFor(data.messageKey) } : {}),
    wcagCriterion: '1.4.1',
    kind: 'link-color-only',
  };
}

/** Parses the color formats getComputedStyle normally returns: #rgb, #rrggbb, rgb() and rgba(). */
export function parseCssRgb(value: string): [number, number, number] | null {
  const v = value.trim().toLowerCase();
  const hex = v.match(/^#([0-9a-f]{3}|[0-9a-f]{6})$/);
  if (hex) {
    const h = hex[1].length === 3 ? [...hex[1]].map(c => c + c).join('') : hex[1];
    return [0, 2, 4].map(i => parseInt(h.slice(i, i + 2), 16)) as [number, number, number];
  }
  const rgb = v.match(/^rgba?\(\s*([\d.]+)[\s,]+([\d.]+)[\s,]+([\d.]+)(?:\s*[,/]\s*([\d.]+%?))?\s*\)$/);
  if (!rgb) return null;
  if (rgb[4] !== undefined && Number.parseFloat(rgb[4]) < (rgb[4].endsWith('%') ? 100 : 1)) return null;
  return [Number(rgb[1]), Number(rgb[2]), Number(rgb[3])];
}

function relativeLuminance([r, g, b]: [number, number, number]): number {
  const lin = (c: number) => { const s = c / 255; return s <= 0.04045 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4; };
  return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
}

/** WCAG contrast between two opaque CSS colors, or null if either cannot be parsed. */
export function cssContrastRatio(a: string, b: string): number | null {
  const ca = parseCssRgb(a);
  const cb = parseCssRgb(b);
  if (!ca || !cb) return null;
  const [hi, lo] = [relativeLuminance(ca), relativeLuminance(cb)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

/** Plain-language explanation shown in the detail view (INS-04). */
export function explainIssue(issue: ContrastIssue): string {
  if (issue.kind === 'link-color-only') return explainLink(issue);
  const size = issue.isLargeText ? 'large text (24px+, or 18.66px+ bold)' : 'normal-size text';
  const rule = issue.wcagCriterion === '1.4.6'
    ? `The enhanced standard, WCAG 2 AAA (1.4.6), asks for at least ${issue.requiredRatio}:1 for ${size}. It is the recommended level for people with low vision, cataracts or reduced contrast sensitivity.`
    : `WCAG 2 AA (1.4.3) asks for at least ${issue.requiredRatio}:1 for ${size}.`;
  if (issue.status === 'needs-review') {
    return `${issue.reviewReason ?? DEFAULT_REVIEW_REASON} Check it by eye or with a color picker. ${rule}`;
  }
  const ratio = issue.contrastRatio === null ? 'unknown' : `${formatRatio(issue.contrastRatio)}:1`;
  if (issue.status === 'passed') return `This text’s contrast is ${ratio}. ${rule} It meets that minimum.`;
  return `This text’s contrast is only ${ratio}. ${rule} Low contrast makes text hard to read for people with low vision, color vision deficiencies, or anyone on a dim screen or in bright light.`;
}

function explainLink(issue: ContrastIssue): string {
  const rule = 'WCAG 2 (1.4.1, Use of Color) says a link inside text must stand out by more than color: an underline or other visual cue, or at least 3:1 contrast with the surrounding text.';
  if (issue.status === 'needs-review') return `${issue.reviewReason ?? DEFAULT_REVIEW_REASON} ${rule}`;
  const ratio = issue.contrastRatio === null ? 'an unknown ratio' : `only ${formatRatio(issue.contrastRatio)}:1`;
  if (issue.status === 'passed') return `This link stands out from the text around it. ${rule}`;
  return `This link has no underline and differs from the surrounding text by ${ratio}. People who cannot see color, such as with achromatopsia, cannot tell it is a link. ${rule}`;
}

export function formatRatio(ratio: number): string {
  return (Math.floor(ratio * 100) / 100).toFixed(2);
}
