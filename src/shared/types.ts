export type FeatureId = 'simulator' | 'inspector' | 'fixer';
export type OperatingMode = 'developer' | 'user';

export type SimulationMode =
  | 'none' | 'protanopia' | 'deuteranopia' | 'tritanopia' | 'achromatopsia'
  | 'blur' | 'cataracts' | 'low-contrast' | 'visionless';

/** failed = measured and below threshold; needs-review = could not be measured reliably. */
export type ContrastLevel = 'AA' | 'AAA';
/**
 * text-contrast:    text vs its background (WCAG 1.4.3 AA, or 1.4.6 AAA "enhanced" for low vision).
 * link-color-only:  a link inside a paragraph that differs from the surrounding text only by color (WCAG 1.4.1).
 *                   For these, textColor = link color, backgroundColor = surrounding text color,
 *                   contrastRatio = link vs surrounding text, requiredRatio = 3.
 */
export type IssueKind = 'text-contrast' | 'link-color-only';
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
  /** AA: 4.5 normal / 3 large. AAA (enhanced): 7 normal / 4.5 large. Color-only links: 3. */
  requiredRatio: number;
  isLargeText: boolean;
  status: ContrastStatus;
  /** Plain-language reason a needs-review case could not be measured. */
  reviewReason?: string;
  wcagCriterion: '1.4.3' | '1.4.6' | '1.4.1';
  /** Defaults to 'text-contrast' when absent. */
  kind?: IssueKind;
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
  property: 'color' | 'background-color' | 'text-decoration-line';
  originalValue: string;
  suggestedValue: string;
  originalContrastRatio: number;
  expectedContrastRatio: number;
  /** 'adjusted': lightness-shifted original; 'site-palette': a color the page already uses. */
  source?: 'adjusted' | 'site-palette';
  /** True when it also meets the target under protanopia, deuteranopia and tritanopia simulation. */
  colorBlindSafe?: boolean;
  /** Contrast under each color-vision simulation, truncated to 2 decimals. */
  simulatedRatios?: Readonly<Partial<Record<'protanopia' | 'deuteranopia' | 'tritanopia', number>>>;
}
