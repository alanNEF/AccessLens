import { useId } from 'react';
import { SimulatorTab } from '../features/simulator/SimulatorTab';
import type { SimulatorController } from '../features/simulator/simulator-controller';
import { APP_NAME } from '../shared/constants';

export function AccessLensPanel({ controller }: { controller: SimulatorController }) {
  const tabId = useId();
  const panelId = useId();
  return (
    <section className="accesslens-panel" aria-label={APP_NAME}>
      <h1>{APP_NAME}</h1>
      <div role="tablist" aria-label="AccessLens features">
        <button role="tab" id={tabId} aria-selected="true" aria-controls={panelId} type="button">Simulator</button>
      </div>
      <div role="tabpanel" id={panelId} aria-labelledby={tabId}>
        <SimulatorTab controller={controller} />
      </div>
    </section>
  );
}
