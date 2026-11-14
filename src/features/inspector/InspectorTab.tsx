import { ScanLine } from 'lucide-react';
import { Card, CardContent } from '../../components/ui/card';

export function InspectorTab() {
  return <div className="space-y-4">
    <div><h2 className="text-lg font-semibold tracking-tight">Inspect contrast</h2><p className="mt-1 text-sm text-muted-foreground">Understand what makes text hard to read.</p></div>
    <Card className="rounded-lg border-dashed bg-secondary/30 py-0 shadow-none"><CardContent className="flex flex-col items-center px-5 py-8 text-center">
      <span className="mb-4 flex size-11 items-center justify-center rounded-xl border border-border bg-background"><ScanLine className="size-5 text-muted-foreground" aria-hidden="true" /></span>
      <h3 className="mb-2 text-sm font-medium">Inspector is not available yet</h3><p className="text-sm text-muted-foreground">Text contrast scanning and element inspection are still being built.</p>
    </CardContent></Card>
    <p className="text-xs leading-relaxed text-muted-foreground">Simulations are visual approximations, not accessibility measurements.</p>
  </div>;
}
