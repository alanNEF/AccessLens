import { useEffect, useId, useRef, useState, useSyncExternalStore } from 'react';
import { CircleAlert, CircleCheck, Copy, Info, RotateCcw, Sparkles } from 'lucide-react';
import { isVerifiedFailure, type SimulationMode } from '../../shared/types';
import type { SimulatorModeReader } from '../../shared/simulator-mode-reader';
import { Button } from '../../components/ui/button';
import { Card, CardContent } from '../../components/ui/card';
import { cn } from '../../components/shared/utils';
import type { FixerController } from './fixer-controller';
import type { FixerState } from './fixer-state';

// Local labels keep the Fixer independent of simulator internals.
const MODE_LABELS: Record<SimulationMode, string> = {
  none: 'Off', protanopia: 'Protanopia', deuteranopia: 'Deuteranopia', tritanopia: 'Tritanopia', blur: 'Low Acuity',
};

function statusText({ phase, view }: FixerState): string {
  if (phase === 'empty') return 'No issue selected';
  if (phase === 'unsupported') return 'No automatic fix for this issue';
  if (phase === 'ready') return 'Suggestion ready — not applied';
  return view === 'fixed' ? 'Previewing the suggested color' : 'Showing the original color';
}

function Swatch({ label, color, background, ratio }: { label: string; color: string; background: string; ratio: number }) {
  return (
    <figure className="m-0 space-y-2 rounded-lg border border-border p-2.5">
      <div className="flex h-12 items-center justify-center rounded-md border border-border text-xl font-semibold" style={{ color, background }} aria-hidden="true">Aa</div>
      <figcaption className="space-y-0.5 text-xs">
        <span className="block font-medium text-foreground">{label}</span>
        <code className="block font-mono text-muted-foreground">{color}</code>
        <span className="block tabular-nums text-muted-foreground">{ratio.toFixed(2)}:1</span>
      </figcaption>
    </figure>
  );
}

export function FixerTab({ controller, modeReader }: { controller: FixerController; modeReader: SimulatorModeReader }) {
  const state = useSyncExternalStore(controller.subscribe, controller.getState);
  const mode = useSyncExternalStore(modeReader.subscribeActiveMode, modeReader.getActiveMode);
  const [copyStatus, setCopyStatus] = useState('');
  const cssId = useId();
  const cssField = useRef<HTMLInputElement>(null);
  const { phase, issue, fix, view } = state;
  const declaration = fix ? `${fix.property}: ${fix.suggestedValue};` : '';
  // A copy message belongs to one declaration; clear it when the suggestion changes.
  useEffect(() => setCopyStatus(''), [declaration]);

  async function copyCss() {
    cssField.current?.select();
    try {
      await navigator.clipboard.writeText(declaration);
      setCopyStatus('Copied to clipboard.');
    } catch {
      // Clipboard API needs a secure, focused page; fall back to the selected field.
      setCopyStatus('Copy blocked on this page. The declaration is selected: press Ctrl+C (⌘C on Mac).');
    }
  }

  return (
    <div className="space-y-5">
      <div>
        <h2 className="mb-1 text-lg font-semibold tracking-tight">Preview a fix</h2>
        <p className="text-sm text-muted-foreground">Try a clearer text color on the page, then copy the CSS.</p>
      </div>

      <p role="status" aria-live="polite" aria-atomic="true" className="text-xs text-muted-foreground">
        Status: <strong className="font-medium text-foreground">{statusText(state)}</strong>
      </p>

      {phase === 'empty' && (
        <Card className="rounded-lg border-dashed bg-secondary/30 py-0 shadow-none"><CardContent className="flex flex-col items-center px-5 py-8 text-center">
          <span className="mb-4 flex size-11 items-center justify-center rounded-xl border border-border bg-background"><Sparkles className="size-5 text-muted-foreground" aria-hidden="true" /></span>
          <h3 className="mb-2 text-sm font-medium">No issue selected</h3>
          <p className="text-sm text-muted-foreground">Select a contrast failure in Inspector to see a suggested fix.</p>
        </CardContent></Card>
      )}

      {issue && (
        <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-sm">
          <dt className="font-medium">Element</dt>
          <dd className="m-0 min-w-0"><code className="font-mono text-xs break-all text-muted-foreground">{issue.selector}</code></dd>
          <dt className="font-medium">Requirement</dt>
          <dd className="m-0 text-muted-foreground">{issue.isLargeText ? 'Large' : 'Normal'} text needs {issue.requiredRatio}:1 (WCAG {issue.wcagCriterion} AA)</dd>
        </dl>
      )}

      {state.message && <p role="alert" className="rounded-lg border border-destructive p-3 text-sm text-destructive">{state.message}</p>}

      {issue && fix && isVerifiedFailure(issue) && (
        <>
          <div className="space-y-2">
            <div className="grid grid-cols-2 gap-2">
              <Swatch label="Current" color={fix.originalValue} background={issue.backgroundColor} ratio={fix.originalContrastRatio} />
              <Swatch label="Suggested" color={fix.suggestedValue} background={issue.backgroundColor} ratio={fix.expectedContrastRatio} />
            </div>
            <p className="text-xs text-muted-foreground">Changes the <code className="font-mono">{fix.property}</code> property only.</p>
          </div>

          {phase === 'ready' && (
            <Button type="button" className="w-full" onClick={() => controller.preview()}><Sparkles aria-hidden="true" />Preview fix</Button>
          )}

          {phase === 'previewing' && (
            <div className="space-y-3">
              <fieldset className="min-w-0">
                <legend className="mb-2 text-xs font-semibold tracking-wide text-muted-foreground uppercase">Compare</legend>
                <div className="grid grid-cols-2 gap-2">
                  {(['original', 'fixed'] as const).map(option => (
                    <Button key={option} type="button" variant="outline" aria-pressed={view === option}
                      onClick={() => (option === 'original' ? controller.showOriginal() : controller.showFixed())}
                      className={cn(view === option ? 'border-ring bg-accent text-accent-foreground hover:bg-accent hover:text-accent-foreground' : 'bg-background hover:bg-secondary')}>
                      {option === 'original' ? 'Original' : 'Fixed'}
                    </Button>
                  ))}
                </div>
              </fieldset>
              {state.measuredRatio !== undefined && (
                <p className={cn('flex items-start gap-2 rounded-lg border p-3 text-sm', state.meetsTarget ? 'border-border' : 'border-destructive text-destructive')}>
                  {state.meetsTarget ? <CircleCheck className="mt-0.5 size-4 shrink-0" aria-hidden="true" /> : <CircleAlert className="mt-0.5 size-4 shrink-0" aria-hidden="true" />}
                  <span>Measured on the page: <strong className="font-semibold tabular-nums">{state.measuredRatio.toFixed(2)}:1</strong> — {state.meetsTarget ? 'meets' : 'does not meet'} {issue.requiredRatio}:1</span>
                </p>
              )}
              <Button type="button" variant="outline" size="sm" onClick={() => controller.revert()}><RotateCcw className="size-3.5" aria-hidden="true" />Revert</Button>
            </div>
          )}

          <div className="space-y-2">
            <label htmlFor={cssId} className="block text-xs font-semibold tracking-wide text-muted-foreground uppercase">CSS declaration</label>
            <div className="flex gap-2">
              <input id={cssId} ref={cssField} readOnly value={declaration} onFocus={event => event.currentTarget.select()}
                className="h-8 min-w-0 flex-1 rounded-md border border-border bg-background px-2.5 font-mono text-xs outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50" />
              <Button type="button" variant="outline" size="sm" onClick={copyCss}><Copy className="size-3.5" aria-hidden="true" />Copy CSS</Button>
            </div>
            {copyStatus && <p role="status" className="text-xs text-muted-foreground">{copyStatus}</p>}
          </div>
        </>
      )}

      {mode !== 'none' && (
        <p className="rounded-lg border border-border bg-accent p-3 text-xs text-accent-foreground">
          Simulation active: <strong className="font-semibold">{MODE_LABELS[mode]}</strong>. Comparing keeps it on.
        </p>
      )}

      <div className="flex items-start gap-2.5 rounded-lg bg-secondary p-3.5 text-xs leading-relaxed text-muted-foreground">
        <Info className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
        <p><strong className="font-semibold text-foreground">Preview only — source code has not been changed.</strong> Add the declaration to your own stylesheet to make the fix permanent.</p>
      </div>
    </div>
  );
}
