import type { SimulationMode } from '../../shared/types';

/** Machado, Oliveira & Fernandes (2009), severity 1.0 (dichromacy).
 * Author tables: https://www.inf.ufrgs.br/~oliveira/pubs_files/CVD_Simulation/CVD_Simulation.html
 * Rows operate on linear RGB, preserve alpha, and use no severity interpolation.
 * The SVG filter declares sRGB; its matrix stage explicitly uses linearRGB to
 * perform the model's required decoding/encoding at the SVG pipeline boundary.
 */
export const PRESETS = {
  none: { label: 'Off' },
  protanopia: { label: 'Protanopia', matrix: '0.152286 1.052583 -0.204868 0 0  0.114503 0.786281 0.099216 0 0  -0.003882 -0.048116 1.051998 0 0  0 0 0 1 0' },
  deuteranopia: { label: 'Deuteranopia', matrix: '0.367322 0.860646 -0.227968 0 0  0.280085 0.672501 0.047413 0 0  -0.011820 0.042940 0.968881 0 0  0 0 0 1 0' },
  tritanopia: { label: 'Tritanopia', matrix: '1.255528 -0.076749 -0.178779 0 0  -0.078411 0.930809 0.147602 0 0  0.004733 0.691367 0.303900 0 0  0 0 0 1 0' },
  blur: { label: 'Low Acuity' },
} as const satisfies Record<SimulationMode, { label: string; matrix?: string }>;
export const BLUR = { default: 2, min: 0, max: 8, step: 0.5 } as const;
export function normalizeBlur(value: number): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) throw new Error('Blur must be a finite number.');
  return Math.round(Math.max(BLUR.min, Math.min(BLUR.max, value)) / BLUR.step) * BLUR.step;
}
