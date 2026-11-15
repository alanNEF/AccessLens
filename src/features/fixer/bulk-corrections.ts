import type { ContrastIssue, OperatingMode, SuggestedFix, VerifiedContrastFailure } from '../../shared/types';
import { contrastRatio, floorRatio, renderedColor } from './color-suggester';
import { matchesOriginalContrast, readSolidContrast } from './solid-contrast';
import { FADED_BACKGROUND_MESSAGE, generateCorrection, type CorrectionTarget, type DrawnText } from './correction-generator';
import type { PreviewManager, StylableElement } from './preview-manager';
import type { ImageIssue } from '../inspector/image-runner';

export interface BulkCorrection {
  readonly id: string;
  readonly issue: VerifiedContrastFailure;
  readonly fix: SuggestedFix;
  readonly enabled: boolean;
  /** Opacity the text is drawn with; the fix and its measurement account for it. */
  readonly opacity: number;
  readonly measuredRatio?: number;
  readonly failure?: string;
}

export interface BulkImageCorrection {
  readonly id: string;
  readonly issue: ImageIssue;
  readonly text: string;
  readonly enabled: boolean;
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
  readonly imageCorrections: readonly BulkImageCorrection[];
  readonly failures: readonly BulkFailure[];
  readonly skipped: number;
}

const INITIAL: BulkState = Object.freeze({ owner: 'developer', phase: 'idle', corrections: Object.freeze([]), imageCorrections: Object.freeze([]), failures: Object.freeze([]), skipped: 0 });
const pause = () => new Promise<void>(resolve => setTimeout(resolve, 0));
const errorText = (cause: unknown) => cause instanceof Error ? cause.message : 'This correction could not be generated or applied.';

/** Bulk state and orchestration; all page writes still go through the shared preview manager. */
export function createBulkCorrections({ previewManager, readComputed, readPalette, readOpacity, beforeRun, beforeEnable }: {
  previewManager: PreviewManager;
  readComputed: (element: Element, property: string) => string;
  /** Opacity the text is drawn with, as for single fixes; undefined when the background fades too. */
  readOpacity?: (element: Element) => number | undefined;
  /** The site's own colors, read once per run (site-palette.ts). */
  readPalette?: () => readonly string[];
  beforeRun: () => void;
  beforeEnable: (element: Element, property: SuggestedFix['property']) => void;
}) {
  let state = INITIAL;
  let version = 0;
  let disposed = false;
  const targets = new Map<string, StylableElement>();
  const imageTargets = new Map<string, HTMLImageElement>();
  const elementIds = new WeakMap<Element, number>();
  let nextElementId = 0;
  const listeners = new Set<() => void>();

  function publish(next: BulkState) {
    state = Object.freeze({ ...next,
      corrections: Object.freeze(next.corrections.map(item => Object.freeze(item))),
      imageCorrections: Object.freeze(next.imageCorrections.map(item => Object.freeze(item))),
      failures: Object.freeze(next.failures.map(item => Object.freeze(item))),
    });
    for (const listener of [...listeners]) listener();
  }

  function elementId(element: Element) {
    let id = elementIds.get(element);
    if (id === undefined) { id = ++nextElementId; elementIds.set(element, id); }
    return id;
  }

  function imageCorrection(issue: ImageIssue, text = ''): BulkImageCorrection | null {
    if (!(issue.element instanceof HTMLImageElement)) return null;
    const id = `bulk:${elementId(issue.element)}:alt`;
    imageTargets.set(id, issue.element);
    return { id, issue, text, enabled: false };
  }

  function disableImage(item: BulkImageCorrection): BulkImageCorrection {
    const result = previewManager.revert(item.id);
    return { ...item, enabled: false,
      ...(!result.ok ? { failure: 'The page changed this image’s alt text. Its value was left in place.' } : {}),
    };
  }

  function enableImage(item: BulkImageCorrection): BulkImageCorrection {
    try {
      const image = imageTargets.get(item.id);
      if (!image?.isConnected) throw new Error('This image is no longer on the page. Scan again to find its replacement.');
      if (!item.text.trim()) throw new Error('Please enter an image description before enabling this correction.');
      const result = previewManager.applyAlt(image, item.text.trim(), item.id, state.owner);
      if (!result.ok) throw new Error(`The alt text preview could not be applied (${result.reason}). Scan again before retrying.`);
      return { ...item, enabled: true, failure: undefined };
    } catch (cause) {
      previewManager.revert(item.id);
      return { ...item, enabled: false, failure: errorText(cause) };
    }
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
      if (item.fix.property === 'text-decoration-line') {
        if (!rendered.includes('underline')) throw new Error('The page did not show the underline. The preview was restored.');
        return { ...item, enabled: true, measuredRatio: undefined, failure: undefined };
      }
      // User Mode verifies the solid colors actually drawn; Developer Mode measures the edited
      // property, with the text faded by its opacity exactly as the page draws it.
      const ratio = state.owner === 'user' ? (readSolidContrast(element)?.ratio ?? Number.NaN) : item.fix.property === 'color'
        ? contrastRatio(renderedColor(rendered, item.issue.backgroundColor, item.opacity), item.issue.backgroundColor)
        : contrastRatio(item.opacity < 1 ? renderedColor(readComputed(element, 'color'), rendered, item.opacity) : item.issue.textColor, rendered);
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
    publish({ ...state, phase: state.phase === 'generating' ? 'idle' : state.phase,
      corrections: state.corrections.map(disable), imageCorrections: state.imageCorrections.map(disableImage) });
  }

  function clear() {
    restore();
    targets.clear();
    imageTargets.clear();
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
    /** Individual image editing and bulk rows use one draft and one preview owner. */
    ensureImage(issue: ImageIssue) {
      if (disposed || state.owner !== 'developer' || state.phase === 'generating') return;
      const existing = state.imageCorrections.find(item => item.issue.element === issue.element);
      if (existing) return existing.id;
      const item = imageCorrection(issue);
      if (!item) return;
      publish({ ...state, phase: 'ready', imageCorrections: [...state.imageCorrections, item] });
      return item.id;
    },
    setImageText(id: string, text: string) {
      if (disposed || state.phase !== 'ready') return;
      publish({ ...state, imageCorrections: state.imageCorrections.map(item => item.id === id
        ? (item.enabled ? enableImage({ ...item, text }) : { ...item, text, failure: undefined }) : item) });
    },
    setImageEnabled(id: string, enabled: boolean) {
      if (disposed || state.phase !== 'ready') return;
      publish({ ...state, imageCorrections: state.imageCorrections.map(item => item.id === id ? (enabled ? enableImage(item) : disableImage(item)) : item) });
    },
    async run(items: readonly CorrectionTarget[], owner: OperatingMode = 'developer', options: { retainExisting?: boolean; imageIssues?: readonly ImageIssue[] } = {}) {
      if (disposed || state.phase === 'generating') return;
      const imageDrafts = new Map(state.imageCorrections.map(item => [item.issue.element, item.text]));
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
      const palette = readPalette?.();
      let skipped = 0;
      for (const [index, item] of items.entries()) {
        if (disposed || current !== version) return;
        if (item.issue.status !== 'failed') { skipped++; continue; }
        try {
          // Faded text gets the same input as a single fix: its CSS color and the opacity that fades it.
          let drawn: DrawnText | undefined;
          if (readOpacity && item.issue.kind !== 'link-color-only' && item.element.isConnected) {
            const opacity = readOpacity(item.element);
            if (opacity === undefined) { failures.push({ issue: item.issue, message: FADED_BACKGROUND_MESSAGE }); continue; }
            if (opacity < 1) drawn = { textColor: readComputed(item.element, 'color'), opacity };
          }
          const result = generateCorrection(item, palette, drawn);
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
          corrections.push({ id, issue: result.issue, fix: result.fix, enabled: false, opacity: drawn?.opacity ?? 1 });
        } catch (cause) {
          failures.push({ issue: item.issue, message: errorText(cause) });
        }
        if (index % 20 === 19) await pause();
      }
      if (disposed || current !== version) return;
      const imageCorrections: BulkImageCorrection[] = [];
      if (owner === 'developer') {
        for (const issue of options.imageIssues ?? []) {
          if (imageCorrections.some(item => item.issue.element === issue.element)) continue;
          const item = imageCorrection(issue, imageDrafts.get(issue.element));
          if (item) imageCorrections.push(item.text.trim() ? enableImage(item) : item);
        }
      }
      // Generation is complete before any override is written or snapshot captured.
      publish({ owner, phase: 'ready', corrections: [...existing, ...corrections.map(enable)], imageCorrections, failures, skipped });
    },
    setEnabled(id: string, enabled: boolean) {
      if (disposed || state.phase !== 'ready') return;
      publish({ ...state, corrections: state.corrections.map(item => item.id === id ? (enabled ? enable(item) : disable(item)) : item) });
    },
    setAllEnabled(enabled: boolean) {
      if (disposed || state.phase !== 'ready') return;
      publish({ ...state, corrections: state.corrections.map(enabled ? enable : disable),
        imageCorrections: state.imageCorrections.map(enabled ? enableImage : disableImage) });
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
