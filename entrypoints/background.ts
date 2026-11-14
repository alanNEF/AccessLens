import { browser } from 'wxt/browser';
import { TOGGLE_PANEL, type TogglePanelMessage } from '../src/shared/messages';

function hasNoReceiver(error: unknown): boolean {
  return error instanceof Error && /receiving end does not exist|could not establish connection/i.test(error.message);
}

export default defineBackground(() => {
  // Initialization is independent per tab; repeated clicks must not bootstrap
  // multiple content-script contexts while an initial command is in flight.
  const opening = new Set<number>();
  browser.action.onClicked.addListener(async tab => {
    const tabId = tab.id;
    if (tabId === undefined || opening.has(tabId)) return;
    opening.add(tabId);
    try {
      const message: TogglePanelMessage = { type: TOGGLE_PANEL };
      try {
        await browser.tabs.sendMessage(tabId, message, { frameId: 0 });
      } catch (error) {
        if (!hasNoReceiver(error)) throw error;
        // Static content scripts do not run retroactively in tabs that predate
        // install/reload. activeTab grants access only after this toolbar click.
        const currentTab = await browser.tabs.get(tabId);
        if (!currentTab.url || !/^https?:\/\//i.test(currentTab.url)) {
          throw new Error('Unsupported page. Open an ordinary HTTP or HTTPS page.');
        }
        await browser.scripting.executeScript({
          target: { tabId, frameIds: [0] },
          files: ['/content-scripts/accesslens.js'],
        });
        await browser.tabs.sendMessage(tabId, message, { frameId: 0 });
      }
      await browser.action.setBadgeText({ tabId, text: '' });
      await browser.action.setTitle({ tabId, title: 'AccessLens — show/hide simulator' });
    } catch {
      // Browser stores, internal pages, navigation races, or denied site access
      // can still prevent injection. Do not reload or change the user's page.
      await Promise.allSettled([
        browser.action.setBadgeText({ tabId, text: '!' }),
        browser.action.setTitle({ tabId, title: 'AccessLens could not open here. Check site access or wait for loading to finish and retry. Chrome-restricted pages are unsupported.' }),
      ]);
    } finally {
      opening.delete(tabId);
    }
  });
});
