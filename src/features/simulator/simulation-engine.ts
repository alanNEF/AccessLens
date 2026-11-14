import { PROTANOPIA_MATRIX } from './filters';

export type SpikeMode = 'none' | 'protanopia' | 'blur';
const TARGET = 'body > [data-accesslens-simulator-target]';
const SVG_NS = 'http://www.w3.org/2000/svg';

/** Controlled, opt-in demo only. Never wraps/reparents or edits website nodes. */
export function createSimulationEngine(doc: Document, panelHost: HTMLElement) {
  const owner = `accesslens-spike-${crypto.randomUUID()}`;
  let style: HTMLStyleElement | undefined;
  let svg: SVGSVGElement | undefined;

  function reset() {
    style?.remove();
    svg?.remove();
    style = undefined;
    svg = undefined;
  }

  function validateTargets() {
    const view = doc.defaultView!;
    const targets = [...doc.querySelectorAll<HTMLElement>(TARGET)];
    if (doc.body.dataset.accesslensSimulatorDemo !== 'phase-0' || !targets.length) {
      throw new Error('Phase 0 supports only the marked AccessLens demo page. Open demo-site/index.html via a local HTTP server.');
    }
    if (panelHost.parentElement !== doc.body || targets.includes(panelHost) ||
        [doc.documentElement, doc.body, ...targets].some(node => view.getComputedStyle(node).filter !== 'none')) {
      throw new Error('Unsupported layout: panel must be a body sibling and simulation roots must have no existing filter. Reset remains available.');
    }
    if (doc.querySelector('base')) {
      throw new Error('Phase 0 does not support pages with a base element.');
    }
    // Marked roots define the opt-in scope. Browser tools and other extensions
    // may add unrelated body siblings; leave those untouched rather than reject
    // an otherwise supported demo. Never broaden the selector to include them.
  }

  return {
    apply(mode: SpikeMode) {
      // Remove only references we own; no source styles or attributes to restore.
      reset();
      if (mode === 'none') return;
      try {
        validateTargets();
        if (mode === 'protanopia') {
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
          matrix.setAttribute('values', PROTANOPIA_MATRIX);
          filter.append(matrix);
          defs.append(filter);
          svg.append(defs);
          doc.body.append(svg);
        }
        style = doc.createElement('style');
        style.dataset.accesslensSimulatorOwned = owner;
        style.textContent = `${TARGET} { filter: ${mode === 'blur' ? 'blur(2px)' : `url("#${owner}")`} !important; }`;
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
    dispose: reset,
  };
}
export type SimulationEngine = ReturnType<typeof createSimulationEngine>;
