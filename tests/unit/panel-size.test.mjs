import { test } from 'node:test';
import assert from 'node:assert/strict';
import { build } from 'esbuild';
const { outputFiles } = await build({ entryPoints: ['src/components/shared/panel-size.ts'], bundle: true, write: false, format: 'esm' });
const m = await import('data:text/javascript;base64,' + Buffer.from(outputFiles[0].text).toString('base64'));

const viewport = { width: 1280, height: 800 };
// Default panel: 380×600 at 16px from the bottom-right corner.
const box = { offset: { right: 16, bottom: 16 }, size: { width: 380, height: 600 } };
const plain = b => ({ offset: { ...b.offset }, size: { ...b.size } });

test('left and top edges grow the panel; its bottom-right corner stays put', () => {
  assert.deepEqual(plain(m.resizeBox(box, 'w', -100, 0, viewport)), { offset: { right: 16, bottom: 16 }, size: { width: 480, height: 600 } });
  assert.deepEqual(plain(m.resizeBox(box, 'n', 0, -50, viewport)), { offset: { right: 16, bottom: 16 }, size: { width: 380, height: 650 } });
  assert.deepEqual(plain(m.resizeBox(box, 'nw', -20, -30, viewport)), { offset: { right: 16, bottom: 16 }, size: { width: 400, height: 630 } });
});

test('right and bottom edges move that side: size and offset change together', () => {
  assert.deepEqual(plain(m.resizeBox(box, 'e', -40, 0, viewport)), { offset: { right: 56, bottom: 16 }, size: { width: 340, height: 600 } });
  assert.deepEqual(plain(m.resizeBox(box, 's', 0, -40, viewport)), { offset: { right: 16, bottom: 56 }, size: { width: 380, height: 560 } });
  const se = m.resizeBox(box, 'se', -10, -10, viewport);
  assert.deepEqual(plain(se), { offset: { right: 26, bottom: 26 }, size: { width: 370, height: 590 } });
});

test('only the dragged axis changes for side edges', () => {
  const r = m.resizeBox(box, 'w', -50, 999, viewport);
  assert.equal(r.size.height, 600);
  assert.equal(r.offset.bottom, 16);
});

test('never smaller than MIN_SIZE; the opposite edge does not move', () => {
  const tiny = m.resizeBox(box, 'nw', 5000, 5000, viewport);
  assert.deepEqual(plain(tiny), { offset: { right: 16, bottom: 16 }, size: { ...m.MIN_SIZE } });
  const fromRight = m.resizeBox(box, 'e', -5000, 0, viewport);
  assert.equal(fromRight.size.width, m.MIN_SIZE.width);
  assert.equal(viewport.width - fromRight.offset.right - fromRight.size.width, viewport.width - 16 - 380, 'left edge unchanged');
});

test('never past the 8px edge margin of the viewport', () => {
  const huge = m.resizeBox(box, 'nw', -5000, -5000, viewport);
  assert.deepEqual(plain(huge), { offset: { right: 16, bottom: 16 }, size: { width: 1280 - 8 - 16, height: 800 - 8 - 16 } });
  const out = m.resizeBox(box, 'se', 5000, 5000, viewport);
  assert.deepEqual({ ...out.offset }, { right: 8, bottom: 8 });
});

test('a viewport smaller than MIN_SIZE still fits', () => {
  const small = { width: 280, height: 200 };
  const r = m.resizeBox({ offset: { right: 8, bottom: 8 }, size: { width: 264, height: 184 } }, 'nw', 100, 100, small);
  assert.ok(r.size.width <= small.width - 16 && r.size.height <= small.height - 16);
});

test('keyboard: Left/Up grow, Right/Down shrink, Shift is a bigger step, other keys do nothing', () => {
  assert.equal(m.resizeByKey(box, 'ArrowLeft', false, viewport).size.width, 380 + m.RESIZE_STEP);
  assert.equal(m.resizeByKey(box, 'ArrowUp', true, viewport).size.height, 600 + m.RESIZE_STEP_LARGE);
  assert.equal(m.resizeByKey(box, 'ArrowRight', false, viewport).size.width, 380 - m.RESIZE_STEP);
  assert.equal(m.resizeByKey(box, 'ArrowDown', false, viewport).size.height, 600 - m.RESIZE_STEP);
  assert.deepEqual({ ...m.resizeByKey(box, 'ArrowLeft', false, viewport).offset }, { right: 16, bottom: 16 });
  assert.equal(m.resizeByKey(box, 'a', false, viewport), null);
});

test('stored sizes are validated', () => {
  assert.equal(m.isPanelSize({ width: 400, height: 500 }), true);
  for (const bad of [null, {}, { width: '400', height: 500 }, { width: 400, height: Number.NaN }, { width: 0, height: 500 }]) {
    assert.equal(m.isPanelSize(bad), false, JSON.stringify(bad));
  }
});
