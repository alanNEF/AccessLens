import { useEffect, useId, useSyncExternalStore } from 'react';
import type { ImageIssue } from '../inspector/image-runner';
import type { FixerController } from './fixer-controller';
import { Button } from '../../components/ui/button';

/** Individual editing shares the bulk row's draft, enabled state and reversible preview. */
export function ImageAltFixer({ selectedImage, controller }: { selectedImage: ImageIssue; controller: FixerController }) {
  const inputId = useId();
  const state = useSyncExternalStore(controller.bulk.subscribe, controller.bulk.getState);
  const item = state.imageCorrections.find(item => item.issue.element === selectedImage.element);
  useEffect(() => { controller.bulk.ensureImage(selectedImage); }, [controller, selectedImage]);
  const busy = state.phase === 'generating';

  return (
    <section aria-label="Selected image correction" className="space-y-3 rounded-lg border border-border p-3">
      <h3 className="font-semibold">Fix image accessibility</h3>
      <p className="text-xs text-muted-foreground">Selected: {selectedImage.selector}</p>
      <label htmlFor={inputId} className="block text-sm font-medium">Alternative text</label>
      <textarea id={inputId} value={item?.text ?? ''} disabled={busy || !item} rows={3}
        onChange={event => { if (item) controller.bulk.setImageText(item.id, event.currentTarget.value); }}
        placeholder="Describe what this image communicates"
        className="w-full rounded-md border border-border bg-background p-2 text-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring" />
      <div className="flex gap-2">
        <Button type="button" disabled={busy || !item} onClick={() => { if (item) controller.bulk.setImageEnabled(item.id, true); }}>Preview alt text</Button>
        {item?.enabled && <Button type="button" variant="outline" onClick={() => controller.bulk.setImageEnabled(item.id, false)}>Revert</Button>}
      </div>
      {item?.failure && <p role="alert" className="text-xs text-destructive">{item.failure}</p>}
      {item?.enabled && <p role="status" className="text-xs">Alt text temporarily applied.</p>}
    </section>
  );
}
