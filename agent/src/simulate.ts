import { BLUR, PRESETS, normalizeBlur } from '../../src/features/simulator/filters';
import type { SimulationMode } from '../../src/shared/types';
import type { Page } from './browser';

/** Modes that can be shown as a still image (Visionless is an interactive, spoken mode). */
export const SCREENSHOT_MODES: readonly SimulationMode[] = (Object.keys(PRESETS) as SimulationMode[]).filter(mode => mode !== 'visionless');

/**
 * Applies the same filter presets as the extension to the whole page and captures the viewport.
 * Approximation only. Returns base64 JPEG (smaller than PNG for agents).
 */
export async function simulateScreenshot(page: Page, mode: SimulationMode, blurPx: number = BLUR.default, quality = 70): Promise<string> {
  if (!SCREENSHOT_MODES.includes(mode)) throw new Error(`Unsupported mode "${mode}". Use one of: ${SCREENSHOT_MODES.join(', ')}.`);
  const preset = PRESETS[mode];
  let filter = '';
  let svg = '';
  if (mode === 'blur') filter = `blur(${normalizeBlur(blurPx)}px)`;
  else if ('css' in preset) filter = preset.css;
  else if ('matrix' in preset) {
    // Same pipeline as the extension: sRGB filter with the matrix applied in linear RGB.
    svg = `<svg xmlns="http://www.w3.org/2000/svg" width="0" height="0" style="position:absolute" aria-hidden="true"><filter id="accesslens-agent-cvd" color-interpolation-filters="sRGB"><feColorMatrix type="matrix" color-interpolation-filters="linearRGB" values="${preset.matrix}"/></filter></svg>`;
    filter = 'url(#accesslens-agent-cvd)';
  }
  await page.evaluate(`(() => {
    document.querySelectorAll('[data-accesslens-agent-sim]').forEach(n => n.remove());
    const svg = ${JSON.stringify(svg)};
    if (svg) { const holder = document.createElement('div'); holder.setAttribute('data-accesslens-agent-sim', ''); holder.innerHTML = svg; document.body.append(holder); }
    const filter = ${JSON.stringify(filter)};
    if (filter) { const style = document.createElement('style'); style.setAttribute('data-accesslens-agent-sim', ''); style.textContent = 'html { filter: ' + filter + ' !important; }'; document.head.append(style); }
    return true;
  })()`);
  // Two frames so the filter is painted before capture.
  await page.evaluate('new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)))');
  const { data } = await page.send('Page.captureScreenshot', { format: 'jpeg', quality });
  return data;
}
