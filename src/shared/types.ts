export type FeatureId = 'simulator' | 'inspector' | 'fixer';

export type SimulationMode = 'none' | 'protanopia' | 'deuteranopia' | 'tritanopia' | 'blur' | 'visionless';

/** failed = measured and below threshold; needs-review = could not be measured reliably. */
export type ContrastStatus = 'failed' | 'needs-review' | 'passed';

/**
 * One text-contrast result from Inspector (INS-04, INS-07).
 * Colors and ratio are null when the status is needs-review and axe could not measure them.
 * Colors are the page's original computed colors, never simulation-filtered pixels (INS-02).
 */
export interface ContrastIssue {
  id: string;
  /** Human-readable CSS selector from axe; for display only. Use the element reference to act on it. */
  selector: string;
  /** Short label such as `<p> "Sells out by 11 am…"`. */
  elementLabel: string;
  textColor: string | null;
  backgroundColor: string | null;
  contrastRatio: number | null;
  /** 4.5 for normal text, 3 for large text (WCAG AA). */
  requiredRatio: number;
  isLargeText: boolean;
  status: ContrastStatus;
  /** Plain-language reason a needs-review case could not be measured. */
  reviewReason?: string;
  wcagCriterion: '1.4.3';
}

/** A failure with every value Fixer needs (FIX-01). */
export interface VerifiedContrastFailure extends ContrastIssue {
  status: 'failed';
  textColor: string;
  backgroundColor: string;
  contrastRatio: number;
}

export function isVerifiedFailure(issue: ContrastIssue): issue is VerifiedContrastFailure {
  return issue.status === 'failed' && issue.textColor !== null && issue.backgroundColor !== null && issue.contrastRatio !== null;
}

export interface SuggestedFix {
  issueId: string;
  property: 'color' | 'background-color';
  originalValue: string;
  suggestedValue: string;
  originalContrastRatio: number;
  expectedContrastRatio: number;
}
