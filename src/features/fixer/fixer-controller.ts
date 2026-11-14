import { isVerifiedFailure, type ContrastIssue } from '../../shared/types';
import { contrastRatio, floorRatio } from './color-suggester';
import type { PreviewFailure, PreviewManager, PreviewResult, StylableElement } from './preview-manager';
import { EMPTY_STATE, snapshot, type FixerState } from './fixer-state';
import { generateCorrection, DETACHED_MESSAGE } from './correction-generator';
import { createBulkCorrections } from './bulk-corrections';

const PREVIEW_MESSAGES: Record<PreviewFailure, string> = {
  detached: DETACHED_MESSAGE,
  'not-applied': 'The browser did not accept the preview style.',
  'page-changed': 'The page changed this element’s color itself, so AccessLens left the page’s value in place.',
  conflict: 'Another correction already owns this element’s CSS property.',
};

interface FixerDependencies {
  readonly previewManager: PreviewManager;
  /** Computed style read-back for FIX-06; injectable for tests. */
  readonly readComputed?: (element: Element, property: string) => string;
}

/**
 * Sole owner of Fixer state. Pure color math lives in color-suggester; the
 * preview manager is the only code that writes to the page.
 */
export function createFixerController({ previewManager, readComputed = (el, prop) => getComputedStyle(el).getPropertyValue(prop) }: FixerDependencies) {
  let state = EMPTY_STATE;
  let element: StylableElement | undefined;
  let disposed = false;
  const listeners = new Set<(state: FixerState) => void>();
  const bulk = createBulkCorrections({ previewManager, readComputed,
    beforeRun: revert,
    beforeEnable: (target, property) => {
      if (target === element && property === state.fix?.property) revert();
    },
  });

  function publish(next: FixerState) {
    state = snapshot(next);
    for (const listener of [...listeners]) listener(state);
  }

  /** Keep the suggestion; drop preview-only fields. */
  function backToReady(message?: string) {
    const { issue, fix } = state;
    publish({ phase: 'ready', issue, fix, view: 'original', ...(message ? { message } : {}) });
  }

  /** Any failed page write ends the preview. A detached element cannot be retried. */
  function onPreviewResult(result: PreviewResult, onOk: () => void) {
    if (result.ok) return onOk();
    previewManager.revert();
    if (result.reason !== 'detached') return backToReady(PREVIEW_MESSAGES[result.reason]);
    element = undefined;
    publish({ phase: 'unsupported', issue: state.issue, view: 'original', message: PREVIEW_MESSAGES.detached });
  }

  /** FIX-06: measure what the page actually renders after the override. */
  function measure() {
    const { issue, fix } = state;
    if (!element || !issue || !fix || !isVerifiedFailure(issue)) return;
    const rendered = readComputed(element, fix.property);
    const ratio = fix.property === 'color'
      ? contrastRatio(rendered, issue.backgroundColor)
      : contrastRatio(issue.textColor, rendered);
    const measuredRatio = Number.isFinite(ratio) ? floorRatio(ratio) : undefined;
    publish({ phase: 'previewing', issue, fix, view: 'fixed', measuredRatio, meetsTarget: measuredRatio !== undefined && ratio >= issue.requiredRatio });
  }

  function revert() {
    if (state.phase !== 'previewing') return;
    const result = previewManager.revert();
    backToReady(result.ok ? undefined : PREVIEW_MESSAGES[result.reason]);
  }

  return {
    bulk,
    getState: () => state,
    subscribe(listener: (state: FixerState) => void) {
      if (!disposed) listeners.add(listener);
      return () => { listeners.delete(listener); };
    },
    /** Inspector handoff (FIX-01). Ends any current preview first. */
    selectIssue(issue: ContrastIssue, target: Element) {
      if (disposed) return;
      previewManager.revert();
      element = undefined;
      const reject = (message: string) => publish({ phase: 'unsupported', issue, view: 'original', message });
      const result = generateCorrection({ issue, element: target });
      if (!result.ok) return reject(result.message);
      element = result.element;
      publish({ phase: 'ready', issue, fix: result.fix, view: 'original' });
    },
    /** Preview fix: apply the temporary override and measure it. */
    preview() {
      if (disposed || !element || !state.fix || (state.phase !== 'ready' && state.phase !== 'previewing')) return;
      bulk.release(element, state.fix.property);
      onPreviewResult(previewManager.apply(element, state.fix.property, state.fix.suggestedValue), measure);
    },
    /** Compare: show the page's own color while keeping the preview. */
    showOriginal() {
      if (state.phase !== 'previewing' || state.view === 'original') return;
      onPreviewResult(previewManager.showOriginal(), () => publish({ ...state, view: 'original' }));
    },
    /** Compare: show the suggested color again. */
    showFixed() {
      if (state.phase !== 'previewing' || state.view === 'fixed') return;
      onPreviewResult(previewManager.showFixed(), measure);
    },
    /** Revert: end the preview; the suggestion stays available. */
    revert,
    /** Cancel pending generation too: Inspector must read original author styles. */
    prepareForInspection() { bulk.clear(); revert(); },
    /** Composition root calls this before an Inspector scan, so it sees original styles. */
    hasActivePreview: () => previewManager.hasActivePreview(),
    clear() {
      bulk.clear();
      previewManager.revert();
      element = undefined;
      if (!disposed) publish(EMPTY_STATE);
    },
    dispose() {
      if (disposed) return;
      bulk.dispose();
      previewManager.dispose();
      element = undefined;
      publish(EMPTY_STATE);
      disposed = true;
      listeners.clear();
    },
  };
}
export type FixerController = ReturnType<typeof createFixerController>;
