import assert from 'node:assert/strict';
import { writeFile } from 'node:fs/promises';
import { join } from 'node:path';

/** Runs against the production extension using the existing isolated Chrome/CDP harness. */
export async function runBulkCorrections({ call, evaluate, waitFor, select, shadow, triggerToolbar, work, url, deactivate }) {
  const bulk = `${shadow}.querySelector('section[aria-label="Bulk contrast corrections"]')`;
  const boxes = `${bulk}.querySelectorAll('input[type=checkbox]')`;
  const checked = `${bulk}.querySelectorAll('input:checked').length`;
  const frame = () => evaluate('new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)))');
  async function tab(label) {
    const point = await evaluate(`(() => {const n=[...${shadow}.querySelectorAll('[role=tab]')].find(n => n.textContent === ${JSON.stringify(label)});const r=n.getBoundingClientRect();return {x:r.x+r.width/2,y:r.y+r.height/2};})()`);
    await call('Input.dispatchMouseEvent', { type: 'mousePressed', button: 'left', clickCount: 1, ...point });
    await call('Input.dispatchMouseEvent', { type: 'mouseReleased', button: 'left', clickCount: 1, ...point });
    await frame();
  }
  async function scan() {
    await tab('Inspector');
    await select('Scan page');
    await waitFor(`${shadow}.querySelector('section[aria-label="Failures"]')`);
    await tab('Fixer');
  }
  async function run() {
    await select('Run All Corrections');
    await waitFor(`${bulk}.getAttribute('aria-busy') === 'false' && ${boxes}.length === 3`);
  }
  const styles = `['bulk-first','bulk-second','bulk-large','bulk-review','bulk-passing'].map(id => {const el=document.getElementById(id);return {id,hasStyle:el.hasAttribute('style'),properties:[...el.style].map(name=>[name,el.style.getPropertyValue(name),el.style.getPropertyPriority(name)])};})`;
  const colors = `['bulk-first','bulk-second','bulk-large'].map(id => getComputedStyle(document.getElementById(id)).color)`;
  await call('Page.navigate', { url: url + '/bulk-corrections.html' });
  await waitFor(`${shadow}?.querySelector('button')`);
  const original = await evaluate(styles);
  const originalColors = await evaluate(colors);
  await tab('Fixer');
  await select('Run All Corrections');
  await waitFor(`${bulk}.getAttribute('aria-busy') === 'false'`);
  assert.match(await evaluate(`${bulk}.textContent`), /No supported corrections/);
  await tab('Simulator');
  await select('Protanopia');
  await scan();
  await run();
  assert.equal(await evaluate(checked), 3);
  assert.match(await evaluate(`${bulk}.textContent`), /3 of 3 corrections enabled/);
  assert.match(await evaluate(`${bulk}.textContent`), /manual-review/);
  const fixedColors = await evaluate(colors);
  fixedColors.forEach((color, index) => assert.notEqual(color, originalColors[index]));
  assert.match(await evaluate(`getComputedStyle(document.querySelector('main')).filter`), /url/);
  assert.equal(await evaluate(`getComputedStyle(document.querySelector('accesslens-panel')).filter`), 'none');
  // Independently validate actual browser colors; do not trust the displayed success label.
  const ratios = await evaluate(`(() => {
    const luminance=color=>color.match(/[\\d.]+/g).slice(0,3).map(Number).map(v=>{v/=255;return v<=0.04045?v/12.92:((v+0.055)/1.055)**2.4}).reduce((sum,v,i)=>sum+v*[0.2126,0.7152,0.0722][i],0);
    return ['bulk-first','bulk-second','bulk-large'].map(id=>{const style=getComputedStyle(document.getElementById(id));const a=luminance(style.color),b=luminance(style.backgroundColor);return (Math.max(a,b)+.05)/(Math.min(a,b)+.05);});
  })()`);
  ratios.forEach((ratio, index) => assert.ok(ratio >= (index === 2 ? 3 : 4.5)));

  await evaluate(`${boxes}[0].focus()`);
  await call('Input.dispatchKeyEvent', { type: 'keyDown', key: ' ', code: 'Space', windowsVirtualKeyCode: 32, text: ' ' });
  await call('Input.dispatchKeyEvent', { type: 'keyUp', key: ' ', code: 'Space', windowsVirtualKeyCode: 32 });
  await frame();
  assert.equal(await evaluate(checked), 2);
  assert.deepEqual(await evaluate(colors), [originalColors[0], ...fixedColors.slice(1)]);
  await evaluate(`${boxes}[0].click()`);
  await frame();
  assert.deepEqual(await evaluate(colors), fixedColors);
  await select('Deselect All');
  assert.equal(await evaluate(checked), 0);
  assert.deepEqual(await evaluate(styles), original);
  await select('Select All');
  assert.equal(await evaluate(checked), 3);
  await select('Restore Original');
  assert.deepEqual(await evaluate(styles), original);
  await run();
  await run();
  assert.equal(await evaluate(checked), 3);
  await select('Restore Original');
  assert.deepEqual(await evaluate(styles), original);
  console.log('PASS bulk generation/defaults, actual contrast, keyboard checkbox, select/deselect/restore, repeat runs and simulation isolation');

  // Inspector scans original styles even when bulk previews are enabled.
  await run();
  await scan();
  assert.deepEqual(await evaluate(styles), original);
  await run();
  await tab('Inspector');
  await select('Preview fix');
  await select('Preview fix');
  assert.equal(await evaluate(checked), 2);
  await select('Original');
  await select('Fixed');
  assert.match(await evaluate(`${shadow}.textContent`), /Measured on the page:/);
  await select('Revert');
  await select('Select All');
  assert.equal(await evaluate(checked), 3);
  await select('Restore Original');
  assert.deepEqual(await evaluate(styles), original);
  await run();
  // Replacing a target must not let the same selector receive the old correction.
  await evaluate(`${boxes}[1].click()`);
  await frame();
  await evaluate(`document.getElementById('bulk-second').replaceWith(document.getElementById('bulk-second').cloneNode(true))`);
  await evaluate(`${boxes}[1].click()`);
  await frame();
  assert.equal(await evaluate(checked), 2);
  assert.match(await evaluate(`${bulk}.textContent`), /no longer on the page/);
  assert.equal(await evaluate(`getComputedStyle(document.getElementById('bulk-second')).color`), originalColors[1]);
  await select('Restore Original');
  assert.deepEqual(await evaluate(styles), original);
  await scan();
  await run();
  const { data } = await call('Page.captureScreenshot');
  await writeFile(join(work, 'bulk-corrections.png'), Buffer.from(data, 'base64'));
  await triggerToolbar();
  await waitFor(`!document.querySelector('accesslens-panel')`);
  assert.deepEqual(await evaluate(styles), original);
  await triggerToolbar();
  await waitFor(`${shadow}?.querySelector('button')`);
  await scan();
  await run();
  await evaluate(`history.pushState({}, '', '/bulk-next-route')`);
  await waitFor(`${boxes}.length === 0`);
  assert.deepEqual(await evaluate(styles), original);
  console.log('PASS single Fixer coexistence, original-style rescans, detached targets, toolbar closure and SPA navigation cleanup');

  if (process.env.ACCESSLENS_BULK_SITE_URL) {
    const navigation = await call('Page.navigate', { url: process.env.ACCESSLENS_BULK_SITE_URL });
    assert.ok(!navigation.errorText, navigation.errorText);
    await waitFor(`${shadow}?.querySelector('button')`);
    await evaluate(`window.bulkOriginals = [...document.querySelectorAll('body *')].filter(el => el.style && el.localName !== 'accesslens-panel').map(el=>({el,value:el.style.getPropertyValue('color'),priority:el.style.getPropertyPriority('color'),hadStyle:el.hasAttribute('style')}))`);
    await scan();
    await select('Run All Corrections');
    await waitFor(`${bulk}.getAttribute('aria-busy') === 'false' && ${boxes}.length > 0`);
    const total = await evaluate(`${boxes}.length`);
    assert.equal(await evaluate(checked), total);
    await select('Restore Original');
    assert.ok(await evaluate(`bulkOriginals.every(({el,value,priority,hadStyle})=>!el.isConnected||(el.style.getPropertyValue('color')===value&&el.style.getPropertyPriority('color')===priority&&el.hasAttribute('style')===hadStyle))`));
    console.log(`PASS real-site bulk generation and exact color restoration: ${total} corrections on ${process.env.ACCESSLENS_BULK_SITE_URL}`);
    // Return to the controlled page for the extension deactivation assertion.
    await call('Page.navigate', { url: url + '/bulk-corrections.html' });
    await waitFor(`${shadow}?.querySelector('button')`);
  }
  await scan();
  await run();
  await deactivate();
  await waitFor(`!document.querySelector('accesslens-panel')`);
  assert.deepEqual(await evaluate(styles), original);
  console.log('PASS actual extension uninstall restores all active bulk previews');
}
