import { useSyncExternalStore } from 'react';
import { BookOpen, RotateCcw, Search } from 'lucide-react';
import { Button } from '../../components/ui/button';
import { Switch } from '../../components/ui/switch';
import type { FixerController } from '../fixer/fixer-controller';
import type { UserModeController } from './user-mode-controller';

export function UserMode({ controller, fixer }: { controller: UserModeController; fixer: FixerController }) {
  const state = useSyncExternalStore(controller.subscribe, controller.getState);
  const bulk = useSyncExternalStore(fixer.bulk.subscribe, fixer.bulk.getState);
  // What the automatic pass could not handle: corrections that failed, plus results needing a human.
  const notImproved = state.status === 'enabled' ? bulk.failures.length + bulk.skipped : 0;
  const total = state.count + notImproved;
  const share = total ? Math.round((state.count / total) * 100) : 0;
  return (
    <section aria-label="Accessibility improvements" className="space-y-3 px-4 py-5">
      <div className="rounded-2xl border border-ring/30 bg-accent p-4">
        <div className="flex items-center gap-3">
          <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-background/60"><BookOpen aria-hidden="true" className="size-5 text-accent-foreground" /></span>
          <div className="min-w-0 flex-1">
            <h2 id="user-mode-label" className="text-sm font-semibold">Easier reading</h2>
            <p className="mt-0.5 text-xs text-muted-foreground">Improves hard-to-read text on this page</p>
          </div>
          <Switch className="data-[state=checked]:border-ring data-[state=checked]:bg-ring" aria-label="Enable Accessibility Improvements" aria-describedby="user-mode-status" checked={state.enabled} onCheckedChange={controller.setEnabled} />
        </div>

        <div id="user-mode-status" role="status" aria-live="polite" aria-atomic="true" className="mt-4 text-sm">
          {state.status === 'disabled' && <p className="text-muted-foreground">Turn on to make text on this page easier to read. The page uses its original appearance.</p>}
          {state.status === 'scanning' && <p><Search aria-hidden="true" className="mr-2 inline size-4" />Checking this page for accessibility improvements...</p>}
          {state.status === 'enabled' && <>
            <p className="flex items-baseline gap-2"><span className="text-4xl leading-none font-bold tabular-nums">{state.count}</span><span>{state.count === 1 ? 'improvement' : 'improvements'} applied</span></p>
            <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-background/60" aria-hidden="true"><div className="h-full rounded-full bg-ring" style={{ width: `${share}%` }} /></div>
            {notImproved > 0 && <p className="mt-2 text-xs text-muted-foreground">{notImproved} couldn’t be improved automatically</p>}
          </>}
          {state.status === 'empty' && <p>No supported improvements were found on this page.</p>}
          {state.status === 'error' && <p>We couldn’t improve this page right now. Please try again.</p>}
        </div>
      </div>
      {state.status === 'error' && <Button className="w-full" onClick={() => controller.setEnabled(true)}>Try again</Button>}
      {state.enabled && <Button variant="outline" className="h-10 w-full" onClick={controller.restore}><RotateCcw aria-hidden="true" />Restore original page</Button>}
      <p className="text-xs leading-relaxed text-muted-foreground">Automatic improvements can’t fix every barrier. Switching to Dev restores the page.</p>
    </section>
  );
}
