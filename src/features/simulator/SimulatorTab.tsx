import { useState } from 'react';
import type { SimulationEngine, SpikeMode } from './simulation-engine';

export function SimulatorTab({ engine }: { engine: SimulationEngine }) {
  const [mode, setMode] = useState<SpikeMode>('none');
  const [error, setError] = useState('');
  function select(next: SpikeMode) {
    try {
      engine.apply(next);
      setMode(next);
      setError('');
    } catch (cause) {
      setMode('none');
      setError(cause instanceof Error ? cause.message : 'Unable to apply effect.');
    }
  }
  return (
    <div>
      <h2>Simulator · Phase 0</h2>
      <p role="status">Active: {mode === 'none' ? 'Off' : mode === 'blur' ? 'Blur (2 px)' : 'Protanopia (approximation)'}</p>
      <div role="group" aria-label="Simulation proof of concept" className="spike-controls">
        <button type="button" aria-pressed={mode === 'none'} onClick={() => select('none')}>Off</button>
        <button type="button" aria-pressed={mode === 'protanopia'} onClick={() => select('protanopia')}>Protanopia</button>
        <button type="button" aria-pressed={mode === 'blur'} onClick={() => select('blur')}>Blur (2 px)</button>
        <button type="button" onClick={() => select('none')}>Reset</button>
      </div>
      {error && <p role="alert">{error}</p>}
      <p>These simulations are approximations of visual barriers, not anyone’s lived experience. They do not determine whether a website is accessible.</p>
      <small>Only marked demo content is simulated. Other overlays stay unchanged. Presets and intensity controls follow after feasibility testing.</small>
    </div>
  );
}
