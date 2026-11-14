import type { SimulationMode } from '../../shared/types';
import { BLUR, PRESETS, normalizeBlur } from './filters';

export interface SimulationSettings {
  readonly mode: SimulationMode;
  readonly blurPx: number;
}
export type SimulationStatus = 'idle' | 'active' | 'error';
export interface SimulatorState {
  readonly settings: SimulationSettings;
  readonly status: SimulationStatus;
  readonly error?: string;
}
export const DEFAULT_SETTINGS: SimulationSettings = Object.freeze({ mode: 'none', blurPx: BLUR.default });
export function validateMode(mode: SimulationMode): SimulationMode {
  if (!Object.hasOwn(PRESETS, mode)) throw new Error('Unknown simulation mode. Choose a listed mode or Reset.');
  return mode;
}
export { normalizeBlur };

/** Stable, deeply immutable snapshots support React's external-store contract. */
export function snapshot(settings: SimulationSettings, error?: string): SimulatorState {
  return Object.freeze({
    settings: Object.freeze({ ...settings }),
    status: error ? 'error' : settings.mode === 'none' ? 'idle' : 'active',
    ...(error ? { error } : {}),
  });
}
