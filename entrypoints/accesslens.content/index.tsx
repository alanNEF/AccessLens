import { createRoot } from 'react-dom/client';
import { AccessLensPanel } from '../../src/components/AccessLensPanel';
import './style.css';

export default defineContentScript({
  matches: ['*://*/*'],
  cssInjectionMode: 'ui',
  async main(ctx) {
    const ui = await createShadowRootUi(ctx, {
      name: 'accesslens-panel',
      position: 'inline',
      anchor: 'body',
      onMount(container) {
        const root = createRoot(container);
        root.render(<AccessLensPanel />);
        return root;
      },
      onRemove(root) {
        root?.unmount();
      },
    });
    ui.mount();
  },
});
