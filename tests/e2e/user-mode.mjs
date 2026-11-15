import assert from 'node:assert/strict';
import { writeFile } from 'node:fs/promises';
import { join } from 'node:path';

/** Production extension tests using the repository's isolated real-Chrome harness. */
export async function runUserMode({ call, evaluate, waitFor, select, shadow, triggerToolbar, work, url, deactivate }) {
  const status = `${shadow}.querySelector('#user-mode-status')`;
  const toggle = `${shadow}.querySelector('[role=switch][aria-label="Enable Accessibility Improvements"]')`;
  const ids = ['bulk-first', 'bulk-second', 'bulk-large', 'bulk-review', 'bulk-passing'];
  const styles = `${JSON.stringify(ids)}.map(id=>{const el=document.getElementById(id);return [id,el.hasAttribute('style'),[...el.style].map(p=>[p,el.style.getPropertyValue(p),el.style.getPropertyPriority(p)])]})`;
  const colors = `${JSON.stringify(ids)}.map(id=>getComputedStyle(document.getElementById(id)).color)`;
  const bulk = `${shadow}.querySelector('section[aria-label="Bulk contrast corrections"]')`;
  const frame = () => evaluate('new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)))');
  async function tab(label) {
    const point = await evaluate(`(()=>{const n=[...${shadow}.querySelectorAll('[role=tab]')].find(n=>n.textContent===${JSON.stringify(label)});const r=n.getBoundingClientRect();return {x:r.x+r.width/2,y:r.y+r.height/2}})()`);
    await call('Input.dispatchMouseEvent', { type: 'mousePressed', button: 'left', clickCount: 1, ...point });
    await call('Input.dispatchMouseEvent', { type: 'mouseReleased', button: 'left', clickCount: 1, ...point });
    await frame();
  }
  async function enabled(count) {
    await waitFor(`${status}?.textContent.includes('${count} ${count === 1 ? 'improvement' : 'improvements'} applied')`);
    assert.equal(await evaluate(`${toggle}.getAttribute('aria-checked')`), 'true');
    assert.equal(await evaluate(`${shadow}.querySelectorAll('.inspector-highlight, [aria-label="Bulk contrast corrections"], [aria-label="AccessLens features"]').length`), 0);
  }
  async function scanAndBulk() {
    await tab('Inspector');
    await select('Scan page');
    await waitFor(`${shadow}.querySelector('section[aria-label="Failures"]')`);
    await tab('Fixer');
    await select('Run All Corrections');
    await waitFor(`${bulk}.getAttribute('aria-busy')==='false' && ${bulk}.querySelectorAll('input:checked').length===3`);
  }
  await call('Page.navigate', { url: url + '/user-mode.html' });
  await waitFor(`${shadow}?.querySelector('button')`);
  const original = await evaluate(styles);
  const originalColors = await evaluate(colors);
  await select('Protanopia');
  await scanAndBulk();
  await select('User');
  assert.deepEqual(await evaluate(styles), original);
  assert.equal(await evaluate(`getComputedStyle(document.querySelector('main')).filter`), 'none');
  assert.equal(await evaluate(`${toggle}.getAttribute('aria-checked')`), 'false');
  assert.match(await evaluate(`${status}.textContent`), /turned off/);
  assert.equal(await evaluate(`${shadow}.querySelectorAll('.inspector-highlight').length`), 0);
  // Native keyboard activation of the main switch, with visible focus styles.
  await evaluate(`${toggle}.focus()`);
  await call('Input.dispatchKeyEvent', { type: 'keyDown', key: ' ', code: 'Space', windowsVirtualKeyCode: 32, text: ' ' });
  await call('Input.dispatchKeyEvent', { type: 'keyUp', key: ' ', code: 'Space', windowsVirtualKeyCode: 32 });
  await enabled(3);
  const fixed = await evaluate(colors);
  fixed.slice(0, 3).forEach((color, i) => assert.notEqual(color, originalColors[i]));
  assert.deepEqual(fixed.slice(3), originalColors.slice(3), 'Unsupported and passing text must remain unchanged');
  const ratios = await evaluate(`(()=>{
    const luminance=c=>c.match(/[\\d.]+/g).slice(0,3).map(Number).map(v=>{v/=255;return v<=.04045?v/12.92:((v+.055)/1.055)**2.4}).reduce((s,v,i)=>s+v*[.2126,.7152,.0722][i],0);
    return ['bulk-first','bulk-second','bulk-large'].map(id=>{const s=getComputedStyle(document.getElementById(id)),a=luminance(s.color),b=luminance(s.backgroundColor);return (Math.max(a,b)+.05)/(Math.min(a,b)+.05)});
  })()`);
  ratios.forEach((ratio, i) => assert.ok(ratio >= (i === 2 ? 3 : 4.5)));
  await select('Restore Original Page');
  assert.deepEqual(await evaluate(styles), original);
  for (let i = 0; i < 2; i++) {
    await select('Enable Accessibility Improvements');
    await enabled(3);
    await select('Enable Accessibility Improvements');
    assert.deepEqual(await evaluate(styles), original);
  }
  console.log('PASS User Mode switch, automatic count/contrast, keyboard toggle, no highlights/checklist, precise repeat restoration');

  await select('Enable Accessibility Improvements');
  await enabled(3);
  // A live market/timer updates text and animation styles continuously. It must
  // not cause restoration/reapplication of corrections on unrelated text.
  await evaluate(`window.liveCorrectionWrites=0;window.liveWatcher=new MutationObserver(rs=>liveCorrectionWrites+=rs.length);['bulk-first','bulk-second','bulk-large'].forEach(id=>liveWatcher.observe(document.getElementById(id),{attributes:true,attributeFilter:['style']}));document.getElementById('toggle-live').click();new Promise(r=>setTimeout(r,2600))`);
  assert.notEqual(await evaluate(`document.getElementById('live-quote').textContent`), '$100.00');
  assert.equal(await evaluate('liveCorrectionWrites'), 0, 'Live page updates must not refresh existing corrections');
  await enabled(3);
  await evaluate(`document.getElementById('toggle-live').click()`);
  // Normal typing and click listeners stay available; no Inspector capture handlers.
  await evaluate(`document.getElementById('note').focus()`);
  await call('Input.insertText', { text: 'My page note' });
  await evaluate(`document.getElementById('page-action').click();document.getElementById('add-text').click()`);
  await enabled(4);
  assert.equal(await evaluate('liveCorrectionWrites'), 0, 'New content must leave unrelated corrections applied');
  await evaluate('liveWatcher.disconnect()');
  assert.equal(await evaluate(`document.getElementById('note').value`), 'My page note');
  assert.equal(await evaluate(`document.getElementById('action-result').textContent`), 'The page action worked.');
  const dynamicFixed = await evaluate(`getComputedStyle(document.getElementById('dynamic-1')).color`);
  assert.notEqual(dynamicFixed, 'rgb(170, 170, 170)');
  await evaluate(`document.getElementById('bulk-second').outerHTML='<p id="bulk-second" class="low-contrast">Replacement text needs stronger contrast.</p>'`);
  await enabled(4);
  await waitFor(`getComputedStyle(document.getElementById('bulk-second')).color!=='rgb(170, 170, 170)'`);
  const { data } = await call('Page.captureScreenshot');
  await writeFile(join(work, 'user-mode.png'), Buffer.from(data, 'base64'));
  // Observe at least two debounce windows: our corrections must not cause more writes/scans.
  await evaluate(`window.ownWriteCount=0;window.testObserver=new MutationObserver(rs=>window.ownWriteCount+=rs.filter(r=>r.type==='attributes'&&r.attributeName==='style'&&r.target.localName!=='accesslens-panel').length);testObserver.observe(document.body,{subtree:true,attributes:true});new Promise(r=>setTimeout(r,1900))`);
  assert.equal(await evaluate('ownWriteCount'), 0, 'Correction writes must not cause an infinite rescan loop');
  await evaluate('testObserver.disconnect()');
  await select('Developer');
  assert.deepEqual(await evaluate(styles), original);
  assert.equal(await evaluate(`document.getElementById('dynamic-1').hasAttribute('style')`), false);
  await tab('Simulator');
  await select('Low Acuity');
  assert.equal(await evaluate(`getComputedStyle(document.querySelector('main')).filter`), 'blur(2px)');
  await select('User');
  await select('Enable Accessibility Improvements');
  await enabled(4);
  await evaluate(`document.getElementById('bulk-first').style.setProperty('color','blue');document.getElementById('bulk-first').style.setProperty('padding','9px')`);
  await select('Restore Original Page');
  assert.equal(await evaluate(`document.getElementById('bulk-first').style.color`), 'blue');
  assert.equal(await evaluate(`document.getElementById('bulk-first').style.padding`), '9px');
  console.log('PASS dynamic additions/replacements, normal typing/actions, no rescan loop, Developer simulator return and author style preservation');

  await call('Page.navigate', { url: url + '/user-mode.html' });
  await waitFor(`${shadow}?.querySelector('button')`);
  await select('User');
  await evaluate(`document.querySelectorAll('.low-contrast,.gradient').forEach(el=>el.remove())`);
  await select('Enable Accessibility Improvements');
  await waitFor(`${status}.textContent.includes('No supported improvements were found')`);
  await select('Restore Original Page');
  await call('Page.navigate', { url: url + '/user-mode.html' });
  await waitFor(`${shadow}?.querySelector('button')`);
  await select('User');
  await select('Enable Accessibility Improvements');
  await enabled(3);
  await evaluate(`history.pushState({},'', '/new-user-route')`);
  await waitFor(`${toggle}.getAttribute('aria-checked')==='false'`);
  assert.deepEqual(await evaluate(styles), original);
  await select('Enable Accessibility Improvements');
  await enabled(3);
  await triggerToolbar();
  await waitFor(`!document.querySelector('accesslens-panel')`);
  assert.deepEqual(await evaluate(styles), original);
  await triggerToolbar();
  await waitFor(`${shadow}?.querySelector('button')`);
  await select('User');
  assert.equal(await evaluate(`${toggle}.getAttribute('aria-checked')`), 'false');
  if (process.env.ACCESSLENS_USER_SITE_URL) {
    const site = process.env.ACCESSLENS_USER_SITE_URL;
    const navigation = await call('Page.navigate', { url: site });
    assert.ok(!navigation.errorText, navigation.errorText);
    await waitFor(`${shadow}?.querySelector('button')`);
    await evaluate(`void(window.userOriginals=[...document.querySelectorAll('body *')].filter(el=>el.style&&el.localName!=='accesslens-panel').map(el=>({el,value:el.style.getPropertyValue('color'),priority:el.style.getPropertyPriority('color'),hadStyle:el.hasAttribute('style')})))`);
    await select('User');
    await select('Enable Accessibility Improvements');
    await waitFor(`${status}.textContent.includes('improvements active') || ${status}.textContent.includes('No supported improvements')`);
    await evaluate(`window.siteCheckingStates=0;new Promise(resolve=>{const poll=setInterval(()=>{if(${status}.textContent.includes('Checking this page')) siteCheckingStates++},50);setTimeout(()=>{clearInterval(poll);resolve()},4000)})`);
    assert.equal(await evaluate('siteCheckingStates'), 0, 'Live site updates must not restart the loading state');
    const message = await evaluate(`${status}.textContent`);
    assert.equal(await evaluate(`${shadow}.querySelectorAll('.inspector-highlight').length`), 0);
    await select('Restore Original Page');
    assert.ok(await evaluate(`userOriginals.every(({el,value,priority,hadStyle})=>!el.isConnected||(el.style.getPropertyValue('color')===value&&el.style.getPropertyPriority('color')===priority&&el.hasAttribute('style')===hadStyle))`));
    console.log(`PASS real-site User Mode and exact restoration: ${site}: ${message}`);
    await call('Page.navigate', { url: url + '/user-mode.html' });
    await waitFor(`${shadow}?.querySelector('button')`);
    await select('User');
  }
  await select('Enable Accessibility Improvements');
  await enabled(3);
  await deactivate();
  await waitFor(`!document.querySelector('accesslens-panel')`);
  assert.deepEqual(await evaluate(styles), original);
  console.log('PASS empty page message, SPA consent reset, toolbar close/reopen, and extension uninstall restoration');
}
