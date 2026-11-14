import { createInterface } from 'node:readline';
// Replaced at build time with the contents of axe-core/axe.min.js (see agent/build.mjs).
import axeSource from 'accesslens:axe-source';
import { Browser } from './browser';
import { scanInPage, type PageScanOptions, type RawNode } from './page-scan';
import { toReport } from './scan';
import { SCREENSHOT_MODES, simulateScreenshot } from './simulate';
import type { SimulationMode } from '../../src/shared/types';

/**
 * AccessLens MCP server (stdio, JSON-RPC 2.0). No SDK dependency: the protocol
 * surface used here is small. stdout carries protocol messages only; logs go to stderr.
 */

const VERSION = '0.1.0';
if (typeof WebSocket === 'undefined') {
  console.error('[accesslens] Node.js 22 or newer is required (global WebSocket).');
  process.exit(1);
}
const browser = new Browser();
const log = (...args: unknown[]) => console.error('[accesslens]', ...args);

const viewportSchema = {
  viewport_width: { type: 'integer', minimum: 320, maximum: 3840, default: 1280, description: 'Viewport width in CSS pixels.' },
  viewport_height: { type: 'integer', minimum: 320, maximum: 2160, default: 900, description: 'Viewport height in CSS pixels.' },
  wait_ms: { type: 'integer', minimum: 0, maximum: 15000, default: 500, description: 'Extra wait after the load event, for client-rendered content.' },
} as const;

const TOOLS = [
  {
    name: 'accesslens_scan',
    title: 'AccessLens accessibility scan',
    description:
      'Loads a URL in headless Chrome and returns compact JSON of accessibility failures: text contrast (WCAG 1.4.3 AA, or 1.4.6 AAA "enhanced" for low vision) and links that rely on color alone (1.4.1). ' +
      'Each failure includes the CSS selector, measured colors and ratio, and when possible a ready-to-apply CSS fix. "review" items could not be measured and need a human. ' +
      'Use this instead of screenshots to check UI changes. To verify fixes before editing source, pass them in `css` and scan again.',
    inputSchema: {
      type: 'object',
      properties: {
        url: { type: 'string', description: 'Page to test: http(s)://… (including localhost) or file://…' },
        level: { type: 'string', enum: ['AA', 'AAA'], default: 'AA', description: 'AA = WCAG minimum (4.5:1). AAA = enhanced (7:1), recommended for low vision, cataracts, reduced contrast sensitivity.' },
        selector: { type: 'string', description: 'Only scan inside this CSS selector.' },
        css: { type: 'string', description: 'CSS injected before scanning, e.g. candidate fixes to verify.' },
        max_issues: { type: 'integer', minimum: 1, maximum: 500, default: 50, description: 'Maximum issues returned (failures first).' },
        ...viewportSchema,
      },
      required: ['url'],
      additionalProperties: false,
    },
    annotations: { readOnlyHint: true, openWorldHint: true },
  },
  {
    name: 'accesslens_simulate',
    title: 'AccessLens vision simulation screenshot',
    description:
      'Screenshot of a URL with an approximate vision simulation applied (same filters as the AccessLens extension). ' +
      'Costs far more tokens than accesslens_scan; use only when a visual check is really needed. Simulations are approximations, not anyone\'s lived experience.',
    inputSchema: {
      type: 'object',
      properties: {
        url: { type: 'string', description: 'Page to capture: http(s)://… or file://…' },
        mode: { type: 'string', enum: SCREENSHOT_MODES, description: 'blur = Low Acuity.' },
        blur_px: { type: 'number', minimum: 0, maximum: 8, default: 2, description: 'Blur radius for mode "blur".' },
        ...viewportSchema,
      },
      required: ['url', 'mode'],
      additionalProperties: false,
    },
    annotations: { readOnlyHint: true, openWorldHint: true },
  },
];

class ToolError extends Error {}

function checkUrl(value: unknown): string {
  if (typeof value !== 'string') throw new ToolError('`url` is required.');
  let url: URL;
  try { url = new URL(value); } catch { throw new ToolError(`Not a valid URL: ${value}`); }
  if (!['http:', 'https:', 'file:'].includes(url.protocol)) throw new ToolError('Only http(s):// and file:// URLs are supported.');
  return url.href;
}

const intArg = (value: unknown, fallback: number, min: number, max: number) =>
  typeof value === 'number' && Number.isFinite(value) ? Math.min(max, Math.max(min, Math.round(value))) : fallback;

function pageOptions(args: Record<string, unknown>) {
  return {
    width: intArg(args.viewport_width, 1280, 320, 3840),
    height: intArg(args.viewport_height, 900, 320, 2160),
    settleMs: intArg(args.wait_ms, 500, 0, 15000),
  };
}

async function scan(args: Record<string, unknown>) {
  const url = checkUrl(args.url);
  const level = args.level === 'AAA' ? 'AAA' : 'AA';
  const options: PageScanOptions = {
    level,
    ...(typeof args.selector === 'string' && args.selector ? { selector: args.selector } : {}),
    ...(typeof args.css === 'string' && args.css ? { css: args.css } : {}),
  };
  const page = await browser.open(url, pageOptions(args));
  try {
    const loaded = await page.evaluate<boolean>('typeof window.axe !== "undefined"');
    if (!loaded) await page.evaluate(`${axeSource}\n;true`);
    const raws = await page.evaluate<RawNode[]>(`(${scanInPage.toString()})(${JSON.stringify(options)})`);
    const report = toReport(url, level, raws, intArg(args.max_issues, 50, 1, 500));
    return { content: [{ type: 'text', text: JSON.stringify(report) }], structuredContent: report };
  } finally {
    await page.close();
  }
}

async function simulate(args: Record<string, unknown>) {
  const url = checkUrl(args.url);
  const mode = args.mode as SimulationMode;
  if (!SCREENSHOT_MODES.includes(mode)) throw new ToolError(`\`mode\` must be one of: ${SCREENSHOT_MODES.join(', ')}.`);
  const page = await browser.open(url, pageOptions(args));
  try {
    const blur = typeof args.blur_px === 'number' ? args.blur_px : undefined;
    const data = await simulateScreenshot(page, mode, blur);
    return {
      content: [
        { type: 'image', data, mimeType: 'image/jpeg' },
        { type: 'text', text: `Simulated ${mode} (approximation) of ${url}.` },
      ],
    };
  } finally {
    await page.close();
  }
}

type Message = { jsonrpc: '2.0'; id?: number | string | null; method?: string; params?: any };

function reply(id: Message['id'], result: unknown) {
  process.stdout.write(JSON.stringify({ jsonrpc: '2.0', id, result }) + '\n');
}
function replyError(id: Message['id'], code: number, message: string) {
  process.stdout.write(JSON.stringify({ jsonrpc: '2.0', id, error: { code, message } }) + '\n');
}

async function handle(message: Message) {
  const { id, method, params } = message;
  const isRequest = id !== undefined && id !== null;
  try {
    switch (method) {
      case 'initialize':
        return reply(id, {
          protocolVersion: typeof params?.protocolVersion === 'string' ? params.protocolVersion : '2025-06-18',
          capabilities: { tools: { listChanged: false } },
          serverInfo: { name: 'accesslens', title: 'AccessLens', version: VERSION },
          instructions: 'Use accesslens_scan after UI changes to get accessibility failures as JSON (cheaper than screenshots). Apply the suggested CSS in source, then scan again.',
        });
      case 'ping':
        return reply(id, {});
      case 'tools/list':
        return reply(id, { tools: TOOLS });
      case 'tools/call': {
        const name = params?.name;
        const args = (params?.arguments ?? {}) as Record<string, unknown>;
        try {
          if (name === 'accesslens_scan') return reply(id, await scan(args));
          if (name === 'accesslens_simulate') return reply(id, await simulate(args));
          return replyError(id, -32602, `Unknown tool: ${name}`);
        } catch (error) {
          // Tool failures are reported to the model as results, not protocol errors.
          const text = error instanceof Error ? error.message : String(error);
          if (!(error instanceof ToolError)) log(`${name} failed:`, error);
          return reply(id, { content: [{ type: 'text', text }], isError: true });
        }
      }
      default:
        if (isRequest) replyError(id, -32601, `Method not found: ${method}`);
    }
  } catch (error) {
    log('Unexpected error:', error);
    if (isRequest) replyError(id, -32603, 'Internal error');
  }
}

const input = createInterface({ input: process.stdin });
input.on('line', line => {
  if (!line.trim()) return;
  let message: Message;
  try { message = JSON.parse(line); } catch { return replyError(null, -32700, 'Parse error'); }
  void handle(message);
});

let closing = false;
async function shutdown() {
  if (closing) return;
  closing = true;
  await browser.dispose().catch(() => undefined);
  process.exit(0);
}
input.on('close', shutdown);
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
