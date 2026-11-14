import { useState } from 'react';
import { SimulatorTab } from '../features/simulator/SimulatorTab';
import { InspectorTab } from '../features/inspector/InspectorTab';
import { FixerTab } from '../features/fixer/FixerTab';
import { APP_NAME } from '../shared/constants';
import type { FeatureId } from '../shared/types';

export function AccessLensPanel() {
  const [feature, setFeature] = useState<FeatureId>('simulator');

  return (
    <section className="accesslens-panel" aria-label={APP_NAME}>
      <h1>{APP_NAME}</h1>
      <nav aria-label="Features">
        {(['simulator', 'inspector', 'fixer'] as const).map((id) => (
          <button
            key={id}
            type="button"
            aria-pressed={feature === id}
            onClick={() => setFeature(id)}
          >
            {id[0].toUpperCase() + id.slice(1)}
          </button>
        ))}
      </nav>
      {feature === 'simulator' && <SimulatorTab />}
      {feature === 'inspector' && <InspectorTab />}
      {feature === 'fixer' && <FixerTab />}
    </section>
  );
}
