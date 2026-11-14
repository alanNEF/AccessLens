import { SimulatorTab } from '../features/simulator/SimulatorTab';
import type { SimulationEngine } from '../features/simulator/simulation-engine';
import { APP_NAME } from '../shared/constants';

export function AccessLensPanel({ engine }: { engine: SimulationEngine }) {
  return (
    <section className="accesslens-panel" aria-label={APP_NAME}>
      <h1>{APP_NAME}</h1>
      <SimulatorTab engine={engine} />
    </section>
  );
}
