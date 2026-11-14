import { useId, useSyncExternalStore } from 'react';
import type { SimulationMode } from '../../shared/types';
import type { SimulatorController } from './simulator-controller';
import type { SimulatorModeReader } from '../../shared/simulator-mode-reader';
import { PRESETS, BLUR } from './filters';

export function SimulatorTab({ controller, modeReader }: { controller: SimulatorController; modeReader: SimulatorModeReader }) {
  const state = useSyncExternalStore(controller.subscribe, controller.getState);
  const activeMode = useSyncExternalStore(modeReader.subscribeActiveMode, modeReader.getActiveMode);
  const { mode, blurPx } = state.settings;
  const intensityId = useId();
  return (
    <div>
      <p role="status" aria-live="polite" aria-atomic="true" className="simulator-status">Active: <strong>{PRESETS[activeMode].label}</strong></p>
      <fieldset className="simulator-modes">
        <legend>Vision mode</legend>
        <div className="simulator-controls">
          {(Object.keys(PRESETS) as SimulationMode[]).map(id => (
            <button key={id} type="button" aria-pressed={mode === id} onClick={() => controller.setMode(id)}>{PRESETS[id].label}</button>
          ))}
        </div>
      </fieldset>
      {mode === 'blur' && <div className="simulator-intensity">
        <label htmlFor={intensityId}>Low Acuity intensity <strong>{blurPx} px</strong></label>
        <input id={intensityId} type="range" min={BLUR.min} max={BLUR.max} step={BLUR.step} value={blurPx}
          aria-valuetext={`${blurPx} pixels of blur`}
          onChange={event => controller.setBlurPx(event.currentTarget.valueAsNumber)} />
        <div className="simulator-range-labels" aria-hidden="true"><span>0 px</span><span>8 px</span></div>
      </div>}
      <button type="button" className="simulator-reset" onClick={() => controller.reset()}>Reset</button>
      {state.error && <p role="alert" className="simulator-error">{state.error} Use Reset to return to Off.</p>}
      <p className="simulator-disclaimer">These simulations are approximations of visual barriers, not anyone’s lived experience. They do not determine whether a website is accessible.</p>
      <small>Only marked demo content is simulated. Other overlays stay unchanged.</small>
    </div>
  );
}
