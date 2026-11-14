import { attachFocusAnnouncer } from './focus-announcer';
import { createSpeechClient } from './speech-client';
export function createVisionlessEngine(doc: Document, panel: HTMLElement) {
  let overlay: HTMLDivElement | undefined;
  let speech: ReturnType<typeof createSpeechClient> | undefined;
  let detach: (() => void) | undefined;
  let status = 'Speech stopped';
  const listeners = new Set<() => void>();
  const report = (next: string) => { status = next; for(const listener of listeners) listener(); };
  function disable() {
    detach?.(); detach=undefined;
    speech?.dispose(); speech=undefined;
    overlay?.remove(); overlay=undefined;
    report('Speech stopped');
  }
  return {
    enable() {
      if (overlay) return;
      // Place blackout inside the extension host's isolated root, below its UI.
      // No website nodes or ARIA properties are changed.
      const root = panel.shadowRoot;
      if (!root) throw new Error('Visionless requires the isolated AccessLens panel.');
      overlay = doc.createElement('div');
      overlay.id = `accesslens-visionless-${crypto.randomUUID()}`;
      overlay.dataset.accesslensVisionless = '';
      overlay.setAttribute('aria-hidden','true');
      overlay.style.cssText = 'position:fixed!important;inset:0!important;background:#000!important;pointer-events:none!important;z-index:0!important;';
      root.append(overlay);
      speech = createSpeechClient(report);
      detach = attachFocusAnnouncer(doc,panel,speech);
      void speech.speak('Visionless Mode. Use Tab and Shift Tab to navigate. Escape stops speech. Use Exit Visionless to restore the page.');
    },
    disable,
    stopSpeech() { void speech?.stop(); },
    getSpeechStatus: () => status,
    subscribeSpeech(listener: () => void) { listeners.add(listener); return () => { listeners.delete(listener); }; },
    dispose() { disable(); listeners.clear(); },
  };
}
