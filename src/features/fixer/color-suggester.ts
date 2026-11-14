import {
  useMode, modeRgb, modeLrgb, modeOklab, modeOklch, modeLab, modeLab65, modeLch,
  parse, wcagContrast, differenceCiede2000, toGamut, formatHex, type Color,
} from 'culori/fn';
import type { SuggestedFix, VerifiedContrastFailure } from '../../shared/types';

// Tree-shakeable Culori: register only the modes needed to parse computed CSS
// colors (rgb/hex, lab, lch, oklab, oklch) and to measure contrast/difference.
const toRgb = useMode(modeRgb);
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

export type UnsupportedReason = 'invalid-color' | 'transparent-color' | 'already-passes' | 'no-compliant-color' | 'too-transparent';
type SuggestionResult =
  | { readonly ok: true; readonly fix: SuggestedFix }
  | { readonly ok: false; readonly reason: UnsupportedReason; readonly message: string };

type SuggestionInput = Pick<VerifiedContrastFailure, 'id' | 'textColor' | 'backgroundColor' | 'requiredRatio'> & {
  /** Combined CSS opacity the text is drawn with, 0–1. The CSS color is faded by it. */
  readonly opacity?: number;
};

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

/**
 * What the browser draws: `color` faded to `opacity` over the background,
 * mixed per sRGB channel (CSS compositing) and rounded to 8-bit hex.
 */
export function renderedColor(color: Color | string, background: Color | string, opacity: number): string {
  const fg = toRgb(color);
  const bg = toRgb(background);
  if (!fg || !bg) return '';
  if (opacity >= 1) return toHex(fg);
  const mix = (f: number, b: number) => opacity * f + (1 - opacity) * b;
  return formatHex({ mode: 'rgb', r: mix(fg.r, bg.r), g: mix(fg.g, bg.g), b: mix(fg.b, bg.b) });
}

/** Truncate to two decimals: 4.499 shows as 4.49, never as 4.50. */
export function floorRatio(ratio: number): number {
  return Math.floor(ratio * 100) / 100;
}

/**
 * Smallest OKLCH lightness change (hue and chroma kept) that makes `adjustable`
 * reach `target` against `fixed`, moving toward black or white. Candidates are
 * judged on their rounded hex value as drawn at `opacity`, so neither rounding
 * nor fading can produce a failure.
 */
function searchLightness(adjustable: Color, fixed: Color, target: number, opacity: number, toward: 0 | 1): string | undefined {
  const start = toOklch(adjustable);
  const hexAt = (l: number) => toHex({ ...start, l });
  const passes = (hex: string) => contrastRatio(renderedColor(hex, fixed, opacity), fixed) >= target;
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
function closestReplacement(adjustable: Color, fixed: Color, target: number, opacity: number): string | undefined {
  let best: { hex: string; difference: number } | undefined;
  for (const toward of [0, 1] as const) {
    const hex = searchLightness(adjustable, fixed, target, opacity, toward);
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
  'no-compliant-color': 'Changing only the text or only the background cannot reach this target. Both colors need to change; adjust them by hand.',
  'too-transparent': 'This text is drawn too transparent (CSS opacity) for any text color to reach the required contrast. Raise its opacity instead.',
};

function unsupported(reason: UnsupportedReason): SuggestionResult {
  return { ok: false, reason, message: MESSAGES[reason] };
}

/**
 * FIX-02: one replacement color reaching the required threshold (AA, or enhanced AAA 7:1).
 *
 * `textColor` is the CSS `color` to edit. With `opacity` below 1 the browser
 * fades it into the background, so every ratio here is measured on the color
 * as drawn, and the suggestion is the CSS color that passes after fading.
 *
 * Fully opaque text is always adjustable: the search ends at black or white,
 * and one of them reaches at least 4.58:1 against any opaque background. Faded
 * text may not be ('too-transparent').
 *
 * The enhanced 7:1 target can be out of reach for the text alone on mid-tone
 * backgrounds, so for opaque text the background color is tried next (FIX-02's
 * "solid background color" option). Faded text is not given a background fix:
 * its drawn color depends on the background too.
 */
export function suggestFix(issue: SuggestionInput): SuggestionResult {
  const opacity = issue.opacity ?? 1;
  if (!(opacity > 0 && opacity <= 1)) return unsupported('too-transparent');
  const text = parseOpaque(issue.textColor);
  if (typeof text === 'string') return unsupported(text);
  const background = parseOpaque(issue.backgroundColor);
  if (typeof background === 'string') return unsupported(background);

  const drawnRatio = (color: Color | string) => contrastRatio(renderedColor(color, background, opacity), background);
  const original = drawnRatio(text);
  if (original >= issue.requiredRatio) return unsupported('already-passes');

  const target = issue.requiredRatio + TARGET_MARGIN;
  const suggestedValue = closestReplacement(text, background, target, opacity);
  if (!suggestedValue && opacity >= 1) {
    const backgroundFix = closestReplacement(background, text, target, 1);
    if (backgroundFix) {
      return {
        ok: true,
        fix: {
          issueId: issue.id,
          property: 'background-color',
          originalValue: toHex(background),
          suggestedValue: backgroundFix,
          originalContrastRatio: floorRatio(original),
          expectedContrastRatio: floorRatio(contrastRatio(text, backgroundFix)),
        },
      };
    }
  }
  if (!suggestedValue) return unsupported(opacity < 1 ? 'too-transparent' : 'no-compliant-color');
  return {
    ok: true,
    fix: {
      issueId: issue.id,
      property: 'color',
      originalValue: toHex(text),
      suggestedValue,
      originalContrastRatio: floorRatio(original),
      expectedContrastRatio: floorRatio(drawnRatio(suggestedValue)),
    },
  };
}
