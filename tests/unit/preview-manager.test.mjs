import { test } from 'node:test';
import assert from 'node:assert/strict';
import { build } from 'esbuild';
const { outputFiles } = await build({ entryPoints: ['src/features/fixer/preview-manager.ts'], bundle: true, write: false, format: 'esm' });
const { createPreviewManager } = await import('data:text/javascript;base64,' + Buffer.from(outputFiles[0].text).toString('base64'));

// Minimal inline-style fake mirroring Chrome: hex reads back as rgb(), invalid
// values are ignored, and the first write creates a style attribute.
function element(initial) {
  const props = new Map(Object.entries(initial ?? {}));
  let hasStyle = initial !== undefined;
  const normalize = value => {
    const hex = /^#([0-9a-f]{6})$/i.exec(value);
    if (hex) return `rgb(${[0, 2, 4].map(i => parseInt(hex[1].slice(i, i + 2), 16)).join(', ')})`;
    return /^(rgb\(|[a-z]+$)/i.test(value) ? value : undefined;
  };
  return {
    isConnected: true,
    getAttribute: name => name === 'style' && hasStyle ? 'x' : null,
    removeAttribute: name => { if (name === 'style') { hasStyle = false; props.clear(); } },
    style: {
      get length() { return props.size; },
      getPropertyValue: name => props.get(name)?.value ?? '',
      getPropertyPriority: name => props.get(name)?.priority ?? '',
      setProperty(name, value, priority = '') {
        const normalized = normalize(value);
        if (normalized === undefined) return;
        props.set(name, { value: normalized, priority });
        hasStyle = true;
      },
      removeProperty(name) { props.delete(name); },
    },
    snapshot: () => ({ hasStyle, props: Object.fromEntries(props) }),
  };
}

test('no prior inline color: apply, then revert leaves no style attribute', () => {
  const el = element();
  const before = el.snapshot();
  const preview = createPreviewManager();
  assert.deepEqual(preview.apply(el, 'color', '#595959'), { ok: true });
  assert.deepEqual(el.snapshot().props.color, { value: 'rgb(89, 89, 89)', priority: 'important' });
  assert.equal(preview.isShowingFixed(), true);
  assert.deepEqual(preview.revert(), { ok: true });
  assert.deepEqual(el.snapshot(), before);
  assert.equal(preview.hasActivePreview(), false);
});

test('restores prior value and priority exactly; other properties untouched', () => {
  for (const priority of ['', 'important']) {
    const el = element({ color: { value: 'rgb(153, 153, 153)', priority }, margin: { value: 'red', priority: '' } });
    const before = el.snapshot();
    const preview = createPreviewManager();
    preview.apply(el, 'color', '#595959');
    assert.equal(el.snapshot().props.margin.value, 'red');
    preview.revert();
    assert.deepEqual(el.snapshot(), before, `priority "${priority}"`);
  }
});

test('style attribute that existed but was empty stays present', () => {
  const el = element({});
  const preview = createPreviewManager();
  preview.apply(el, 'color', '#595959');
  preview.revert();
  assert.deepEqual(el.snapshot(), { hasStyle: true, props: {} });
});

test('compare toggles Original and Fixed without ending the preview', () => {
  const el = element({ color: { value: 'rgb(153, 153, 153)', priority: '' } });
  const preview = createPreviewManager();
  preview.apply(el, 'color', '#595959');
  assert.deepEqual(preview.showOriginal(), { ok: true });
  assert.equal(el.snapshot().props.color.value, 'rgb(153, 153, 153)');
  assert.equal(preview.isShowingFixed(), false);
  assert.equal(preview.hasActivePreview(), true);
  assert.deepEqual(preview.showFixed(), { ok: true });
  assert.equal(el.snapshot().props.color.value, 'rgb(89, 89, 89)');
  preview.showFixed(); preview.showOriginal(); preview.showOriginal();
  preview.revert();
  assert.deepEqual(el.snapshot().props.color, { value: 'rgb(153, 153, 153)', priority: '' });
});

test('page script changing the color mid-preview is never overwritten', () => {
  const el = element();
  const preview = createPreviewManager();
  preview.apply(el, 'color', '#595959');
  el.style.setProperty('color', 'blue');
  assert.deepEqual(preview.revert(), { ok: false, reason: 'page-changed' });
  assert.equal(el.snapshot().props.color.value, 'blue');
  assert.equal(preview.hasActivePreview(), false);
});

test('detached element and rejected values are reported, not written', () => {
  const detached = element();
  detached.isConnected = false;
  const preview = createPreviewManager();
  assert.deepEqual(preview.apply(detached, 'color', '#595959'), { ok: false, reason: 'detached' });
  assert.equal(detached.snapshot().hasStyle, false);
  const el = element();
  assert.deepEqual(preview.apply(el, 'color', 'not a color!'), { ok: false, reason: 'not-applied' });
  assert.deepEqual(el.snapshot(), { hasStyle: false, props: {} });
  assert.equal(preview.hasActivePreview(), false);
});

test('a new preview reverts the previous element first; revert and dispose are idempotent', () => {
  const [a, b] = [element(), element()];
  const preview = createPreviewManager();
  preview.apply(a, 'color', '#595959');
  preview.apply(b, 'color', '#595959');
  assert.equal(a.snapshot().hasStyle, false);
  assert.equal(b.snapshot().props.color.priority, 'important');
  const { revert, dispose } = preview;
  assert.deepEqual(revert(), { ok: true });
  assert.deepEqual(revert(), { ok: true });
  dispose();
  assert.equal(b.snapshot().hasStyle, false);
  assert.deepEqual(preview.showFixed(), { ok: false, reason: 'not-applied' });
});
