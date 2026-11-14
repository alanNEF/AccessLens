import { test } from 'node:test';
import assert from 'node:assert/strict';
import { build } from 'esbuild';
const { outputFiles } = await build({ entryPoints: ['src/components/shared/panel-position.ts'], bundle: true, write: false, format: 'esm' });
const m = await import('data:text/javascript;base64,' + Buffer.from(outputFiles[0].text).toString('base64'));

const viewport = { width: 1280, height: 800 };
const panel = { width: 380, height: 600 };

test('default offset matches the original bottom-right corner', () => {
  assert.deepEqual({ ...m.DEFAULT_OFFSET }, { right: 16, bottom: 16 });
});

test('dragging right/down moves the panel toward the right/bottom edges', () => {
  assert.deepEqual(m.dragOffset({ right: 100, bottom: 100 }, 30, -20), { right: 70, bottom: 120 });
});

test('clamping keeps the whole panel on screen with an 8px margin', () => {
  assert.deepEqual(m.clampOffset({ right: -50, bottom: -50 }, panel, viewport), { right: 8, bottom: 8 });
  assert.deepEqual(m.clampOffset({ right: 5000, bottom: 5000 }, panel, viewport), { right: 1280 - 380 - 8, bottom: 800 - 600 - 8 });
  assert.deepEqual(m.clampOffset({ right: 300, bottom: 100 }, panel, viewport), { right: 300, bottom: 100 });
});

test('a panel larger than the viewport is pinned to the margin instead of going off screen', () => {
  assert.deepEqual(m.clampOffset({ right: 200, bottom: 200 }, { width: 2000, height: 2000 }, viewport), { right: 8, bottom: 8 });
});

test('arrow keys nudge in the expected direction; Shift uses big steps; Home resets', () => {
  const start = { right: 100, bottom: 100 };
  assert.deepEqual(m.nudgeOffset(start, 'ArrowLeft', false), { right: 116, bottom: 100 });
  assert.deepEqual(m.nudgeOffset(start, 'ArrowRight', false), { right: 84, bottom: 100 });
  assert.deepEqual(m.nudgeOffset(start, 'ArrowUp', true), { right: 100, bottom: 164 });
  assert.deepEqual(m.nudgeOffset(start, 'ArrowDown', true), { right: 100, bottom: 36 });
  assert.deepEqual({ ...m.nudgeOffset(start, 'Home', false) }, { right: 16, bottom: 16 });
  assert.equal(m.nudgeOffset(start, 'a', false), null);
});

test('saved positions are validated before use', () => {
  assert.equal(m.isPanelOffset({ right: 10, bottom: 20 }), true);
  assert.equal(m.isPanelOffset({ right: '10', bottom: 20 }), false);
  assert.equal(m.isPanelOffset({ right: NaN, bottom: 20 }), false);
  assert.equal(m.isPanelOffset(null), false);
});

test('small pointer jitter on the launcher is still a click, not a drag', () => {
  assert.equal(m.passedThreshold(2, 2), false);
  assert.equal(m.passedThreshold(4, 0), true);
});
