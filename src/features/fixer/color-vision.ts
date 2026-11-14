import { PRESETS } from '../simulator/filters';

/**
 * Color-vision checks for Fixer suggestions. Reuses the Simulator's own
 * Machado et al. (2009) dichromacy matrices, so "safe under Deuteranopia" here
 * means exactly what the Deuteranopia simulation shows.
 */
export const VISION_CHECKS = ['protanopia', 'deuteranopia', 'tritanopia'] as const;
export type VisionCheck = (typeof VISION_CHECKS)[number];
export type SimulatedRatios = Readonly<Record<VisionCheck, number>>;

/** First three rows × first three columns of the SVG feColorMatrix (alpha column dropped). */
function matrixOf(check: VisionCheck): number[][] {
  const values = PRESETS[check].matrix.trim().split(/\s+/).map(Number);
  return [0, 1, 2].map(row => values.slice(row * 5, row * 5 + 3));
}
const MATRICES: Readonly<Record<VisionCheck, number[][]>> = Object.freeze({
  protanopia: matrixOf('protanopia'),
  deuteranopia: matrixOf('deuteranopia'),
  tritanopia: matrixOf('tritanopia'),
});

const toLinear = (channel: number) => {
  const c = channel / 255;
  return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
};
const toSrgb = (linear: number) => {
  const c = Math.min(1, Math.max(0, linear));
  return Math.round((c <= 0.0031308 ? 12.92 * c : 1.055 * c ** (1 / 2.4) - 0.055) * 255);
};

/** How a #rrggbb color looks under the given simulation, as #rrggbb. Matrices act on linear RGB. */
export function simulateColor(hex: string, check: VisionCheck): string {
  const rgb = [1, 3, 5].map(i => toLinear(Number.parseInt(hex.slice(i, i + 2), 16)));
  return '#' + MATRICES[check]
    .map(row => toSrgb(row[0] * rgb[0] + row[1] * rgb[1] + row[2] * rgb[2]).toString(16).padStart(2, '0'))
    .join('');
}

/** Contrast of drawn text against its background under each simulation. */
export function simulatedRatios(textHex: string, backgroundHex: string, ratio: (a: string, b: string) => number): SimulatedRatios {
  const entry = (check: VisionCheck) => [check, ratio(simulateColor(textHex, check), simulateColor(backgroundHex, check))] as const;
  return Object.freeze(Object.fromEntries(VISION_CHECKS.map(entry)) as Record<VisionCheck, number>);
}
