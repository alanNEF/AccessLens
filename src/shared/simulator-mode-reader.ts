import type { SimulationMode } from './types';

/** Applied rendering context only. A simulation is never a detected issue. */
export interface SimulatorModeReader {
  readonly getActiveMode: () => SimulationMode;
  /** Emits changes only, not an initial value. Unsubscribe on consumer teardown. */
  readonly subscribeActiveMode: (listener: (mode: SimulationMode) => void) => () => void;
}

/** Runtime capability boundary: consumers receive no commands or mutable state. */
export function createSimulatorModeReader(source: SimulatorModeReader): SimulatorModeReader {
  return Object.freeze({
    getActiveMode: () => source.getActiveMode(),
    subscribeActiveMode: (listener: (mode: SimulationMode) => void) => source.subscribeActiveMode(listener),
  });
}
