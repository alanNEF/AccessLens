import { isVerifiedFailure, type ContrastIssue, type SuggestedFix } from '../../shared/types';
import { suggestFix } from './color-suggester';
import type { StylableElement } from './preview-manager';

export interface CorrectionTarget {
  readonly issue: ContrastIssue;
  readonly element: Element;
}

export const DETACHED_MESSAGE = 'The element is no longer on the page, so no preview was applied.';
export const FADED_BACKGROUND_MESSAGE = 'The background behind this text is itself faded (CSS opacity), so the result can’t be measured reliably. Check it by eye.';

/** How the text is actually drawn: its CSS color, faded by this opacity. */
export interface DrawnText {
  readonly textColor: string;
  readonly opacity: number;
}

export function isStylable(element: Element): element is StylableElement {
  return 'style' in element;
}

/** Text thresholds: AA (4.5, 3) and enhanced AAA (7, 4.5). Color-only links use 3 vs surrounding text. */
export const SUPPORTED_RATIOS: ReadonlySet<number> = new Set([3, 4.5, 7]);
export const UNSUPPORTED_RATIO_MESSAGE = 'Only the WCAG text thresholds 3:1, 4.5:1 and 7:1 are supported.';

/** WCAG 1.4.1 fix for a link that relies on color: add an underline. Colors are left alone. */
export function underlineFix(issue: ContrastIssue, current = 'none'): SuggestedFix {
  const ratio = issue.contrastRatio ?? 0;
  return {
    issueId: issue.id,
    property: 'text-decoration-line',
    originalValue: current.trim() || 'none',
    suggestedValue: 'underline',
    originalContrastRatio: ratio,
    expectedContrastRatio: ratio,
  };
}

/** The same eligibility checks and color engine for individual and bulk fixes. `palette`: the site's colors. */
export function generateCorrection({ issue, element }: CorrectionTarget, palette?: readonly string[], drawn?: DrawnText) {
  if (!isVerifiedFailure(issue)) return { ok: false, message: 'This issue needs manual review, so no automatic fix is suggested.' } as const;
  if (!SUPPORTED_RATIOS.has(issue.requiredRatio)) return { ok: false, message: UNSUPPORTED_RATIO_MESSAGE } as const;
  if (!element.isConnected || !isStylable(element)) return { ok: false, message: DETACHED_MESSAGE } as const;
  if (issue.kind === 'link-color-only') return { ok: true, fix: underlineFix(issue), element, issue } as const;
  const result = suggestFix({ ...issue, ...drawn, palette });
  return result.ok ? { ...result, element, issue } : result;
}
