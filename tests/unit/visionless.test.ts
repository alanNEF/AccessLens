import { beforeEach, describe, expect, it, vi } from 'vitest';
import { describeElement } from '../../src/features/simulator/visionless/accessible-label';
const speech = vi.hoisted(()=>({speak:vi.fn(async()=>{}),stop:vi.fn(async()=>{}),dispose:vi.fn()}));
vi.mock('../../src/features/simulator/visionless/speech-client',()=>({createSpeechClient:()=>speech}));
import { createVisionlessEngine } from '../../src/features/simulator/visionless/visionless-engine';
import { createSimulationEngine } from '../../src/features/simulator/simulation-engine';
beforeEach(()=>{document.body.innerHTML='';document.head.innerHTML='';vi.clearAllMocks();});
function announcement(html:string,selector='button') {document.body.innerHTML=html;return describeElement(document.querySelector(selector)!)?.announcement;}
describe('lightweight accessible labels',()=>{
  it('visible text, icon aria label, native label and labelledby priority',()=>{
    expect(announcement('<button>Submit</button>')).toBe('Submit, button');
    expect(announcement('<button aria-label="Open menu">☰</button>')).toBe('Open menu, button');
    expect(announcement('<label for="email">Email address</label><input id="email">','input')).toBe('Email address, edit text');
    expect(announcement('<span id="x">Save</span><button aria-labelledby="x" aria-label="ignored">Other</button>')).toBe('Save, button');
  });
  it('unlabeled, hidden and empty labels',()=>{
    expect(announcement('<button><span hidden>Secret</span></button>')).toBe('Unlabeled button');
    expect(announcement('<span id="x" style="display:none">Secret</span><button aria-labelledby="x"></button>')).toBe('Unlabeled button');
    expect(announcement('<button aria-label=" "> </button>')).toBe('Unlabeled button');
  });
  it('states and common roles without values',()=>{
    expect(announcement('<input type="checkbox" aria-label="Remember me" checked>','input')).toBe('Remember me, checkbox, checked');
    expect(announcement('<input type="checkbox">','input')).toContain('unchecked');
    expect(announcement('<input type="radio" aria-label="Standard" checked>','input')).toContain('selected');
    expect(announcement('<button disabled aria-expanded="false">Continue</button>')).toBe('Continue, button, disabled, collapsed');
    expect(announcement('<input required aria-label="Email">','input')).toContain('required');
    expect(announcement('<select aria-label="Country"><option>Private</option></select>','select')).toBe('Country, combo box');
    expect(announcement('<a href="#">Home</a>','a')).toBe('Home, link');
  });
  it('never reads passwords, values, placeholders, or control contents in labels',()=>{
    expect(announcement('<input type="password" aria-label="Password" value="secret123">','input')).toBe('Password, edit text, password');
    expect(announcement('<input value="private@example.com" placeholder="secret">','input')).toBe('Unlabeled edit text');
    expect(announcement('<label>Message<textarea>private message</textarea></label>','textarea')).toBe('Message, edit text');
  });
});
it('one overlay and listener set; panel focus excluded; native keys untouched; cleanup',()=>{
  const host=document.createElement('accesslens-panel');document.body.append(host);const shadow=host.attachShadow({mode:'open'});shadow.innerHTML='<button>Panel button</button>';
  const page=document.createElement('button');page.textContent='Page button';document.body.append(page);
  const engine=createVisionlessEngine(document,host);
  engine.enable();engine.enable();expect(shadow.querySelectorAll('[data-accesslens-visionless]')).toHaveLength(1);
  const overlay=shadow.querySelector<HTMLElement>('[data-accesslens-visionless]')!;
  expect(overlay.style.pointerEvents).toBe('none');
  speech.speak.mockClear();page.focus();expect(speech.speak).toHaveBeenCalledExactlyOnceWith('Page button, button');
  shadow.querySelector('button')!.focus();expect(speech.speak).toHaveBeenCalledTimes(1);
  const tab=new KeyboardEvent('keydown',{key:'Tab',cancelable:true,bubbles:true});page.dispatchEvent(tab);expect(tab.defaultPrevented).toBe(false);
  page.dispatchEvent(new KeyboardEvent('keydown',{key:'Escape',bubbles:true}));expect(speech.stop).toHaveBeenCalledTimes(1);
  engine.disable();expect(overlay.isConnected).toBe(false);expect(speech.dispose).toHaveBeenCalledTimes(1);
  speech.speak.mockClear();page.focus();expect(speech.speak).not.toHaveBeenCalled();
});
it('switching existing modes removes blackout and speech; Reset/dispose idempotent',()=>{
  const host=document.createElement('accesslens-panel');document.body.innerHTML='<main>Content</main>';document.body.append(host);host.attachShadow({mode:'open'});
  const engine=createSimulationEngine(document,host);
  engine.apply('visionless');engine.apply('visionless');expect(host.shadowRoot!.querySelectorAll('[data-accesslens-visionless]')).toHaveLength(1);
  engine.apply('protanopia');expect(host.shadowRoot!.querySelector('[data-accesslens-visionless]')).toBeNull();expect(speech.dispose).toHaveBeenCalledTimes(1);
  engine.apply('visionless');engine.reset();engine.reset();engine.dispose();expect(host.shadowRoot!.querySelector('[data-accesslens-visionless]')).toBeNull();expect(document.querySelector('[data-accesslens-simulator-owned]')).toBeNull();
});
