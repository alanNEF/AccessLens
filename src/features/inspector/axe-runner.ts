import axe from 'axe-core';
import type { ContrastIssue, ContrastStatus } from '../../shared/types';
import { describeElement, selectorFromTarget, toContrastIssue, type AxeContrastData } from './contrast-mapping';

/** An issue plus a stable reference to the element it describes (INS-07). */
export interface InspectedIssue {
  readonly issue: ContrastIssue;
  readonly element: Element;
}

const RULE = 'color-contrast';
let queue: Promise<unknown> = Promise.resolve();

/** axe throws if two runs overlap, so every run waits for the previous one. */
function runAxe(context: axe.ElementContext, options: axe.RunOptions): Promise<axe.AxeResults> {
  const next = queue.then(() => axe.run(context, options));
  queue = next.catch(() => undefined);
  return next;
}

function toInspected(node: axe.NodeResult, status: ContrastStatus, id: string): InspectedIssue | null {
  const element = node.element;
  if (!element) return null;
  const check = [...node.any, ...node.all, ...node.none].find(result => result.id === RULE);
  return {
    element,
    issue: toContrastIssue({
      id,
      status,
      selector: selectorFromTarget(node.target),
      elementLabel: describeElement(element.tagName, element.textContent),
      data: (check?.data ?? null) as AxeContrastData | null,
    }),
  };
}

function collect(results: axe.AxeResults, includePasses: boolean): InspectedIssue[] {
  const groups: Array<[axe.Result[], ContrastStatus]> = [
    [results.violations, 'failed'],
    [results.incomplete, 'needs-review'],
    ...(includePasses ? [[results.passes, 'passed'] as [axe.Result[], ContrastStatus]] : []),
  ];
  const out: InspectedIssue[] = [];
  for (const [rules, status] of groups) {
    for (const rule of rules) {
      if (rule.id !== RULE) continue;
      rule.nodes.forEach((node, index) => {
        const inspected = toInspected(node, status, `${status}-${index}`);
        if (inspected) out.push(inspected);
      });
    }
  }
  return out;
}

/**
 * Scans the whole page for text-contrast failures and needs-review cases (INS-03, INS-05, INS-06).
 * `exclude` is the AccessLens panel host, so our own UI is never audited.
 * axe reads computed CSS colors, so an active simulation does not change results (INS-02).
 */
export async function scanTextContrast(exclude: Element): Promise<InspectedIssue[]> {
  const results = await runAxe(
    { include: [document.documentElement], exclude: [exclude] } as unknown as axe.ElementContext,
    { runOnly: { type: 'rule', values: [RULE] }, elementRef: true, resultTypes: ['violations', 'incomplete'] },
  );
  return collect(results, false);
}

/**
 * Checks one element the developer clicked (INS-01). Returns the result for that element
 * (or, if it has no text of its own, its first text descendant), including passes.
 */
export async function inspectElement(target: Element, exclude: Element): Promise<InspectedIssue | null> {
  const results = await runAxe(
    { include: [target], exclude: [exclude] } as unknown as axe.ElementContext,
    { runOnly: { type: 'rule', values: [RULE] }, elementRef: true },
  );
  const found = collect(results, true);
  const exact = found.find(item => item.element === target);
  const chosen = exact ?? found[0];
  if (!chosen) return null;
  return { element: chosen.element, issue: { ...chosen.issue, id: `picked-${chosen.issue.id}` } };
}
