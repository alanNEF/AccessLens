import { browser } from 'wxt/browser';
import type { SpeechMessage, SpeechResponse } from '../../../shared/messages';
export interface SpeechClient { speak(text: string): Promise<void>; stop(): Promise<void> }
export function createSpeechClient(report: (status: string) => void) {
  let session = crypto.randomUUID();
  let sequence = 0;
  let active = true;
  let revision = 0;
  async function send(action: SpeechMessage['action'], text?: string): Promise<SpeechResponse> {
    try {
      const response: SpeechResponse = await browser.runtime.sendMessage({type:'accesslens:speech',action,session,sequence:sequence++,text} satisfies SpeechMessage);
      return response?.ok ? response : {ok:false,error:response?.error};
    } catch { return {ok:false}; }
  }
  const ready = send('start');
  void ready.then(response => { if(active && !response.ok) report('Speech unavailable. Keyboard navigation still works.'); });
  async function run(action: 'speak' | 'stop', text?: string) {
    const request = ++revision;
    try {
      const initialized = await ready;
      if (!active || request !== revision) return;
      let response = initialized.ok ? await send(action,text) : {ok:false,error:undefined};
      // MV3 workers may sleep while the user reads. Reopen only for a current
      // live request; disposal/revision checks prohibit delayed resurrection.
      if(response.error==='session-expired' && active && request===revision) {
        session=crypto.randomUUID(); sequence=0;
        const reopened=await send('start');
        if(!active || request!==revision) return;
        response=reopened.ok ? await send(action,text) : reopened;
      }
      if (!response.ok) { if(active && request === revision) report('Speech unavailable. Keyboard navigation still works.'); return; }
      if (active && request === revision) report(action === 'speak' ? 'Announcement requested' : 'Speech stopped');
    } catch { if(active && request === revision) report('Speech unavailable. Keyboard navigation still works.'); }
  }
  return {
    speak: (text: string) => run('speak',text.slice(0,600)),
    stop: () => run('stop'),
    dispose() {
      if (!active) return;
      active = false; revision++;
      void ready.then(() => send('end')).catch(() => {});
    },
  };
}
