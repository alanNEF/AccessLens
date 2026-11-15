import { createVisionlessEngine } from './visionless/visionless-engine';
import { PRESETS, BLUR, normalizeBlur } from './filters';
import { createSimulatorDom } from './simulator-dom';
import type { SimulationMode } from '../../shared/types';

const SVG_NS = 'http://www.w3.org/2000/svg';

/** Owns reversible effects on direct-body content; never reparents page nodes. */
export function createSimulationEngine(doc: Document, panelHost: HTMLElement) {
  const owner = `accesslens-spike-${crypto.randomUUID()}`;
  let style: HTMLStyleElement | undefined;
  let svg: SVGSVGElement | undefined;
  let disposed = false;
  let active: { mode: SimulationMode; blurPx: number } | undefined;
  const errors = new Set<(error: Error) => void>();
  const visionless = createVisionlessEngine(doc,panelHost);
  const dom = createSimulatorDom(doc, panelHost, owner);

  function reset() {
    visionless.disable();
    active = undefined;
    dom.clear();
    style?.remove();
    svg?.remove();
    style = undefined;
    svg = undefined;
  }

  function apply(mode: SimulationMode, blurPx: number = BLUR.default) {
    try {
      if (disposed) throw new Error('Simulator engine has been disposed.');
      if (!Object.hasOwn(PRESETS, mode)) throw new Error('Unknown simulation mode.');
      if (mode === 'visionless') {
        if (active?.mode !== 'visionless') { reset(); visionless.enable(); active={mode,blurPx}; }
        return;
      }
      visionless.disable();
      if (mode === 'none') { reset(); return; }
      const intensity = normalizeBlur(blurPx);
      // Clear our rule synchronously before checking author filters. Reuse the
      // same nodes on success; failures always roll back to a clean Off state.
      if (style) style.textContent = '';
      const targets = dom.targets();
      const preset = PRESETS[mode];
      if ('matrix' in preset) {
        if (!svg) {
          svg = doc.createElementNS(SVG_NS, 'svg');
          svg.dataset.accesslensSimulatorOwned = owner;
          svg.setAttribute('aria-hidden', 'true');
          svg.setAttribute('width', '0');
          svg.setAttribute('height', '0');
          svg.style.cssText = 'position:absolute;pointer-events:none;overflow:hidden';
          const defs = doc.createElementNS(SVG_NS, 'defs');
          const filter = doc.createElementNS(SVG_NS, 'filter');
          filter.id = owner;
          filter.setAttribute('color-interpolation-filters', 'sRGB');
          const matrix = doc.createElementNS(SVG_NS, 'feColorMatrix');
          matrix.setAttribute('type', 'matrix');
          matrix.setAttribute('color-interpolation-filters', 'linearRGB');
          filter.append(matrix);
          defs.append(filter);
          svg.append(defs);
          doc.body.append(svg);
        }
        svg.querySelector('feColorMatrix')!.setAttribute('values', preset.matrix);
        if (svg.parentElement !== doc.body) doc.body.append(svg);
      } else {
        svg?.remove();
        svg = undefined;
      }
      // Which filter to apply: Low Acuity blur, a CSS filter preset, or the SVG color matrix.
      const effect = mode === 'blur' ? `blur(${intensity}px)`
        : 'css' in preset ? preset.css
        : `url("${doc.URL.split('#')[0]}#${owner}")`;
      // Blurring effects bleed past the element's edges; clip that halo.
      const clipHalo = mode === 'blur' || ('halo' in preset && preset.halo);
      style ??= doc.createElement('style');
      style.dataset.accesslensSimulatorOwned = owner;
      // Clip after filtering to contain the halo without changing layout or
      // scrolling. This also clips overflowing descendants and shadows.
      style.textContent = targets.map(target => `${target.selector} { filter: ${target.filter === 'none' ? '' : target.filter + ' '}${effect} !important; ${clipHalo && target.clipPath === 'none' ? 'clip-path: inset(0) !important;' : ''} }`).join('\n');
      doc.head.append(style);
      // Catch blocked styles / conflicting author rules; painting is browser-tested.
      if (targets.some(({node, filter}) => doc.defaultView!.getComputedStyle(node).filter === filter)) {
        throw new Error('The page blocked the effect stylesheet.');
      }
      active = {mode, blurPx: intensity};
      dom.watch(() => {
        const requested = active;
        if (!requested) return;
        try { apply(requested.mode, requested.blurPx); } catch (cause) {
          const error = cause instanceof Error ? cause : new Error('Unable to update simulation targets.');
          for (const listener of errors) listener(error);
        }
      });
    } catch (error) {
      reset();
      throw error;
    }
  }
  return {
    apply,
    stopSpeech: visionless.stopSpeech,
    getSpeechStatus: visionless.getSpeechStatus,
    subscribeSpeech: visionless.subscribeSpeech,
    subscribeErrors(listener: (error: Error) => void) {
      errors.add(listener);
      return () => { errors.delete(listener); };
    },
    reset,
    dispose() { reset(); disposed = true; visionless.dispose(); errors.clear(); },
  };
}
export type SimulationEngine = ReturnType<typeof createSimulationEngine>;
