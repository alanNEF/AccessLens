import { test } from 'node:test';
import assert from 'node:assert/strict';
import { build } from 'esbuild';
const { outputFiles } = await build({ entryPoints: ['src/features/fixer/color-vision.ts'], bundle: true, write: false, format: 'esm' });
const m = await import('data:text/javascript;base64,' + Buffer.from(outputFiles[0].text).toString('base64'));

test('matches the Simulator: the Health card colors as seen with Deuteranopia', () => {
  // Pixel colors measured from real screenshots taken with the Deuteranopia simulation on.
  assert.equal(m.simulateColor('#43e8b0', 'deuteranopia'), '#cec8b4');
  assert.equal(m.simulateColor('#1f7457', 'deuteranopia'), '#666359');
  assert.equal(m.simulateColor('#1e9972', 'deuteranopia'), '#878375');
});

test('greys, black and white look the same for every color-vision type', () => {
  for (const check of m.VISION_CHECKS) {
    assert.equal(m.simulateColor('#000000', check), '#000000', check);
    assert.equal(m.simulateColor('#ffffff', check), '#ffffff', check);
    assert.equal(m.simulateColor('#777777', check), '#777777', check);
  }
});

test('red and green collapse under red-green color blindness', () => {
  const red = m.simulateColor('#d03030', 'deuteranopia');
  const green = m.simulateColor('#2f9e44', 'deuteranopia');
  const distance = [1, 3, 5].reduce((sum, i) => sum + Math.abs(parseInt(red.slice(i, i + 2), 16) - parseInt(green.slice(i, i + 2), 16)), 0);
  assert.ok(distance < 120, `${red} vs ${green}`);
});

test('simulatedRatios reports one ratio per type, using the given contrast function', () => {
  const ratios = m.simulatedRatios('#000000', '#ffffff', () => 7);
  assert.deepEqual({ ...ratios }, { protanopia: 7, deuteranopia: 7, tritanopia: 7 });
});
