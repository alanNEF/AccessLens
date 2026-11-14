import type { SpeechMessage, SpeechResponse } from '../../../shared/messages';
interface Session { id: string; sequence: number; closed: boolean }
export interface SpeechBackend { speak(text: string): Promise<void>; stop(): void; isActive(tabId: number): Promise<boolean> }
/** Chrome TTS is global. Only its current owner may stop it; async checks revalidate ownership. */
export function createSpeechBroker(backend: SpeechBackend) {
  const sessions = new Map<number,Session>();
  const retired = new Map<number,Set<string>>();
  let owner: {tabId:number; session:Session} | undefined;
  function stop(tabId: number) { if(owner?.tabId===tabId){backend.stop();owner=undefined;} }
  return {
    async handle(tabId: number, message: SpeechMessage): Promise<SpeechResponse> {
      if(message.action==='start') {
        const previous = sessions.get(tabId);
        if(message.sequence!==0 || previous?.id===message.session || retired.get(tabId)?.has(message.session)) return {ok:true};
        const old = retired.get(tabId) || new Set<string>();
        if(previous) old.add(previous.id);
        if(old.size>64) old.delete(old.values().next().value!);
        retired.set(tabId,old);
        stop(tabId);
        sessions.set(tabId,{id:message.session,sequence:message.sequence,closed:false});
        return {ok:true};
      }
      const session = sessions.get(tabId);
      if(!session) return {ok:false,error:'session-expired'};
      if(session.id!==message.session || session.closed || message.sequence<=session.sequence) return {ok:true};
      session.sequence=message.sequence;
      if(message.action!=='speak'){stop(tabId);if(message.action==='end') session.closed=true;return {ok:true};}
      try {
        const active = await backend.isActive(tabId);
        if(!active || sessions.get(tabId)!==session || session.closed || session.sequence!==message.sequence) return {ok:true};
        owner={tabId,session};
        await backend.speak(message.text!);
        return {ok:true};
      } catch { return {ok:false,error:'Chrome speech is unavailable. Keyboard navigation still works.'}; }
    },
    release(tabId:number) { stop(tabId); sessions.delete(tabId); retired.delete(tabId); },
    activate(tabId:number) { if(owner && owner.tabId!==tabId) stop(owner.tabId); },
  };
}
