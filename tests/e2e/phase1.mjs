// Dependency-free real Chrome smoke test. Builds must exist: npm run build.
// CHROME_PATH can select another Chrome binary supporting Extensions.loadUnpacked.
import assert from 'node:assert/strict';
import { runCrossSite } from './cross-site.mjs';
import { runUiRedesign } from './ui-redesign.mjs';
import { runBulkCorrections } from './bulk-corrections.mjs';
import { runUserMode } from './user-mode.mjs';
import { build } from 'esbuild';
import { spawn } from 'node:child_process';
import { createServer } from 'node:http';
import { readFile, mkdtemp, writeFile, rm, mkdir } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { resolve, join } from 'node:path';

const work = await mkdtemp(join(tmpdir(), 'accesslens-simulator-'));
const profile = join(work, 'profile');
const html = await readFile('demo-site/index.html');
const compatibility = await readFile('demo-site/compatibility.html');
const bulkHtml = await readFile('demo-site/bulk-corrections.html');
const userHtml = await readFile('demo-site/user-mode.html');
const server = createServer((req, res) => {
  res.setHeader('Content-Type', 'text/html');
  if (req.url === '/bare') return res.end('<!doctype html><body>Bare text<p>Wrapped content</p></body>');
  if (req.url.startsWith('/bulk-corrections.html')) return res.end(bulkHtml);
  if (req.url.startsWith('/user-mode.html')) return res.end(userHtml);
  if (req.url.startsWith('/compatibility.html')) return res.end(compatibility);
  if (req.url === '/base') return res.end(html.toString().replace('<head>', '<head><base href="/">'));
  res.end(req.url === '/unsupported' ? '<!doctype html><style>body {filter:sepia(1)}</style><body><h1>Unsafe ancestor</h1></body>' : html);
});
await new Promise(r => server.listen(0, '127.0.0.1', r));
const url = `http://127.0.0.1:${server.address().port}`;
const chrome = spawn(process.env.CHROME_PATH || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', [
  '--headless=new', '--no-first-run', '--no-default-browser-check',
  '--remote-debugging-port=0', '--enable-unsafe-extension-debugging',
  `--user-data-dir=${profile}`, '--window-size=1280,900', 'about:blank',
]);
let socket;
try {
  const endpoint = await new Promise((ok, fail) => {
    let stderr = '';
    chrome.stderr.on('data', chunk => {
      stderr += chunk;
      const match = stderr.match(/DevTools listening on (ws:\/\/\S+)/);
      if (match) ok(match[1]);
    });
    chrome.on('error', fail);
    chrome.on('exit', code => fail(new Error(`Chrome exited ${code}: ${stderr}`)));
  });
  socket = new WebSocket(endpoint);
  await new Promise(r => socket.addEventListener('open', r, { once: true }));
  let id = 0;
  const pending = new Map();
  const extensionErrors = [];
  socket.addEventListener('message', ({ data }) => {
    const msg = JSON.parse(data);
    if (!msg.id) {
      if (msg.method === 'Runtime.consoleAPICalled' && msg.params.type === 'error' && JSON.stringify(msg.params.stackTrace).includes('chrome-extension://')) extensionErrors.push('Extension console error');
      if (msg.method === 'Runtime.exceptionThrown') {
        const details = msg.params.exceptionDetails;
        if (JSON.stringify(details).includes('chrome-extension://')) extensionErrors.push(details.text);
      }
      return;
    }
    const promise = pending.get(msg.id);
    pending.delete(msg.id);
    if (msg.error) promise.reject(new Error(JSON.stringify(msg.error)));
    else promise.resolve(msg.result);
  });
  function cdp(method, params = {}, sessionId) {
    return new Promise((resolve, reject) => {
      const callId = ++id;
      pending.set(callId, { resolve, reject });
      socket.send(JSON.stringify({ id: callId, method, params, sessionId }));
    });
  }
  // A second site already open before extension installation/reload.
  const staleUrl = url.replace('127.0.0.1','localhost') + '/compatibility.html';
  const staleTarget = await cdp('Target.createTarget', {url:staleUrl});
  const staleSession = await cdp('Target.attachToTarget',{targetId:staleTarget.targetId,flatten:true});
  const staleCall = (method,params)=>cdp(method,params,staleSession.sessionId);
  async function staleValue(expression) {
    const result=await staleCall('Runtime.evaluate',{expression,returnByValue:true});
    return result.result.value;
  }
  for(let i=0;i<100;i++) {
    if(await staleValue('document.readyState === "complete" && Boolean(document.querySelector("#navigate"))')) break;
    await new Promise(r=>setTimeout(r,50));
  }
  const extension = await cdp('Extensions.loadUnpacked', { path: resolve('.output/chrome-mv3') });
  const { targetId } = await cdp('Target.createTarget', { url: 'about:blank' });
  const { sessionId } = await cdp('Target.attachToTarget', { targetId, flatten: true });
  const call = (method, params) => cdp(method, params, sessionId);
  async function evaluate(expression) {
    const result = await call('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true });
    if (result.exceptionDetails) throw new Error(JSON.stringify(result.exceptionDetails));
    return result.result.value;
  }
  async function triggerToolbar() {
    await call('Page.bringToFront');
    const href = await evaluate('location.href');
    const {targetInfos} = await cdp('Target.getTargets',{filter:[{type:'tab',exclude:false},{exclude:true}]});
    const tab = targetInfos.find(info=>info.url===href);
    assert.ok(tab,'Browser tab target must exist');
    await cdp('Extensions.triggerAction',{id:extension.id,targetId:tab.targetId});
  }
  async function waitFor(expression) {
    for (let n = 0; n < 100; n++) {
      if (await evaluate(expression)) return;
      if (expression.includes('shadowRoot') && n % 10 === 2 && !await evaluate("Boolean(document.querySelector('accesslens-panel'))")) {
        await triggerToolbar();
      }
      await new Promise(r => setTimeout(r, 50));
    }
    throw new Error(`Timed out: ${expression}`);
  }
  const shadow = `document.querySelector('accesslens-panel')?.shadowRoot`;
  const button = label => `[...${shadow}.querySelectorAll('button')].find(b => (b.getAttribute('aria-label') || b.textContent) === ${JSON.stringify(label)})`;
  const owned = `document.querySelectorAll('[data-accesslens-simulator-owned]').length`;
  async function select(label) {
    await evaluate(`${button(label)}.click()`);
    await evaluate('new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)))');
  }
  async function screenshot(name, selector) {
    const clip = await evaluate(`(() => { const r = (${selector}).getBoundingClientRect(); return {x:r.x+scrollX,y:r.y+scrollY,width:r.width,height:r.height,scale:1}; })()`);
    const { data } = await call('Page.captureScreenshot', { clip, captureBeyondViewport: true });
    await writeFile(join(work, name + '.png'), Buffer.from(data, 'base64'));
    return data;
  }
  await call('Page.enable');
  await call('Runtime.enable');
  if (process.env.ACCESSLENS_USER_ONLY) {
    await runUserMode({call,evaluate,waitFor,select,shadow,triggerToolbar,work,url,deactivate:()=>cdp('Extensions.uninstall',{id:extension.id})});
  } else if (process.env.ACCESSLENS_BULK_ONLY) {
    await runBulkCorrections({call,evaluate,waitFor,select,shadow,triggerToolbar,work,url,deactivate:()=>cdp('Extensions.uninstall',{id:extension.id})});
  } else {
  if (process.env.ACCESSLENS_CROSS_SITE) await runCrossSite({call,evaluate,waitFor,select,shadow,owned,work,extensionErrors});
  await call('Page.navigate', { url });
  await waitFor(`${shadow}?.querySelector('button')`);
  await runUiRedesign({call,evaluate,waitFor,select,shadow,triggerToolbar,work});
  await evaluate(`window.originalNodes = [...document.body.children].filter(n => n.localName !== 'accesslens-panel'); window.originalParents = originalNodes.map(n=>n.parentNode)`);
  assert.equal(await evaluate(owned), 0);
  await select('Low Acuity');
  await triggerToolbar();
  await waitFor(`!document.querySelector('accesslens-panel') && ${owned} === 0`);
  await triggerToolbar();
  await waitFor(`${shadow}?.querySelector('button')`);
  assert.equal(await evaluate(`document.querySelectorAll('accesslens-panel').length`),1);
  assert.equal(await evaluate(owned),0);
  assert.match(await evaluate(`${shadow}.querySelector('[role=status]').textContent`), /Off/);
  console.log('PASS actual toolbar open/close/reopen, effect cleanup, no duplicate panel');
  await select('Protanopia');
  await staleCall('Page.bringToFront');
  const staleTabs=await cdp('Target.getTargets',{filter:[{type:'tab',exclude:false},{exclude:true}]});
  const staleTab=staleTabs.targetInfos.find(info=>info.url===staleUrl);
  await cdp('Extensions.triggerAction',{id:extension.id,targetId:staleTab.targetId});
  let staleOpened=false;
  for(let i=0;i<100;i++) {
    if(await staleValue(`Boolean(document.querySelector('accesslens-panel')?.shadowRoot?.querySelector('button'))`)){staleOpened=true;break;}
    await new Promise(r=>setTimeout(r,50));
  }
  assert.ok(staleOpened,'Switching to a site opened before extension load must open its panel without refresh');
  assert.equal(await staleValue(`document.querySelectorAll('accesslens-panel').length`),1);
  await staleValue(`[...document.querySelector('accesslens-panel').shadowRoot.querySelectorAll('button')].find(b=>b.getAttribute('aria-label')==='Low Acuity').click()`);
  assert.equal(await staleValue(`getComputedStyle(document.querySelector('main')).filter`),'blur(2px)');
  assert.match(await evaluate(`${shadow}.querySelector('[role=status]').textContent`),/Protanopia/);
  await triggerToolbar(); // closes only the first tab's panel and effects
  await waitFor(`!document.querySelector('accesslens-panel') && ${owned} === 0`);
  assert.equal(await staleValue(`document.querySelectorAll('accesslens-panel').length`),1);
  assert.equal(await staleValue(`getComputedStyle(document.querySelector('main')).filter`),'blur(2px)');
  await cdp('Target.closeTarget',{targetId:staleTarget.targetId});
  await triggerToolbar();
  await waitFor(`${shadow}?.querySelector('button')`);
  console.log('PASS switch to pre-existing second site without refresh; tab-local state and close');

  // Browser tools/other extensions can inject body siblings into the real demo.
  await evaluate(`(() => {const peer=document.createElement('div'); peer.id='third-party-overlay'; peer.textContent='External overlay'; peer.style.cssText='position:fixed;top:0;right:0'; document.body.append(peer);})()`);
  await select('Protanopia');
  assert.equal(await evaluate(`${shadow}.querySelector('[role=alert]')?.textContent || ''`), '');
  assert.equal(await evaluate(owned), 2);
  assert.notEqual(await evaluate(`getComputedStyle(document.querySelector('#third-party-overlay')).filter`), 'none');
  await select('Reset');
  assert.equal(await evaluate(owned), 0);
  assert.equal(await evaluate(`getComputedStyle(document.querySelector('accesslens-panel')).position`), 'fixed');
  // Real pointer event -> applied state and a completed intervening paint
  // opportunity (two rAFs). This is a paint proxy, not a GPU presentation trace.
  const timings = {};
  for (let round=0; round<4; round++) {
    for (const label of ['Protanopia','Deuteranopia','Tritanopia','Low Acuity','Off']) {
      const point = await evaluate(`(() => {const b=${button(label)}; const r=b.getBoundingClientRect(); window.modeLatency=new Promise(resolve=>b.addEventListener('click',()=>{const start=performance.now();requestAnimationFrame(()=>requestAnimationFrame(()=>resolve({ms:performance.now()-start,selected:b.getAttribute('aria-pressed'),filter:getComputedStyle(document.querySelector('main')).filter})));},{once:true,capture:true})); return {x:r.x+r.width/2,y:r.y+r.height/2};})()`);
      await call('Input.dispatchMouseEvent', {type:'mousePressed',button:'left',clickCount:1,...point});
      await call('Input.dispatchMouseEvent', {type:'mouseReleased',button:'left',clickCount:1,...point});
      const sample = await evaluate('modeLatency');
      assert.equal(sample.selected, 'true');
      assert.equal(sample.filter === 'none', label === 'Off');
      assert.ok(sample.ms < 300, `${label} exceeded 300 ms: ${sample.ms}`);
      (timings[label] ??= []).push(sample.ms);
    }
  }
  const performanceReport = Object.fromEntries(Object.entries(timings).map(([label, samples])=>[label,{samples:samples.length, maxMs:Math.max(...samples), meanMs:samples.reduce((a,b)=>a+b,0)/samples.length}]));
  await writeFile(join(work,'performance.json'), JSON.stringify(performanceReport,null,2));
  console.log('PASS action-to-paint proxy <300ms:', JSON.stringify(performanceReport));
  await select('Reset');
  // Visionless uses native page focus/activation under a pointer-transparent blackout.
  await evaluate(`const button=document.createElement('button');button.id='visionless-native-activation';button.textContent='Native action';window.nativeClicks=0;button.addEventListener('click',()=>window.nativeClicks++);document.querySelector('main').append(button)`);
  await select('Visionless');
  await select('Visionless');
  await select('Collapse Perspective');
  const expandPoint=await evaluate(`(()=>{const b=${button('Expand Perspective')};const r=b.getBoundingClientRect();return {x:r.x+r.width/2,y:r.y+r.height/2};})()`);
  const expandShot=await call('Page.captureScreenshot',{clip:{...expandPoint,width:1,height:1,scale:1}});
  const expandPixel=await evaluate(`(async()=>{const img=await createImageBitmap(await(await fetch('data:image/png;base64,${expandShot.data}')).blob());const c=document.createElement('canvas');c.width=1;c.height=1;const ctx=c.getContext('2d');ctx.drawImage(img,0,0);return [...ctx.getImageData(0,0,1,1).data];})()`);
  assert.ok(expandPixel.slice(0,3).some(v=>v>0),'Collapsed expand icon must paint above the blackout');
  await call('Input.dispatchMouseEvent',{type:'mousePressed',button:'left',clickCount:1,...expandPoint});
  await call('Input.dispatchMouseEvent',{type:'mouseReleased',button:'left',clickCount:1,...expandPoint});
  assert.equal(await evaluate(`${shadow}.querySelectorAll('[data-accesslens-visionless]').length`),1);

  assert.equal(await evaluate(`${shadow}.querySelectorAll('[data-accesslens-visionless]').length`),1);
  assert.equal(await evaluate(`${shadow}.querySelector('[data-accesslens-visionless]').style.pointerEvents`),'none');
  const blackout = await call('Page.captureScreenshot');
  await writeFile(join(work,'visionless.png'),Buffer.from(blackout.data,'base64'));
  const blackPixel=await evaluate(`(async()=>{const blob=await(await fetch('data:image/png;base64,${blackout.data}')).blob();const img=await createImageBitmap(blob);const c=document.createElement('canvas');c.width=img.width;c.height=img.height;const ctx=c.getContext('2d');ctx.drawImage(img,0,0);return [...ctx.getImageData(50,100,1,1).data];})()`);
  assert.deepEqual(blackPixel,[0,0,0,255]);
  assert.equal(await evaluate(`getComputedStyle(document.querySelector('accesslens-panel')).filter`),'none');
  await evaluate(`document.querySelector('input[name=name]').focus()`);
  await call('Input.insertText',{text:'Visionless input'});
  await call('Input.dispatchKeyEvent',{type:'keyDown',key:'Tab',code:'Tab',windowsVirtualKeyCode:9});
  await call('Input.dispatchKeyEvent',{type:'keyUp',key:'Tab',code:'Tab',windowsVirtualKeyCode:9});
  assert.equal(await evaluate('document.activeElement.localName'),'select');
  await call('Input.dispatchKeyEvent',{type:'keyDown',key:'Tab',code:'Tab',windowsVirtualKeyCode:9,modifiers:8});
  await call('Input.dispatchKeyEvent',{type:'keyUp',key:'Tab',code:'Tab',windowsVirtualKeyCode:9,modifiers:8});
  assert.equal(await evaluate('document.activeElement.name'),'name');
  await evaluate(`document.querySelector('#visionless-native-activation').focus()`);
  for(const [key,code,virtual,text] of [['Enter','Enter',13,'\r'],[' ','Space',32,' ']]) {
    await call('Input.dispatchKeyEvent',{type:'keyDown',key,code,windowsVirtualKeyCode:virtual,text});
    await call('Input.dispatchKeyEvent',{type:'keyUp',key,code,windowsVirtualKeyCode:virtual});
  }
  assert.equal(await evaluate('nativeClicks'),2);
  await evaluate('new Promise(r=>setTimeout(r,200))');
  console.log('VISIONLESS Chrome TTS status:',await evaluate(`${shadow}.querySelector('p[aria-live=polite]:not([role])')?.textContent`));
  await call('Input.dispatchKeyEvent',{type:'keyDown',key:'Escape',code:'Escape',windowsVirtualKeyCode:27});
  await select('Exit Visionless');
  assert.equal(await evaluate(`${shadow}.querySelectorAll('[data-accesslens-visionless]').length`),0);
  assert.equal(await evaluate(`document.querySelector('input[name=name]').value`),'Visionless input');
  await evaluate(`document.querySelector('input[name=name]').value='';document.querySelector('#visionless-native-activation').remove();scrollTo(0,0)`);
  console.log('PASS Visionless blackout pixels, panel exclusion, native Tab/Shift+Tab, Escape, Exit and preserved input');
  const panelBefore = await screenshot('panel-off', `${shadow}.querySelector('h1')`);
  const swatchBefore = await screenshot('swatch-off', `document.querySelector('.red')`);
  const baselineHeight = await evaluate('document.documentElement.scrollHeight');
  const painted = new Set();
  const svgModes = ['Protanopia', 'Deuteranopia', 'Tritanopia', 'Achromatopsia'];
  for (const mode of ['Protanopia', 'Deuteranopia', 'Tritanopia', 'Achromatopsia', 'Cataracts', 'Low Contrast', 'Low Acuity']) {
    await select(mode);
    assert.equal(await evaluate(owned), svgModes.includes(mode) ? 2 : 1);
    assert.equal(await evaluate(`${shadow}.querySelector('[role=alert]')?.textContent || ''`), '');
    assert.equal(await evaluate(`getComputedStyle(document.querySelector('accesslens-panel')).filter`), 'none');
    assert.equal(await screenshot(`panel-${mode === 'Low Acuity' ? 'blur' : 'color'}`, `${shadow}.querySelector('h1')`), panelBefore, 'Panel heading pixels must remain identical');
    assert.notEqual(await screenshot(`swatch-${mode === 'Low Acuity' ? 'blur' : 'color'}`, `document.querySelector('.red')`), swatchBefore, 'Page pixels must change');
    if (svgModes.includes(mode)) {
      const crop = await screenshot('reference-' + mode, `document.querySelector('.red')`);
      painted.add(crop);
      const pixel = await evaluate(`(async () => {const b=await (await fetch('data:image/png;base64,${crop}')).blob(); const img=await createImageBitmap(b); const c=document.createElement('canvas'); c.width=img.width;c.height=img.height;const ctx=c.getContext('2d');ctx.drawImage(img,0,0);return [...ctx.getImageData(120,85,1,1).data];})()`);
      // Independent reference fixture: linear-light matrix output for #e00000.
      const expected = { Protanopia: [94,82,0,255], Deuteranopia: [142,125,0,255], Tritanopia: [248,0,12,255], Achromatopsia: [111,111,111,255] }[mode];
      assert.ok(pixel.every((v,i)=>Math.abs(v-expected[i])<=3), `${mode} reference ${pixel} vs ${expected}`);
    }
    assert.equal(await evaluate('document.documentElement.scrollHeight'), baselineHeight);
    // Actual keyboard input into the existing form, not replacement DOM.
    await evaluate(`document.querySelector('input[name=name]').focus(); document.querySelector('input[name=name]').value = ''`);
    await call('Input.insertText', { text: 'Phase zero' });
    await evaluate(`document.querySelector('select').value='Urgent'; document.querySelector('input[type=checkbox]').click(); document.querySelector('#demo-form').requestSubmit()`);
    assert.equal(await evaluate(`document.querySelector('#saved').textContent`), ' Saved: Phase zero');
    await evaluate(`document.querySelector('#open-dialog').click()`);
    assert.equal(await evaluate(`document.querySelector('dialog').open`), true);
    assert.notEqual(await evaluate(`getComputedStyle(document.querySelector('dialog')).filter`), 'none');
    await evaluate(`document.querySelector('dialog input').focus()`);
    await call('Input.insertText', { text: 'Modal works' });
    assert.match(await evaluate(`document.querySelector('dialog input').value`), /Modal works/);
    await evaluate(`document.querySelector('dialog button').click()`);
    await evaluate(`document.querySelector('header a[href="#bottom"]').click()`);
    assert.ok(await evaluate('scrollY') > 0);
    assert.equal(await evaluate(`Math.round(document.querySelector('header').getBoundingClientRect().top)`), 0);
    assert.equal(await evaluate(`Math.round(document.querySelector('.sticky').getBoundingClientRect().top)`), 78);
    await evaluate('scrollTo(0,0)');
    await call('Input.dispatchMouseEvent', {type:'mouseWheel',x:100,y:300,deltaX:0,deltaY:400});
    await waitFor('scrollY > 0');
    await evaluate(`document.querySelector('.scroll-box').scrollTop=200`);
    const scroll = await evaluate(`({window:scrollY,nested:document.querySelector('.scroll-box').scrollTop})`);
    await select('Reset');
    assert.equal(await evaluate(owned), 0);
    assert.deepEqual(await evaluate(`({window:scrollY,nested:document.querySelector('.scroll-box').scrollTop})`), scroll);
    assert.equal(await evaluate(`document.querySelector('input[name=name]').value`), 'Phase zero');
    assert.equal(await evaluate(`getComputedStyle(document.querySelector('.existing-filter')).filter`), 'grayscale(1)');
    assert.ok(await evaluate('originalNodes.every((n,i)=>n.isConnected && n.parentNode===originalParents[i])'));
    await evaluate('scrollTo(0,0)');
    assert.equal(await screenshot('swatch-restored', `document.querySelector('.red')`), swatchBefore);
    console.log(`PASS ${mode}: painted page, identical panel pixels, forms, modal, anchors, fixed header, scrolling and Reset`);
  }
  assert.equal(painted.size, 4, 'Four color-matrix presets must paint distinctly');
  // Keyboard-operate simulator controls. Repeated selections do not add nodes.
  await call('Emulation.setFocusEmulationEnabled', { enabled: true });
  await evaluate(`${button('Protanopia')}.focus()`);
  assert.equal(await evaluate(`${shadow}.activeElement?.getAttribute('aria-label')`), 'Protanopia');
  await call('Input.dispatchKeyEvent', { type: 'keyDown', key: 'Enter', code: 'Enter', text: '\r', windowsVirtualKeyCode: 13 });
  await call('Input.dispatchKeyEvent', { type: 'keyUp', key: 'Enter', code: 'Enter', windowsVirtualKeyCode: 13 });
  assert.equal(await evaluate(owned), 2);
  for (let i=0; i<20; i++) {
    await select('Protanopia'); assert.equal(await evaluate(owned), 2);
    await select('Low Acuity'); assert.equal(await evaluate(owned), 1);
  }
  await select('Off'); await select('Off'); await select('Reset');
  assert.equal(await evaluate(owned), 0);
  assert.equal(await evaluate(`document.querySelectorAll('accesslens-panel').length`), 1);
  console.log('PASS keyboard activation, 40 switches, duplicate requests, Off/Reset ownership cleanup');
  // Verify the complete Phase 2 keyboard order and selected-state semantics.
  assert.equal(await evaluate(`${shadow}.querySelector('[role=tab]').getAttribute('aria-selected')`), 'true');
  assert.match(await evaluate(`${shadow}.textContent`), /approximations.*do not represent any individual.s lived visual experience/s);
  await evaluate(`${button('Off')}.focus()`);
  for (const label of ['Protanopia','Deuteranopia','Tritanopia','Visionless','Achromatopsia','Cataracts','Low Contrast','Low Acuity']) {
    await call('Input.dispatchKeyEvent', {type:'keyDown',key:'Tab',code:'Tab',windowsVirtualKeyCode:9});
    await call('Input.dispatchKeyEvent', {type:'keyUp',key:'Tab',code:'Tab',windowsVirtualKeyCode:9});
    assert.equal(await evaluate(`${shadow}.activeElement.getAttribute('aria-label')`), label);
    await call('Input.dispatchKeyEvent', {type:'keyDown',key:'Enter',code:'Enter',text:'\r',windowsVirtualKeyCode:13});
    await call('Input.dispatchKeyEvent', {type:'keyUp',key:'Enter',code:'Enter',windowsVirtualKeyCode:13});
    assert.match(await evaluate(`${shadow}.querySelector('[role=status]').textContent`), new RegExp(label));
    assert.equal(await evaluate(`${shadow}.querySelectorAll('fieldset button[aria-pressed=true]').length`), 1);
  }
  await call('Input.dispatchKeyEvent', {type:'keyDown',key:'Tab',code:'Tab',windowsVirtualKeyCode:9});
  assert.equal(await evaluate(`${shadow}.activeElement.getAttribute('role')`), 'slider');
  assert.ok(await evaluate(`Boolean(${shadow}.getElementById(${shadow}.activeElement.getAttribute('aria-labelledby')))`));
  await call('Input.dispatchKeyEvent', {type:'keyDown',key:'Tab',code:'Tab',windowsVirtualKeyCode:9});
  assert.equal(await evaluate(`${shadow}.activeElement.textContent`), 'Reset');
  await call('Input.dispatchKeyEvent', {type:'keyDown',key:'Enter',code:'Enter',text:'\r',windowsVirtualKeyCode:13});
  await call('Input.dispatchKeyEvent', {type:'keyUp',key:'Enter',code:'Enter',windowsVirtualKeyCode:13});
  assert.equal(await evaluate(owned), 0);
  assert.match(await evaluate(`${shadow}.querySelector('[role=status]').textContent`), /Off/);
  console.log('PASS Simulator tab, disclaimer, all mode buttons, slider and Reset keyboard order');
  // Test the React-independent engine through a bundled test-only entrypoint.
  const bundle = await build({ stdin: { contents: "export { createSimulationEngine } from './src/features/simulator/simulation-engine';", resolveDir: process.cwd() }, bundle:true, write:false, format:'iife', globalName:'engineTest' });
  await evaluate(bundle.outputFiles[0].text);
  await evaluate(`window.testEngine=engineTest.createSimulationEngine(document,document.querySelector('accesslens-panel'))`);
  await evaluate(`testEngine.apply('blur', 99); window.styleBefore=document.querySelector('[data-accesslens-simulator-owned]')`);
  assert.equal(await evaluate(`getComputedStyle(document.querySelector('main')).filter`), 'blur(8px)');
  await evaluate(`testEngine.apply('blur', -2)`);
  assert.equal(await evaluate(`getComputedStyle(document.querySelector('main')).filter`), 'blur(0px)');
  assert.ok(await evaluate(`styleBefore === document.querySelector('[data-accesslens-simulator-owned]')`));
  await evaluate(`testEngine.apply('blur', 2.3)`);
  assert.equal(await evaluate(`getComputedStyle(document.querySelector('main')).filter`), 'blur(2.5px)');
  for (const invalid of ['NaN','Infinity', "'bad'"]) {
    assert.ok(await evaluate(`(() => {try {testEngine.apply('blur', ${invalid}); return false;} catch {return true;}})()`));
    assert.equal(await evaluate(owned), 0);
  }
  await evaluate(`testEngine.apply('protanopia'); window.svgBefore=document.querySelector('svg[data-accesslens-simulator-owned]'); testEngine.apply('tritanopia')`);
  assert.ok(await evaluate(`svgBefore === document.querySelector('svg[data-accesslens-simulator-owned]')`));
  // Force a DOM failure after partial SVG creation: rollback must remove it.
  assert.ok(await evaluate(`(() => {testEngine.reset();const append=document.head.append;document.head.append=()=>{throw new Error('injected failure')};try {testEngine.apply('protanopia');return false;}catch{return true;}finally{document.head.append=append;}})()`));
  assert.equal(await evaluate(owned), 0);
  await evaluate(`testEngine.apply('blur');testEngine.dispose();testEngine.dispose()`);
  assert.equal(await evaluate(owned), 0);
  assert.ok(await evaluate(`(() => {try{testEngine.apply('blur');return false;}catch{return true;}})()`));
  // Compare max-blur paint immediately below the fixed header boundary.
  await evaluate('scrollTo(0,0)');
  async function edgeCapture(name) {
    const {data} = await call('Page.captureScreenshot');
    await writeFile(join(work, name + '.png'), Buffer.from(data, 'base64'));
    const y = await evaluate(`Math.ceil(document.querySelector('header').getBoundingClientRect().bottom) + 6`);
    return evaluate(`(async () => {const b=await (await fetch('data:image/png;base64,${data}')).blob();const img=await createImageBitmap(b);const c=document.createElement('canvas');c.width=img.width;c.height=img.height;const ctx=c.getContext('2d');ctx.drawImage(img,0,0);return [...ctx.getImageData(200,${y},1,1).data];})()`);
  }
  const edgeOff = await edgeCapture('header-off');
  await evaluate(`window.clipEngine=engineTest.createSimulationEngine(document,document.querySelector('accesslens-panel'));clipEngine.apply('blur',8)`);
  assert.equal(await evaluate(`getComputedStyle(document.querySelector('header')).clipPath`), 'inset(0px)');
  const edgeClipped = await edgeCapture('header-max-blur-clipped');
  assert.deepEqual(edgeClipped, edgeOff, 'No blur paint may leak below header');
  await evaluate(`document.querySelector('style[data-accesslens-simulator-owned]').textContent=document.querySelector('style[data-accesslens-simulator-owned]').textContent.replace('clip-path: inset(0) !important;', '')`);
  const edgeUnclipped = await edgeCapture('header-max-blur-before');
  assert.notDeepEqual(edgeUnclipped, edgeOff, 'Comparison must reproduce original halo');
  await evaluate(`clipEngine.apply('protanopia')`);
  assert.equal(await evaluate(`getComputedStyle(document.querySelector('header')).clipPath`), 'none');
  await evaluate(`clipEngine.reset();document.querySelector('header').style.clipPath='inset(1px)'`);
  await evaluate(`clipEngine.apply('blur',8)`);
  assert.equal(await evaluate(owned), 1);
  assert.equal(await evaluate(`document.querySelector('header').style.clipPath`), 'inset(1px)');
  await evaluate(`document.querySelector('header').style.removeProperty('clip-path');clipEngine.dispose()`);
  assert.equal(await evaluate(`getComputedStyle(document.querySelector('header')).clipPath`), 'none');
  console.log('PASS max blur halo pixel comparison, color/reset clipping removal, author clip-path preservation');
  // Real range keyboard interaction updates the active effect without a reload.
  await select('Low Acuity');
  await evaluate(`${shadow}.querySelector('[role=slider]').focus()`);
  await call('Input.dispatchKeyEvent', {type:'keyDown',key:'ArrowRight',code:'ArrowRight',windowsVirtualKeyCode:39});
  await call('Input.dispatchKeyEvent', {type:'keyUp',key:'ArrowRight',code:'ArrowRight',windowsVirtualKeyCode:39});
  assert.equal(await evaluate(`getComputedStyle(document.querySelector('main')).filter`), 'blur(2.5px)');
  await select('Protanopia');
  assert.equal(await evaluate(`${shadow}.querySelector('[role=slider]')`), null);
  await select('Reset');
  await select('Low Acuity');
  assert.equal(await evaluate(`getComputedStyle(document.querySelector('main')).filter`), 'blur(2px)');
  await select('Off');
  console.log('PASS blur bounds/steps/nonfinite values, node reuse, partial-failure rollback, dispose and keyboard slider');
  // Compose with author root filters; reject filtered ancestors that affect UI.
  await evaluate(`document.querySelector('main').style.filter='sepia(1)'`);
  await select('Protanopia');
  assert.match(await evaluate(`getComputedStyle(document.querySelector('main')).filter`), /sepia.*url/);
  await select('Reset');
  assert.equal(await evaluate(`getComputedStyle(document.querySelector('main')).filter`), 'sepia(1)');
  await evaluate(`document.body.style.filter='sepia(1)'`);
  await select('Protanopia');
  assert.equal(await evaluate(owned), 0);
  assert.match(await evaluate(`${shadow}.querySelector('[role=alert]').textContent`), /Unsupported layout/);
  assert.match(await evaluate(`${shadow}.querySelector('[role=status]').textContent`), /Off/);
  assert.equal(await evaluate(`${button('Off')}.getAttribute('aria-pressed')`), 'true');
  assert.equal(await evaluate(`document.querySelector('main').style.filter`), 'sepia(1)');
  await evaluate(`document.body.style.removeProperty('filter');document.querySelector('main').style.removeProperty('filter')`);
  await select('Low Acuity');
  await call('Page.reload');
  await waitFor(`${shadow}?.querySelector('button')`);
  assert.equal(await evaluate(owned), 0);
  await select('Protanopia');
  // Explicit lifecycle hook exercises the same cleanup used by navigation.
  await evaluate(`dispatchEvent(new PageTransitionEvent('pagehide'))`);
  assert.equal(await evaluate(owned), 0);
  assert.equal(await evaluate(`document.querySelectorAll('accesslens-panel').length`), 0);
  await evaluate(`dispatchEvent(new PageTransitionEvent('pageshow',{persisted:true}))`);
  await waitFor(`${shadow}?.querySelector('button')`);
  assert.equal(await evaluate(owned), 0);
  // Unmarked content, SPA route changes, root replacement and async errors.
  await evaluate(`document.body.removeAttribute('data-accesslens-simulator-demo');document.querySelectorAll('[data-accesslens-simulator-target]').forEach(n=>n.removeAttribute('data-accesslens-simulator-target'))`);
  await select('Protanopia');
  await evaluate(`window.removedRoot=document.querySelector('main');const replacement=document.createElement('article');replacement.id='spa-root';replacement.innerHTML='<h1>New route</h1><input aria-label="SPA input">';removedRoot.replaceWith(replacement);history.pushState({},'', '/spa-route')`);
  await waitFor(`getComputedStyle(document.querySelector('#spa-root')).filter !== 'none'`);
  assert.equal(await evaluate(owned),2);
  assert.equal(await evaluate(`removedRoot.getAttributeNames().filter(n=>n.startsWith('data-accesslens-spike-')).length`),0);
  await evaluate(`document.querySelector('#spa-root').style.filter='grayscale(0.5)'`);
  await waitFor(`/grayscale.*url/.test(getComputedStyle(document.querySelector('#spa-root')).filter)`);
  await evaluate(`document.querySelector('style[data-accesslens-simulator-owned]').remove();document.querySelector('svg[data-accesslens-simulator-owned]').remove()`);
  await waitFor(`${owned} === 2`);
  await evaluate(`history.pushState({},'', '/route-without-replacement')`);
  await waitFor(`getComputedStyle(document.querySelector('#spa-root')).filter.includes('/route-without-replacement')`);
  await select('Low Acuity');
  await evaluate(`window.detachedRoot=document.querySelector('#spa-root');const next=document.createElement('section');next.id='late-root';next.textContent='Late route content';detachedRoot.replaceWith(next)`);
  await waitFor(`getComputedStyle(document.querySelector('#late-root')).filter === 'blur(2px)'`);
  assert.equal(await evaluate(owned),1);
  // Replace only website body in this fixture; adapter reattaches its own panel.
  await evaluate(`const body=document.createElement('body');body.innerHTML='<article id="new-body-root">New body</article>';document.body.replaceWith(body)`);
  await waitFor(`document.querySelector('accesslens-panel') && getComputedStyle(document.querySelector('#new-body-root')).filter === 'blur(2px)'`);
  assert.equal(await evaluate(`document.querySelectorAll('accesslens-panel').length`),1);
  await evaluate(`document.body.style.filter='sepia(1)'`);
  await waitFor(`${shadow}.querySelector('[role=alert]')`);
  assert.equal(await evaluate(owned),0);
  assert.match(await evaluate(`${shadow}.querySelector('[role=status]').textContent`),/Off/);
  await evaluate(`document.body.style.removeProperty('filter')`);
  await select('Reset');
  assert.equal(await evaluate(`document.querySelectorAll('*').length > 0 && [...document.querySelectorAll('*')].some(n=>n.getAttributeNames().some(a=>a.startsWith('data-accesslens-spike-')))`),false);
  console.log('PASS unmarked layout, SPA/root/body replacement, composed author filters, async Off/error and marker cleanup');
  await select('Visionless');
  await evaluate(`const a=document.createElement('a');a.href=${JSON.stringify(url.replace('127.0.0.1','localhost')+'/compatibility.html')};a.id='visionless-navigation-link';a.textContent='Next page';document.body.append(a);a.focus()`);
  await call('Input.dispatchKeyEvent',{type:'keyDown',key:'Enter',code:'Enter',text:'\r',windowsVirtualKeyCode:13});
  await call('Input.dispatchKeyEvent',{type:'keyUp',key:'Enter',code:'Enter',windowsVirtualKeyCode:13});
  let carried=false;
  for(let attempt=0;attempt<100;attempt++){
    if(await evaluate(`location.pathname==='/compatibility.html' && Boolean(${shadow}?.querySelector('[data-accesslens-visionless]'))`)){carried=true;break;}
    await new Promise(r=>setTimeout(r,50));
  }
  assert.ok(carried,'Enter navigation must restore Visionless automatically without a toolbar click');
  const isolatedTab=await cdp('Target.createTarget',{url:url+'/base'});
  const isolatedSession=await cdp('Target.attachToTarget',{targetId:isolatedTab.targetId,flatten:true});
  await new Promise(r=>setTimeout(r,300));
  const isolatedState=await cdp('Runtime.evaluate',{expression:`Boolean(document.querySelector('accesslens-panel'))`,returnByValue:true},isolatedSession.sessionId);
  assert.equal(isolatedState.result.value,false,'Visionless continuation must not leak into another tab');
  await cdp('Target.closeTarget',{targetId:isolatedTab.targetId});
  await call('Page.bringToFront');
  await select('Exit Visionless');
  await call('Page.reload');
  await evaluate('new Promise(r=>setTimeout(r,400))');
  assert.equal(await evaluate(`Boolean(${shadow}?.querySelector('[data-accesslens-visionless]'))`),false);
  console.log('PASS Visionless Enter navigation carry-over and explicit Exit clearing it');
  await call('Page.navigate', { url: url + '/compatibility.html' });
  await waitFor(`${shadow}?.querySelector('button')`);
  await select('Tritanopia');
  await evaluate(`document.querySelector('#navigate').click()`);
  await waitFor(`getComputedStyle(document.querySelector('#route')).filter !== 'none'`);
  assert.match(await evaluate(`${shadow}.querySelector('[role=status]').textContent`), /Tritanopia/);
  await evaluate(`document.querySelector('#overlay').click()`);
  await waitFor(`/contrast.*url/.test(getComputedStyle(document.querySelector('aside')).filter)`);
  await select('Reset');
  assert.equal(await evaluate(owned),0);
  assert.equal(await evaluate(`getComputedStyle(document.querySelector('aside')).filter`), 'contrast(1.05)');
  console.log('PASS runnable unmarked SPA demo controls and original author-filter restoration');
  await call('Page.navigate', { url: url + '/base' });
  await waitFor(`${shadow}?.querySelector('button')`);
  await select('Protanopia');
  assert.equal(await evaluate(owned), 2);
  assert.equal(await evaluate(`${shadow}.querySelector('[role=alert]')`), null);
  await select('Reset');
  await call('Page.navigate', { url: url + '/bare' });
  await waitFor(`${shadow}?.querySelector('button')`);
  await select('Protanopia');
  assert.equal(await evaluate(owned),0);
  assert.match(await evaluate(`${shadow}.querySelector('[role=alert]').textContent`), /bare body text/);
  await call('Page.navigate', { url: url + '/unsupported' });
  await waitFor(`${shadow}?.querySelector('button')`);
  await select('Low Acuity');
  assert.equal(await evaluate(owned), 0);
  assert.match(await evaluate(`${shadow}.querySelector('[role=alert]').textContent`), /Unsupported layout/);
  await select('Reset');
  assert.equal(await evaluate(`${shadow}.querySelector('[role=alert]')`), null);
  console.log('PASS author-filter composition and ancestor refusal, reload Off, pagehide cleanup, pageshow remount, unsupported-page recovery');
  await call('Page.navigate', { url });
  await waitFor(`${shadow}?.querySelector('button')`);
  // A narrow viewport exercises panel bounds without changing website structure.
  await call('Emulation.setDeviceMetricsOverride', { width: 480, height: 900, deviceScaleFactor: 1, mobile: false });
  await select('Low Acuity');
  assert.ok(await evaluate(`(() => {const r=${shadow}.querySelector('section').getBoundingClientRect(); return r.left>=0 && r.right<=innerWidth && r.bottom<=innerHeight;})()`));
  const capture = await call('Page.captureScreenshot');
  await writeFile(join(work, 'narrow-blur.png'), Buffer.from(capture.data, 'base64'));
  await select('Protanopia');
  // A temporary management-capable extension controls ONLY our test extension.
  // This checks real disable/re-enable behavior without touching user profiles.
  const helperDir = join(work,'management-helper');
  await mkdir(helperDir);
  await writeFile(join(helperDir,'manifest.json'), JSON.stringify({manifest_version:3,name:'Perspective test lifecycle helper',version:'1.0',permissions:['management']}));
  await writeFile(join(helperDir,'control.html'), '<!doctype html><title>Test helper</title>');
  const helper = await cdp('Extensions.loadUnpacked', {path:helperDir});
  const helperTarget = await cdp('Target.createTarget', {url:`chrome-extension://${helper.id}/control.html`});
  const helperSession = await cdp('Target.attachToTarget', {targetId:helperTarget.targetId,flatten:true});
  for (let attempt=0; attempt<100; attempt++) {
    const ready = await cdp('Runtime.evaluate', {expression:'Boolean(globalThis.chrome?.management?.setEnabled)',returnByValue:true},helperSession.sessionId);
    if (ready.result.value) break;
    if (attempt === 99) throw new Error('Management helper did not become ready');
    await new Promise(r=>setTimeout(r,50));
  }
  async function setEnabled(enabled) {
    const result = await cdp('Runtime.evaluate', {expression:`chrome.management.setEnabled(${JSON.stringify(extension.id)},${enabled})`,awaitPromise:true,userGesture:true,returnByValue:true},helperSession.sessionId);
    assert.equal(result.exceptionDetails, undefined);
  }
  await select('Low Acuity');
  await setEnabled(false);
  await waitFor(`${owned} === 0 && !document.querySelector('accesslens-panel')`);
  assert.equal(await evaluate(`getComputedStyle(document.querySelector('main')).filter`), 'none');
  assert.equal(await evaluate(`getComputedStyle(document.querySelector('main')).clipPath`), 'none');
  await setEnabled(true);
  await call('Page.reload');
  await waitFor(`${shadow}?.querySelector('button')`);
  assert.equal(await evaluate(owned),0);
  assert.match(await evaluate(`${shadow}.querySelector('[role=status]').textContent`), /Off/);
  await select('Low Acuity');
  await cdp('Extensions.uninstall', { id: extension.id });
  await waitFor(`${owned} === 0 && !document.querySelector('accesslens-panel')`);
  console.log('PASS narrow viewport panel bounds and actual extension disable/re-enable/uninstall cleanup');
  }
  console.log('Chrome:', (await cdp('Browser.getVersion')).product);
  console.log('Screenshots:', work);
} finally {
  socket?.close();
  server.close();
  if (chrome.exitCode === null && chrome.signalCode === null) {
    const exited = new Promise(r => chrome.once('exit', r));
    chrome.kill();
    await exited;
  }
  await rm(profile, { recursive: true, force: true });
}
