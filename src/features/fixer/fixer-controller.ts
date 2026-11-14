import { isVerifiedFailure, type ContrastIssue } from '../../shared/types';
import { contrastRatio, floorRatio, renderedColor, suggestFix } from './color-suggester';
import type { PreviewFailure, PreviewManager, PreviewResult, StylableElement } from './preview-manager';
import { EMPTY_STATE, snapshot, type FixerState } from './fixer-state';

const PREVIEW_MESSAGES: Record<PreviewFailure, string> = {
  detached: 'The element is no longer on the page, so no preview was applied.',
  'not-applied': 'The browser did not accept the preview style.',
  'page-changed': 'The page changed this element’s color itself, so AccessLens left the page’s value in place.',
};

interface FixerDependencies {
  readonly previewManager: PreviewManager;
  /** Computed style read-back for FIX-06; injectable for tests. */
  readonly readComputed?: (element: Element, property: string) => string;
  /** Opacity the text is drawn with (see readDrawnOpacity); injectable for tests. */
  readonly readOpacity?: (element: Element) => number | undefined;
}

function isStylable(element: Element): element is StylableElement {
  return 'style' in element;
}

const isClear = (color: string) => color === 'transparent' || /^rgba\(.*,\s*0\)$/.test(color);

/**
 * Combined CSS opacity of the element and its ancestors up to the one that
 * paints its background. Undefined when that background layer (or anything
 * above it) is faded too: text and background then fade together, which the
 * Fixer does not model.
 */
function readDrawnOpacity(element: Element): number | undefined {
  let opacity = 1;
  let reachedBackground = false;
  for (let node: Element | null = element; node; node = node.parentElement) {
    const style = getComputedStyle(node);
    const own = Number.parseFloat(style.opacity);
    reachedBackground ||= style.backgroundImage !== 'none' || !isClear(style.backgroundColor);
    if (!reachedBackground) opacity *= own;
    else if (own < 1) return undefined;
  }
  return opacity;
}

/** A difference above this between the drawn color and Inspector's measurement means something else affects the text. */
const MEASUREMENT_TOLERANCE = 0.1;

/**
 * Sole owner of Fixer state. Pure color math lives in color-suggester; the
 * preview manager is the only code that writes to the page.
 */
export function createFixerController({
  previewManager,
  readComputed = (el, prop) => getComputedStyle(el).getPropertyValue(prop),
  readOpacity = readDrawnOpacity,
}: FixerDependencies) {
  let state = EMPTY_STATE;
  let element: StylableElement | undefined;
  let disposed = false;
  const listeners = new Set<(state: FixerState) => void>();

  function publish(next: FixerState) {
    state = snapshot(next);
    for (const listener of [...listeners]) listener(state);
  }

  /** Keep the suggestion; drop preview-only fields. */
  function backToReady(message?: string) {
    const { issue, fix, opacity } = state;
    publish({ phase: 'ready', issue, fix, opacity, view: 'original', ...(message ? { message } : {}) });
  }

  /** Any failed page write ends the preview. A detached element cannot be retried. */
  function onPreviewResult(result: PreviewResult, onOk: () => void) {
    if (result.ok) return onOk();
    previewManager.revert();
    if (result.reason !== 'detached') return backToReady(PREVIEW_MESSAGES[result.reason]);
    element = undefined;
    publish({ phase: 'unsupported', issue: state.issue, view: 'original', message: PREVIEW_MESSAGES.detached });
  }

  /** The text color as actually drawn: computed CSS color faded by its opacity. Empty if unknown. */
  function drawnTextColor(target: Element, background: string): string {
    const opacity = readOpacity(target);
    return opacity === undefined ? '' : renderedColor(readComputed(target, 'color'), background, opacity);
  }

  /** FIX-06: measure what the page actually draws after the override. */
  function measure() {
    const { issue, fix, opacity } = state;
    if (!element || !issue || !fix || !isVerifiedFailure(issue)) return;
    const drawn = drawnTextColor(element, issue.backgroundColor);
    const ratio = drawn ? contrastRatio(drawn, issue.backgroundColor) : Number.NaN;
    const measuredRatio = Number.isFinite(ratio) ? floorRatio(ratio) : undefined;
    publish({ phase: 'previewing', issue, fix, opacity, view: 'fixed', measuredRatio, meetsTarget: measuredRatio !== undefined && ratio >= issue.requiredRatio });
  }

  return {
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
      if (!isVerifiedFailure(issue)) return reject('This issue needs manual review, so no automatic fix is suggested.');
      if (issue.requiredRatio !== 4.5 && issue.requiredRatio !== 3) return reject('Only WCAG AA text thresholds (4.5:1 and 3:1) are supported.');
      if (!target.isConnected || !isStylable(target)) return reject(PREVIEW_MESSAGES.detached);
      // Inspector reports the color as drawn; the Fixer edits the CSS color, which opacity then fades.
      const opacity = readOpacity(target);
      if (opacity === undefined) return reject('The background behind this text is itself faded (CSS opacity), so the result can’t be measured reliably. Check it by eye.');
      const drawn = drawnTextColor(target, issue.backgroundColor);
      if (!drawn || Math.abs(contrastRatio(drawn, issue.backgroundColor) - issue.contrastRatio) > MEASUREMENT_TOLERANCE) {
        return reject('AccessLens could not confirm how this text is drawn, so no automatic fix is suggested. Check it by eye.');
      }
      const result = suggestFix({ ...issue, textColor: readComputed(target, 'color'), opacity });
      if (!result.ok) return reject(result.message);
      element = target;
      publish({ phase: 'ready', issue, fix: result.fix, opacity, view: 'original' });
    },
    /** Preview fix: apply the temporary override and measure it. */
    preview() {
      if (disposed || !element || !state.fix || (state.phase !== 'ready' && state.phase !== 'previewing')) return;
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
    revert() {
      if (state.phase !== 'previewing') return;
      const result = previewManager.revert();
      backToReady(result.ok ? undefined : PREVIEW_MESSAGES[result.reason]);
    },
    /** Composition root calls this before an Inspector scan, so it sees original styles. */
    hasActivePreview: () => previewManager.hasActivePreview(),
    clear() {
      previewManager.revert();
      element = undefined;
      if (!disposed) publish(EMPTY_STATE);
    },
    dispose() {
      if (disposed) return;
      previewManager.dispose();
      element = undefined;
      publish(EMPTY_STATE);
      disposed = true;
      listeners.clear();
    },
  };
}
export type FixerController = ReturnType<typeof createFixerController>;
