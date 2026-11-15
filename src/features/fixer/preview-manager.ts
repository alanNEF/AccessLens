import type { OperatingMode, SuggestedFix } from '../../shared/types';

type FixProperty = SuggestedFix['property'];

/** Any element with an inline style (HTML or SVG). */
export type StylableElement = Element & ElementCSSInlineStyle;

export type PreviewFailure = 'detached' | 'not-applied' | 'page-changed' | 'conflict';
export type PreviewResult = { readonly ok: true } | { readonly ok: false; readonly reason: PreviewFailure };

interface ActivePreview {
  readonly owner: OperatingMode;
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

interface AltPreview {
  readonly owner: OperatingMode;
  readonly element: HTMLImageElement;
  readonly originalValue: string | null;
  readonly written: string;
}

const OK: PreviewResult = Object.freeze({ ok: true });
const fail = (reason: PreviewFailure): PreviewResult => ({ ok: false, reason });

/**
 * Sole Fixer DOM writer. Restores each CSS property's exact prior value/priority
 * and each image's prior alt attribute (including absence). It never replaces
 * the whole `style` attribute, so other inline properties are untouched.
 */
export function createPreviewManager() {
  const previews = new Map<string, ActivePreview>();
  const altPreviews = new Map<string, AltPreview>();
  let mode: OperatingMode = 'developer';
  const writers = new Set<(phase: 'before' | 'after') => void>();
  const SINGLE = 'individual';

  // Monitoring can drain page mutations before our write, then discard only our
  // synchronous records. Keep observing external changes during asynchronous scans.
  function mutate<T>(run: () => T): T {
    for (const listener of writers) listener('before');
    try { return run(); }
    finally { for (const listener of writers) listener('after'); }
  }

  function write(preview: ActivePreview): PreviewResult {
    const { element, property, value } = preview;
    if (!element.isConnected) return fail('detached');
    const { style } = element;
    // getAttribute (not hasAttribute) also flushes Chrome's lazy CSSOM sync.
    preview.hadStyleAttribute = [...previews.values()].find(item => item !== preview && item.element === element)?.hadStyleAttribute
      ?? (element.getAttribute('style') !== null);
    preview.originalValue = style.getPropertyValue(property);
    preview.originalPriority = style.getPropertyPriority(property);
    // !important so the preview also wins over author !important rules.
    mutate(() => style.setProperty(property, value, 'important'));
    const written = style.getPropertyValue(property);
    if (!written || style.getPropertyPriority(property) !== 'important') {
      restoreOriginal(preview);
      return fail('not-applied');
    }
    preview.written = written;
    return OK;
  }

  function restoreOriginal(preview: ActivePreview) {
    mutate(() => {
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
    });
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

  /** End a CSS or image preview and restore its prior state. */
  function revert(id = SINGLE): PreviewResult {
    const alt = altPreviews.get(id);
    if (alt) {
      altPreviews.delete(id);
      if (alt.element.getAttribute('alt') !== alt.written) return fail('page-changed');
      mutate(() => {
        if (alt.originalValue === null) alt.element.removeAttribute('alt');
        else alt.element.setAttribute('alt', alt.originalValue);
      });
      return OK;
    }
    const active = previews.get(id);
    if (!active) return OK;
    const result = unwrite(active);
    previews.delete(id);
    return result;
  }

  function revertAll(): PreviewResult {
    let result = OK;
    for (const id of [...previews.keys(), ...altPreviews.keys()].reverse()) {
      const next = revert(id);
      if (!next.ok) result = next;
    }
    return result;
  }

  return {
    getMode: () => mode,
    /** Mode transitions end the departing workflow; snapshots never cross owners. */
    setMode(next: OperatingMode) {
      if (mode === next) return;
      revertAll();
      mode = next;
    },
    subscribeWrites(listener: (phase: 'before' | 'after') => void) {
      writers.add(listener);
      return () => { writers.delete(listener); };
    },
    isApplied(id: string) {
      const alt = altPreviews.get(id);
      if (alt) return alt.element.isConnected && alt.element.getAttribute('alt') === alt.written;
      const item = previews.get(id);
      return Boolean(item?.element.isConnected && item.written !== undefined &&
        item.element.style.getPropertyValue(item.property) === item.written &&
        item.element.style.getPropertyPriority(item.property) === 'important');
    },
    revertOwner(owner: OperatingMode) {
      for (const [id, item] of previews) if (item.owner === owner) revert(id);
      for (const [id, item] of altPreviews) if (item.owner === owner) revert(id);
    },
    /** Attribute previews share CSS previews' ownership, restoration and disposal lifecycle. */
    applyAlt(element: HTMLImageElement, value: string, id: string, owner: OperatingMode = 'developer'): PreviewResult {
      if (owner !== mode || previews.has(id)) return fail('conflict');
      if (!element.isConnected) return fail('detached');
      if ([...altPreviews.entries()].some(([key, item]) => key !== id && item.element === element)) return fail('conflict');
      const previous = revert(id);
      if (!previous.ok) return previous;
      const originalValue = element.getAttribute('alt');
      mutate(() => element.setAttribute('alt', value));
      altPreviews.set(id, { owner, element, originalValue, written: value });
      if (element.getAttribute('alt') !== value) {
        altPreviews.delete(id);
        return fail('not-applied');
      }
      return OK;
    },
    /** Start/replace one preview. A property can have only one owner. */
    apply(element: StylableElement, property: FixProperty, value: string, id = SINGLE, owner: OperatingMode = 'developer'): PreviewResult {
      if (owner !== mode || altPreviews.has(id)) return fail('conflict');
      if ([...previews.entries()].some(([key, item]) => key !== id && item.element === element && item.property === property)) return fail('conflict');
      const previous = revert(id);
      if (!previous.ok) return previous;
      const preview: ActivePreview = { owner, element, property, value, originalValue: '', originalPriority: '', hadStyleAttribute: false };
      const result = write(preview);
      if (result.ok) previews.set(id, preview);
      return result;
    },
    /** Compare: show the page's own value without ending the preview. */
    showOriginal(): PreviewResult {
      const active = previews.get(SINGLE);
      return active ? unwrite(active) : OK;
    },
    /** Compare: re-apply the suggestion. Re-captures the prior state first. */
    showFixed(): PreviewResult {
      const active = previews.get(SINGLE);
      if (!active) return fail('not-applied');
      return active.written === undefined ? write(active) : OK;
    },
    revert,
    revertAll,
    isShowingFixed: () => previews.get(SINGLE)?.written !== undefined,
    hasActivePreview: () => previews.size > 0 || altPreviews.size > 0,
    dispose(): void { revertAll(); writers.clear(); },
  };
}
export type PreviewManager = ReturnType<typeof createPreviewManager>;
