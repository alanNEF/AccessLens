import {beforeEach,expect,it,vi} from 'vitest';
const send=vi.hoisted(()=>vi.fn());
const transport=vi.hoisted(()=>({call:undefined as undefined | ((message:unknown)=>Promise<unknown>)}));
vi.mock('wxt/browser',()=>({browser:{runtime:{sendMessage:(message:unknown)=>transport.call ? transport.call(message) : send(message)}}}));
import {createSpeechClient} from '../../src/features/simulator/visionless/speech-client';
beforeEach(()=>{send.mockReset();transport.call=undefined;});
it('cancels delayed announcements after disposal while ending the session',async()=>{
  let resolve!:(value:{ok:boolean})=>void;
  send.mockImplementationOnce(()=>new Promise(r=>{resolve=r;})).mockResolvedValue({ok:true});
  const report=vi.fn();const client=createSpeechClient(report);
  const speech=client.speak('private page label');client.dispose();resolve({ok:true});await speech;
  await Promise.resolve();
  expect(send.mock.calls.map(([m])=>m.action)).toEqual(['start','end']);expect(report).not.toHaveBeenCalled();
});
it('rapid focus requests send only the latest while startup is pending',async()=>{
  send.mockResolvedValue({ok:true});const client=createSpeechClient(vi.fn());
  await Promise.all([client.speak('First'),client.speak('Second')]);
  expect(send.mock.calls.filter(([m])=>m.action==='speak').map(([m])=>m.text)).toEqual(['Second']);client.dispose();
});
it('reports failures without rejecting UI commands',async()=>{
  send.mockResolvedValue({ok:false,error:'Unavailable'});const report=vi.fn();const client=createSpeechClient(report);
  await expect(client.speak('Submit')).resolves.toBeUndefined();expect(report).toHaveBeenCalledWith(expect.stringMatching(/unavailable/));client.dispose();
});
it('handles a rejected transport promise',async()=>{
  transport.call=async()=>{throw new Error('Disconnected transport');};
  const report=vi.fn();const client=createSpeechClient(report);
  await client.stop();
  expect(report).toHaveBeenCalledWith(expect.stringMatching(/unavailable/));
  client.dispose();
});

it('reconnects after MV3 worker sleep without replaying stale speech',async()=>{
  send.mockResolvedValueOnce({ok:true}).mockResolvedValueOnce({ok:false,error:'session-expired'}).mockResolvedValue({ok:true});
  const client=createSpeechClient(vi.fn());await client.speak('Current label');
  expect(send.mock.calls.map(([m])=>m.action)).toEqual(['start','speak','start','speak']);
  expect(send.mock.calls[0][0].session).not.toBe(send.mock.calls[2][0].session);client.dispose();
});
