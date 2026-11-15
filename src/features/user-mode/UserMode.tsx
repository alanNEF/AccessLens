import { useSyncExternalStore } from 'react';
import { Check, Search, Sparkles } from 'lucide-react';
import { Button } from '../../components/ui/button';
import { Switch } from '../../components/ui/switch';
import type { UserModeController } from './user-mode-controller';

export function UserMode({ controller }: { controller: UserModeController }) {
  const state = useSyncExternalStore(controller.subscribe, controller.getState);
  return (
    <section aria-label="Accessibility improvements" className="space-y-5 px-5 py-6">
      <div className="flex items-center gap-3">
        <span className="rounded-lg bg-secondary p-2"><Sparkles aria-hidden="true" className="size-5" /></span>
        <div className="flex-1">
          <h2 id="user-mode-label" className="text-sm font-semibold">Accessibility Improvements</h2>
          <p className="mt-1 text-xs text-muted-foreground">Make text easier to read on this page.</p>
        </div>
        <Switch aria-label="Enable Accessibility Improvements" aria-describedby="user-mode-status" checked={state.enabled} onCheckedChange={controller.setEnabled} />
      </div>
      <div id="user-mode-status" role="status" aria-live="polite" aria-atomic="true" className="rounded-lg border border-border bg-secondary/40 p-4 text-sm leading-relaxed">
        {state.status === 'disabled' && <p>Accessibility improvements are turned off. The page uses its original appearance.</p>}
        {state.status === 'scanning' && <p><Search aria-hidden="true" className="mr-2 inline size-4" />Checking this page for accessibility improvements...</p>}
        {state.status === 'enabled' && <><p className="font-medium"><Check aria-hidden="true" className="mr-2 inline size-4" />Accessibility improvements active</p><p className="mt-2">{state.count} {state.count === 1 ? 'improvement' : 'improvements'} applied to this page.</p></>}
        {state.status === 'empty' && <p>No supported improvements were found on this page.</p>}
        {state.status === 'error' && <p>We couldn’t improve this page right now. Please try again.</p>}
      </div>
      {state.status === 'error' && <Button onClick={() => controller.setEnabled(true)}>Try again</Button>}
      {state.enabled && <Button variant="outline" className="w-full" onClick={controller.restore}>Restore Original Page</Button>}
      <p className="text-xs leading-relaxed text-muted-foreground">Temporary changes for this page only. Automated improvements can’t address every accessibility barrier. Switching to Developer restores the page.</p>
    </section>
  );
}
