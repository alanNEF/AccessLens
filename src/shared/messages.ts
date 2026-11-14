/** Internal toolbar-to-content-script command. No website content is sent. */
export const TOGGLE_PANEL = 'accesslens:toggle-panel' as const;
export interface TogglePanelMessage { readonly type: typeof TOGGLE_PANEL }
export function isTogglePanelMessage(value: unknown): value is TogglePanelMessage {
  return typeof value === 'object' && value !== null && 'type' in value && value.type === TOGGLE_PANEL;
}
