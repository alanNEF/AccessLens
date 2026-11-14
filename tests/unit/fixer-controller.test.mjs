import { test } from 'node:test';
import assert from 'node:assert/strict';
import { build } from 'esbuild';
const { outputFiles } = await build({ entryPoints: ['src/features/fixer/fixer-controller.ts'], bundle: true, write: false, format: 'esm' });
const { createFixerController } = await import('data:text/javascript;base64,' + Buffer.from(outputFiles[0].text).toString('base64'));

const issue = (overrides = {}) => Object.freeze({
  id: 'issue-1', selector: 'main > p', textColor: 'rgb(153, 153, 153)', backgroundColor: 'rgb(255, 255, 255)',
  contrastRatio: 2.85, requiredRatio: 4.5, isLargeText: false, status: 'failed', wcagCriterion: '1.4.3', ...overrides,
});

// Fake preview manager: records calls; each result can be overridden per test.
function fixture() {
  const calls = [];
  const element = { isConnected: true, style: {} };
  let rendered = 'rgb(153, 153, 153)';
  let active = false;
  const next = {};
  const result = name => next[name] ?? { ok: true };
  const previewManager = {
    apply(el, property, value) { calls.push(['apply', property, value]); const r = result('apply'); if (r.ok) { active = true; rendered = value; } return r; },
    showOriginal() { calls.push(['showOriginal']); rendered = 'rgb(153, 153, 153)'; return result('showOriginal'); },
    showFixed() { calls.push(['showFixed']); return result('showFixed'); },
    revert() { calls.push(['revert']); active = false; rendered = 'rgb(153, 153, 153)'; return result('revert'); },
    hasActivePreview: () => active,
    dispose() { calls.push(['dispose']); active = false; },
  };
  const controller = createFixerController({ previewManager, readComputed: () => rendered });
  return { controller, calls, element, next, setRendered: v => { rendered = v; } };
}

test('select → ready with a suggestion; preview measures the page (FIX-01/02/06)', () => {
  const { controller: c, calls, element } = fixture();
  assert.deepEqual(c.getState(), { phase: 'empty', view: 'original' });
  c.selectIssue(issue(), element);
  const ready = c.getState();
  assert.equal(ready.phase, 'ready');
  assert.equal(ready.fix.property, 'color');
  assert.ok(ready.fix.expectedContrastRatio >= 4.5);
  assert.equal(c.getState(), ready, 'stable snapshot');
  assert.throws(() => { ready.phase = 'empty'; }, TypeError);
  c.preview();
  const previewing = c.getState();
  assert.deepEqual(calls.at(-1), ['apply', 'color', ready.fix.suggestedValue]);
  assert.equal(previewing.phase, 'previewing');
  assert.equal(previewing.view, 'fixed');
  assert.ok(previewing.measuredRatio >= 4.5);
  assert.equal(previewing.meetsTarget, true);
  assert.ok(!('message' in previewing));
});

test('compare toggles views; revert keeps the suggestion (FIX-05)', () => {
  const { controller: c, calls, element } = fixture();
  c.selectIssue(issue(), element);
  c.preview();
  c.showOriginal();
  assert.equal(c.getState().view, 'original');
  c.showOriginal();
  c.showFixed();
  assert.equal(c.getState().view, 'fixed');
  assert.deepEqual(calls.map(([name]) => name), ['revert', 'apply', 'showOriginal', 'showFixed']);
  c.revert();
  assert.equal(c.getState().phase, 'ready');
  assert.equal(c.getState().measuredRatio, undefined);
  assert.ok(c.getState().fix);
  c.preview();
  assert.equal(c.getState().phase, 'previewing', 'can preview again');
});

test('rejects needs-review, bad thresholds, detached elements and unfixable colors (FIX-01/08)', () => {
  const { controller: c, element } = fixture();
  const reject = (i, el = element) => { c.selectIssue(i, el); return c.getState(); };
  assert.match(reject(issue({ status: 'needs-review' })).message, /manual review/);
  assert.match(reject(issue({ requiredRatio: 5 })).message, /3:1, 4\.5:1 and 7:1/);
  assert.match(reject(issue(), { isConnected: false, style: {} }).message, /no longer on the page/);
  assert.match(reject(issue({ textColor: 'rgba(0, 0, 0, 0.4)' })).message, /manual review/);
  assert.match(reject(issue({ textColor: '#000000' })).message, /already meet/);
  const state = c.getState();
  assert.equal(state.phase, 'unsupported');
  assert.equal(state.fix, undefined);
  c.preview();
  assert.equal(c.getState(), state, 'preview does nothing when unsupported');
});

test('measured result is honest when the page does not render the fix (FIX-06)', () => {
  const { controller: c, element, setRendered } = fixture();
  c.selectIssue(issue(), element);
  c.preview();
  // e.g. a page rule on the element wins, so the rendered color never changes
  setRendered('rgb(153, 153, 153)');
  c.showOriginal(); c.showFixed();
  assert.equal(c.getState().meetsTarget, false);
  assert.ok(c.getState().measuredRatio < 4.5);
});

test('page changes and detachment end the preview with an explanation', () => {
  const { controller: c, element, next } = fixture();
  c.selectIssue(issue(), element);
  c.preview();
  next.showOriginal = { ok: false, reason: 'page-changed' };
  c.showOriginal();
  assert.equal(c.getState().phase, 'ready');
  assert.match(c.getState().message, /changed this element/);
  delete next.showOriginal;
  c.preview();
  next.showOriginal = { ok: false, reason: 'detached' };
  c.showOriginal();
  assert.equal(c.getState().phase, 'unsupported');
  assert.match(c.getState().message, /no longer on the page/);
});

test('new selection reverts first; clear, dispose and listeners', () => {
  const { controller: c, calls, element } = fixture();
  const seen = [];
  const unsubscribe = c.subscribe(state => seen.push(state.phase));
  c.selectIssue(issue(), element);
  c.preview();
  c.selectIssue(issue({ id: 'issue-2' }), element);
  assert.deepEqual(calls.filter(([n]) => n === 'revert').length, 2);
  assert.equal(c.getState().fix.issueId, 'issue-2');
  assert.equal(c.hasActivePreview(), false);
  c.clear();
  assert.deepEqual(c.getState(), { phase: 'empty', view: 'original' });
  unsubscribe();
  c.selectIssue(issue(), element);
  assert.deepEqual(seen, ['ready', 'previewing', 'ready', 'empty']);
  c.dispose(); c.dispose();
  assert.equal(calls.filter(([n]) => n === 'dispose').length, 1);
  c.selectIssue(issue(), element);
  assert.deepEqual(c.getState(), { phase: 'empty', view: 'original' });
});

test('enhanced (AAA) 7:1 issues are accepted and fixed to at least 7:1', () => {
  const { controller: c, element } = fixture();
  c.selectIssue(issue({ requiredRatio: 7, wcagCriterion: '1.4.6' }), element);
  assert.equal(c.getState().phase, 'ready');
  assert.ok(c.getState().fix.expectedContrastRatio >= 7);
});

test('color-only link (WCAG 1.4.1): suggests an underline and confirms it on the page', () => {
  // Own fake: the page's text-decoration-line is 'none' until our preview writes 'underline'.
  let decoration = 'none';
  const calls = [];
  const previewManager = {
    apply(el, property, value) { calls.push(['apply', property, value]); decoration = value; return { ok: true }; },
    showOriginal() { decoration = 'none'; return { ok: true }; },
    showFixed() { decoration = 'underline'; return { ok: true }; },
    revert() { decoration = 'none'; return { ok: true }; },
    hasActivePreview: () => false,
    dispose() {},
  };
  const c = createFixerController({ previewManager, readComputed: (el, property) => (property === 'text-decoration-line' ? decoration : 'rgb(30, 64, 175)') });
  const element = { isConnected: true, style: {} };
  const link = issue({ kind: 'link-color-only', wcagCriterion: '1.4.1', requiredRatio: 3, textColor: '#1e40af', backgroundColor: '#1f2937', contrastRatio: 1.68 });
  c.selectIssue(link, element);
  const ready = c.getState();
  assert.equal(ready.phase, 'ready');
  assert.deepEqual([ready.fix.property, ready.fix.originalValue, ready.fix.suggestedValue], ['text-decoration-line', 'none', 'underline']);
  c.preview();
  assert.deepEqual(calls.at(-1), ['apply', 'text-decoration-line', 'underline']);
  assert.equal(c.getState().phase, 'previewing');
  assert.equal(c.getState().meetsTarget, true);
  assert.equal(c.getState().measuredRatio, undefined, 'no ratio is claimed for an underline fix');
  c.showOriginal();
  assert.equal(c.getState().view, 'original');
  c.showFixed();
  assert.equal(c.getState().meetsTarget, true);
});

test('an already-underlined link is not offered a fix', () => {
  const previewManager = { apply: () => ({ ok: true }), showOriginal: () => ({ ok: true }), showFixed: () => ({ ok: true }), revert: () => ({ ok: true }), hasActivePreview: () => false, dispose() {} };
  const c = createFixerController({ previewManager, readComputed: () => 'underline' });
  c.selectIssue(issue({ kind: 'link-color-only', wcagCriterion: '1.4.1', requiredRatio: 3 }), { isConnected: true, style: {} });
  assert.match(c.getState().message, /already underlined/);
});
