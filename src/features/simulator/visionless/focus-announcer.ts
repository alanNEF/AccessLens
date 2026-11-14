import { describeElement } from './accessible-label';
import type { SpeechClient } from './speech-client';
export function attachFocusAnnouncer(doc: Document, panel: HTMLElement, speech: SpeechClient) {
  let last: Event | undefined;
  const focus = (event: FocusEvent) => {
    if (event === last || event.composedPath().includes(panel)) return;
    last = event;
    const element = event.composedPath().find(node => node instanceof doc.defaultView!.Element) as Element | undefined;
    if (!element) return;
    const description = describeElement(element);
    if (description) void speech.speak(description.announcement);
  };
  const key = (event: KeyboardEvent) => { if (event.key === 'Escape') void speech.stop(); };
  const visibility = () => { if (doc.hidden) void speech.stop(); };
  doc.addEventListener('focusin',focus,true);
  doc.addEventListener('keydown',key,true);
  doc.addEventListener('visibilitychange',visibility);
  return () => {
    doc.removeEventListener('focusin',focus,true);
    doc.removeEventListener('keydown',key,true);
    doc.removeEventListener('visibilitychange',visibility);
  };
}
