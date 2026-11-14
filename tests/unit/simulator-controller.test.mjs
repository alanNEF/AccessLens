import { test } from 'node:test';
import assert from 'node:assert/strict';
import { build } from 'esbuild';
const { outputFiles } = await build({ entryPoints: ['src/features/simulator/simulator-controller.ts'], bundle: true, write: false, format: 'esm' });
const { createSimulatorController } = await import('data:text/javascript;base64,' + Buffer.from(outputFiles[0].text).toString('base64'));
function fixture() {
  const calls = [];
  let fail = false;
  const engine = {
    apply(mode, blur) { calls.push(['apply', mode, blur]); if (fail) throw new Error('Blocked effect'); },
    reset() { calls.push(['reset']); },
    dispose() { calls.push(['dispose']); },
  };
  return { controller: createSimulatorController(engine), calls, fail() { fail = true; } };
}
test('immutable, stable snapshots; exactly one mode; settings retained and Reset defaults', () => {
  const { controller: c, calls } = fixture();
  assert.deepEqual(c.getState(), { settings: { mode: 'none', blurPx: 2 }, status: 'idle' });
  assert.equal(c.getState(), c.getState());
  assert.throws(() => { c.getState().settings.mode = 'blur'; }, TypeError);
  c.setMode('blur'); c.setBlurPx(4.3);
  assert.equal(c.getState().settings.blurPx, 4.5);
  for (const mode of ['protanopia', 'deuteranopia', 'tritanopia', 'none', 'blur']) {
    c.setMode(mode);
    assert.equal(c.getState().settings.mode, mode);
    assert.equal(c.getState().settings.blurPx, 4.5);
  }
  c.setBlurPx(100); assert.equal(c.getState().settings.blurPx, 8);
  c.setBlurPx(-1); assert.equal(c.getState().settings.blurPx, 0);
  c.reset(); c.reset();
  assert.deepEqual(c.getState(), { settings: { mode: 'none', blurPx: 2 }, status: 'idle' });
  assert.deepEqual(calls.at(-1), ['apply', 'none', 2]);
});
test('publish actual applied state; failure resets Off; unsubscribe and recovery', () => {
  const { controller: c, calls, fail } = fixture();
  const states = [];
  const unsubscribe = c.subscribe(state => { assert.equal(c.getState(), state); states.push(state); });
  c.setMode('protanopia');
  assert.equal(states.at(-1).status, 'active');
  fail(); c.setMode('blur');
  assert.equal(states.at(-1).settings.mode, 'none');
  assert.equal(states.at(-1).status, 'error');
  assert.match(states.at(-1).error, /Blocked effect/);
  assert.deepEqual(calls.at(-1), ['reset']);
  unsubscribe(); const count = states.length;
  c.reset(); assert.equal(states.length, count);
});
test('invalid mode or blur clears effects; invalid input never reaches engine; Reset recovers', () => {
  const { controller: c, calls } = fixture();
  for (const action of [() => c.setMode('unknown'), () => c.setBlurPx(NaN), () => c.setBlurPx(Infinity), () => c.setBlurPx('2')]) {
    c.setMode('blur'); const before = calls.length;
    action();
    assert.equal(c.getState().settings.mode, 'none');
    assert.equal(c.getState().status, 'error');
    assert.deepEqual(calls.slice(before), [['reset']]);
    c.reset(); assert.equal(c.getState().status, 'idle');
  }
});
test('dispose removes effects, clears subscriptions, and prevents later updates', () => {
  const { controller: c, calls } = fixture();
  let count = 0;
  c.subscribe(() => count++);
  c.setMode('blur'); c.dispose();
  assert.equal(c.getState().settings.mode, 'none');
  const before = calls.length;
  c.dispose(); c.setMode('protanopia'); c.setBlurPx(8); c.reset();
  assert.equal(calls.length, before);
  assert.equal(count, 2);
  assert.deepEqual(calls.at(-1), ['dispose']);
});
