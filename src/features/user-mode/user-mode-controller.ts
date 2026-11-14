import type { OperatingMode } from '../../shared/types';
import type { IssueHandoffStore } from '../../shared/issue-handoff';
import type { FixerController } from '../fixer/fixer-controller';
import type { PreviewManager } from '../fixer/preview-manager';
import type { InspectorStore } from '../inspector/inspector-store';
import type { SimulatorController } from '../simulator/simulator-controller';

export interface UserModeState {
  readonly mode: OperatingMode;
  readonly enabled: boolean;
  readonly status: 'disabled' | 'scanning' | 'enabled' | 'empty' | 'error';
  readonly count: number;
}

const INITIAL: UserModeState = Object.freeze({ mode: 'developer', enabled: false, status: 'disabled', count: 0 });
const NON_CONTENT = 'script, style, link, meta, title, template, noscript';
// Position/transform updates from live widgets do not change text contrast.
const CONTRAST_PROPERTIES = ['color', 'background-color', 'background-image', 'opacity', 'filter', 'mix-blend-mode',
  'font-size', 'font-weight', 'font-family', 'text-shadow', '-webkit-text-fill-color', '-webkit-text-stroke-width', 'display', 'visibility'];

/** Page-level workflow coordinator. Inspector audits and Fixer owns every CSS write. */
export function createUserModeController({ host, inspector, fixer, previews, simulator, handoff, debounceMs = 800 }: {
  host: HTMLElement;
  inspector: InspectorStore;
  fixer: FixerController;
  previews: PreviewManager;
  simulator: Pick<SimulatorController, 'reset'>;
  handoff: IssueHandoffStore;
  debounceMs?: number;
}) {
  let state = INITIAL;
  let disposed = false;
  let version = 0;
  let running = 0;
  let timer: ReturnType<typeof setTimeout> | undefined;
  let needsPrune = false;
  const pending = new Set<Element>();
  const listeners = new Set<() => void>();
  const doc = host.ownerDocument;
  const observer = new MutationObserver(collect);
  const oldStyle = doc.createElement('span').style;
  const newStyle = doc.createElement('span').style;

  function publish(patch: Partial<UserModeState>) {
    if (disposed) return;
    state = Object.freeze({ ...state, ...patch });
    for (const listener of [...listeners]) listener();
  }

  const own = (node: Node) => node === host || host.contains(node);
  const content = (node: Node) => !own(node) && !(node instanceof Element ? node : node.parentElement)?.closest(NON_CONTENT);
  const meaningfulText = (node: Node) => node.nodeType === Node.TEXT_NODE && Boolean(node.textContent?.trim());
  const appliedCount = () => fixer.bulk.getState().corrections.filter(item => item.enabled && previews.isApplied(item.id)).length;

  function relevantAttribute(record: MutationRecord): boolean {
    const element = record.target;
    if (!(element instanceof Element)) return false;
    const value = element.getAttribute(record.attributeName!);
    if (value === record.oldValue) return false;
    if (record.attributeName !== 'style') return true;
    oldStyle.cssText = record.oldValue ?? '';
    newStyle.cssText = value ?? '';
    return CONTRAST_PROPERTIES.some(property => oldStyle.getPropertyValue(property) !== newStyle.getPropertyValue(property) ||
      oldStyle.getPropertyPriority(property) !== newStyle.getPropertyPriority(property));
  }

  function schedule() {
    if (disposed || !state.enabled || running || timer !== undefined || (!pending.size && !needsPrune)) return;
    // One coalesced subtree scan at most per debounce window, never a polling scan.
    timer = setTimeout(() => {
      timer = undefined;
      const roots = [...pending].filter(element => element.isConnected && !own(element));
      pending.clear();
      const minimal = roots.filter(element => !roots.some(other => other !== element && other.contains(element)));
      const prune = needsPrune;
      needsPrune = false;
      if (minimal.length) void run(minimal);
      else if (prune) {
        fixer.bulk.prepareRefresh([]);
        const count = appliedCount();
        publish({ count, status: count ? 'enabled' : 'empty' });
      }
    }, debounceMs);
  }

  function collect(records: MutationRecord[]) {
    if (!state.enabled || disposed) return;
    for (const record of records) {
      if (!content(record.target)) continue;
      if (record.type === 'childList') {
        // textContent updates on a live price/timer replace text nodes, but do
        // not change its contrast. Newly introduced text still needs an audit.
        const textReplacement = [...record.addedNodes, ...record.removedNodes].every(node => node.nodeType === Node.TEXT_NODE) &&
          [...record.addedNodes].some(meaningfulText) && [...record.removedNodes].some(meaningfulText);
        if (textReplacement) continue;
        for (const node of record.addedNodes) {
          if (!content(node)) continue;
          const element = node instanceof Element ? node : node.parentElement;
          if (element && (node instanceof Element || meaningfulText(node))) pending.add(element);
        }
        if ([...record.removedNodes].some(meaningfulText) && ![...record.addedNodes].some(meaningfulText) && record.target instanceof Element) pending.add(record.target);
        // Prune detached corrections without re-auditing their whole parent.
        if ([...record.removedNodes].some(node => node instanceof Element && content(node))) needsPrune = true;
      } else {
        if (record.type === 'attributes' && !relevantAttribute(record)) continue;
        if (record.type === 'characterData' && record.oldValue?.trim() && record.target.textContent?.trim()) continue;
        const element = record.target instanceof Element ? record.target : record.target.parentElement;
        if (element) pending.add(element);
      }
    }
    const count = appliedCount();
    if (count !== state.count) publish({ count });
    schedule();
  }

  // Drain external changes before writes, discard only the engine's synchronous
  // style records afterward. External mutations during axe/generation stay queued.
  const stopWrites = previews.subscribeWrites(phase => {
    const records = observer.takeRecords();
    if (phase === 'before' && records.length) collect(records);
  });

  function stop() {
    version++;
    observer.disconnect();
    clearTimeout(timer);
    timer = undefined;
    pending.clear();
    needsPrune = false;
    fixer.bulk.clear();
    previews.revertOwner('user');
    publish({ enabled: false, status: 'disabled', count: 0 });
  }

  async function run(roots?: readonly Element[]) {
    const current = version;
    running++;
    const incremental = roots !== undefined;
    if (!incremental) { publish({ status: 'scanning' }); fixer.bulk.clear(); }
    const scopes = incremental ? fixer.bulk.prepareRefresh(roots) : undefined;
    try {
      const results = await inspector.scanSilently(scopes);
      if (disposed || current !== version || !state.enabled) return;
      await fixer.bulk.run(results, 'user', { retainExisting: incremental });
      if (disposed || current !== version || !state.enabled) return;
      const count = appliedCount();
      const failed = fixer.bulk.getState().corrections.some(item => item.failure);
      publish({ count, status: count ? 'enabled' : failed ? 'error' : 'empty' });
    } catch {
      if (!disposed && current === version && state.enabled) {
        if (!incremental) fixer.bulk.clear();
        const count = appliedCount();
        publish({ status: count ? 'enabled' : 'error', count });
      }
    } finally {
      running--;
      // A quick off/on may have queued a new activation behind an old axe run.
      schedule();
    }
  }

  return {
    getState: () => state,
    subscribe(listener: () => void) {
      listeners.add(listener);
      return () => { listeners.delete(listener); };
    },
    setMode(mode: OperatingMode) {
      if (disposed || state.mode === mode) return;
      stop();
      inspector.clear();
      handoff.clear();
      fixer.clear();
      simulator.reset();
      previews.setMode(mode);
      publish({ mode });
    },
    setEnabled(enabled: boolean) {
      if (disposed || state.mode !== 'user') return;
      if (!enabled) { stop(); return; }
      if (state.enabled && state.status !== 'error') return;
      stop();
      publish({ enabled: true, status: 'scanning' });
      observer.observe(doc.documentElement, { subtree: true, childList: true, characterData: true, characterDataOldValue: true,
        attributes: true, attributeOldValue: true, attributeFilter: ['class', 'style', 'hidden'] });
      void run();
    },
    restore: stop,
    resetPage: stop,
    dispose() {
      if (disposed) return;
      stop();
      stopWrites();
      disposed = true;
      listeners.clear();
    },
  };
}

export type UserModeController = ReturnType<typeof createUserModeController>;
