import { browser } from 'wxt/browser';
import { isTogglePanelMessage, type VisionlessNavigationMessage } from '../../src/shared/messages';
import { createRoot } from 'react-dom/client';
import { AccessLensPanel } from '../../src/components/AccessLensPanel';
import { createSimulationEngine } from '../../src/features/simulator/simulation-engine';
import { createSimulatorController, type SimulatorController } from '../../src/features/simulator/simulator-controller';
import { createSimulatorModeReader } from '../../src/shared/simulator-mode-reader';
import { createInspectorStore, type InspectorStore } from '../../src/features/inspector/inspector-store';
import { createIssueHandoffStore, type IssueHandoffStore } from '../../src/shared/issue-handoff';
import { createFixerController, type FixerController } from '../../src/features/fixer/fixer-controller';
import { createPreviewManager } from '../../src/features/fixer/preview-manager';
import { connectInspectorToFixer } from '../../src/features/fixer/connect-inspector';
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
    let fixer: FixerController | undefined;
    let leavingDocument = false;
    let interactionVersion = 0;
    let unsubscribeNavigation: (() => void) | undefined;
    const saveNavigation = async (enabled: boolean) => {
      try { await browser.runtime.sendMessage({type:'accesslens:visionless-navigation',enabled} satisfies VisionlessNavigationMessage); }
      catch { /* Context invalidation must never interrupt DOM/speech cleanup. */ }
    };
    let disconnectFixer: (() => void) | undefined;
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
        unsubscribeNavigation = controller.subscribeActiveMode(mode=>{if(!leavingDocument) saveNavigation(mode==='visionless');});
        inspector = createInspectorStore(host);
        handoff = createIssueHandoffStore();
        fixer = createFixerController({ previewManager: createPreviewManager() });
        disconnectFixer = connectInspectorToFixer(inspector, handoff, fixer);
        const root = createRoot(container);
        root.render(<AccessLensPanel controller={controller} modeReader={createSimulatorModeReader(controller)} inspector={inspector} handoff={handoff} fixer={fixer} />);
        return root;
      },
      onRemove(root) {
        unsubscribeNavigation?.();
        unsubscribeNavigation = undefined;
        if(!leavingDocument) saveNavigation(false);
        // Disconnect first, then dispose: closing the panel reverts any Fixer preview.
        disconnectFixer?.();
        fixer?.dispose();
        controller?.dispose();
        inspector?.dispose();
        handoff?.clear();
        root?.unmount();
      },
    });
    const togglePanel: Parameters<typeof browser.runtime.onMessage.addListener>[0] = (message: unknown, sender, sendResponse) => {
      if (sender.id !== browser.runtime.id || !isTogglePanelMessage(message)) return;
      interactionVersion++;
      if (ui.shadowHost.isConnected) ui.remove();
      else if (!document.querySelector('accesslens-panel[data-accesslens-ui]')) ui.mount();
      sendResponse({ visible: ui.shadowHost.isConnected });
    };
    browser.runtime.onMessage.addListener(togglePanel);
    ctx.onInvalidated(() => browser.runtime.onMessage.removeListener(togglePanel));
    async function resumeVisionless() {
      const version = interactionVersion;
      try {
        const response = await browser.runtime.sendMessage({type:'accesslens:visionless-navigation'} satisfies VisionlessNavigationMessage);
        if(response?.enabled !== true || leavingDocument || ctx.isInvalid || version!==interactionVersion) return;
        if(!ui.shadowHost.isConnected) ui.mount();
        controller?.setMode('visionless');
      } catch { /* No page mutation if session storage or messaging is unavailable. */ }
    }
    void resumeVisionless();
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
      leavingDocument = true;
      reopenOnPageShow = ui.shadowHost.isConnected;
      ui.remove();
    });
    ctx.addEventListener(window, 'pageshow', (event) => {
      if(event.persisted) {
        leavingDocument = false;
        if(reopenOnPageShow && !ui.shadowHost.isConnected) ui.mount();
        void resumeVisionless();
      }
    });
    // Hidden by default except when resuming this tab's Visionless session.
  },
});
