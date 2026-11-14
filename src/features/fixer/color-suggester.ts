import {
  useMode, modeRgb, modeLrgb, modeOklab, modeOklch, modeLab, modeLab65, modeLch,
  parse, wcagContrast, differenceCiede2000, toGamut, formatHex, type Color,
} from 'culori/fn';
import type { SuggestedFix, VerifiedContrastFailure } from '../../shared/types';

// Tree-shakeable Culori: register only the modes needed to parse computed CSS
// colors (rgb/hex, lab, lch, oklab, oklch) and to measure contrast/difference.
useMode(modeRgb);
useMode(modeLrgb);
useMode(modeOklab);
useMode(modeLab);
useMode(modeLch);
useMode(modeLab65);
const toOklch = useMode(modeOklch);
const intoSrgb = toGamut('rgb', 'oklch');
const colorDifference = differenceCiede2000();

/** Aim just above the threshold so other contrast tools agree on borderline values. */
const TARGET_MARGIN = 0.01;
const SEARCH_STEPS = 20;

export type UnsupportedReason = 'invalid-color' | 'transparent-color' | 'already-passes' | 'no-compliant-color';
type SuggestionResult =
  | { readonly ok: true; readonly fix: SuggestedFix }
  | { readonly ok: false; readonly reason: UnsupportedReason; readonly message: string };

type SuggestionInput = Pick<VerifiedContrastFailure, 'id' | 'textColor' | 'backgroundColor' | 'requiredRatio'>;

/** Parses a CSS color, accepting only fully opaque values. */
export function parseOpaque(value: string): Color | UnsupportedReason {
  const color = parse(value);
  if (!color) return 'invalid-color';
  if (color.alpha !== undefined && color.alpha < 1) return 'transparent-color';
  return color;
}

/** Lowercase #rrggbb after mapping into the sRGB gamut. */
export function toHex(color: Color): string {
  return formatHex(intoSrgb(color));
}

/** WCAG 2.x contrast ratio; never rounded. */
export function contrastRatio(a: Color | string, b: Color | string): number {
  return wcagContrast(a, b);
}

/** Truncate to two decimals: 4.499 shows as 4.49, never as 4.50. */
export function floorRatio(ratio: number): number {
  return Math.floor(ratio * 100) / 100;
}

/**
 * Smallest OKLCH lightness change (hue and chroma kept) that makes `adjustable`
 * reach `target` against `fixed`, moving toward black or white. Candidates are
 * judged on their rounded hex value, so rounding can never produce a failure.
 */
function searchLightness(adjustable: Color, fixed: Color, target: number, toward: 0 | 1): string | undefined {
  const start = toOklch(adjustable);
  const hexAt = (l: number) => toHex({ ...start, l });
  const passes = (hex: string) => contrastRatio(hex, fixed) >= target;
  if (!passes(hexAt(toward))) return undefined;
  let failing = start.l;
  let passing: number = toward;
  for (let step = 0; step < SEARCH_STEPS; step++) {
    const middle = (failing + passing) / 2;
    if (passes(hexAt(middle))) passing = middle;
    else failing = middle;
  }
  return hexAt(passing);
}

/** Closest passing candidate by CIEDE2000, trying darker and lighter. */
function closestReplacement(adjustable: Color, fixed: Color, target: number): string | undefined {
  let best: { hex: string; difference: number } | undefined;
  for (const toward of [0, 1] as const) {
    const hex = searchLightness(adjustable, fixed, target, toward);
    if (!hex) continue;
    const difference = colorDifference(adjustable, hex);
    if (!best || difference < best.difference) best = { hex, difference };
  }
  return best?.hex;
}

const MESSAGES: Record<UnsupportedReason, string> = {
  'invalid-color': 'The element’s colors could not be read reliably.',
  'transparent-color': 'Transparent or semi-transparent colors need manual review.',
  'already-passes': 'These colors already meet the required contrast ratio.',
  'no-compliant-color': 'No compliant color could be proposed reliably for this element.',
};

function unsupported(reason: UnsupportedReason): SuggestionResult {
  return { ok: false, reason, message: MESSAGES[reason] };
}

/**
 * FIX-02: one replacement text color reaching the WCAG AA threshold.
 *
 * Text is always adjustable for opaque colors: the search ends at black or
 * white, and one of them reaches at least 4.58:1 against any opaque background
 * (the worst case is where both tie). So no background fallback is needed for
 * the 4.5:1 and 3:1 thresholds; 'background-color' stays in the shared type
 * for future fix types. 'no-compliant-color' is a defensive guard only.
 */
export function suggestFix(issue: SuggestionInput): SuggestionResult {
  const text = parseOpaque(issue.textColor);
  if (typeof text === 'string') return unsupported(text);
  const background = parseOpaque(issue.backgroundColor);
  if (typeof background === 'string') return unsupported(background);

  const original = contrastRatio(text, background);
  if (original >= issue.requiredRatio) return unsupported('already-passes');

  const suggestedValue = closestReplacement(text, background, issue.requiredRatio + TARGET_MARGIN);
  if (!suggestedValue) return unsupported('no-compliant-color');
  return {
    ok: true,
    fix: {
      issueId: issue.id,
      property: 'color',
      originalValue: toHex(text),
      suggestedValue,
      originalContrastRatio: floorRatio(original),
      expectedContrastRatio: floorRatio(contrastRatio(suggestedValue, background)),
    },
  };
}
