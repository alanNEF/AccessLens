import { createRoot } from 'react-dom/client';
import { AccessLensPanel } from '../../src/components/AccessLensPanel';
import { createSimulationEngine } from '../../src/features/simulator/simulation-engine';
import { createSimulatorController, type SimulatorController } from '../../src/features/simulator/simulator-controller';
import './style.css';

export default defineContentScript({
  matches: ['*://*/*'],
  cssInjectionMode: 'ui',
  async main(ctx) {
    let controller: SimulatorController | undefined;
    const ui = await createShadowRootUi(ctx, {
      name: 'accesslens-panel',
      position: 'inline',
      anchor: 'body',
      onMount(container, _shadow, host) {
        controller = createSimulatorController(createSimulationEngine(document, host));
        const root = createRoot(container);
        root.render(<AccessLensPanel controller={controller} />);
        return root;
      },
      onRemove(root) {
        controller?.dispose();
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
