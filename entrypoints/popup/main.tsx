import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import '../../src/styles/globals.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <section className="accesslens-panel"><h1>AccessLens</h1><p>Simulator controls appear directly on the demo page. Serve demo-site over HTTP and open it in a tab.</p></section>
  </StrictMode>,
);
