import { useSyncExternalStore } from 'react';
import { Sparkles } from 'lucide-react';
import { Button } from '../../components/ui/button';
import type { InspectorStore } from '../inspector/inspector-store';
import type { FixerController } from './fixer-controller';

export function BulkCorrections({ controller, inspector }: { controller: FixerController; inspector: InspectorStore }) {
  const state = useSyncExternalStore(controller.bulk.subscribe, controller.bulk.getState);
  const inspected = useSyncExternalStore(inspector.subscribe, inspector.getState);
  const generating = state.phase === 'generating';
  const enabled = state.corrections.filter(item => item.enabled).length;
  const busy = generating || inspected.status === 'scanning' || inspected.picking;

  return (
    <section aria-label="Bulk contrast corrections" aria-busy={generating} className="space-y-3 rounded-lg border border-border p-3">
      <div>
        <h3 className="text-sm font-semibold">Correct detected contrast issues</h3>
        <p className="mt-1 text-xs text-muted-foreground">Generate temporary previews from Inspector’s current results.</p>
      </div>
      <Button type="button" className="w-full" disabled={busy} onClick={() => {
        const items = inspected.picked ? [inspected.picked, ...inspected.issues] : inspected.issues;
        void controller.bulk.run(items);
      }}><Sparkles aria-hidden="true" />{generating ? 'Generating corrections…' : 'Run All Corrections'}</Button>

      <p role="status" aria-live="polite" aria-atomic="true" className="text-xs text-muted-foreground">
        {generating ? 'Generating and validating supported corrections…'
          : state.phase === 'idle' ? 'Use Scan page in Inspector, then run all corrections.'
            : state.corrections.length === 0 ? 'No supported corrections are available. Use Scan page in Inspector for current results.'
              : `${enabled} of ${state.corrections.length} corrections enabled`}
      </p>

      {state.corrections.length > 0 && <>
        <h4 className="text-xs font-semibold">Generated Corrections</h4>
        <div className="flex flex-wrap gap-2">
          <Button type="button" size="sm" variant="outline" disabled={busy} onClick={() => controller.bulk.setAllEnabled(true)}>Select All</Button>
          <Button type="button" size="sm" variant="outline" disabled={busy} onClick={() => controller.bulk.setAllEnabled(false)}>Deselect All</Button>
          <Button type="button" size="sm" variant="outline" disabled={busy} onClick={() => controller.bulk.restore()}>Restore Original</Button>
        </div>
        <ul className="space-y-2">
          {state.corrections.map(item => <li key={item.id} className="rounded-md border border-border p-2.5">
            <label className="flex cursor-pointer items-start gap-2 text-xs font-medium">
              <input type="checkbox" checked={item.enabled} disabled={busy} onChange={event => controller.bulk.setEnabled(item.id, event.currentTarget.checked)}
                className="mt-0.5 size-4 shrink-0 accent-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring" />
              <span className="min-w-0 break-words">{item.issue.kind === 'link-color-only' ? 'Color-only link' : 'Low contrast'} — {item.issue.elementLabel}</span>
            </label>
            <div className="mt-2 space-y-1 pl-6 text-xs text-muted-foreground">
              <code className="block break-all">{item.issue.selector}</code>
              <p>Original: <code>{item.fix.originalValue}</code></p>
              <p>Suggested {item.fix.property}: <code>{item.fix.suggestedValue}</code></p>
              <p>{item.fix.property === 'text-decoration-line'
                ? (item.enabled ? 'Underline showing on the page' : 'Not applied · adds an underline')
                : item.enabled && item.measuredRatio !== undefined
                  ? `Measured ${item.measuredRatio.toFixed(2)}:1 — meets ${item.issue.requiredRatio}:1`
                  : `Not applied · target ${item.issue.requiredRatio}:1`}</p>
              {item.failure && <p role="alert" className="text-destructive">{item.failure}</p>}
            </div>
          </li>)}
        </ul>
      </>}
      {state.skipped > 0 && <p className="text-xs text-muted-foreground">{state.skipped} unsupported or manual-review {state.skipped === 1 ? 'result was' : 'results were'} skipped.</p>}
      {state.failures.length > 0 && <div className="space-y-2 text-xs">
        <p role="status" className="font-medium">{state.failures.length} {state.failures.length === 1 ? 'correction was' : 'corrections were'} unavailable:</p>
        <ul className="space-y-2 text-muted-foreground">{state.failures.map((failure, index) => <li key={`${failure.issue.id}:${index}`}>
          <strong className="font-medium">{failure.issue.elementLabel || failure.issue.selector}</strong>: {failure.message}
        </li>)}</ul>
      </div>}
    </section>
  );
}
