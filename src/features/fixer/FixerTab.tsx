import { Sparkles } from 'lucide-react';
import { Card, CardContent } from '../../components/ui/card';

export function FixerTab() {
  return <div className="space-y-4">
    <div><h2 className="text-lg font-semibold tracking-tight">Preview a fix</h2><p className="mt-1 text-sm text-muted-foreground">Explore a clearer color choice in context.</p></div>
    <Card className="rounded-lg border-dashed bg-secondary/30 py-0 shadow-none"><CardContent className="flex flex-col items-center px-5 py-8 text-center">
      <span className="mb-4 flex size-11 items-center justify-center rounded-xl border border-border bg-background"><Sparkles className="size-5 text-muted-foreground" aria-hidden="true" /></span>
      <h3 className="mb-2 text-sm font-medium">Fix suggestions are not available yet</h3><p className="text-sm text-muted-foreground">Contrast suggestions and reversible style previews are still being built.</p>
    </CardContent></Card>
    <p className="text-xs leading-relaxed text-muted-foreground">Previewed changes will be temporary. Your website source is never edited by AccessLens.</p>
  </div>;
}
