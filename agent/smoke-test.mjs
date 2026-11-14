// End-to-end check of the bundled MCP server against demo-site/market.html.
// Usage: npm run build:agent && npm run test:agent
// Talks to the server over stdio exactly like an agent client would.
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

const serverPath = process.env.ACCESSLENS_MCP || fileURLToPath(new URL('../agent-plugin/server/accesslens-mcp.mjs', import.meta.url));
const html = await readFile(new URL('../demo-site/market.html', import.meta.url));
const http = createServer((_req, res) => { res.setHeader('Content-Type', 'text/html'); res.end(html); });
await new Promise(resolve => http.listen(0, '127.0.0.1', resolve));
const url = `http://127.0.0.1:${http.address().port}/market.html`;

const child = spawn(process.execPath, [serverPath], { stdio: ['pipe', 'pipe', 'inherit'] });
let buffer = '';
const waiting = new Map();
child.stdout.on('data', chunk => {
  buffer += chunk;
  let newline;
  while ((newline = buffer.indexOf('\n')) >= 0) {
    const line = buffer.slice(0, newline);
    buffer = buffer.slice(newline + 1);
    const message = JSON.parse(line); // Fails the test if anything but JSON-RPC reaches stdout.
    waiting.get(message.id)?.(message);
    waiting.delete(message.id);
  }
});
let nextId = 0;
const request = (method, params) => new Promise((resolve, reject) => {
  const id = ++nextId;
  const timer = setTimeout(() => reject(new Error(`${method} timed out`)), 60_000);
  waiting.set(id, message => { clearTimeout(timer); message.error ? reject(new Error(message.error.message)) : resolve(message.result); });
  child.stdin.write(JSON.stringify({ jsonrpc: '2.0', id, method, params }) + '\n');
});

try {
  const init = await request('initialize', { protocolVersion: '2025-06-18', capabilities: {}, clientInfo: { name: 'smoke-test', version: '0' } });
  assert.equal(init.serverInfo.name, 'accesslens');
  child.stdin.write(JSON.stringify({ jsonrpc: '2.0', method: 'notifications/initialized' }) + '\n');

  const { tools } = await request('tools/list', {});
  assert.deepEqual(tools.map(tool => tool.name).sort(), ['accesslens_scan', 'accesslens_simulate']);

  const aa = (await request('tools/call', { name: 'accesslens_scan', arguments: { url } })).structuredContent;
  const find = (report, selectorPart) => report.issues.find(issue => issue.selector.includes(selectorPart));
  const fine = find(aa, 'fine-print');
  assert.equal(fine?.status, 'fail', 'T1 fine print fails AA');
  assert.equal(fine.wcag, '1.4.3');
  assert.equal(fine.required, 4.5);
  // The plumbing test (stand-in color library) cannot compute real colors, so it only checks the fix where real culori is bundled.
  if (!process.env.ACCESSLENS_STUB_AXE) assert.ok(fine.fix?.css.includes('color:'), 'T1 gets a CSS color fix');
  const link = find(aa, 'policy-link');
  assert.equal(link?.kind, 'link-color-only', 'T9 color-only link found');
  assert.equal(link.wcag, '1.4.1');
  assert.equal(link.fix?.value, 'underline');
  assert.ok(aa.issues.some(issue => issue.status === 'review'), 'gradient hero needs review');
  assert.ok(aa.summary.fail >= 2);
  if (process.env.ACCESSLENS_DEBUG) console.log(JSON.stringify(aa, null, 1));
  console.log(`PASS scan AA: ${aa.summary.fail} fail, ${aa.summary.review} review, ${JSON.stringify(aa).length} bytes of JSON`);

  const aaa = (await request('tools/call', { name: 'accesslens_scan', arguments: { url, level: 'AAA' } })).structuredContent;
  assert.equal(aaa.level, 'AAA');
  assert.equal(find(aaa, 'fine-print')?.wcag, '1.4.6');
  assert.equal(find(aaa, 'fine-print')?.required, 7, 'AA-rule failures are judged against 7:1 at AAA');
  assert.equal(find(aaa, 'vendor-meta')?.status, 'fail', 'T8 (6.70:1) fails only at AAA');
  assert.equal(find(aa, 'vendor-meta'), undefined, 'T8 passes AA');
  assert.equal(aaa.issues.filter(issue => issue.selector.includes('hero')).length, 1, 'no duplicate review items at AAA');
  console.log(`PASS scan AAA: ${aaa.summary.fail} fail`);

  // Verify-a-fix loop: inject the suggested CSS and scan again.
  const fixed = (await request('tools/call', { name: 'accesslens_scan', arguments: { url, css: `${fine.fix?.css ?? ''}\n${link.fix.css}` } })).structuredContent;
  if (!process.env.ACCESSLENS_STUB_AXE) {
    assert.equal(find(fixed, 'fine-print'), undefined, 'fine print passes after the suggested CSS');
    assert.equal(find(fixed, 'policy-link'), undefined, 'link passes once underlined');
  }
  console.log('PASS verify-fix rescan');

  const sim = await request('tools/call', { name: 'accesslens_simulate', arguments: { url, mode: 'achromatopsia' } });
  assert.equal(sim.content[0].type, 'image');
  assert.ok(sim.content[0].data.length > 1000);
  console.log(`PASS simulate achromatopsia: ${Math.round(sim.content[0].data.length * 0.75 / 1024)} KB image`);

  const bad = await request('tools/call', { name: 'accesslens_scan', arguments: { url: 'ftp://example.com' } });
  assert.equal(bad.isError, true);
  console.log('PASS invalid URL reported as a tool error');
} finally {
  child.stdin.end();
  http.close();
}
