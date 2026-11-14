import { describeElement, selectorFromTarget, toContrastIssue, toLinkIssue, type AxeContrastData, type AxeLinkData } from '../../src/features/inspector/contrast-mapping';
import { suggestFix } from '../../src/features/fixer/color-suggester';
import { isVerifiedFailure, type ContrastIssue, type ContrastLevel } from '../../src/shared/types';
import type { RawNode } from './page-scan';

/** One finding, kept small on purpose: agents read this instead of screenshots. */
export interface AgentIssue {
  id: string;
  status: 'fail' | 'review';
  /** WCAG success criterion, e.g. "1.4.3". */
  wcag: string;
  kind: 'text-contrast' | 'link-color-only';
  selector: string;
  element: string;
  text_color?: string;
  /** For links: the surrounding text color. Otherwise: the background. */
  background?: string;
  ratio?: number;
  required: number;
  large_text?: true;
  /** Why it needs a human (review only). */
  reason?: string;
  fix?: AgentFix;
  /** Why no automatic fix was suggested for a failure. */
  no_fix?: string;
}

export interface AgentFix {
  property: string;
  value: string;
  /** Ready-to-apply rule for the element's selector. */
  css: string;
  expected_ratio?: number;
}

export interface AgentReport {
  url: string;
  level: ContrastLevel;
  summary: { fail: number; review: number; color_only_links: number };
  issues: AgentIssue[];
  truncated?: number;
  note: string;
}

const round = (ratio: number) => Math.floor(ratio * 100) / 100;

function fixFor(raw: RawNode, issue: ContrastIssue): { fix?: AgentFix; no_fix?: string } {
  if (!isVerifiedFailure(issue)) return {};
  const cssFor = (property: string, value: string) => `${issue.selector} { ${property}: ${value}; }`;
  if (issue.kind === 'link-color-only') {
    if (raw.decoration?.includes('underline')) return { no_fix: 'Already underlined; another cue may be needed.' };
    return { fix: { property: 'text-decoration-line', value: 'underline', css: cssFor('text-decoration-line', 'underline') } };
  }
  if (raw.opacity === null) return { no_fix: 'The background behind this text is faded (CSS opacity); check by eye.' };
  const result = suggestFix({
    id: issue.id,
    textColor: raw.color ?? issue.textColor,
    backgroundColor: issue.backgroundColor,
    requiredRatio: issue.requiredRatio,
    opacity: raw.opacity,
  });
  if (!result.ok) return { no_fix: result.message };
  return {
    fix: {
      property: result.fix.property,
      value: result.fix.suggestedValue,
      css: cssFor(result.fix.property, result.fix.suggestedValue),
      expected_ratio: result.fix.expectedContrastRatio,
    },
  };
}

export function toReport(url: string, level: ContrastLevel, raws: readonly RawNode[], maxIssues: number): AgentReport {
  // At AAA both text rules can report one element; keep its first (failures come first) result.
  const seen = new Set<string>();
  const unique = raws.filter(raw => {
    const key = `${raw.rule === 'link-in-text-block' ? 'link' : 'text'}|${JSON.stringify(raw.target)}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
  const issues: AgentIssue[] = unique.map(raw => {
    const common = {
      id: `${raw.rule}-${raw.status}-${raw.index}`,
      status: raw.status,
      selector: selectorFromTarget(raw.target),
      elementLabel: describeElement(raw.tag ?? 'unknown', raw.text),
    };
    const issue = raw.rule === 'link-in-text-block'
      ? toLinkIssue({ ...common, data: raw.data as AxeLinkData | null, computedLinkColor: raw.color, computedTextColor: raw.surroundingColor })
      : toContrastIssue({ ...common, data: raw.data as AxeContrastData | null, level, fromMinimumRule: raw.rule === 'color-contrast' });
    return {
      id: issue.id,
      status: issue.status === 'failed' ? 'fail' : 'review',
      wcag: issue.wcagCriterion,
      kind: issue.kind ?? 'text-contrast',
      selector: issue.selector,
      element: issue.elementLabel,
      ...(issue.textColor ? { text_color: issue.textColor } : {}),
      ...(issue.backgroundColor ? { background: issue.backgroundColor } : {}),
      ...(issue.contrastRatio !== null ? { ratio: round(issue.contrastRatio) } : {}),
      required: issue.requiredRatio,
      ...(issue.isLargeText ? { large_text: true as const } : {}),
      ...(issue.reviewReason ? { reason: issue.reviewReason } : {}),
      ...fixFor(raw, issue),
    } satisfies AgentIssue;
  });
  // Failures first; within each group keep page order.
  issues.sort((a, b) => (a.status === b.status ? 0 : a.status === 'fail' ? -1 : 1));
  const summary = {
    fail: issues.filter(issue => issue.status === 'fail').length,
    review: issues.filter(issue => issue.status === 'review').length,
    color_only_links: issues.filter(issue => issue.status === 'fail' && issue.kind === 'link-color-only').length,
  };
  const shown = issues.slice(0, Math.max(0, maxIssues));
  return {
    url,
    level,
    summary,
    issues: shown,
    ...(issues.length > shown.length ? { truncated: issues.length - shown.length } : {}),
    note: 'Automated checks cover text contrast (WCAG 1.4.3, or 1.4.6 at AAA) and color-only links (1.4.1). Zero failures does not mean the page is accessible. "review" items need a human.',
  };
}
