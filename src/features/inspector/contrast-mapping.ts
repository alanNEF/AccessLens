import type { ContrastIssue, ContrastStatus } from '../../shared/types';

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
const DEFAULT_REVIEW_REASON = 'AccessLens could not reliably determine this text’s colors.';

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
export function requiredRatioFor(data: AxeContrastData): { requiredRatio: number; isLargeText: boolean } {
  const large = isLargeText(parseFontPx(data.fontSize), data.fontWeight);
  const parsed = data.expectedContrastRatio ? Number.parseFloat(data.expectedContrastRatio) : Number.NaN;
  if (parsed === LARGE_TEXT_RATIO || parsed === NORMAL_TEXT_RATIO) {
    return { requiredRatio: parsed, isLargeText: parsed === LARGE_TEXT_RATIO };
  }
  return { requiredRatio: large ? LARGE_TEXT_RATIO : NORMAL_TEXT_RATIO, isLargeText: large };
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
}): ContrastIssue {
  const data = input.data ?? {};
  const { requiredRatio, isLargeText: large } = requiredRatioFor(data);
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
    wcagCriterion: '1.4.3',
  };
}

/** Plain-language explanation shown in the detail view (INS-04). */
export function explainIssue(issue: ContrastIssue): string {
  const size = issue.isLargeText ? 'large text (24px+, or 18.66px+ bold)' : 'normal-size text';
  const rule = `WCAG 2 AA (1.4.3) asks for at least ${issue.requiredRatio}:1 for ${size}.`;
  if (issue.status === 'needs-review') {
    return `${issue.reviewReason ?? DEFAULT_REVIEW_REASON} Check it by eye or with a color picker. ${rule}`;
  }
  const ratio = issue.contrastRatio === null ? 'unknown' : `${formatRatio(issue.contrastRatio)}:1`;
  if (issue.status === 'passed') return `This text’s contrast is ${ratio}. ${rule} It meets that minimum.`;
  return `This text’s contrast is only ${ratio}. ${rule} Low contrast makes text hard to read for people with low vision, color vision deficiencies, or anyone on a dim screen or in bright light.`;
}

export function formatRatio(ratio: number): string {
  return (Math.floor(ratio * 100) / 100).toFixed(2);
}
