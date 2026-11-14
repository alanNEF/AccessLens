import { isVerifiedFailure, type ContrastIssue } from '../../shared/types';
import { suggestFix } from './color-suggester';
import type { StylableElement } from './preview-manager';

export interface CorrectionTarget {
  readonly issue: ContrastIssue;
  readonly element: Element;
}

export const DETACHED_MESSAGE = 'The element is no longer on the page, so no preview was applied.';

function isStylable(element: Element): element is StylableElement {
  return 'style' in element;
}

/** The same eligibility checks and color engine for individual and bulk fixes. */
export function generateCorrection({ issue, element }: CorrectionTarget) {
  if (!isVerifiedFailure(issue)) return { ok: false, message: 'This issue needs manual review, so no automatic fix is suggested.' } as const;
  if (issue.requiredRatio !== 4.5 && issue.requiredRatio !== 3) return { ok: false, message: 'Only WCAG AA text thresholds (4.5:1 and 3:1) are supported.' } as const;
  if (!element.isConnected || !isStylable(element)) return { ok: false, message: DETACHED_MESSAGE } as const;
  const result = suggestFix(issue);
  return result.ok ? { ...result, element, issue } : result;
}
