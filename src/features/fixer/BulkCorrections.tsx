import { useId, useSyncExternalStore } from 'react';
import { Button } from '../../components/ui/button';
import type { InspectorStore } from '../inspector/inspector-store';
import type { FixerController } from './fixer-controller';
import type { BulkImageCorrection } from './bulk-corrections';

function ImageCorrectionRow({ item, controller, busy }: { item: BulkImageCorrection; controller: FixerController; busy: boolean }) {
  const inputId = useId();
  return <li className="rounded-md border border-border p-2.5">
    <label className="flex cursor-pointer items-start gap-2 text-xs font-medium">
      <input type="checkbox" checked={item.enabled} disabled={busy}
        onChange={event => controller.bulk.setImageEnabled(item.id, event.currentTarget.checked)}
        className="mt-0.5 size-4 shrink-0 accent-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring" />
      <span className="min-w-0 break-all">Image alternative text — {item.issue.selector}</span>
    </label>
    <div className="mt-2 space-y-2 pl-6 text-xs text-muted-foreground">
      <label htmlFor={inputId} className="block font-medium text-foreground">Alternative text for {item.issue.selector}</label>
      <textarea id={inputId} value={item.text} disabled={busy} rows={3}
        onChange={event => controller.bulk.setImageText(item.id, event.currentTarget.value)}
        placeholder="Describe what this image communicates"
        className="w-full rounded-md border border-border bg-background p-2 text-sm text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring" />
      <p>{item.enabled ? 'Alt text temporarily applied on the page' : 'Enter a description, then select this correction to preview it.'}</p>
      {item.failure && <p role="alert" className="text-destructive">{item.failure}</p>}
    </div>
  </li>;
}

export function BulkCorrections({ controller, inspector }: { controller: FixerController; inspector: InspectorStore }) {
  const state = useSyncExternalStore(controller.bulk.subscribe, controller.bulk.getState);
  const inspected = useSyncExternalStore(inspector.subscribe, inspector.getState);
  const generating = state.phase === 'generating';
  const enabled = state.corrections.filter(item => item.enabled).length + state.imageCorrections.filter(item => item.enabled).length;
  const total = state.corrections.length + state.imageCorrections.length;
  const busy = generating || inspected.status === 'scanning' || inspected.picking;

  return (
    <section aria-label="Bulk corrections" aria-busy={generating} className="space-y-3 rounded-xl border border-border p-3">
      <h3 className="text-sm font-semibold">All corrections</h3>
      <p role="status" aria-live="polite" aria-atomic="true" className="text-xs text-muted-foreground">
        {generating ? 'Generating and validating supported corrections…'
          : state.phase === 'idle' ? 'Use Fix all to correct every failure at once.'
            : total === 0 ? 'No supported corrections are available. Use Scan page in Inspector for current results.'
              : `${enabled} of ${total} corrections enabled`}
      </p>
      {state.imageCorrections.length > 0 && <p className="text-xs text-muted-foreground">Image descriptions need your input: type one, then tick the image to preview it.</p>}

      {total > 0 && <>
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
          {state.imageCorrections.map(item => <ImageCorrectionRow key={item.id} item={item} controller={controller} busy={busy} />)}
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
