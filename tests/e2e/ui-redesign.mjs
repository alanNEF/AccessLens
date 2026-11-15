import assert from 'node:assert/strict';
import { writeFile } from 'node:fs/promises';
import { join } from 'node:path';

export async function runUiRedesign({ call, evaluate, waitFor, select, shadow, triggerToolbar, work }) {
  const theme = `${shadow}.querySelector('[data-theme]')`;
  const themeButton = `${shadow}.querySelector('[role="switch"]')`;
  const originalHostStyles = await evaluate(`[...document.querySelectorAll('style:not([data-accesslens-simulator-owned])')].map(n=>n.textContent)`);
  const hostState = await evaluate(`({html:document.documentElement.getAttribute('style'),classes:document.documentElement.className,body:document.body.getAttribute('style'),color:getComputedStyle(document.querySelector('main')).color,background:getComputedStyle(document.body).backgroundColor})`);
  async function key(key, code = key, vk = { Enter:13, Escape:27, ArrowDown:40, ArrowRight:39, ArrowLeft:37, Home:36, End:35 }[key]) {
    await call('Input.dispatchKeyEvent', { type:'keyDown', key, code, windowsVirtualKeyCode:vk, ...(key === 'Enter' ? { text:'\r' } : {}) });
    await call('Input.dispatchKeyEvent', { type:'keyUp', key, code, windowsVirtualKeyCode:vk });
    await evaluate('new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)))');
  }
  async function media(scheme) {
    await call('Emulation.setEmulatedMedia', { features:[{ name:'prefers-color-scheme', value:scheme }, { name:'prefers-reduced-motion', value:'reduce' }] });
  }
  async function setTheme(label) {
    if (await evaluate(`${themeButton}.getAttribute('aria-checked')`) !== String(label === 'Dark')) await evaluate(`${themeButton}.click()`);
    await evaluate('new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)))');
  }
  async function capture(name) {
    const clip = await evaluate(`(() => {const r=${shadow}.querySelector('section').getBoundingClientRect();return {x:r.x,y:r.y,width:r.width,height:r.height,scale:1};})()`);
    await writeFile(join(work, name+'.png'), Buffer.from((await call('Page.captureScreenshot',{clip})).data,'base64'));
  }
  // Collapsing preserves active effects, selected tab, and settings; focus follows.
  await select('Low Acuity');
  await evaluate(`[...${shadow}.querySelectorAll('[role=tab]')].find(n=>n.textContent==='Inspect').focus()`);
  await evaluate(`${shadow}.querySelector('button[aria-label="Collapse Perspective"]').focus()`);
  await key('Enter');
  await waitFor(`${shadow}.querySelector('button[aria-label="Expand Perspective"]')`);
  assert.equal(await evaluate(`getComputedStyle(${shadow}.querySelector('section')).display`),'none');
  assert.equal(await evaluate(`getComputedStyle(document.querySelector('main')).filter`),'blur(2px)');
  assert.equal(await evaluate(`${shadow}.activeElement.getAttribute('aria-label')`),'Expand Perspective');
  assert.ok(await evaluate(`(() => {const r=document.querySelector('accesslens-panel').getBoundingClientRect();return r.width<=48&&r.height<=48;})()`),'Collapsed host must not block the old panel area');
  await key('Enter');
  await waitFor(`!${shadow}.querySelector('section').hidden`);
  assert.equal(await evaluate(`${shadow}.activeElement.getAttribute('aria-label')`),'Collapse Perspective');
  assert.equal(await evaluate(`${shadow}.querySelector('[role=tab][aria-selected=true]').textContent`),'Inspect');
  await evaluate(`[...${shadow}.querySelectorAll('[role=tab]')].find(n=>n.textContent==='Simulate').focus()`);
  await select('Reset');
  console.log('PASS collapse/expand keyboard focus, compact host bounds and preserved simulation');
  // Switch keyboard operation, preference persistence, and local tooltips.
  await media('light');
  await waitFor(`${theme}.dataset.theme === 'light'`);
  await evaluate(`${themeButton}.focus()`);
  await key(' ', 'Space', 32);
  await waitFor(`${theme}.dataset.theme === 'dark'`);
  await capture('ui-dark');
  await triggerToolbar();
  await waitFor(`!document.querySelector('accesslens-panel')`);
  await triggerToolbar();
  await waitFor(`${theme}?.dataset.theme === 'dark'`);
  await call('Page.reload');
  await waitFor(`${theme}?.dataset.theme === 'dark'`);
  await evaluate(`${themeButton}.focus()`);
  await waitFor(`${shadow}.querySelector('[role=tooltip]')`);
  assert.equal(await evaluate(`Boolean(document.querySelector('[role=tooltip]'))`), false);
  assert.ok(await evaluate(`${shadow}.querySelector('[role=tooltip]').closest('[data-theme]') !== null`));
  await key('Escape');
  await setTheme('Light');
  await waitFor(`${theme}.dataset.theme === 'light'`);
  await media('dark');
  assert.equal(await evaluate(`${theme}.dataset.theme`),'light', 'Explicit preference overrides the system');
  await capture('ui-light');

  // Validate the actual theme token pairs used by small text and selected controls.
  for (const preference of ['Light','Dark']) {
    await setTheme(preference);
    const ratios = await evaluate(`(() => {
      const style=getComputedStyle(${theme});const c=document.createElement('canvas').getContext('2d');
      function luminance(name){c.fillStyle=style.getPropertyValue(name).trim();c.fillRect(0,0,1,1);return [...c.getImageData(0,0,1,1).data].slice(0,3).map(v=>{v/=255;return v<=0.04045?v/12.92:((v+0.055)/1.055)**2.4}).reduce((a,v,i)=>a+v*[0.2126,0.7152,0.0722][i],0)}
      return [['--foreground','--background'],['--muted-foreground','--background'],['--muted-foreground','--secondary'],['--muted-foreground','--accent'],['--accent-foreground','--accent'],['--primary-foreground','--primary']].map(([a,b])=>{const x=luminance(a),y=luminance(b);return {pair:[a,b],ratio:(Math.max(x,y)+0.05)/(Math.min(x,y)+0.05)}});
    })()`);
    for (const item of ratios) assert.ok(item.ratio >= 4.5, `${preference} ${item.pair} has contrast ${item.ratio}`);
  }
  await setTheme('Light');
  await select('Low Acuity');
  const slider = `${shadow}.querySelector('[role=slider]')`;
  const track = await evaluate(`(() => {const n=${shadow}.querySelector('[data-slot=slider-track]');n.scrollIntoView({block:'nearest'});const r=n.getBoundingClientRect();return {x:r.x+r.width*.75,y:r.y+r.height/2};})()`);
  await call('Input.dispatchMouseEvent',{type:'mousePressed',button:'left',clickCount:1,...track});
  await call('Input.dispatchMouseEvent',{type:'mouseReleased',button:'left',clickCount:1,...track});
  await waitFor(`${slider}.getAttribute('aria-valuenow') === '6'`);
  assert.equal(await evaluate(`getComputedStyle(document.querySelector('main')).filter`),'blur(6px)');
  await evaluate(`${slider}.focus()`);
  assert.equal(await evaluate(`${slider}.getAttribute('aria-valuemin')`),'0');
  assert.equal(await evaluate(`${slider}.getAttribute('aria-valuemax')`),'8');
  await key('End');
  assert.equal(await evaluate(`getComputedStyle(document.querySelector('main')).filter`),'blur(8px)');
  await key('Home');
  await key('ArrowRight');
  assert.equal(await evaluate(`getComputedStyle(document.querySelector('main')).filter`),'blur(0.5px)');
  assert.equal(await evaluate(`${slider}.getAttribute('aria-valuetext')`),'0.5 pixels of blur');
  assert.ok(await evaluate(`getComputedStyle(${slider}).outlineWidth !== '0px'`));
  // Roving keyboard tabs must keep the controller state alive across content unmounts.
  await evaluate(`${shadow}.querySelector('[role=tab][data-state=active]').focus()`);
  await key('ArrowRight');
  assert.equal(await evaluate(`${shadow}.querySelector('[role=tab][data-state=active]').textContent`),'Inspect');
  assert.equal(await evaluate(`getComputedStyle(document.querySelector('main')).filter`),'blur(0.5px)');
  await capture('ui-inspector');
  await key('ArrowRight');
  assert.equal(await evaluate(`${shadow}.querySelector('[role=tab][data-state=active]').textContent`),'Fix');
  await capture('ui-fixer');
  await key('Home');
  assert.equal(await evaluate(`${slider}.getAttribute('aria-valuenow')`),'0.5');
  await capture('ui-blur');
  const newHostState = await evaluate(`({html:document.documentElement.getAttribute('style'),classes:document.documentElement.className,body:document.body.getAttribute('style'),color:getComputedStyle(document.querySelector('main')).color,background:getComputedStyle(document.body).backgroundColor})`);
  assert.deepEqual(newHostState,hostState,'Themes must not change host classes, inline styles, or author colors');
  assert.deepEqual(await evaluate(`[...document.querySelectorAll('style:not([data-accesslens-simulator-owned])')].map(n=>n.textContent)`),originalHostStyles,'Theme and component CSS must not be injected into the host document');
  assert.ok(await evaluate(`Boolean(${shadow}.querySelector('style'))`));
  assert.equal(await evaluate(`getComputedStyle(${shadow}.querySelector('button')).transitionDuration`),'0s');
  await call('Emulation.setDeviceMetricsOverride',{width:360,height:480,deviceScaleFactor:1,mobile:false});
  assert.ok(await evaluate(`(() => {const r=${shadow}.querySelector('section').getBoundingClientRect();const s=${shadow}.querySelector('.accesslens-scroll');return r.left>=0&&r.top>=0&&r.right<=innerWidth&&r.bottom<=innerHeight&&s.scrollHeight>s.clientHeight;})()`),'Short viewport must scroll internally and stay on screen');
  assert.ok(await evaluate(`(() => {const tabs=[...${shadow}.querySelectorAll('[role=tab]')];return tabs.every(n=>{const r=n.getBoundingClientRect();return [...n.children].every(c=>{const x=c.getBoundingClientRect();return x.left>=r.left&&x.right<=r.right;});});})()`),'Tab icons must fit their controls at narrow widths');
  await capture('ui-short-viewport');
  await call('Emulation.clearDeviceMetricsOverride');
  await select('Reset');
  await media('light');
  console.log('PASS UI themes/persistence/system, local portals, switch/tabs/slider keyboard, AA theme tokens, reduced motion, host isolation and short viewport');
}
