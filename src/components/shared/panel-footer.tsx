import type { ReactNode } from 'react';

/** The bottom status bar every panel screen shares. */
export function PanelFooter({ children }: { children: ReactNode }) {
  return <footer className="flex shrink-0 items-center gap-2 bg-secondary/50 px-4 py-2.5 text-xs text-muted-foreground">{children}</footer>;
}
