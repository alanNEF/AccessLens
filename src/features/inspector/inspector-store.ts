import { inspectElement, scanTextContrast, type InspectedIssue } from './axe-runner';

export interface InspectorState {
  readonly status: 'idle' | 'scanning' | 'done' | 'error';
  /** Results of the last full scan: failures first, then needs-review. */
  readonly issues: readonly InspectedIssue[];
  /** Result of the last "Pick element" click, if any. */
  readonly picked: InspectedIssue | null;
  readonly selectedId: string | null;
  readonly picking: boolean;
  /** Element under the pointer while picking, for the hover outline. */
  readonly hovered: Element | null;
  readonly message: string | null;
}

const INITIAL: InspectorState = Object.freeze({
  status: 'idle', issues: [], picked: null, selectedId: null, picking: false, hovered: null, message: null,
});

/**
 * Owns Inspector state for one mounted panel. Never writes to the page's DOM or styles:
 * highlights are drawn inside the AccessLens shadow root (see HighlightLayer).
 * `panelHost` is excluded from scans and from picking.
 */
export function createInspectorStore(panelHost: Element) {
  let state = INITIAL;
  let disposed = false;
  let runId = 0;
  const listeners = new Set<() => void>();
  let stopPicking: (() => void) | null = null;
  let queue: Promise<unknown> = Promise.resolve();

  function set(patch: Partial<InspectorState>) {
    if (disposed) return;
    state = Object.freeze({ ...state, ...patch });
    for (const listener of [...listeners]) listener();
  }

  const isOwnUi = (event: Event) => event.composedPath().includes(panelHost);

  /**
   * axe works out each text's background from what is stacked on screen. Our fixed panel sits on top
   * of page text, so it is hidden for the duration of a run to avoid false "overlapped" results.
   */
  function withPanelHidden<T>(run: () => Promise<T>, hide = true): Promise<T> {
    const next = queue.then(() => hide ? hidePanel(run) : run());
    queue = next.catch(() => undefined);
    return next;
  }
  async function hidePanel<T>(run: () => Promise<T>): Promise<T> {
    const host = panelHost as HTMLElement;
    const previous = host.style.getPropertyValue('visibility');
    const priority = host.style.getPropertyPriority('visibility');
    host.style.setProperty('visibility', 'hidden', 'important');
    try {
      return await run();
    } finally {
      if (previous) host.style.setProperty('visibility', previous, priority);
      else host.style.removeProperty('visibility');
    }
  }
  const errorText = (cause: unknown) => (cause instanceof Error ? cause.message : 'The scan failed.');

  async function scan() {
    const id = ++runId;
    set({ status: 'scanning', message: null });
    try {
      const issues = await withPanelHidden(() => scanTextContrast(panelHost));
      if (id !== runId) return;
      set({ status: 'done', issues, selectedId: issues[0]?.issue.id ?? null, picked: null });
    } catch (cause) {
      if (id !== runId) return;
      set({ status: 'error', message: errorText(cause) });
    }
  }

  async function pick(target: Element) {
    const id = ++runId;
    set({ picking: false, hovered: null, message: null });
    try {
      const result = await withPanelHidden(() => inspectElement(target, panelHost));
      if (id !== runId) return;
      if (!result) {
        set({ picked: null, message: 'No text was found in that element. Try clicking directly on some text.' });
        return;
      }
      set({ picked: result, selectedId: result.issue.id });
    } catch (cause) {
      if (id !== runId) return;
      set({ message: errorText(cause) });
    }
  }

  function startPicking() {
    if (disposed || stopPicking) return;
    const onMove = (event: PointerEvent) => {
      if (isOwnUi(event)) { if (state.hovered) set({ hovered: null }); return; }
      const target = event.target instanceof Element ? event.target : null;
      if (target !== state.hovered) set({ hovered: target });
    };
    // Capture phase + preventDefault so the page's own links and buttons don't fire while picking.
    const onClick = (event: MouseEvent) => {
      if (isOwnUi(event)) return;
      event.preventDefault();
      event.stopPropagation();
      const target = event.target instanceof Element ? event.target : null;
      cancelPicking();
      if (target) void pick(target);
    };
    const swallow = (event: Event) => { if (!isOwnUi(event)) { event.preventDefault(); event.stopPropagation(); } };
    const onKey = (event: KeyboardEvent) => { if (event.key === 'Escape') cancelPicking(); };
    window.addEventListener('pointermove', onMove, true);
    window.addEventListener('click', onClick, true);
    window.addEventListener('mousedown', swallow, true);
    window.addEventListener('pointerdown', swallow, true);
    window.addEventListener('keydown', onKey, true);
    stopPicking = () => {
      window.removeEventListener('pointermove', onMove, true);
      window.removeEventListener('click', onClick, true);
      window.removeEventListener('mousedown', swallow, true);
      window.removeEventListener('pointerdown', swallow, true);
      window.removeEventListener('keydown', onKey, true);
    };
    set({ picking: true, message: null });
  }

  function cancelPicking() {
    stopPicking?.();
    stopPicking = null;
    if (state.picking || state.hovered) set({ picking: false, hovered: null });
  }

  return {
    getState: () => state,
    subscribe(listener: () => void) {
      listeners.add(listener);
      return () => { listeners.delete(listener); };
    },
    scan,
    /** Same audit engine, without selection, highlights, or developer result state. */
    scanSilently(roots?: readonly Element[]) {
      // Keep status and cancellation controls available in User Mode. axe excludes
      // our host and treats any covered page text as uncertain, hence never fixed.
      return withPanelHidden(() => scanTextContrast(panelHost, roots), false);
    },
    startPicking,
    cancelPicking,
    select(id: string | null) { set({ selectedId: id }); },
    /** The issue currently shown in the detail view (from the scan list or the picked element). */
    getSelected(): InspectedIssue | null {
      if (state.picked?.issue.id === state.selectedId) return state.picked;
      return state.issues.find(item => item.issue.id === state.selectedId) ?? null;
    },
    clear() {
      runId++;
      cancelPicking();
      set({ ...INITIAL });
    },
    dispose() {
      cancelPicking();
      runId++;
      state = INITIAL;
      disposed = true;
      listeners.clear();
    },
  };
}
export type InspectorStore = ReturnType<typeof createInspectorStore>;
