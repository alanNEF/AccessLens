import { spawn, type ChildProcess } from 'node:child_process';
import { existsSync } from 'node:fs';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

/**
 * Minimal Chrome DevTools Protocol client (Node 22+ global WebSocket, no dependencies).
 * Either launches its own headless Chrome, or attaches to an existing browser
 * (the agent's own) when ACCESSLENS_CDP_URL is set, e.g. http://127.0.0.1:9222.
 */

const CHROME_CANDIDATES = [
  process.env.CHROME_PATH,
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  '/Applications/Chromium.app/Contents/MacOS/Chromium',
  '/usr/bin/google-chrome',
  '/usr/bin/google-chrome-stable',
  '/usr/bin/chromium',
  '/usr/bin/chromium-browser',
  'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
].filter((path): path is string => Boolean(path));

type Pending = { resolve: (value: any) => void; reject: (error: Error) => void };
type Listener = (params: any, sessionId?: string) => void;

class Connection {
  private id = 0;
  private pending = new Map<number, Pending>();
  private listeners = new Map<string, Set<Listener>>();
  constructor(private socket: WebSocket) {
    socket.addEventListener('message', ({ data }) => {
      const message = JSON.parse(String(data));
      if (message.id !== undefined) {
        const entry = this.pending.get(message.id);
        if (!entry) return;
        this.pending.delete(message.id);
        if (message.error) entry.reject(new Error(`${message.error.message}${message.error.data ? `: ${message.error.data}` : ''}`));
        else entry.resolve(message.result);
        return;
      }
      for (const listener of this.listeners.get(message.method) ?? []) listener(message.params, message.sessionId);
    });
    socket.addEventListener('close', () => {
      for (const entry of this.pending.values()) entry.reject(new Error('Browser connection closed.'));
      this.pending.clear();
    });
  }
  send(method: string, params: object = {}, sessionId?: string): Promise<any> {
    const id = ++this.id;
    return new Promise((resolve, reject) => {
      this.pending.set(id, { resolve, reject });
      this.socket.send(JSON.stringify({ id, method, params, ...(sessionId ? { sessionId } : {}) }));
    });
  }
  on(method: string, listener: Listener): () => void {
    const set = this.listeners.get(method) ?? new Set();
    set.add(listener);
    this.listeners.set(method, set);
    return () => set.delete(listener);
  }
  close() { this.socket.close(); }
}

async function openSocket(url: string): Promise<WebSocket> {
  const socket = new WebSocket(url);
  await new Promise<void>((resolve, reject) => {
    socket.addEventListener('open', () => resolve(), { once: true });
    socket.addEventListener('error', () => reject(new Error(`Could not connect to the browser at ${url}.`)), { once: true });
  });
  return socket;
}

/** Accepts ws://… directly, or an http(s) DevTools address whose /json/version names the socket. */
async function resolveEndpoint(cdpUrl: string): Promise<string> {
  if (cdpUrl.startsWith('ws')) return cdpUrl;
  const response = await fetch(new URL('/json/version', cdpUrl));
  if (!response.ok) throw new Error(`No DevTools endpoint at ${cdpUrl}.`);
  return (await response.json()).webSocketDebuggerUrl;
}

export interface Page {
  readonly sessionId: string;
  send(method: string, params?: object): Promise<any>;
  /** Runs a JS expression in the page and returns its JSON value. Promises are awaited. */
  evaluate<T = unknown>(expression: string): Promise<T>;
  close(): Promise<void>;
}

export class Browser {
  private connection?: Connection;
  private chrome?: ChildProcess;
  private profile?: string;
  private starting?: Promise<Connection>;

  private async start(): Promise<Connection> {
    const cdpUrl = process.env.ACCESSLENS_CDP_URL;
    if (cdpUrl) return new Connection(await openSocket(await resolveEndpoint(cdpUrl)));
    const executable = CHROME_CANDIDATES.find(path => existsSync(path));
    if (!executable) throw new Error('Chrome was not found. Install Google Chrome or set CHROME_PATH (or ACCESSLENS_CDP_URL to use an existing browser).');
    this.profile = await mkdtemp(join(tmpdir(), 'accesslens-agent-'));
    const chrome = spawn(executable, [
      '--headless=new', '--no-first-run', '--no-default-browser-check', '--disable-gpu',
      '--remote-debugging-port=0', `--user-data-dir=${this.profile}`, 'about:blank',
    ], { stdio: ['ignore', 'ignore', 'pipe'] });
    this.chrome = chrome;
    const endpoint = await new Promise<string>((resolve, reject) => {
      let stderr = '';
      const timer = setTimeout(() => reject(new Error('Chrome did not start within 20 seconds.')), 20_000);
      chrome.stderr!.on('data', chunk => {
        stderr += chunk;
        const match = stderr.match(/DevTools listening on (ws:\/\/\S+)/);
        if (match) { clearTimeout(timer); resolve(match[1]); }
      });
      chrome.on('error', error => { clearTimeout(timer); reject(error); });
      chrome.on('exit', code => { clearTimeout(timer); reject(new Error(`Chrome exited (${code}): ${stderr.slice(-500)}`)); });
    });
    return new Connection(await openSocket(endpoint));
  }

  private async connect(): Promise<Connection> {
    if (this.connection) return this.connection;
    this.starting ??= this.start().then(connection => (this.connection = connection)).finally(() => { this.starting = undefined; });
    return this.starting;
  }

  /** Opens a new tab, sizes it, loads `url` and waits for the load event plus `settleMs`. */
  async open(url: string, { width = 1280, height = 900, settleMs = 500, timeoutMs = 30_000 } = {}): Promise<Page> {
    const connection = await this.connect();
    const { targetId } = await connection.send('Target.createTarget', { url: 'about:blank' });
    const { sessionId } = await connection.send('Target.attachToTarget', { targetId, flatten: true });
    const send = (method: string, params: object = {}) => connection.send(method, params, sessionId);
    const page: Page = {
      sessionId,
      send,
      async evaluate<T>(expression: string) {
        const { result, exceptionDetails } = await send('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true });
        if (exceptionDetails) throw new Error(exceptionDetails.exception?.description?.split('\n')[0] ?? exceptionDetails.text);
        return result.value as T;
      },
      async close() { await connection.send('Target.closeTarget', { targetId }).catch(() => undefined); },
    };
    try {
      await send('Page.enable');
      await send('Emulation.setDeviceMetricsOverride', { width, height, deviceScaleFactor: 1, mobile: false });
      const loaded = new Promise<void>((resolve, reject) => {
        const timer = setTimeout(() => { stop(); reject(new Error(`The page did not finish loading within ${timeoutMs / 1000}s.`)); }, timeoutMs);
        const stop = connection.on('Page.loadEventFired', (_params, id) => {
          if (id !== sessionId) return;
          clearTimeout(timer); stop(); resolve();
        });
      });
      const { errorText } = await send('Page.navigate', { url });
      if (errorText) throw new Error(`Could not load ${url}: ${errorText}`);
      await loaded;
      if (settleMs > 0) await new Promise(resolve => setTimeout(resolve, settleMs));
      return page;
    } catch (error) {
      await page.close();
      throw error;
    }
  }

  async dispose() {
    this.connection?.close();
    this.connection = undefined;
    if (this.chrome && this.chrome.exitCode === null) {
      this.chrome.kill();
      await new Promise(resolve => this.chrome!.once('exit', resolve));
    }
    if (this.profile) await rm(this.profile, { recursive: true, force: true }).catch(() => undefined);
  }
}
