import { createRoot } from 'react-dom/client';
import { AccessLensPanel } from '../../src/components/AccessLensPanel';
import { createSimulationEngine, type SimulationEngine } from '../../src/features/simulator/simulation-engine';
import './style.css';

export default defineContentScript({
  matches: ['*://*/*'],
  cssInjectionMode: 'ui',
  async main(ctx) {
    let engine: SimulationEngine | undefined;
    const ui = await createShadowRootUi(ctx, {
      name: 'accesslens-panel',
      position: 'inline',
      anchor: 'body',
      onMount(container, _shadow, host) {
        engine = createSimulationEngine(document, host);
        const root = createRoot(container);
        root.render(<AccessLensPanel engine={engine} />);
        return root;
      },
      onRemove(root) {
        engine?.dispose();
        root?.unmount();
      },
    });
    // WXT checks runtime validity on each tick, including extension removal.
    // No DOM scanning; at most one second before owned effects are cleaned up.
    ctx.setInterval(() => {}, 1000);
    // pagehide also covers navigation and BFCache entry; do not retain effects.
    ctx.addEventListener(window, 'pagehide', () => ui.remove());
    ctx.addEventListener(window, 'pageshow', (event) => {
      if (event.persisted) ui.mount();
    });
    ui.mount();
  },
});
