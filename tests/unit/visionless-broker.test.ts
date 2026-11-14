import {expect,it,vi} from 'vitest';
import {createSpeechBroker} from '../../src/features/simulator/visionless/speech-broker';
import type {SpeechMessage} from '../../src/shared/messages';
const msg=(session:string,action:SpeechMessage['action'],sequence:number,text='Submit, button'):SpeechMessage=>({type:'accesslens:speech',session,action,sequence,text});
it('ignores delayed speech after stop/end and never reopens a closed session',async()=>{
  let resolve!:(active:boolean)=>void;
  const backend={speak:vi.fn(async()=>{}),stop:vi.fn(),isActive:()=>new Promise<boolean>(r=>{resolve=r;})};
  const broker=createSpeechBroker(backend);
  await broker.handle(1,msg('a','start',0));
  const delayed=broker.handle(1,msg('a','speak',1));
  await broker.handle(1,msg('a','end',2));resolve(true);await delayed;
  await broker.handle(1,msg('a','start',0));await broker.handle(1,msg('a','speak',3));
  expect(backend.speak).not.toHaveBeenCalled();
});
it('interrupts speech, isolates stop ownership, and ignores old sessions',async()=>{
  const backend={speak:vi.fn(async()=>{}),stop:vi.fn(),isActive:vi.fn(async()=>true)};
  const broker=createSpeechBroker(backend);
  await broker.handle(1,msg('a','start',0));await broker.handle(1,msg('a','speak',1));
  await broker.handle(2,msg('b','start',0));await broker.handle(2,msg('b','speak',1));
  await broker.handle(1,msg('a','end',2));expect(backend.stop).not.toHaveBeenCalled();
  broker.activate(1);expect(backend.stop).toHaveBeenCalledTimes(1);
  await broker.handle(1,msg('c','start',0));await broker.handle(1,msg('a','start',0));await broker.handle(1,msg('a','speak',4));
  expect(backend.speak).toHaveBeenCalledTimes(2);
  backend.isActive.mockResolvedValue(false);await broker.handle(1,msg('c','speak',1));expect(backend.speak).toHaveBeenCalledTimes(2);
});
it('reports unavailable TTS without breaking the mode',async()=>{
  const broker=createSpeechBroker({speak:async()=>{throw Error('no voice');},stop:()=>{},isActive:async()=>true});
  await broker.handle(1,msg('a','start',0));expect((await broker.handle(1,msg('a','speak',1))).ok).toBe(false);
});
