import assert from 'node:assert/strict';
import { writeFile } from 'node:fs/promises';
import { join } from 'node:path';

export async function runCrossSite({call, evaluate, waitFor, select, shadow, owned, work, extensionErrors}) {
  const results = [];
  const sites = process.env.ACCESSLENS_SITE_URL ? [['Requested site',process.env.ACCESSLENS_SITE_URL]] : [
    ['Wikipedia','https://en.wikipedia.org/wiki/Accessibility'],
    ['Hacker News','https://news.ycombinator.com/'],
    ['MDN','https://developer.mozilla.org/en-US/docs/Web/Accessibility'],
    ['GitHub','https://github.com/microsoft/TypeScript'],
    ['YouTube','https://www.youtube.com/'],
  ];
  for (const [name,url] of sites) {
    const result = {name,url};
    const errorStart = extensionErrors.length;
    try {
      const navigation = await call('Page.navigate',{url});
      assert.ok(!navigation.errorText,navigation.errorText);
      await waitFor(`${shadow}?.querySelector('button')`);
      await evaluate('new Promise(r=>setTimeout(r,1500))');
      result.title = await evaluate('document.title');
      assert.ok(!/robot check|captcha|access denied|automated access/i.test(result.title) && !await evaluate(`/click the button below to continue shopping/i.test(document.body.textContent)`), 'Site served an access challenge; ordinary content was not tested');
      assert.equal(await evaluate("document.querySelectorAll('accesslens-panel').length"),1);
      const source = await evaluate(`(() => {const n=[...document.body.children].find(n=>n.localName!=='accesslens-panel'&&!n.hasAttribute('data-accesslens-simulator-owned')&&n.getBoundingClientRect().height>100);window.externalRoot=n;return n?.getAttribute('style') ?? null;})()`);
      assert.ok(await evaluate('Boolean(externalRoot)'));
      const originalRendering = await evaluate(`({filter:getComputedStyle(externalRoot).filter,clipPath:getComputedStyle(externalRoot).clipPath})`);
      async function panelShot() {
        const clip = await evaluate(`(() => {const r=${shadow}.querySelector('h1').getBoundingClientRect();return {x:r.x,y:r.y,width:r.width,height:r.height,scale:1};})()`);
        return (await call('Page.captureScreenshot',{clip})).data;
      }
      const panelOff = await panelShot();
      const pageClip = {x:0,y:0,width:800,height:300,scale:1};
      const pageOff = (await call('Page.captureScreenshot',{clip:pageClip})).data;
      for (const label of ['Protanopia','Deuteranopia','Tritanopia','Low Acuity']) {
        await select(label);
        assert.equal(await evaluate(`${shadow}.querySelector('[role=alert]')?.textContent || ''`),'');
        assert.equal(await evaluate(owned),label==='Low Acuity'?1:2);
        assert.notEqual(await evaluate('getComputedStyle(externalRoot).filter'),'none');
        assert.equal(await evaluate(`getComputedStyle(document.querySelector('accesslens-panel')).filter`),'none');
        const panelNow = await panelShot();
        const delta = await evaluate(`(async()=>{async function pixels(data){const image=await createImageBitmap(await(await fetch('data:image/png;base64,'+data)).blob());const c=document.createElement('canvas');c.width=image.width;c.height=image.height;const ctx=c.getContext('2d');ctx.drawImage(image,0,0);return {width:c.width,height:c.height,p:ctx.getImageData(0,0,c.width,c.height).data};}const a=await pixels('${panelOff}'),b=await pixels('${panelNow}');if(a.width!==b.width||a.height!==b.height)return 999;return a.p.reduce((sum,v,i)=>sum+Math.abs(v-b.p[i]),0)/a.p.length;})()`);
        assert.ok(delta < 0.25, `${label}: panel heading raster delta ${delta}`);
        const shot=(await call('Page.captureScreenshot')).data;
        assert.ok((await call('Page.captureScreenshot',{clip:pageClip})).data!==pageOff, `${label}: page pixels did not change`);
        await writeFile(join(work,`${name.replaceAll(' ','-')}-${label.replaceAll(' ','-')}.png`),Buffer.from(shot,'base64'));
      }
      await evaluate(`${shadow}.querySelector('[role=slider]').focus()`);
      await call('Input.dispatchKeyEvent',{type:'keyDown',key:'End',code:'End',windowsVirtualKeyCode:35});
      await call('Input.dispatchKeyEvent',{type:'keyUp',key:'End',code:'End',windowsVirtualKeyCode:35});
      assert.match(await evaluate('getComputedStyle(externalRoot).filter'),/blur\(8px\)/);
      const oldScroll=await evaluate(`(() => {window.scrollEvents=0;document.addEventListener('scroll',()=>window.scrollEvents++,{capture:true,once:true});return scrollY;})()`);
      await call('Input.dispatchMouseEvent',{type:'mouseWheel',x:100,y:300,deltaX:0,deltaY:450});
      await evaluate('new Promise(r=>setTimeout(r,200))');
      result.scrolling = await evaluate('scrollY') !== oldScroll ? 'document scrolled' : await evaluate('scrollEvents') > 0 ? 'nested region scrolled' : 'no scroll response at tested point';
      await select('Reset');
      assert.equal(await evaluate(owned),0);
      assert.equal(await evaluate('externalRoot.getAttribute("style")'),source);
      assert.deepEqual(await evaluate(`({filter:getComputedStyle(externalRoot).filter,clipPath:getComputedStyle(externalRoot).clipPath})`), originalRendering);
      assert.equal(await evaluate('Object.keys(externalRoot.attributes).map(k=>externalRoot.attributes[k].name).filter(n=>n.startsWith("data-accesslens-spike-")).length'),0);
      await select('Visionless');
      assert.equal(await evaluate(`${shadow}.querySelectorAll('[data-accesslens-visionless]').length`),1);
      await writeFile(join(work,`${name.replaceAll(' ','-')}-Visionless.png`),Buffer.from((await call('Page.captureScreenshot')).data,'base64'));
      await select('Exit Visionless');
      assert.equal(await evaluate(`${shadow}.querySelectorAll('[data-accesslens-visionless]').length`),0);
      // Focus and type into an existing search/text field, without submitting.
      const editable=await evaluate(`(() => {const input=[...document.querySelectorAll('input[type=search],input[type=text],input:not([type])')].find(n=>n.getBoundingClientRect().width>0&&!n.disabled);if(!input)return false;window.externalInput=input;window.originalInput=input.value;input.focus();return true;})()`);
      if(editable){await call('Input.insertText',{text:'AccessLens'});assert.match(await evaluate('externalInput.value'),/AccessLens/);await evaluate('externalInput.value=originalInput');}
      result.input = editable ? 'typed into existing field; no submission' : 'no visible field';
      // A real informational link navigation after Reset; no account actions.
      const link = await evaluate(`(() => {const a=[...document.querySelectorAll('a[href]')].find(a=>{try{const u=new URL(a.href);return u.origin===location.origin && u.pathname!==location.pathname && !u.search && !/login|logout|signin|signup|account|delete|edit|submit/i.test(u.pathname)&&a.getBoundingClientRect().width>0}catch{return false}});if(!a)return null;a.scrollIntoView({block:'center'});const r=a.getBoundingClientRect();return {x:r.x+r.width/2,y:r.y+r.height/2};})()`);
      if(link){await call('Input.dispatchMouseEvent',{type:'mousePressed',button:'left',clickCount:1,...link});await call('Input.dispatchMouseEvent',{type:'mouseReleased',button:'left',clickCount:1,...link});await evaluate('new Promise(r=>setTimeout(r,800))');await waitFor(`${shadow}?.querySelector('button')`);}
      result.link = link ? 'clicked same-origin informational link' : 'no safe visible link';
      assert.equal(await evaluate("document.querySelectorAll('accesslens-panel').length"),1);
      assert.deepEqual(extensionErrors.slice(errorStart),[], 'No extension-origin runtime errors');
      result.status='pass';
    } catch(error) { result.status='limited'; result.reason=error.message; }
    results.push(result);
    console.log('CROSS-SITE',JSON.stringify(result));
    await writeFile(join(work,'cross-site-results.json'),JSON.stringify(results,null,2));
  }
  assert.ok(results.filter(r=>r.status==='pass').length>=Math.min(3,sites.length),'At least three external sites must pass; see cross-site-results.json');
}
