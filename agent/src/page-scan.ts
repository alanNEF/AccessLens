/**
 * Runs inside the page (serialized with Function#toString), so it must be fully
 * self-contained: no imports, no references to anything outside its own body.
 * It mirrors what the extension's Inspector reads, then returns plain JSON.
 */

export interface PageScanOptions {
  readonly level: 'AA' | 'AAA';
  /** Optional CSS selector to limit the scan to part of the page. */
  readonly selector?: string;
  /** Optional CSS injected before scanning, e.g. to verify candidate fixes without editing source. */
  readonly css?: string;
}

export interface RawNode {
  readonly rule: string;
  readonly status: 'failed' | 'needs-review';
  readonly index: number;
  readonly target: Array<string | string[]>;
  readonly tag: string | null;
  readonly text: string | null;
  readonly data: Record<string, unknown> | null;
  /** Computed CSS `color` (what a fix edits). */
  readonly color: string | null;
  /** Combined opacity the text is drawn with; null when the background layer is itself faded. */
  readonly opacity: number | null;
  /** For links: the color of the text around the link. */
  readonly surroundingColor: string | null;
  readonly decoration: string | null;
}

export async function scanInPage(options: PageScanOptions): Promise<RawNode[]> {
  const axe = (window as any).axe;
  if (!axe) throw new Error('axe-core is not loaded in the page.');
  // At AAA, color-contrast-enhanced only reports 4.5–7:1 (3–4.5:1 large) and passes lower ratios,
  // so color-contrast runs too; its results are judged against the AAA target outside the page.
  const rules = options.level === 'AAA'
    ? ['color-contrast', 'color-contrast-enhanced', 'link-in-text-block']
    : ['color-contrast', 'link-in-text-block'];

  document.querySelectorAll('style[data-accesslens-agent]').forEach(node => node.remove());
  if (options.css) {
    const style = document.createElement('style');
    style.setAttribute('data-accesslens-agent', '');
    style.textContent = options.css;
    document.head.append(style);
  }

  const isClear = (color: string) => color === 'transparent' || /^rgba\(.*,\s*0\)$/.test(color);
  // Same model as the extension's Fixer (readDrawnOpacity).
  const drawnOpacity = (element: Element): number | null => {
    let opacity = 1;
    let reachedBackground = false;
    for (let node: Element | null = element; node; node = node.parentElement) {
      const style = getComputedStyle(node);
      const own = Number.parseFloat(style.opacity);
      reachedBackground ||= style.backgroundImage !== 'none' || !isClear(style.backgroundColor);
      if (!reachedBackground) opacity *= own;
      else if (own < 1) return null;
    }
    return opacity;
  };
  const surrounding = (element: Element): string | null => {
    let parent = element.parentElement;
    while (parent && getComputedStyle(parent).display.startsWith('inline')) parent = parent.parentElement;
    return parent ? getComputedStyle(parent).color : null;
  };

  const context = options.selector
    ? { include: [options.selector], exclude: ['accesslens-panel'] }
    : { exclude: ['accesslens-panel'] };
  const results = await axe.run(context, {
    runOnly: { type: 'rule', values: rules },
    resultTypes: ['violations', 'incomplete'],
    elementRef: true,
  });

  const out: RawNode[] = [];
  const groups: Array<[any[], RawNode['status']]> = [[results.violations, 'failed'], [results.incomplete, 'needs-review']];
  for (const [group, status] of groups) {
    for (const rule of group) {
      if (!rules.includes(rule.id)) continue;
      rule.nodes.forEach((node: any, index: number) => {
        const element: Element | undefined = node.element;
        const checks = [...(node.any ?? []), ...(node.all ?? []), ...(node.none ?? [])];
        const check = checks.find((c: any) => c.id === rule.id || c.id === 'color-contrast' || c.id === 'color-contrast-enhanced');
        const style = element ? getComputedStyle(element) : null;
        out.push({
          rule: rule.id,
          status,
          index,
          target: node.target,
          tag: element?.tagName ?? null,
          text: element?.textContent?.replace(/\s+/g, ' ').trim().slice(0, 120) ?? null,
          data: check?.data && typeof check.data === 'object' ? check.data : null,
          color: style?.color ?? null,
          opacity: element ? drawnOpacity(element) : null,
          surroundingColor: rule.id === 'link-in-text-block' && element ? surrounding(element) : null,
          decoration: style?.textDecorationLine ?? null,
        });
      });
    }
  }
  return out;
}
