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
  /** Rod monochromacy: every channel becomes relative luminance (Rec. 709 / sRGB weights).
   * Applied in linear RGB like the matrices above, so perceived lightness is preserved. */
  achromatopsia: { label: 'Achromatopsia', matrix: '0.2126 0.7152 0.0722 0 0  0.2126 0.7152 0.0722 0 0  0.2126 0.7152 0.0722 0 0  0 0 0 1 0' },
  blur: { label: 'Low Acuity' },
  /** Cataracts: hazy blur, reduced contrast, slightly washed-out and yellowed color
   * (symptoms per the U.S. National Eye Institute). An illustrative CSS approximation,
   * not a calibrated clinical model. */
  cataracts: { label: 'Cataracts', css: 'blur(1.5px) contrast(0.7) brightness(1.08) sepia(0.45) saturate(0.85)', halo: true },
  /** Reduced contrast sensitivity (common with age, glaucoma, diabetic eye disease):
   * light and dark areas move toward each other. Illustrative CSS approximation. */
  'low-contrast': { label: 'Low Contrast', css: 'contrast(0.5) brightness(1.15)' },
  visionless: { label: 'Visionless' },
} as const satisfies Record<SimulationMode, { label: string; matrix?: string; css?: string; halo?: boolean }>;
export const BLUR = { default: 2, min: 0, max: 8, step: 0.5 } as const;
export function normalizeBlur(value: number): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) throw new Error('Blur must be a finite number.');
  return Math.round(Math.max(BLUR.min, Math.min(BLUR.max, value)) / BLUR.step) * BLUR.step;
}
