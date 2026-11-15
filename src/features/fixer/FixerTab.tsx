import { useEffect, useId, useRef, useState, useSyncExternalStore, type CSSProperties, type ReactNode } from 'react';
import { ArrowLeftRight, ArrowRight, Check, ChevronLeft, ChevronRight, CircleAlert, CircleCheck, Copy, Info, ListChecks, Palette, RotateCcw, Wrench } from 'lucide-react';
import { isVerifiedFailure, type ContrastIssue, type SuggestedFix, type VerifiedContrastFailure } from '../../shared/types';
import type { SimulatorModeReader } from '../../shared/simulator-mode-reader';
import { Button } from '../../components/ui/button';
import { cn } from '../../components/shared/utils';
import type { FixerController } from './fixer-controller';
import { BulkCorrections } from './BulkCorrections';
import { ImageAltFixer } from './ImageAltFixer';
import type { ImageIssue } from '../inspector/image-runner';
import { modeName } from '../simulator/SimulatorTab';
import type { InspectorStore } from '../inspector/inspector-store';

const VISION_LABELS = { protanopia: 'Protanopia', deuteranopia: 'Deuteranopia', tritanopia: 'Tritanopia' } as const;

/** The primary action color: blue on navy (dark) and on white (light). */
const PRIMARY = 'bg-ring text-background hover:bg-ring/90';

function requirementText(issue: ContrastIssue): string {
  if (issue.kind === 'link-color-only') return `Links in text need an underline, or ${issue.requiredRatio}:1 against the surrounding text (WCAG 1.4.1)`;
  const level = issue.wcagCriterion === '1.4.6' ? 'AAA, enhanced' : 'AA';
  return `${issue.isLargeText ? 'Large' : 'Normal'} text needs ${issue.requiredRatio}:1 (WCAG ${issue.wcagCriterion} ${level})`;
}

/** One half of the big before/after preview. The ratio sits on a readable chip, never in the sample's own colors. */
function PreviewHalf({ label, ratio, sample, style }: { label: string; ratio?: number; sample: ReactNode; style: CSSProperties }) {
  return (
    <div className="flex min-h-[92px] flex-col justify-between p-3" style={style}>
      <div className="text-2xl leading-none font-bold">{sample}</div>
      <span className="mt-3 self-start rounded-md bg-background/90 px-1.5 py-0.5 text-[11px] font-medium text-foreground tabular-nums">
        {label}{ratio !== undefined ? ` · ${ratio.toFixed(2)} : 1` : ''}
      </span>
    </div>
  );
}

function BeforeAfter({ issue, fix, opacity = 1 }: { issue: VerifiedContrastFailure; fix: SuggestedFix; opacity?: number }) {
  const halves = fix.property === 'text-decoration-line'
    ? (['Now', 'Fixed'] as const).map(label => ({ label, ratio: undefined, style: { background: '#ffffff' },
      sample: <span className="text-lg font-medium" style={{ color: issue.textColor, textDecorationLine: label === 'Now' ? 'none' : 'underline' }}>link</span> }))
    : fix.property === 'background-color'
      ? [{ label: 'Now', ratio: fix.originalContrastRatio, style: { background: fix.originalValue, color: issue.textColor }, sample: 'Aa' },
        { label: 'Fixed', ratio: fix.expectedContrastRatio, style: { background: fix.suggestedValue, color: issue.textColor }, sample: 'Aa' }]
      : [{ label: 'Now', ratio: fix.originalContrastRatio, style: { background: issue.backgroundColor }, sample: <span style={{ color: fix.originalValue, opacity }}>Aa</span> },
        { label: 'Fixed', ratio: fix.expectedContrastRatio, style: { background: issue.backgroundColor }, sample: <span style={{ color: fix.suggestedValue, opacity }}>Aa</span> }];
  return (
    <div className="grid grid-cols-2 overflow-hidden rounded-xl border border-border" aria-hidden="true">
      {halves.map((half, index) => (
        <div key={half.label} className={cn(index === 1 && 'border-l-2 border-background')}><PreviewHalf {...half} /></div>
      ))}
    </div>
  );
}

export function FixerTab({ controller, modeReader, selectedImage, inspector }: {
  controller: FixerController;
  modeReader: SimulatorModeReader;
  /** An image picked with Fix image in Inspect: edited here instead of a contrast issue. */
  selectedImage: ImageIssue | null;
  inspector: InspectorStore;
}) {
  const state = useSyncExternalStore(controller.subscribe, controller.getState);
  const bulk = useSyncExternalStore(controller.bulk.subscribe, controller.bulk.getState);
  const inspected = useSyncExternalStore(inspector.subscribe, inspector.getState);
  const mode = useSyncExternalStore(modeReader.subscribeActiveMode, modeReader.getActiveMode);
  const { phase, issue, fix, view } = state;
  // The CSS rule to copy: this element's selector and the suggested declaration. Editable before copying.
  const rule = issue && fix ? `${issue.selector} {
  ${fix.property}: ${fix.suggestedValue};
}` : '';
  const [cssText, setCssText] = useState(rule);
  const [copied, setCopied] = useState(false);
  const [copyStatus, setCopyStatus] = useState('');
  const cssId = useId();
  const cssField = useRef<HTMLTextAreaElement>(null);
  const copiedTimer = useRef<ReturnType<typeof setTimeout>>(undefined);
  // A new suggestion starts from its own rule, with no leftover copy message.
  useEffect(() => { setCssText(rule); setCopied(false); setCopyStatus(''); }, [rule]);
  useEffect(() => () => clearTimeout(copiedTimer.current), []);

  // Step through the Inspector's verified failures (‹ 1 of 7 ›).
  const failures = inspected.issues.filter(item => isVerifiedFailure(item.issue));
  const index = issue ? failures.findIndex(item => item.issue.id === issue.id) : -1;
  const go = (step: number) => {
    const next = failures[(index + step + failures.length) % failures.length];
    if (next) controller.selectIssue(next.issue, next.element);
  };

  async function copyCss() {
    clearTimeout(copiedTimer.current);
    try {
      await navigator.clipboard.writeText(cssText);
      setCopied(true);
      setCopyStatus('Fix copied to the clipboard');
      // The tick shows for 2 seconds, then the copy icon returns.
      copiedTimer.current = setTimeout(() => { setCopied(false); setCopyStatus(''); }, 2000);
    } catch {
      // Clipboard API needs a secure, focused page; fall back to selecting the field.
      setCopied(false);
      setCopyStatus('Copy blocked on this page. The fix is selected: press Ctrl+C (⌘C on Mac).');
      cssField.current?.focus();
      cssField.current?.select();
    }
  }

  return (
    <div className="space-y-3">
      {bulk.phase !== 'idle' && <BulkCorrections controller={controller} inspector={inspector} />}
      <FixAll controller={controller} inspector={inspector} />

      {selectedImage && <ImageAltFixer selectedImage={selectedImage} controller={controller} />}

      {!selectedImage && <>

      <p role="status" aria-live="polite" aria-atomic="true" className="sr-only">
        {phase === 'empty' ? 'No issue selected' : phase === 'unsupported' ? 'No automatic fix for this issue' : phase === 'ready' ? 'Suggestion ready, not applied' : view === 'fixed' ? 'Previewing the fix' : 'Showing the original'}
      </p>

      {phase === 'empty' && bulk.phase === 'idle' && (
        <div className="flex flex-col items-center rounded-xl border border-dashed border-border px-5 py-8 text-center">
          <span className="mb-3 flex size-11 items-center justify-center rounded-xl bg-secondary"><Wrench className="size-5 text-muted-foreground" aria-hidden="true" /></span>
          <h3 className="mb-1 text-sm font-medium">No issue selected</h3>
          <p className="text-sm text-muted-foreground">Pick a failure in Inspect, or fix everything at once with Fix all.</p>
        </div>
      )}

      {issue && (
        <div>
          <div className="flex items-center gap-2">
            <span className={cn('shrink-0 rounded-full px-2 py-0.5 text-[11px] font-medium', isVerifiedFailure(issue) ? 'bg-destructive/15 text-destructive' : 'bg-secondary text-muted-foreground')}>
              {isVerifiedFailure(issue) ? 'Fail' : 'Review'}
            </span>
            <h3 className="min-w-0 flex-1 truncate text-sm font-semibold" title={issue.selector}>{issue.elementLabel || issue.selector}</h3>
            {index >= 0 && failures.length > 1 && <>
              <span className="shrink-0 text-xs text-muted-foreground tabular-nums">{index + 1} of {failures.length}</span>
              <Button type="button" variant="ghost" size="icon-xs" aria-label="Previous issue" onClick={() => go(-1)}><ChevronLeft aria-hidden="true" /></Button>
              <Button type="button" variant="ghost" size="icon-xs" aria-label="Next issue" onClick={() => go(1)}><ChevronRight aria-hidden="true" /></Button>
            </>}
          </div>
          <p className="mt-1 text-xs text-muted-foreground">{requirementText(issue)}</p>
        </div>
      )}

      {state.message && <p role="alert" className="rounded-lg border border-destructive p-3 text-sm text-destructive">{state.message}</p>}

      {issue && fix && isVerifiedFailure(issue) && (
        <>
          <BeforeAfter issue={issue} fix={fix} opacity={state.opacity} />

          {fix.property !== 'text-decoration-line' && (
            <p className="flex items-center gap-2 font-mono text-xs text-muted-foreground">
              <span>{fix.originalValue}</span>
              <ArrowRight className="size-3.5" aria-label="changes to" />
              <span className="size-3.5 rounded-sm border border-border" style={{ background: fix.suggestedValue }} aria-hidden="true" />
              <span className="text-foreground">{fix.suggestedValue}</span>
              <span className="ml-auto font-sans">{fix.property}</span>
            </p>
          )}

          {(fix.simulatedRatios || fix.source === 'site-palette' || state.alternative || (state.opacity ?? 1) < 1) && (
            <ul className="divide-y divide-border overflow-hidden rounded-xl border border-border text-sm">
              {fix.simulatedRatios && (
                <li className="flex items-center gap-2.5 px-3 py-2.5">
                  {fix.colorBlindSafe
                    ? <CircleCheck className="size-4 shrink-0 text-emerald-600 dark:text-emerald-400" aria-hidden="true" />
                    : <CircleAlert className="size-4 shrink-0 text-destructive" aria-hidden="true" />}
                  <span className="flex-1">{fix.colorBlindSafe ? 'Color-blind safe' : 'Not safe for every color-vision type'}</span>
                  <span className="text-xs text-muted-foreground tabular-nums">
                    {(Object.keys(VISION_LABELS) as (keyof typeof VISION_LABELS)[]).map((check, i) => {
                      const ratio = fix.simulatedRatios?.[check];
                      return ratio === undefined ? null : <span key={check}>{i > 0 && ' · '}<span className="sr-only">{VISION_LABELS[check]} </span><span className={ratio < issue.requiredRatio ? 'text-destructive' : undefined}>{ratio.toFixed(2)}</span></span>;
                    })}
                  </span>
                </li>
              )}
              {(fix.source === 'site-palette' || state.alternative?.source === 'site-palette') && (
                <li className="flex items-center gap-2.5 px-3 py-2.5">
                  <Palette className="size-4 shrink-0 text-violet-600 dark:text-violet-300" aria-hidden="true" />
                  <span className="flex-1">{fix.source === 'site-palette' ? 'This site’s own color' : 'A site color also works'}</span>
                  {state.alternative && (
                    <button type="button" className="text-xs font-medium text-ring hover:underline" onClick={() => controller.useAlternative()}>
                      Use {state.alternative.suggestedValue}
                    </button>
                  )}
                </li>
              )}
              {fix.source !== 'site-palette' && state.alternative && state.alternative.source !== 'site-palette' && (
                <li className="flex items-center gap-2.5 px-3 py-2.5">
                  <Palette className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
                  <span className="flex-1">Another option</span>
                  <button type="button" className="text-xs font-medium text-ring hover:underline" onClick={() => controller.useAlternative()}>Use {state.alternative.suggestedValue}</button>
                </li>
              )}
              {(state.opacity ?? 1) < 1 && (
                <li className="flex items-start gap-2.5 px-3 py-2.5 text-xs text-muted-foreground">
                  <Info className="mt-px size-4 shrink-0" aria-hidden="true" />
                  <span>Drawn at {Math.round((state.opacity ?? 1) * 100)}% opacity, so ratios are measured as drawn. Raising the opacity also works.</span>
                </li>
              )}
            </ul>
          )}

          {phase === 'previewing' && (state.measuredRatio !== undefined || (fix.property === 'text-decoration-line' && state.meetsTarget !== undefined && view === 'fixed')) && (
            <p className={cn('flex items-start gap-2 rounded-lg border p-2.5 text-sm', state.meetsTarget ? 'border-border' : 'border-destructive text-destructive')}>
              {state.meetsTarget ? <CircleCheck className="mt-0.5 size-4 shrink-0 text-emerald-600 dark:text-emerald-400" aria-hidden="true" /> : <CircleAlert className="mt-0.5 size-4 shrink-0" aria-hidden="true" />}
              {state.measuredRatio !== undefined
                ? <span>Measured on the page: <strong className="font-semibold tabular-nums">{state.measuredRatio.toFixed(2)}:1</strong> — {state.meetsTarget ? 'meets' : 'does not meet'} {issue.requiredRatio}:1</span>
                : <span>{state.meetsTarget ? 'The link is now underlined, so it no longer relies on color.' : 'The page did not show the underline.'}</span>}
            </p>
          )}

          <div className="flex gap-2">
            {phase === 'previewing' ? (
              <>
                <div role="group" aria-label="Compare" className="flex flex-1 rounded-lg bg-secondary p-0.5">
                  {(['original', 'fixed'] as const).map(option => (
                    <button key={option} type="button" aria-pressed={view === option}
                      onClick={() => (option === 'original' ? controller.showOriginal() : controller.showFixed())}
                      className={cn('flex-1 rounded-md py-1.5 text-sm font-medium transition-colors', view === option ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground')}>
                      {option === 'original' ? 'Original' : 'Fixed'}
                    </button>
                  ))}
                </div>
                <Button type="button" variant="outline" className="h-auto" onClick={() => controller.revert()}><RotateCcw className="size-3.5" aria-hidden="true" />Revert</Button>
              </>
            ) : (
              <>
                <Button type="button" className={cn('h-10 flex-1', PRIMARY)} onClick={() => controller.preview()}><Wrench aria-hidden="true" />Preview fix</Button>
                <Button type="button" variant="outline" className="size-10" aria-label="Compare original and fixed" onClick={() => { controller.preview(); controller.showOriginal(); }}><ArrowLeftRight aria-hidden="true" /></Button>
              </>
            )}
          </div>

          <div className="space-y-2 rounded-xl border border-border p-3">
            <div className="flex items-baseline justify-between gap-2">
              <label htmlFor={cssId} className="text-sm font-medium">Copy fix</label>
              <span className="text-xs text-muted-foreground">Paste it into your stylesheet</span>
            </div>
            <div className="flex items-start gap-2">
              <textarea id={cssId} ref={cssField} value={cssText} onChange={event => setCssText(event.currentTarget.value)} rows={3} spellCheck={false}
                className="min-w-0 flex-1 resize-y rounded-md border border-border bg-background px-2.5 py-2 font-mono text-xs leading-relaxed outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50" />
              <Button type="button" variant="outline" className="relative size-10 shrink-0" aria-label={copied ? 'Copied' : 'Copy fix'} onClick={copyCss}>
                <Copy aria-hidden="true" className={cn('absolute transition-all duration-200 motion-reduce:transition-none', copied ? 'scale-50 opacity-0' : 'scale-100 opacity-100')} />
                <Check aria-hidden="true" className={cn('absolute text-emerald-600 transition-all duration-200 motion-reduce:transition-none dark:text-emerald-400', copied ? 'scale-100 opacity-100' : 'scale-50 opacity-0')} />
              </Button>
            </div>
            <p role="status" aria-live="polite" className={cn('text-xs', copyStatus ? 'text-muted-foreground' : 'sr-only')}>{copyStatus}</p>
          </div>
          <p className="text-xs text-muted-foreground">Preview only — your source code isn’t changed. Copy the fix into your stylesheet to keep it.</p>
        </>
      )}

      </>}

      {mode !== 'none' && issue && !selectedImage && <p className="text-xs text-muted-foreground">Simulation on: <strong className="font-medium text-foreground">{modeName(mode)}</strong>. Comparing keeps it on.</p>}
    </div>
  );
}

/** Fixes every verified failure at once, scanning the page first if Inspect hasn't yet. */
function FixAll({ controller, inspector }: { controller: FixerController; inspector: InspectorStore }) {
  const bulk = useSyncExternalStore(controller.bulk.subscribe, controller.bulk.getState);
  const inspected = useSyncExternalStore(inspector.subscribe, inspector.getState);
  const generating = bulk.phase === 'generating';
  const scanning = inspected.status === 'scanning';
  const scanned = inspected.status === 'done';
  const count = inspected.issues.filter(item => isVerifiedFailure(item.issue)).length;
  const images = inspected.imageIssues.length;
  // Same count as the list above: contrast fixes plus image descriptions.
  const items = [...bulk.corrections, ...bulk.imageCorrections];
  const enabled = items.filter(item => item.enabled).length;
  const allFixed = bulk.phase === 'ready' && items.length > 0 && enabled === items.length;

  async function fixAll() {
    if (!scanned) await inspector.scan();
    const latest = inspector.getState();
    if (latest.status !== 'done') return; // scan failed: Inspect shows the error
    // Images can't be described automatically: they join the list for you to write their alt text.
    await controller.bulk.run(latest.picked ? [latest.picked, ...latest.issues] : latest.issues, 'developer', { imageIssues: latest.imageIssues });
  }

  return (
    <Button type="button" className={cn('h-10 w-full', PRIMARY)} aria-label="Fix All" disabled={generating || scanning || inspected.picking || (scanned && count === 0 && images === 0)}
      onClick={() => { void fixAll(); }}>
      <ListChecks aria-hidden="true" />
      {scanning ? 'Scanning the page…' : generating ? 'Fixing…'
        : allFixed ? `All ${enabled} fixed · Fix all again`
          : scanned && count === 0 ? (images ? 'Add image descriptions' : 'No contrast failures to fix')
            : `Fix all${scanned ? ` ${count} ${count === 1 ? 'issue' : 'issues'}` : ''}`}
    </Button>
  );
}
