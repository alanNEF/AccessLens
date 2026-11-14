import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import '../../src/styles/globals.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <section className="accesslens-ui w-80 space-y-2 bg-background p-4"><h1 className="text-lg font-semibold">AccessLens</h1><p className="text-sm text-muted-foreground">Simulator controls appear directly on supported HTTP and HTTPS pages. Refresh an open tab after reloading the extension.</p></section>
  </StrictMode>,
);
