import { useEffect, useRef, useSyncExternalStore } from 'react';
import { CircleCheck, CircleHelp, CircleX, Crosshair, ExternalLink, Info, LocateFixed, ScanLine, Sparkles, Underline, X } from 'lucide-react';
import type { InspectorStore } from './inspector-store';
import type { InspectedIssue } from './axe-runner';
import { explainIssue, formatRatio } from './contrast-mapping';
import { revealElement } from './element-highlighter';
import type { SimulatorModeReader } from '../../shared/simulator-mode-reader';
import { isVerifiedFailure, type ContrastIssue, type ContrastLevel, type ContrastStatus, type SimulationMode } from '../../shared/types';
import { Button } from '../../components/ui/button';
import { Card, CardContent } from '../../components/ui/card';
import { cn } from '../../components/shared/utils';
import type { ImageIssue } from './image-runner';

const WCAG_LINKS: Record<ContrastIssue['wcagCriterion'], { href: string; label: string }> = {
  '1.4.3': { href: 'https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum.html', label: 'WCAG 1.4.3' },
  '1.4.6': { href: 'https://www.w3.org/WAI/WCAG22/Understanding/contrast-enhanced.html', label: 'WCAG 1.4.6' },
  '1.4.1': { href: 'https://www.w3.org/WAI/WCAG22/Understanding/use-of-color.html', label: 'WCAG 1.4.1' },
};

/** Simulations about contrast sensitivity: the enhanced (AAA) standard is the matching check. */
const ENHANCED_MODES: ReadonlySet<SimulationMode> = new Set(['cataracts', 'low-contrast']);
/** Simulations about color perception: color-only links are the matching check. */
const COLOR_MODES: ReadonlySet<SimulationMode> = new Set(['protanopia', 'deuteranopia', 'tritanopia', 'achromatopsia']);

const isLink = (issue: ContrastIssue) => issue.kind === 'link-color-only';

const LEVELS: { id: ContrastLevel; label: string; description: string }[] = [
  { id: 'AA', label: 'Minimum', description: 'WCAG AA · 4.5:1' },
  { id: 'AAA', label: 'Enhanced', description: 'Low vision · 7:1' },
];

/** Status is always shown as an icon plus text, never by color alone. */
const STATUS = {
  failed: { label: 'Fail', icon: CircleX, className: 'border-red-700 bg-red-50 text-red-800 dark:border-red-400 dark:bg-red-950 dark:text-red-200' },
  'needs-review': { label: 'Needs review', icon: CircleHelp, className: 'border-dashed border-amber-700 bg-amber-50 text-amber-900 dark:border-amber-400 dark:bg-amber-950 dark:text-amber-200' },
  passed: { label: 'Pass', icon: CircleCheck, className: 'border-green-700 bg-green-50 text-green-800 dark:border-green-400 dark:bg-green-950 dark:text-green-200' },
} satisfies Record<ContrastStatus, { label: string; icon: typeof CircleX; className: string }>;

function StatusBadge({ status }: { status: ContrastStatus }) {
  const { label, icon: Icon, className } = STATUS[status];
  return (
    <span className={cn('inline-flex w-fit items-center gap-1 rounded-md border px-1.5 py-0.5 text-xs font-semibold', className)}>
      <Icon className="size-3" aria-hidden="true" />{label}
    </span>
  );
}

function ratioText(item: InspectedIssue) {
  const { contrastRatio, requiredRatio } = item.issue;
  if (isLink(item.issue)) {
    return contrastRatio === null ? 'Needs an underline' : `${formatRatio(contrastRatio)}:1 vs text · needs underline or ${requiredRatio}:1`;
  }
  return contrastRatio === null ? `Needs ${requiredRatio}:1` : `${formatRatio(contrastRatio)}:1 · needs ${requiredRatio}:1`;
}

function requirementText(issue: ContrastIssue) {
  if (isLink(issue)) return `Underline, or ${issue.requiredRatio}:1 vs surrounding text (WCAG A)`;
  return `${issue.requiredRatio}:1 · ${issue.isLargeText ? 'large text' : 'normal text'} (WCAG ${issue.wcagCriterion === '1.4.6' ? 'AAA' : 'AA'})`;
}

function IssueList({ title, items, selectedId, onSelect }: {
  title: string; items: InspectedIssue[]; selectedId: string | null; onSelect: (item: InspectedIssue) => void;
}) {
  if (!items.length) return null;
  return (
    <section aria-label={title} className="space-y-2">
      <h3 className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">{title} ({items.length})</h3>
      <ul className="space-y-2">
        {items.map(item => {
          const selected = item.issue.id === selectedId;
          return (
            <li key={item.issue.id}>
              <Button type="button" variant="outline" aria-pressed={selected} onClick={() => onSelect(item)}
                className={cn('h-auto w-full flex-col items-start gap-1 rounded-lg px-3 py-2.5 text-left whitespace-normal',
                  selected ? 'border-ring bg-accent text-accent-foreground hover:bg-accent hover:text-accent-foreground' : 'border-border bg-background hover:bg-secondary')}>
                <StatusBadge status={item.issue.status} />
                <span className="text-sm font-medium break-words">{item.issue.elementLabel}</span>
                <span className="text-xs font-normal text-muted-foreground tabular-nums">{ratioText(item)}</span>
              </Button>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

function Swatch({ label, color }: { label: string; color: string | null }) {
  return (
    <div className="flex min-w-0 items-center gap-2">
      <span className="flex size-7 shrink-0 items-center justify-center rounded-md border border-border text-xs text-muted-foreground"
        style={{ background: color ?? 'transparent' }} aria-hidden="true">{color ? '' : '?'}</span>
      <span className="min-w-0 text-xs leading-tight"><span className="text-muted-foreground">{label}</span><br /><code className="font-mono">{color ?? 'Unknown'}</code></span>
    </div>
  );
}

function IssueDetail({ item, onPreviewFix }: { item: InspectedIssue; onPreviewFix: (item: InspectedIssue) => void }) {
  const { issue } = item;
  const fixable = isVerifiedFailure(issue);
  return (
    <Card className="gap-0 rounded-lg py-0 shadow-none" aria-label="Selected element details">
      <CardContent className="space-y-3 p-3.5">
        <div className="space-y-1.5">
          <StatusBadge status={issue.status} />
          <p className="text-sm font-medium break-words">{issue.elementLabel}</p>
        </div>
        {issue.textColor && issue.backgroundColor && (isLink(issue) ? (
          // Link color inside its surrounding text color, on white, so "looks like plain text" is visible.
          <div className="rounded-md border border-border bg-white px-3 py-2 text-base" aria-hidden="true">
            <span style={{ color: issue.backgroundColor }}>Read the </span>
            <span style={{ color: issue.textColor }}>vendor policy</span>
            <span style={{ color: issue.backgroundColor }}> before visiting.</span>
          </div>
        ) : (
          // Intentionally rendered in the page's own (possibly failing) colors so the problem is visible.
          <div className="rounded-md border border-border px-3 py-2 text-lg" style={{ color: issue.textColor, background: issue.backgroundColor }} aria-hidden="true">
            Aa Sample text
          </div>
        ))}
        <div className="grid grid-cols-2 gap-3">
          <Swatch label={isLink(issue) ? 'Link' : 'Text'} color={issue.textColor} />
          <Swatch label={isLink(issue) ? 'Surrounding text' : 'Background'} color={issue.backgroundColor} />
        </div>
        <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-xs">
          <dt className="text-muted-foreground">{isLink(issue) ? 'Link vs text' : 'Contrast'}</dt>
          <dd className="font-medium tabular-nums">{issue.contrastRatio === null ? 'Could not be measured' : `${formatRatio(issue.contrastRatio)}:1`}</dd>
          <dt className="text-muted-foreground">Required</dt>
          <dd className="font-medium">{requirementText(issue)}</dd>
          <dt className="text-muted-foreground">Selector</dt>
          <dd className="min-w-0 font-mono break-all">{issue.selector}</dd>
        </dl>
        <p className="text-xs leading-relaxed text-muted-foreground">
          {explainIssue(issue)}{' '}
          <a href={WCAG_LINKS[issue.wcagCriterion].href} target="_blank" rel="noreferrer" className="inline-flex items-center gap-0.5 font-medium text-accent-foreground underline underline-offset-2">
            {WCAG_LINKS[issue.wcagCriterion].label}<ExternalLink className="size-3" aria-hidden="true" /><span className="sr-only"> (opens in a new tab)</span>
          </a>
        </p>
        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="outline" size="sm" onClick={() => revealElement(item.element)}>
            <LocateFixed className="size-3.5" aria-hidden="true" />Show on page
          </Button>
          {fixable && (
            <Button type="button" size="sm" onClick={() => onPreviewFix(item)}>
              {isLink(issue)
                ? <><Underline className="size-3.5" aria-hidden="true" />Preview underline</>
                : <><Sparkles className="size-3.5" aria-hidden="true" />Preview fix</>}
            </Button>
          )}
        </div>
        {issue.status === 'needs-review' && (
          <p className="text-xs text-muted-foreground">Fixer only handles measured failures, so this one needs a manual check.</p>
        )}
      </CardContent>
    </Card>
  );
}

export function InspectorTab({ store, modeReader, onPreviewFix, onPreviewImageFix }: {
  store: InspectorStore;
  modeReader: SimulatorModeReader;
  onPreviewFix: (item: InspectedIssue) => void;
  onPreviewImageFix: (item: ImageIssue) => void;
}) {
  const state = useSyncExternalStore(store.subscribe, store.getState);
  const imageIssues = state.imageIssues;
  const simulationMode = useSyncExternalStore(modeReader.subscribeActiveMode, modeReader.getActiveMode);
  const failures = state.issues.filter(item => item.issue.status === 'failed' && !isLink(item.issue));
  const linkFailures = state.issues.filter(item => item.issue.status === 'failed' && isLink(item.issue));
  const reviews = state.issues.filter(item => item.issue.status === 'needs-review');

  // Picking Cataracts or Low Contrast switches to the matching check: enhanced (AAA) contrast.
  // Only on a change of mode, so the user can still switch back by hand.
  const previousMode = useRef(simulationMode);
  useEffect(() => {
    if (previousMode.current === simulationMode) return;
    previousMode.current = simulationMode;
    if (ENHANCED_MODES.has(simulationMode)) store.setLevel('AAA');
  }, [simulationMode, store]);
  const selected = store.getSelected();
  const scanning = state.status === 'scanning';
  const hasResults = state.issues.length > 0 || state.picked !== null;
  const select = (item: InspectedIssue) => { store.select(item.issue.id); revealElement(item.element); };

  let statusText = '';
  if (state.picking) statusText = 'Click any text on the page to check it. Press Esc to cancel.';
  else if (state.status === 'done') statusText = failures.length || linkFailures.length || reviews.length
    ? [
        `${failures.length} contrast ${failures.length === 1 ? 'failure' : 'failures'}`,
        ...(linkFailures.length ? [`${linkFailures.length} color-only ${linkFailures.length === 1 ? 'link' : 'links'}`] : []),
        `${reviews.length} need manual review`,
      ].join(' · ')
    : 'No measurable failures found.';

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-lg font-semibold tracking-tight">Inspect contrast</h2>
        <p className="mt-1 text-sm text-muted-foreground">Find text that is hard to read and see why.</p>
      </div>

      <fieldset className="min-w-0">
        <legend className="mb-2 text-xs font-semibold tracking-wide text-muted-foreground uppercase">Contrast standard</legend>
        <div className="grid grid-cols-2 gap-2">
          {LEVELS.map(level => (
            <Button key={level.id} type="button" variant="outline" aria-pressed={state.level === level.id} onClick={() => store.setLevel(level.id)}
              className={cn('h-auto flex-col items-start gap-0.5 rounded-lg px-3 py-2 text-left whitespace-normal',
                state.level === level.id ? 'border-ring bg-accent text-accent-foreground hover:bg-accent hover:text-accent-foreground' : 'border-border bg-background hover:bg-secondary')}>
              <span className="text-sm font-medium">{level.label}</span>
              <span className="text-xs font-normal text-muted-foreground">{level.description}</span>
            </Button>
          ))}
        </div>
      </fieldset>

      {ENHANCED_MODES.has(simulationMode) && (
        <p className="rounded-lg border border-border p-3 text-xs text-muted-foreground">
          This simulation shows reduced contrast sensitivity. The Enhanced standard (WCAG 1.4.6: 7:1, or 4.5:1 for large text) is the matching check{state.level === 'AAA' ? ' and is on.' : '. Switch to Enhanced to use it.'}
        </p>
      )}
      {COLOR_MODES.has(simulationMode) && (
        <p className="rounded-lg border border-border p-3 text-xs text-muted-foreground">
          This simulation removes or shifts color. Every scan also finds links that stand out only by color (WCAG 1.4.1), which this simulation hides.
        </p>
      )}

      <div className="grid grid-cols-2 gap-2">
        <Button type="button" onClick={() => void store.scan()} disabled={scanning}>
          <ScanLine className="size-4" aria-hidden="true" />{scanning ? 'Scanning…' : 'Scan page'}
        </Button>
        {state.picking
          ? <Button type="button" variant="outline" onClick={() => store.cancelPicking()}><X className="size-4" aria-hidden="true" />Cancel</Button>
          : <Button type="button" variant="outline" onClick={() => store.startPicking()}><Crosshair className="size-4" aria-hidden="true" />Pick element</Button>}
      </div>

      {(statusText || hasResults) && (
        <div className="flex items-center justify-between gap-2">
          <p role="status" aria-live="polite" aria-atomic="true" className="min-w-0 text-xs font-medium">{statusText}</p>
          {hasResults && <Button type="button" variant="ghost" size="xs" onClick={() => store.clear()}>Clear</Button>}
        </div>
      )}

      {state.message && <p role="alert" className="rounded-lg border border-destructive p-3 text-sm text-destructive">
        {state.status === 'error' ? `Scan failed: ${state.message}` : state.message}
      </p>}

      {simulationMode !== 'none' && (
        <p className="rounded-lg border border-border p-3 text-xs text-muted-foreground">
          A simulation is on. Ratios use the page’s real colors, not the simulated view.
        </p>
      )}

      {selected && <IssueDetail item={selected} onPreviewFix={onPreviewFix} />}

      <IssueList
        title={state.level === 'AAA' ? 'Enhanced contrast failures' : 'Contrast failures'}
        items={failures}
        selectedId={state.selectedId}
        onSelect={select}
      />

      <IssueList
        title="Links that rely on color"
        items={linkFailures}
        selectedId={state.selectedId}
        onSelect={select}
      />

      <section className="space-y-2">
        <h3 className="text-xs font-semibold uppercase">
          Images missing alt text ({imageIssues.length})
        </h3>
      {imageIssues.map((item) => (
        <div key={item.id} className="rounded-lg border p-3 space-y-2">
          <p className="text-sm font-medium break-all">
            {item.selector}
          </p>
          <p className="text-xs text-muted-foreground">
            {item.description}
          </p>

          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => revealElement(item.element)}
            >
              Show image on page
            </Button>

            {item.element instanceof HTMLImageElement && (
              <Button
                type="button"
                size="sm"
                onClick={() => onPreviewImageFix(item)}
              >
                Fix image
              </Button>
            )}
          </div>
        </div>
      ))}
      </section>

      <IssueList
        title="Needs manual review"
        items={reviews}
        selectedId={state.selectedId}
        onSelect={select}
      />

      {state.status === 'idle' && !state.picked && !state.picking && (
        <Card className="rounded-lg border-dashed bg-secondary/30 py-0 shadow-none"><CardContent className="flex flex-col items-center px-5 py-6 text-center">
          <span className="mb-3 flex size-11 items-center justify-center rounded-xl border border-border bg-background"><ScanLine className="size-5 text-muted-foreground" aria-hidden="true" /></span>
          <p className="text-sm text-muted-foreground">Scan the page for WCAG text-contrast problems, or pick a single element to check.</p>
        </CardContent></Card>
      )}

      <div className="flex items-start gap-2.5 rounded-lg bg-secondary p-3.5 text-xs leading-relaxed text-muted-foreground">
        <Info className="mt-0.5 size-4" aria-hidden="true" />
        <p>Automated checks cover measurable text contrast and color-only links. A clean scan does not mean the page is accessible.</p>
      </div>
    </div>
  );
}
