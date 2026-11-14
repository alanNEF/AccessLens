// Dependency-free real Chrome smoke test. Builds must exist: npm run build.
// CHROME_PATH can select another Chrome binary supporting Extensions.loadUnpacked.
import assert from 'node:assert/strict';
import { build } from 'esbuild';
import { spawn } from 'node:child_process';
import { createServer } from 'node:http';
import { readFile, mkdtemp, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { resolve, join } from 'node:path';

const work = await mkdtemp(join(tmpdir(), 'accesslens-phase0-'));
const profile = join(work, 'profile');
const html = await readFile('demo-site/index.html');
const server = createServer((req, res) => {
  res.setHeader('Content-Type', 'text/html');
  res.end(req.url === '/unsupported' ? '<!doctype html><body><h1>Unmarked page</h1></body>' : html);
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
  socket.addEventListener('message', ({ data }) => {
    const msg = JSON.parse(data);
    if (!msg.id) return;
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
  const extension = await cdp('Extensions.loadUnpacked', { path: resolve('.output/chrome-mv3') });
  const { targetId } = await cdp('Target.createTarget', { url: 'about:blank' });
  const { sessionId } = await cdp('Target.attachToTarget', { targetId, flatten: true });
  const call = (method, params) => cdp(method, params, sessionId);
  async function evaluate(expression) {
    const result = await call('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true });
    if (result.exceptionDetails) throw new Error(JSON.stringify(result.exceptionDetails));
    return result.result.value;
  }
  async function waitFor(expression) {
    for (let n = 0; n < 100; n++) {
      if (await evaluate(expression)) return;
      await new Promise(r => setTimeout(r, 50));
    }
    throw new Error(`Timed out: ${expression}`);
  }
  const shadow = `document.querySelector('accesslens-panel')?.shadowRoot`;
  const button = label => `[...${shadow}.querySelectorAll('button')].find(b => b.textContent === ${JSON.stringify(label)})`;
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
  await call('Page.navigate', { url });
  await waitFor(`${shadow}?.querySelector('button')`);
  await evaluate(`window.originalNodes = [...document.body.children].filter(n => n.localName !== 'accesslens-panel'); window.originalParents = originalNodes.map(n=>n.parentNode)`);
  assert.equal(await evaluate(owned), 0);
  // Browser tools/other extensions can inject body siblings into the real demo.
  await evaluate(`(() => {const peer=document.createElement('div'); peer.id='third-party-overlay'; peer.textContent='External overlay'; peer.style.cssText='position:fixed;top:0;right:0'; document.body.append(peer);})()`);
  await select('Protanopia');
  assert.equal(await evaluate(`${shadow}.querySelector('[role=alert]')?.textContent || ''`), '');
  assert.equal(await evaluate(owned), 2);
  assert.equal(await evaluate(`getComputedStyle(document.querySelector('#third-party-overlay')).filter`), 'none');
  await select('Reset');
  assert.equal(await evaluate(owned), 0);
  assert.equal(await evaluate(`getComputedStyle(document.querySelector('accesslens-panel')).position`), 'fixed');
  const panelBefore = await screenshot('panel-off', `${shadow}.querySelector('h1')`);
  const swatchBefore = await screenshot('swatch-off', `document.querySelector('.red')`);
  const baselineHeight = await evaluate('document.documentElement.scrollHeight');
  const painted = new Set();
  for (const mode of ['Protanopia', 'Deuteranopia', 'Tritanopia', 'Low Acuity']) {
    await select(mode);
    assert.equal(await evaluate(owned), mode === 'Low Acuity' ? 1 : 2);
    assert.equal(await evaluate(`${shadow}.querySelector('[role=alert]')?.textContent || ''`), '');
    assert.equal(await evaluate(`getComputedStyle(document.querySelector('accesslens-panel')).filter`), 'none');
    assert.equal(await screenshot(`panel-${mode === 'Low Acuity' ? 'blur' : 'color'}`, `${shadow}.querySelector('h1')`), panelBefore, 'Panel heading pixels must remain identical');
    assert.notEqual(await screenshot(`swatch-${mode === 'Low Acuity' ? 'blur' : 'color'}`, `document.querySelector('.red')`), swatchBefore, 'Page pixels must change');
    if (mode !== 'Low Acuity') {
      const crop = await screenshot('reference-' + mode, `document.querySelector('.red')`);
      painted.add(crop);
      const pixel = await evaluate(`(async () => {const b=await (await fetch('data:image/png;base64,${crop}')).blob(); const img=await createImageBitmap(b); const c=document.createElement('canvas'); c.width=img.width;c.height=img.height;const ctx=c.getContext('2d');ctx.drawImage(img,0,0);return [...ctx.getImageData(120,85,1,1).data];})()`);
      // Independent reference fixture: linear-light matrix output for #e00000.
      const expected = { Protanopia: [94,82,0,255], Deuteranopia: [142,125,0,255], Tritanopia: [248,0,12,255] }[mode];
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
  assert.equal(painted.size, 3, 'Three presets must paint distinctly');
  // Keyboard-operate simulator controls. Repeated selections do not add nodes.
  await call('Emulation.setFocusEmulationEnabled', { enabled: true });
  await evaluate(`${button('Protanopia')}.focus()`);
  assert.equal(await evaluate(`${shadow}.activeElement?.textContent`), 'Protanopia');
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
  assert.match(await evaluate(`${shadow}.textContent`), /approximations.*not anyone’s lived experience/s);
  await evaluate(`${button('Off')}.focus()`);
  for (const label of ['Protanopia','Deuteranopia','Tritanopia','Low Acuity']) {
    await call('Input.dispatchKeyEvent', {type:'keyDown',key:'Tab',code:'Tab',windowsVirtualKeyCode:9});
    await call('Input.dispatchKeyEvent', {type:'keyUp',key:'Tab',code:'Tab',windowsVirtualKeyCode:9});
    assert.equal(await evaluate(`${shadow}.activeElement.textContent`), label);
    await call('Input.dispatchKeyEvent', {type:'keyDown',key:'Enter',code:'Enter',text:'\r',windowsVirtualKeyCode:13});
    await call('Input.dispatchKeyEvent', {type:'keyUp',key:'Enter',code:'Enter',windowsVirtualKeyCode:13});
    assert.match(await evaluate(`${shadow}.querySelector('[role=status]').textContent`), new RegExp(label));
    assert.equal(await evaluate(`${shadow}.querySelectorAll('button[aria-pressed=true]').length`), 1);
  }
  await call('Input.dispatchKeyEvent', {type:'keyDown',key:'Tab',code:'Tab',windowsVirtualKeyCode:9});
  assert.equal(await evaluate(`${shadow}.activeElement.type`), 'range');
  assert.ok(await evaluate(`${shadow}.activeElement.labels.length > 0`));
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
  // Real range keyboard interaction updates the active effect without a reload.
  await select('Low Acuity');
  await evaluate(`${shadow}.querySelector('input[type=range]').focus()`);
  await call('Input.dispatchKeyEvent', {type:'keyDown',key:'ArrowRight',code:'ArrowRight',windowsVirtualKeyCode:39});
  await call('Input.dispatchKeyEvent', {type:'keyUp',key:'ArrowRight',code:'ArrowRight',windowsVirtualKeyCode:39});
  assert.equal(await evaluate(`getComputedStyle(document.querySelector('main')).filter`), 'blur(2.5px)');
  await select('Protanopia');
  assert.equal(await evaluate(`${shadow}.querySelector('input[type=range]')`), null);
  await select('Reset');
  await select('Low Acuity');
  assert.equal(await evaluate(`getComputedStyle(document.querySelector('main')).filter`), 'blur(2px)');
  await select('Off');
  console.log('PASS blur bounds/steps/nonfinite values, node reuse, partial-failure rollback, dispose and keyboard slider');
  // Existing root filters and ancestor filters must fail without overwriting them.
  await evaluate(`document.querySelector('main').style.filter='sepia(1)'`);
  await select('Protanopia');
  assert.equal(await evaluate(owned), 0);
  assert.match(await evaluate(`${shadow}.querySelector('[role=alert]').textContent`), /Unsupported layout/);
  assert.match(await evaluate(`${shadow}.querySelector('[role=status]').textContent`), /Off/);
  assert.equal(await evaluate(`${button('Off')}.getAttribute('aria-pressed')`), 'true');
  assert.equal(await evaluate(`document.querySelector('main').style.filter`), 'sepia(1)');
  await evaluate(`document.querySelector('main').style.removeProperty('filter')`);
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
  await call('Page.navigate', { url: url + '/unsupported' });
  await waitFor(`${shadow}?.querySelector('button')`);
  await select('Low Acuity');
  assert.equal(await evaluate(owned), 0);
  assert.match(await evaluate(`${shadow}.querySelector('[role=alert]').textContent`), /only the marked/);
  await select('Reset');
  assert.equal(await evaluate(`${shadow}.querySelector('[role=alert]')`), null);
  console.log('PASS existing-root-filter refusal, reload Off, pagehide cleanup, pageshow remount, unsupported-page recovery');
  await call('Page.navigate', { url });
  await waitFor(`${shadow}?.querySelector('button')`);
  // A narrow viewport exercises panel bounds without changing website structure.
  await call('Emulation.setDeviceMetricsOverride', { width: 480, height: 900, deviceScaleFactor: 1, mobile: false });
  await select('Low Acuity');
  assert.ok(await evaluate(`(() => {const r=${shadow}.querySelector('section').getBoundingClientRect(); return r.left>=0 && r.right<=innerWidth && r.bottom<=innerHeight;})()`));
  const capture = await call('Page.captureScreenshot');
  await writeFile(join(work, 'narrow-blur.png'), Buffer.from(capture.data, 'base64'));
  await select('Protanopia');
  await cdp('Extensions.uninstall', { id: extension.id });
  await waitFor(`${owned} === 0 && !document.querySelector('accesslens-panel')`);
  console.log('PASS narrow viewport panel bounds and actual extension uninstall cleanup');
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
