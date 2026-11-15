import { isVerifiedFailure, type ContrastIssue, type SuggestedFix } from '../../shared/types';
import { contrastRatio, floorRatio, renderedColor, suggestFix } from './color-suggester';
import type { PreviewFailure, PreviewManager, PreviewResult, StylableElement } from './preview-manager';
import { EMPTY_STATE, snapshot, type FixerState } from './fixer-state';
import { generateCorrection, DETACHED_MESSAGE, SUPPORTED_RATIOS, UNSUPPORTED_RATIO_MESSAGE, underlineFix } from './correction-generator';
import { createBulkCorrections } from './bulk-corrections';
import { collectSitePalette } from './site-palette';

const PREVIEW_MESSAGES: Record<PreviewFailure, string> = {
  detached: DETACHED_MESSAGE,
  'not-applied': 'The browser did not accept the preview style.',
  'page-changed': 'The page changed this element’s color itself, so Perspective left the page’s value in place.',
  conflict: 'Another correction already owns this element’s CSS property.',
};

interface FixerDependencies {
  readonly previewManager: PreviewManager;
  /** Computed style read-back for FIX-06; injectable for tests. */
  readonly readComputed?: (element: Element, property: string) => string;
  /** Opacity the text is drawn with (see readDrawnOpacity); injectable for tests. */
  readonly readOpacity?: (element: Element) => number | undefined;
  /** Colors the page already uses (site-palette.ts); injectable for tests. */
  readonly readPalette?: () => readonly string[];
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
  readPalette = collectSitePalette,
}: FixerDependencies) {
  let state = EMPTY_STATE;
  let element: StylableElement | undefined;
  /** The other good suggestion for the current issue (site color vs. adjusted shade). */
  let alternative: SuggestedFix | undefined;
  let disposed = false;
  const listeners = new Set<(state: FixerState) => void>();
  const bulk = createBulkCorrections({ previewManager, readComputed, readPalette,
    beforeRun: revert,
    beforeEnable: (target, property) => {
      if (target === element && property === state.fix?.property) revert();
    },
  });

  function publish(next: FixerState) {
    // Every state that shows a fix also offers its alternative, if there is one.
    state = snapshot(next.fix && alternative ? { ...next, alternative } : next);
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
    if (fix.property === 'text-decoration-line') {
      // Success for a color-only link is a visible underline; there is no ratio to measure.
      publish({ phase: 'previewing', issue, fix, view: 'fixed', meetsTarget: readComputed(element, fix.property).includes('underline') });
      return;
    }
    // A background fix changes what the text sits on, so measure against the rendered background.
    const background = fix.property === 'background-color' ? readComputed(element, 'background-color') : issue.backgroundColor;
    const drawn = drawnTextColor(element, background);
    const ratio = drawn ? contrastRatio(drawn, background) : Number.NaN;
    const measuredRatio = Number.isFinite(ratio) ? floorRatio(ratio) : undefined;
    publish({ phase: 'previewing', issue, fix, opacity, view: 'fixed', measuredRatio, meetsTarget: measuredRatio !== undefined && ratio >= issue.requiredRatio });
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
      alternative = undefined;
      const reject = (message: string) => publish({ phase: 'unsupported', issue, view: 'original', message });
      if (!isVerifiedFailure(issue)) return reject('This issue needs manual review, so no automatic fix is suggested.');
      if (!SUPPORTED_RATIOS.has(issue.requiredRatio)) return reject(UNSUPPORTED_RATIO_MESSAGE);
      if (!target.isConnected || !isStylable(target)) return reject(PREVIEW_MESSAGES.detached);
      if (issue.kind === 'link-color-only') {
        const current = readComputed(target, 'text-decoration-line');
        if (current.includes('underline')) return reject('This link is already underlined.');
        element = target;
        publish({ phase: 'ready', issue, fix: underlineFix(issue, current), view: 'original' });
        return;
      }
      // A bulk correction on this element would make the measurement read its fixed colors,
      // not the page's: hand the element over to the single Fixer first (as preview() would).
      bulk.release(target, 'color');
      bulk.release(target, 'background-color');
      // Inspector reports the color as drawn; the Fixer edits the CSS color, which opacity then fades.
      const opacity = readOpacity(target);
      if (opacity === undefined) return reject('The background behind this text is itself faded (CSS opacity), so the result can’t be measured reliably. Check it by eye.');
      const drawn = drawnTextColor(target, issue.backgroundColor);
      if (!drawn || Math.abs(contrastRatio(drawn, issue.backgroundColor) - issue.contrastRatio) > MEASUREMENT_TOLERANCE) {
        return reject('Perspective could not confirm how this text is drawn, so no automatic fix is suggested. Check it by eye.');
      }
      const result = suggestFix({ ...issue, textColor: readComputed(target, 'color'), opacity, palette: readPalette() });
      if (!result.ok) return reject(result.message);
      element = target;
      alternative = result.alternative;
      publish({ phase: 'ready', issue, fix: result.fix, opacity, view: 'original' });
    },
    /** Swap to the other suggestion (site color ⇄ adjusted shade). Ends any preview first. */
    useAlternative() {
      if (disposed || !alternative || !state.fix || (state.phase !== 'ready' && state.phase !== 'previewing')) return;
      if (state.phase === 'previewing') previewManager.revert();
      const next = alternative;
      alternative = state.fix;
      const { issue, opacity } = state;
      publish({ phase: 'ready', issue, fix: next, opacity, view: 'original' });
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
      alternative = undefined;
      if (!disposed) publish(EMPTY_STATE);
    },
    dispose() {
      if (disposed) return;
      bulk.dispose();
      previewManager.dispose();
      element = undefined;
      alternative = undefined;
      publish(EMPTY_STATE);
      disposed = true;
      listeners.clear();
    },
  };
}
export type FixerController = ReturnType<typeof createFixerController>;
