import { useSyncExternalStore } from 'react';
import { CircleCheck, CircleHelp, CircleX, Crosshair, ExternalLink, Info, LocateFixed, ScanLine, Sparkles, X } from 'lucide-react';
import type { InspectorStore } from './inspector-store';
import type { InspectedIssue } from './axe-runner';
import { explainIssue, formatRatio } from './contrast-mapping';
import { revealElement } from './element-highlighter';
import type { SimulatorModeReader } from '../../shared/simulator-mode-reader';
import { isVerifiedFailure, type ContrastStatus } from '../../shared/types';
import { Button } from '../../components/ui/button';
import { Card, CardContent } from '../../components/ui/card';
import { cn } from '../../components/shared/utils';

const WCAG_LINK = 'https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum.html';

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
  return contrastRatio === null ? `Needs ${requiredRatio}:1` : `${formatRatio(contrastRatio)}:1 · needs ${requiredRatio}:1`;
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
        {issue.textColor && issue.backgroundColor && (
          // Intentionally rendered in the page's own (possibly failing) colors so the problem is visible.
          <div className="rounded-md border border-border px-3 py-2 text-lg" style={{ color: issue.textColor, background: issue.backgroundColor }} aria-hidden="true">
            Aa Sample text
          </div>
        )}
        <div className="grid grid-cols-2 gap-3">
          <Swatch label="Text" color={issue.textColor} />
          <Swatch label="Background" color={issue.backgroundColor} />
        </div>
        <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-xs">
          <dt className="text-muted-foreground">Contrast</dt>
          <dd className="font-medium tabular-nums">{issue.contrastRatio === null ? 'Could not be measured' : `${formatRatio(issue.contrastRatio)}:1`}</dd>
          <dt className="text-muted-foreground">Required</dt>
          <dd className="font-medium">{issue.requiredRatio}:1 · {issue.isLargeText ? 'large text' : 'normal text'} (WCAG AA)</dd>
          <dt className="text-muted-foreground">Selector</dt>
          <dd className="min-w-0 font-mono break-all">{issue.selector}</dd>
        </dl>
        <p className="text-xs leading-relaxed text-muted-foreground">
          {explainIssue(issue)}{' '}
          <a href={WCAG_LINK} target="_blank" rel="noreferrer" className="inline-flex items-center gap-0.5 font-medium text-accent-foreground underline underline-offset-2">
            WCAG 1.4.3<ExternalLink className="size-3" aria-hidden="true" /><span className="sr-only"> (opens in a new tab)</span>
          </a>
        </p>
        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="outline" size="sm" onClick={() => revealElement(item.element)}>
            <LocateFixed className="size-3.5" aria-hidden="true" />Show on page
          </Button>
          {fixable && (
            <Button type="button" size="sm" onClick={() => onPreviewFix(item)}>
              <Sparkles className="size-3.5" aria-hidden="true" />Preview fix
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

export function InspectorTab({ store, modeReader, onPreviewFix }: {
  store: InspectorStore;
  modeReader: SimulatorModeReader;
  onPreviewFix: (item: InspectedIssue) => void;
}) {
  const state = useSyncExternalStore(store.subscribe, store.getState);
  const simulationMode = useSyncExternalStore(modeReader.subscribeActiveMode, modeReader.getActiveMode);
  const failures = state.issues.filter(item => item.issue.status === 'failed');
  const reviews = state.issues.filter(item => item.issue.status === 'needs-review');
  const selected = store.getSelected();
  const scanning = state.status === 'scanning';
  const hasResults = state.issues.length > 0 || state.picked !== null;
  const select = (item: InspectedIssue) => { store.select(item.issue.id); revealElement(item.element); };

  let statusText = '';
  if (state.picking) statusText = 'Click any text on the page to check it. Press Esc to cancel.';
  else if (state.status === 'done') statusText = failures.length || reviews.length
    ? `${failures.length} contrast ${failures.length === 1 ? 'failure' : 'failures'} · ${reviews.length} need manual review`
    : 'No measurable contrast failures found.';

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-lg font-semibold tracking-tight">Inspect contrast</h2>
        <p className="mt-1 text-sm text-muted-foreground">Find text that is hard to read and see why.</p>
      </div>

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

      <IssueList title="Failures" items={failures} selectedId={state.selectedId} onSelect={select} />
      <IssueList title="Needs manual review" items={reviews} selectedId={state.selectedId} onSelect={select} />

      {state.status === 'idle' && !state.picked && !state.picking && (
        <Card className="rounded-lg border-dashed bg-secondary/30 py-0 shadow-none"><CardContent className="flex flex-col items-center px-5 py-6 text-center">
          <span className="mb-3 flex size-11 items-center justify-center rounded-xl border border-border bg-background"><ScanLine className="size-5 text-muted-foreground" aria-hidden="true" /></span>
          <p className="text-sm text-muted-foreground">Scan the page for WCAG text-contrast problems, or pick a single element to check.</p>
        </CardContent></Card>
      )}

      <div className="flex items-start gap-2.5 rounded-lg bg-secondary p-3.5 text-xs leading-relaxed text-muted-foreground">
        <Info className="mt-0.5 size-4" aria-hidden="true" />
        <p>Automated checks only cover measurable text contrast. A clean scan does not mean the page is accessible.</p>
      </div>
    </div>
  );
}
