/** Internal toolbar-to-content-script command. No website content is sent. */
export const TOGGLE_PANEL = 'accesslens:toggle-panel' as const;
export interface TogglePanelMessage { readonly type: typeof TOGGLE_PANEL }
export function isTogglePanelMessage(value: unknown): value is TogglePanelMessage {
  return typeof value === 'object' && value !== null && 'type' in value && value.type === TOGGLE_PANEL;
}

export interface SpeechMessage {
  readonly type: 'accesslens:speech';
  readonly action: 'start' | 'speak' | 'stop' | 'end';
  readonly session: string;
  readonly sequence: number;
  readonly text?: string;
}
export interface SpeechResponse { ok: boolean; error?: string }
export function isSpeechMessage(value: unknown): value is SpeechMessage {
  if (typeof value !== 'object' || value === null) return false;
  const m = value as Partial<SpeechMessage>;
  return m.type === 'accesslens:speech' && ['start','speak','stop','end'].includes(m.action || '') &&
    typeof m.session === 'string' && m.session.length <= 100 && m.session.length > 0 &&
    Number.isSafeInteger(m.sequence) && m.sequence! >= 0 &&
    (m.action !== 'speak' || typeof m.text === 'string' && m.text.length > 0 && m.text.length <= 600);
}

/** Tab-local, session-only Visionless continuation; no page data or history. */
export interface VisionlessNavigationMessage {
  readonly type: 'accesslens:visionless-navigation';
  readonly enabled?: boolean;
}
export function isVisionlessNavigationMessage(value: unknown): value is VisionlessNavigationMessage {
  return typeof value === 'object' && value !== null && 'type' in value &&
    value.type === 'accesslens:visionless-navigation' &&
    (!('enabled' in value) || typeof value.enabled === 'boolean');
}
