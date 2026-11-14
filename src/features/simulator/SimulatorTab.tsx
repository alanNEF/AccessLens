import { useState } from 'react';
import type { SimulationEngine } from './simulation-engine';

import type { SimulationMode } from '../../shared/types';
import { PRESETS, BLUR } from './filters';

export function SimulatorTab({ engine }: { engine: SimulationEngine }) {
  const [mode, setMode] = useState<SimulationMode>('none');
  const [blurPx, setBlurPx] = useState<number>(BLUR.default);
  const [error, setError] = useState('');
  function select(next: SimulationMode, intensity = blurPx) {
    try {
      engine.apply(next, intensity);
      setMode(next);
      setError('');
    } catch (cause) {
      setMode('none');
      setError(cause instanceof Error ? cause.message : 'Unable to apply effect.');
    }
  }
  return (
    <div>
      <h2>Simulator · Phase 1 engine demo</h2>
      <p role="status">Active: {PRESETS[mode].label}</p>
      <div role="group" aria-label="Engine demo controls" className="spike-controls">
        {(Object.keys(PRESETS) as SimulationMode[]).map(id => (
          <button key={id} type="button" aria-pressed={mode === id} onClick={() => select(id)}>{PRESETS[id].label}</button>
        ))}
        <button type="button" onClick={() => { setBlurPx(BLUR.default); select('none'); }}>Reset</button>
      </div>
      {mode === 'blur' && <label>Low Acuity intensity: {blurPx} px
        <input type="range" min={BLUR.min} max={BLUR.max} step={BLUR.step} value={blurPx}
          onChange={event => { const value = event.currentTarget.valueAsNumber; setBlurPx(value); select('blur', value); }} />
      </label>}
      {error && <p role="alert">{error}</p>}
      <p>These simulations are approximations of visual barriers, not anyone’s lived experience. They do not determine whether a website is accessible.</p>
      <small>Only marked demo content is simulated. Other overlays stay unchanged. Temporary engine test controls; the production controller and UI are deferred.</small>
    </div>
  );
}
