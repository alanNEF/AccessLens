import { PRESETS, BLUR, normalizeBlur } from './filters';
import type { SimulationMode } from '../../shared/types';

const TARGET = 'body > [data-accesslens-simulator-target]';
const SVG_NS = 'http://www.w3.org/2000/svg';

/** Controlled, opt-in demo only. Never wraps/reparents or edits website nodes. */
export function createSimulationEngine(doc: Document, panelHost: HTMLElement) {
  const owner = `accesslens-spike-${crypto.randomUUID()}`;
  let style: HTMLStyleElement | undefined;
  let svg: SVGSVGElement | undefined;
  let disposed = false;

  function reset() {
    style?.remove();
    svg?.remove();
    style = undefined;
    svg = undefined;
  }

  function validateTargets(mode: SimulationMode) {
    const view = doc.defaultView!;
    const targets = [...doc.querySelectorAll<HTMLElement>(TARGET)];
    if (doc.body.dataset.accesslensSimulatorDemo !== 'phase-0' || !targets.length) {
      throw new Error('Simulator supports only the marked AccessLens demo page. Open demo-site/index.html via a local HTTP server.');
    }
    if (panelHost.parentElement !== doc.body || targets.includes(panelHost) ||
        [doc.documentElement, doc.body, ...targets].some(node => view.getComputedStyle(node).filter !== 'none')) {
      throw new Error('Unsupported layout: panel must be a body sibling and simulation roots must have no existing filter. Reset remains available.');
    }
    if (mode === 'blur' && targets.some(node => view.getComputedStyle(node).clipPath !== 'none')) {
      throw new Error('Unsupported layout: blur clipping conflicts with an existing root clip-path. Reset remains available.');
    }
    if (doc.querySelector('base')) {
      throw new Error('Simulator does not support pages with a base element.');
    }
    // Marked roots define the opt-in scope. Browser tools and other extensions
    // may add unrelated body siblings; leave those untouched rather than reject
    // an otherwise supported demo. Never broaden the selector to include them.
  }

  return {
    apply(mode: SimulationMode, blurPx: number = BLUR.default) {
      try {
        if (disposed) throw new Error('Simulator engine has been disposed.');
        if (!Object.hasOwn(PRESETS, mode)) throw new Error('Unknown simulation mode.');
        if (mode === 'none') { reset(); return; }
        const intensity = normalizeBlur(blurPx);
        // Clear our rule synchronously before checking author filters. Reuse the
        // same nodes on success; failures always roll back to a clean Off state.
        if (style) style.textContent = '';
        validateTargets(mode);
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
        } else {
          svg?.remove();
          svg = undefined;
        }
        style ??= doc.createElement('style');
        style.dataset.accesslensSimulatorOwned = owner;
        // Clip after filtering to contain the halo without changing layout or
        // scrolling. This also clips overflowing descendants and shadows.
        style.textContent = `${TARGET} { filter: ${mode === 'blur' ? `blur(${intensity}px)` : `url("#${owner}")`} !important; ${mode === 'blur' ? 'clip-path: inset(0) !important;' : ''} }`;
        doc.head.append(style);
        // Catch blocked styles / conflicting author rules; painting is browser-tested.
        if ([...doc.querySelectorAll(TARGET)].some(node => doc.defaultView!.getComputedStyle(node).filter === 'none')) {
          throw new Error('The page blocked the effect stylesheet.');
        }
      } catch (error) {
        reset();
        throw error;
      }
    },
    reset,
    dispose() { reset(); disposed = true; },
  };
}
export type SimulationEngine = ReturnType<typeof createSimulationEngine>;
