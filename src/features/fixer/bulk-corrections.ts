import type { ContrastIssue, OperatingMode, SuggestedFix, VerifiedContrastFailure } from '../../shared/types';
import { contrastRatio, floorRatio } from './color-suggester';
import { matchesOriginalContrast, readSolidContrast } from './solid-contrast';
import { generateCorrection, type CorrectionTarget } from './correction-generator';
import type { PreviewManager, StylableElement } from './preview-manager';

export interface BulkCorrection {
  readonly id: string;
  readonly issue: VerifiedContrastFailure;
  readonly fix: SuggestedFix;
  readonly enabled: boolean;
  readonly measuredRatio?: number;
  readonly failure?: string;
}

interface BulkFailure {
  readonly issue: ContrastIssue;
  readonly message: string;
}

export interface BulkState {
  readonly owner: OperatingMode;
  readonly phase: 'idle' | 'generating' | 'ready';
  readonly corrections: readonly BulkCorrection[];
  readonly failures: readonly BulkFailure[];
  readonly skipped: number;
}

const INITIAL: BulkState = Object.freeze({ owner: 'developer', phase: 'idle', corrections: Object.freeze([]), failures: Object.freeze([]), skipped: 0 });
const pause = () => new Promise<void>(resolve => setTimeout(resolve, 0));
const errorText = (cause: unknown) => cause instanceof Error ? cause.message : 'This correction could not be generated or applied.';

/** Bulk state and orchestration; all page writes still go through the shared preview manager. */
export function createBulkCorrections({ previewManager, readComputed, beforeRun, beforeEnable }: {
  previewManager: PreviewManager;
  readComputed: (element: Element, property: string) => string;
  beforeRun: () => void;
  beforeEnable: (element: Element, property: SuggestedFix['property']) => void;
}) {
  let state = INITIAL;
  let version = 0;
  let disposed = false;
  const targets = new Map<string, StylableElement>();
  const elementIds = new WeakMap<Element, number>();
  let nextElementId = 0;
  const listeners = new Set<() => void>();

  function publish(next: BulkState) {
    state = Object.freeze({ ...next,
      corrections: Object.freeze(next.corrections.map(item => Object.freeze(item))),
      failures: Object.freeze(next.failures.map(item => Object.freeze(item))),
    });
    for (const listener of [...listeners]) listener();
  }

  function disable(item: BulkCorrection): BulkCorrection {
    const result = previewManager.revert(item.id);
    return { ...item, enabled: false, measuredRatio: undefined,
      ...(!result.ok ? { failure: `Preview restored where possible: ${result.reason}. Scan again before retrying.` } : {}),
    };
  }

  function enable(item: BulkCorrection): BulkCorrection {
    const element = targets.get(item.id);
    if (item.enabled && element?.isConnected) return item;
    let failure: string;
    try {
      if (!element?.isConnected) throw new Error('The element is no longer on the page. Scan again to find its replacement.');
      if (state.owner === 'user' && !matchesOriginalContrast(element, item.issue)) throw new Error('The original text colors could not be verified.');
      beforeEnable(element, item.fix.property);
      const result = previewManager.apply(element, item.fix.property, item.fix.suggestedValue, item.id, state.owner);
      if (!result.ok) throw new Error(`The preview could not be applied (${result.reason}). Scan again before retrying.`);
      // Read back the rendered property, just as individual Fixer previews do (FIX-06).
      const rendered = readComputed(element, item.fix.property);
      const ratio = state.owner === 'user' ? (readSolidContrast(element)?.ratio ?? Number.NaN) : item.fix.property === 'color'
        ? contrastRatio(rendered, item.issue.backgroundColor)
        : contrastRatio(item.issue.textColor, rendered);
      if (!Number.isFinite(ratio) || ratio < item.issue.requiredRatio) throw new Error('The rendered color did not meet the required contrast. The preview was restored.');
      return { ...item, enabled: true, measuredRatio: floorRatio(ratio), failure: undefined };
    } catch (cause) {
      failure = errorText(cause);
    }
    previewManager.revert(item.id);
    return { ...item, enabled: false, measuredRatio: undefined, failure };
  }

  function restore() {
    version++;
    if (disposed) return;
    publish({ ...state, phase: state.phase === 'generating' ? 'idle' : state.phase, corrections: state.corrections.map(disable) });
  }

  function clear() {
    restore();
    targets.clear();
    if (!disposed) publish(INITIAL);
  }

  /** Restore only audit scopes and any corrected ancestors affecting inheritance. */
  function prepareRefresh(roots: readonly Element[]): readonly Element[] {
    if (disposed) return [];
    version++;
    const expanded = roots.map(root => {
      let scope = root;
      for (const item of state.corrections) {
        const target = targets.get(item.id);
        if (item.enabled && target?.isConnected && target.contains(scope)) scope = target;
      }
      return scope;
    });
    const scopes = [...new Set(expanded)].filter(root => !expanded.some(other => other !== root && other.contains(root)));
    const corrections = state.corrections.filter(item => {
      const target = targets.get(item.id);
      if (target?.isConnected && !scopes.some(root => root.contains(target))) return true;
      disable(item);
      targets.delete(item.id);
      return false;
    });
    publish({ ...state, phase: 'ready', corrections, failures: [], skipped: 0 });
    return scopes;
  }

  return {
    getState: () => state,
    subscribe(listener: () => void) {
      if (!disposed) listeners.add(listener);
      return () => { listeners.delete(listener); };
    },
    prepareRefresh,
    async run(items: readonly CorrectionTarget[], owner: OperatingMode = 'developer', options: { retainExisting?: boolean } = {}) {
      if (disposed || state.phase === 'generating') return;
      const retain = options.retainExisting && state.owner === owner;
      if (!retain) clear();
      const existing = retain ? state.corrections : [];
      beforeRun();
      const current = ++version;
      // Publish and yield once so React can paint the generating status.
      publish({ ...INITIAL, owner, corrections: existing, phase: 'generating' });
      await pause();
      const corrections: BulkCorrection[] = [];
      const failures: BulkFailure[] = [];
      const claimed = new Map<Element, Set<SuggestedFix['property']>>();
      const ids = new Set<string>();
      for (const item of existing) {
        const target = targets.get(item.id);
        if (target) {
          const properties = claimed.get(target) ?? new Set<SuggestedFix['property']>();
          properties.add(item.fix.property);
          claimed.set(target, properties);
        }
        ids.add(item.id);
      }
      let skipped = 0;
      for (const [index, item] of items.entries()) {
        if (disposed || current !== version) return;
        if (item.issue.status !== 'failed') { skipped++; continue; }
        try {
          const result = generateCorrection(item);
          if (!result.ok) { failures.push({ issue: item.issue, message: result.message }); continue; }
          if (owner === 'user' && !matchesOriginalContrast(result.element, result.issue)) { skipped++; continue; }
          let elementId = elementIds.get(item.element);
          if (elementId === undefined) { elementId = ++nextElementId; elementIds.set(item.element, elementId); }
          const id = `${owner === 'user' ? 'user' : 'bulk'}:${elementId}:${result.fix.property}`;
          const properties = claimed.get(item.element) ?? new Set<SuggestedFix['property']>();
          // First Inspector result wins; never layer competing property snapshots.
          if (properties.has(result.fix.property) || ids.has(id)) {
            failures.push({ issue: item.issue, message: 'Duplicate or conflicting correction skipped; the first Inspector result takes priority.' });
            continue;
          }
          properties.add(result.fix.property);
          claimed.set(item.element, properties);
          ids.add(id);
          targets.set(id, result.element);
          corrections.push({ id, issue: result.issue, fix: result.fix, enabled: false });
        } catch (cause) {
          failures.push({ issue: item.issue, message: errorText(cause) });
        }
        if (index % 20 === 19) await pause();
      }
      if (disposed || current !== version) return;
      // Generation is complete before any override is written or snapshot captured.
      publish({ owner, phase: 'ready', corrections: [...existing, ...corrections.map(enable)], failures, skipped });
    },
    setEnabled(id: string, enabled: boolean) {
      if (disposed || state.phase !== 'ready') return;
      publish({ ...state, corrections: state.corrections.map(item => item.id === id ? (enabled ? enable(item) : disable(item)) : item) });
    },
    setAllEnabled(enabled: boolean) {
      if (disposed || state.phase !== 'ready') return;
      publish({ ...state, corrections: state.corrections.map(enabled ? enable : disable) });
    },
    /** Transfer this property's ownership to an individual preview. */
    release(element: Element, property: SuggestedFix['property']) {
      if (disposed) return;
      publish({ ...state, corrections: state.corrections.map(item => targets.get(item.id) === element && item.fix.property === property ? disable(item) : item) });
    },
    restore,
    clear,
    dispose() {
      if (disposed) return;
      clear();
      disposed = true;
      listeners.clear();
    },
  };
}
