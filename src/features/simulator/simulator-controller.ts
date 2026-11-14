import type { SimulationMode } from '../../shared/types';
import type { SimulationEngine } from './simulation-engine';
import { DEFAULT_SETTINGS, normalizeBlur, snapshot, validateMode, type SimulationSettings, type SimulatorState } from './simulator-state';

/** Sole owner of transient simulator state. Engine remains the sole DOM writer.
 * Only final applied snapshots are published: synchronous requests never expose
 * an unfulfilled mode. Read-only integration with other features is Phase 3.
 */
export function createSimulatorController(engine: SimulationEngine) {
  let state = snapshot(DEFAULT_SETTINGS);
  let disposed = false;
  const listeners = new Set<(state: SimulatorState) => void>();
  function publish(next: SimulatorState) {
    state = next;
    for (const listener of [...listeners]) listener(state);
  }
  function transition(settings: () => SimulationSettings) {
    if (disposed) return;
    let next: SimulatorState;
    try {
      const requested = settings();
      engine.apply(requested.mode, requested.blurPx);
      next = snapshot(requested);
    } catch (cause) {
      engine.reset();
      next = snapshot({ ...state.settings, mode: 'none' }, cause instanceof Error ? cause.message : 'Unable to apply simulation. Try Reset.');
    }
    publish(next);
  }
  return {
    getState: () => state,
    subscribe(listener: (state: SimulatorState) => void) {
      if (!disposed) listeners.add(listener);
      return () => { listeners.delete(listener); };
    },
    setMode(mode: SimulationMode) {
      transition(() => ({ ...state.settings, mode: validateMode(mode) }));
    },
    setBlurPx(value: number) {
      transition(() => ({ ...state.settings, blurPx: normalizeBlur(value) }));
    },
    reset() { transition(() => DEFAULT_SETTINGS); },
    dispose() {
      if (disposed) return;
      engine.dispose();
      disposed = true;
      publish(snapshot(DEFAULT_SETTINGS));
      listeners.clear();
    },
  };
}
export type SimulatorController = ReturnType<typeof createSimulatorController>;
