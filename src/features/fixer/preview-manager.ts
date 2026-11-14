import type { SuggestedFix } from '../../shared/types';

type FixProperty = SuggestedFix['property'];

/** Any element with an inline style (HTML or SVG). */
export type StylableElement = Element & ElementCSSInlineStyle;

export type PreviewFailure = 'detached' | 'not-applied' | 'page-changed';
export type PreviewResult = { readonly ok: true } | { readonly ok: false; readonly reason: PreviewFailure };

interface ActivePreview {
  readonly element: StylableElement;
  readonly property: FixProperty;
  readonly value: string;
  /** Prior inline state, captured before each apply. */
  originalValue: string;
  originalPriority: string;
  hadStyleAttribute: boolean;
  /** Browser-normalized value read back after our write; undefined while showing Original. */
  written?: string;
}

const OK: PreviewResult = Object.freeze({ ok: true });
const fail = (reason: PreviewFailure): PreviewResult => ({ ok: false, reason });

/**
 * Sole Fixer DOM writer. Changes one inline property on one element and
 * restores that property's exact prior value and priority. It never reads or
 * replaces the whole `style` attribute, so other inline properties are untouched.
 */
export function createPreviewManager() {
  let active: ActivePreview | undefined;

  function write(preview: ActivePreview): PreviewResult {
    const { element, property, value } = preview;
    if (!element.isConnected) return fail('detached');
    const { style } = element;
    // getAttribute (not hasAttribute) also flushes Chrome's lazy CSSOM sync.
    preview.hadStyleAttribute = element.getAttribute('style') !== null;
    preview.originalValue = style.getPropertyValue(property);
    preview.originalPriority = style.getPropertyPriority(property);
    // !important so the preview also wins over author !important rules.
    style.setProperty(property, value, 'important');
    const written = style.getPropertyValue(property);
    if (!written || style.getPropertyPriority(property) !== 'important') {
      restoreOriginal(preview);
      return fail('not-applied');
    }
    preview.written = written;
    return OK;
  }

  function restoreOriginal(preview: ActivePreview) {
    const { element, property, originalValue, originalPriority } = preview;
    if (originalValue) element.style.setProperty(property, originalValue, originalPriority);
    else element.style.removeProperty(property);
    // Leave no empty style="" behind on elements that had no style attribute.
    // Chrome syncs CSSOM edits to the attribute lazily; read it first so a
    // pending sync cannot re-create style="" after removeAttribute.
    if (!preview.hadStyleAttribute && element.style.length === 0) {
      element.getAttribute('style');
      element.removeAttribute('style');
    }
    preview.written = undefined;
  }

  /** Undo our write unless page script has since changed the same property. */
  function unwrite(preview: ActivePreview): PreviewResult {
    if (preview.written === undefined) return OK;
    const { style } = preview.element;
    if (style.getPropertyValue(preview.property) !== preview.written || style.getPropertyPriority(preview.property) !== 'important') {
      preview.written = undefined;
      return fail('page-changed');
    }
    restoreOriginal(preview);
    return OK;
  }

  /** End the preview and restore the prior inline state. */
  function revert(): PreviewResult {
    if (!active) return OK;
    const result = unwrite(active);
    active = undefined;
    return result;
  }

  return {
    /** Start a preview. Any other active preview is reverted first. */
    apply(element: StylableElement, property: FixProperty, value: string): PreviewResult {
      revert();
      const preview: ActivePreview = { element, property, value, originalValue: '', originalPriority: '', hadStyleAttribute: false };
      const result = write(preview);
      if (result.ok) active = preview;
      return result;
    },
    /** Compare: show the page's own value without ending the preview. */
    showOriginal(): PreviewResult {
      return active ? unwrite(active) : OK;
    },
    /** Compare: re-apply the suggestion. Re-captures the prior state first. */
    showFixed(): PreviewResult {
      if (!active) return fail('not-applied');
      return active.written === undefined ? write(active) : OK;
    },
    revert,
    isShowingFixed: () => active?.written !== undefined,
    hasActivePreview: () => active !== undefined,
    dispose(): void { revert(); },
  };
}
export type PreviewManager = ReturnType<typeof createPreviewManager>;
