import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { AccessLensPanel } from '../../src/components/AccessLensPanel';
import '../../src/styles/globals.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AccessLensPanel />
  </StrictMode>,
);
