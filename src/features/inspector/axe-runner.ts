import axe from 'axe-core';
import type { ContrastIssue, ContrastLevel, ContrastStatus } from '../../shared/types';
import { describeElement, selectorFromTarget, toContrastIssue, toLinkIssue, type AxeContrastData, type AxeLinkData } from './contrast-mapping';

/** An issue plus a stable reference to the element it describes (INS-07). */
export interface InspectedIssue {
  readonly issue: ContrastIssue;
  readonly element: Element;
}

/**
 * axe rule ids. color-contrast-enhanced is axe's WCAG 1.4.6 (AAA) rule. It only reports ratios from
 * 4.5:1 (3:1 large) up to 7:1 (4.5:1 large) and passes anything lower, so AAA also runs color-contrast
 * to catch the worst text, judged against the AAA target.
 */
const TEXT_RULES: Record<ContrastLevel, readonly string[]> = { AA: ['color-contrast'], AAA: ['color-contrast', 'color-contrast-enhanced'] };
const LINK_RULE = 'link-in-text-block';

let queue: Promise<unknown> = Promise.resolve();

/** axe throws if two runs overlap, so every run waits for the previous one. */
function runAxe(context: axe.ElementContext, options: axe.RunOptions): Promise<axe.AxeResults> {
  const next = queue.then(() => axe.run(context, options));
  queue = next.catch(() => undefined);
  return next;
}

/** Color of the text a link sits in: the nearest ancestor that is not itself inline. */
function surroundingTextColor(element: Element): string | null {
  let parent = element.parentElement;
  while (parent && getComputedStyle(parent).display.startsWith('inline')) parent = parent.parentElement;
  return parent ? getComputedStyle(parent).color : null;
}

function toInspected(ruleId: string, node: axe.NodeResult, status: ContrastStatus, id: string, level: ContrastLevel): InspectedIssue | null {
  const element = node.element;
  if (!element) return null;
  const checks = [...node.any, ...node.all, ...node.none];
  const common = { id, status, selector: selectorFromTarget(node.target), elementLabel: describeElement(element.tagName, element.textContent) };
  if (ruleId === LINK_RULE) {
    const data = (checks.find(check => check.id === LINK_RULE)?.data ?? null) as AxeLinkData | null;
    return {
      element,
      issue: toLinkIssue({ ...common, data, computedLinkColor: getComputedStyle(element).color, computedTextColor: surroundingTextColor(element) }),
    };
  }
  const data = (checks.find(check => check.id === 'color-contrast' || check.id === 'color-contrast-enhanced')?.data ?? null) as AxeContrastData | null;
  return { element, issue: toContrastIssue({ ...common, data, level, fromMinimumRule: ruleId === 'color-contrast' }) };
}

function collect(results: axe.AxeResults, level: ContrastLevel, includePasses: boolean): InspectedIssue[] {
  const wanted = new Set([...TEXT_RULES[level], LINK_RULE]);
  // At AAA both text rules can report the same element (e.g. as needs-review); keep its first, most severe result.
  const seenElements = new Map<Element, Set<string>>();
  const groups: Array<[axe.Result[], ContrastStatus]> = [
    [results.violations, 'failed'],
    [results.incomplete, 'needs-review'],
    ...(includePasses ? [[results.passes, 'passed'] as [axe.Result[], ContrastStatus]] : []),
  ];
  const out: InspectedIssue[] = [];
  for (const [rules, status] of groups) {
    for (const rule of rules) {
      if (!wanted.has(rule.id)) continue;
      rule.nodes.forEach((node, index) => {
        const inspected = toInspected(rule.id, node, status, `${rule.id}-${status}-${index}`, level);
        if (!inspected) return;
        const key = `${inspected.issue.kind}`;
        if (seenElements.get(inspected.element)?.has(key)) return;
        seenElements.set(inspected.element, (seenElements.get(inspected.element) ?? new Set()).add(key));
        out.push(inspected);
      });
    }
  }
  return out;
}

const optionsFor = (level: ContrastLevel): axe.RunOptions => ({
  runOnly: { type: 'rule', values: [...TEXT_RULES[level], LINK_RULE] },
  elementRef: true,
});

/**
 * Scans the whole page (INS-03, INS-05, INS-06) for text contrast at the chosen level
 * (AA 1.4.3 or enhanced AAA 1.4.6) and for links that rely on color alone (1.4.1).
 * `exclude` is the AccessLens panel host, so our own UI is never audited.
 * axe reads computed CSS colors, so an active simulation does not change results (INS-02).
 */
export async function scanTextContrast(exclude: Element, roots: readonly Element[] = [document.documentElement], level: ContrastLevel = 'AA'): Promise<InspectedIssue[]> {
  const results = await runAxe(
    { include: [...roots], exclude: [exclude] } as unknown as axe.ElementContext,
    { ...optionsFor(level), resultTypes: ['violations', 'incomplete'] },
  );

  return collect(results, level, false);
}

/**
 * Checks one element the developer clicked (INS-01). Returns the result for that element
 * (or, if it has no text of its own, its first text descendant), including passes.
 */
export async function inspectElement(target: Element, exclude: Element, level: ContrastLevel = 'AA'): Promise<InspectedIssue | null> {
  const results = await runAxe(
    { include: [target], exclude: [exclude] } as unknown as axe.ElementContext,
    optionsFor(level),
  );
  const found = collect(results, level, true);
  // Prefer a result about the clicked element itself; a failure beats a pass.
  const exact = found.find(item => item.element === target);
  const chosen = exact ?? found[0];
  if (!chosen) return null;
  return { element: chosen.element, issue: { ...chosen.issue, id: `picked-${chosen.issue.id}` } };
}
