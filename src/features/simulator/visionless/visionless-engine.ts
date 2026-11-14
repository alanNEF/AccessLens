import { attachFocusAnnouncer } from './focus-announcer';
import { createSpeechClient } from './speech-client';
import { LOGO_DARK_LARGE } from '../../../assets/brand';
import { APP_NAME } from '../../../shared/constants';

/** Decorative brand mark on the blackout: large logo, name and mode, centered. */
function brandMark(doc: Document): HTMLDivElement {
  const mark = doc.createElement('div');
  mark.style.cssText = 'position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:12px;';
  const logo = doc.createElement('img');
  logo.src = LOGO_DARK_LARGE;
  logo.alt = '';
  logo.draggable = false;
  logo.style.cssText = 'width:min(42vmin,340px);height:auto;';
  const name = doc.createElement('div');
  name.textContent = APP_NAME;
  name.style.cssText = 'font:600 clamp(28px,6vmin,56px)/1.1 ui-sans-serif,system-ui,sans-serif;color:#f1f5f9;letter-spacing:-0.02em;';
  const mode = doc.createElement('div');
  mode.textContent = 'Visionless mode';
  mode.style.cssText = 'font:500 clamp(14px,2.2vmin,20px)/1.4 ui-sans-serif,system-ui,sans-serif;color:#94a3b8;';
  mark.append(logo, name, mode);
  return mark;
}
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
      if (!root) throw new Error('Visionless requires the isolated Perspective panel.');
      overlay = doc.createElement('div');
      overlay.id = `accesslens-visionless-${crypto.randomUUID()}`;
      overlay.dataset.accesslensVisionless = '';
      overlay.setAttribute('aria-hidden','true');
      overlay.style.cssText = 'position:fixed!important;inset:0!important;background:#000!important;pointer-events:none!important;z-index:0!important;';
      overlay.append(brandMark(doc));
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
