import { test } from 'node:test';
import assert from 'node:assert/strict';
import { build } from 'esbuild';
const { outputFiles } = await build({ entryPoints: ['src/features/simulator/filters.ts'], bundle: true, write: false, format: 'esm' });
const { PRESETS } = await import('data:text/javascript;base64,' + Buffer.from(outputFiles[0].text).toString('base64'));

const entries = Object.entries(PRESETS);

test('every mode has a unique, non-empty label', () => {
  const labels = entries.map(([, p]) => p.label);
  assert.ok(labels.every(label => typeof label === 'string' && label.trim()));
  assert.equal(new Set(labels).size, labels.length);
});

test('a preset is a color matrix or a CSS filter, never both', () => {
  for (const [id, p] of entries) assert.ok(!('matrix' in p && 'css' in p), id);
});

test('color matrices are 4x5 with alpha preserved', () => {
  for (const [id, p] of entries.filter(([, p]) => 'matrix' in p)) {
    const v = p.matrix.trim().split(/\s+/).map(Number);
    assert.equal(v.length, 20, id);
    assert.ok(v.every(Number.isFinite), id);
    assert.deepEqual(v.slice(15), [0, 0, 0, 1, 0], `${id} alpha row`);
  }
});

test('achromatopsia maps every channel to the same luminance and keeps white white', () => {
  const v = PRESETS.achromatopsia.matrix.trim().split(/\s+/).map(Number);
  const rows = [v.slice(0, 5), v.slice(5, 10), v.slice(10, 15)];
  assert.deepEqual(rows[0], rows[1]);
  assert.deepEqual(rows[1], rows[2]);
  assert.ok(Math.abs(rows[0][0] + rows[0][1] + rows[0][2] - 1) < 1e-9);
});

test('CSS presets use only standard filter functions', () => {
  const allowed = /^(?:\s*(?:blur|contrast|brightness|sepia|saturate|grayscale|hue-rotate|opacity)\([^()]*\))+\s*$/;
  for (const id of ['cataracts', 'low-contrast']) assert.match(PRESETS[id].css, allowed, id);
  assert.equal(PRESETS.cataracts.halo, true, 'cataracts blurs, so its halo must be clipped');
});
