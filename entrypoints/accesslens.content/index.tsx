import { browser } from 'wxt/browser';
import { isTogglePanelMessage } from '../../src/shared/messages';
import { createRoot } from 'react-dom/client';
import { AccessLensPanel } from '../../src/components/AccessLensPanel';
import { createSimulationEngine } from '../../src/features/simulator/simulation-engine';
import { createSimulatorController, type SimulatorController } from '../../src/features/simulator/simulator-controller';
import { createSimulatorModeReader } from '../../src/shared/simulator-mode-reader';
import { createInspectorStore, type InspectorStore } from '../../src/features/inspector/inspector-store';
import { createIssueHandoffStore, type IssueHandoffStore } from '../../src/shared/issue-handoff';
import './style.css';

export default defineContentScript({
  matches: ['http://*/*', 'https://*/*'],
  runAt: 'document_idle',
  allFrames: false,
  cssInjectionMode: 'ui',
  async main(ctx) {
    if (window.top !== window || document.contentType !== 'text/html') return;
    let controller: SimulatorController | undefined;
    let inspector: InspectorStore | undefined;
    let handoff: IssueHandoffStore | undefined;
    // SPA navigation: re-apply simulation; drop Inspector results unless only the #hash changed.
    let lastPath = location.href.split('#')[0];
    const onPageChange = () => {
      controller?.refresh();
      const path = location.href.split('#')[0];
      if (path !== lastPath) { lastPath = path; inspector?.clear(); handoff?.clear(); }
    };
    const ui = await createShadowRootUi(ctx, {
      name: 'accesslens-panel',
      position: 'inline',
      anchor: 'body',
      onMount(container, _shadow, host) {
        host.dataset.accesslensUi = '';
        controller = createSimulatorController(createSimulationEngine(document, host));
        inspector = createInspectorStore(host);
        handoff = createIssueHandoffStore();
        const root = createRoot(container);
        root.render(<AccessLensPanel controller={controller} modeReader={createSimulatorModeReader(controller)} inspector={inspector} handoff={handoff} />);
        return root;
      },
      onRemove(root) {
        controller?.dispose();
        inspector?.dispose();
        handoff?.clear();
        root?.unmount();
      },
    });
    const togglePanel: Parameters<typeof browser.runtime.onMessage.addListener>[0] = (message: unknown, sender, sendResponse) => {
      if (sender.id !== browser.runtime.id || !isTogglePanelMessage(message)) return;
      if (ui.shadowHost.isConnected) ui.remove();
      else if (!document.querySelector('accesslens-panel[data-accesslens-ui]')) ui.mount();
      sendResponse({ visible: ui.shadowHost.isConnected });
    };
    browser.runtime.onMessage.addListener(togglePanel);
    ctx.onInvalidated(() => browser.runtime.onMessage.removeListener(togglePanel));
    // WXT checks runtime validity on each tick, including extension removal.
    // No DOM scanning; normally one second, subject to background timer throttling.
    let lastUrl = location.href;
    ctx.setInterval(() => {
      if (lastUrl !== location.href) { lastUrl = location.href; onPageChange(); }
    }, 1000);
    // Refresh after URL commit (WXT's navigate event fires before commit).
    if ('navigation' in window && window.navigation instanceof EventTarget) {
      ctx.addEventListener(window.navigation, 'currententrychange', onPageChange);
    }
    // pagehide also covers navigation and BFCache entry; do not retain effects.
    let reopenOnPageShow = false;
    ctx.addEventListener(window, 'pagehide', () => {
      reopenOnPageShow = ui.shadowHost.isConnected;
      ui.remove();
    });
    ctx.addEventListener(window, 'pageshow', (event) => {
      if (event.persisted && reopenOnPageShow && !ui.shadowHost.isConnected) ui.mount();
    });
    // Toolbar activation mounts the panel; pages start with no simulation.
  },
});
