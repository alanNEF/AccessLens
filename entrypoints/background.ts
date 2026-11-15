import { createSpeechBroker } from '../src/features/simulator/visionless/speech-broker';
import { browser } from 'wxt/browser';
import { isSpeechMessage, isVisionlessNavigationMessage, TOGGLE_PANEL, type TogglePanelMessage } from '../src/shared/messages';

function hasNoReceiver(error: unknown): boolean {
  return error instanceof Error && /receiving end does not exist|could not establish connection/i.test(error.message);
}

export default defineBackground(() => {
  // Initialization is independent per tab; repeated clicks must not bootstrap
  // multiple content-script contexts while an initial command is in flight.
  // Serialize get/set so a new document cannot overtake the previous document's
  // mode update. Session storage survives worker sleep, not browser restarts.
  let navigationQueue: Promise<unknown> = Promise.resolve();
  browser.runtime.onMessage.addListener((message: unknown,sender,respond) => {
    if(sender.id!==browser.runtime.id || sender.frameId!==0 || sender.tab?.id===undefined || !isVisionlessNavigationMessage(message)) return;
    const key = `visionless-navigation:${sender.tab.id}`;
    const operation = navigationQueue.catch(()=>{}).then(async()=>{
      if(message.enabled !== undefined) {
        if(message.enabled) await browser.storage.session.set({[key]:true});
        else await browser.storage.session.remove(key);
        return {enabled:message.enabled};
      }
      return {enabled:(await browser.storage.session.get(key))[key]===true};
    });
    navigationQueue=operation;
    void operation.then(respond,()=>respond({enabled:false}));
    return true;
  });
  browser.tabs.onRemoved.addListener(tabId=>{
    navigationQueue=navigationQueue.catch(()=>{}).then(()=>browser.storage.session.remove(`visionless-navigation:${tabId}`));
  });
  let localVoice: string | undefined;
  const broker = createSpeechBroker({
    speak: text => {
      if (!localVoice) return Promise.reject(new Error('No local Chrome speech voice is available.'));
      // Keep page-provided names plain text, never executable SSML markup.
      return browser.tts.speak(text.replace(/[<>]/g,''),{voiceName:localVoice,rate:1.0,enqueue:false});
    },
    stop: () => { browser.tts.stop(); },
    isActive: async tabId => {
      const [tabs, voices] = await Promise.all([
        browser.tabs.query({active:true,lastFocusedWindow:true}), browser.tts.getVoices(),
      ]);
      const local = voices.filter(voice=>voice.remote===false);
      localVoice = (local.find(voice=>voice.lang?.startsWith('en')) || local[0])?.voiceName;
      return tabs.some(tab=>tab.id===tabId);
    },
  });
  browser.runtime.onMessage.addListener((message: unknown,sender,respond) => {
    if(sender.id!==browser.runtime.id || sender.frameId!==0 || sender.tab?.id===undefined || !isSpeechMessage(message)) return;
    void broker.handle(sender.tab.id,message).then(respond,()=>respond({ok:false,error:'Speech unavailable'}));
    return true;
  });
  browser.tabs.onActivated.addListener(({tabId})=>broker.activate(tabId));
  browser.tabs.onRemoved.addListener(tabId=>broker.release(tabId));
  browser.tabs.onUpdated.addListener((tabId,change)=>{if(change.status==='loading') broker.release(tabId);});
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
