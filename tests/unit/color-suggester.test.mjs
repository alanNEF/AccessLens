import { test } from 'node:test';
import assert from 'node:assert/strict';
import { build } from 'esbuild';
const { outputFiles } = await build({ entryPoints: ['src/features/fixer/color-suggester.ts'], bundle: true, write: false, format: 'esm' });
const { suggestFix, contrastRatio, floorRatio } = await import('data:text/javascript;base64,' + Buffer.from(outputFiles[0].text).toString('base64'));

// Independent WCAG 2.x formula, so the tests do not only trust Culori.
function luminance(hex) {
  const [r, g, b] = [1, 3, 5].map(i => parseInt(hex.slice(i, i + 2), 16) / 255)
    .map(c => c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}
function wcag(a, b) {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}
const issue = (textColor, backgroundColor, requiredRatio = 4.5) =>
  ({ id: 'issue-1', textColor, backgroundColor, requiredRatio });

test('grey text on white: smallest darker grey that passes 4.5:1', () => {
  const result = suggestFix(issue('#777777', '#ffffff'));
  assert.equal(result.ok, true);
  const { fix } = result;
  assert.deepEqual([fix.issueId, fix.property, fix.originalValue], ['issue-1', 'color', '#777777']);
  assert.equal(fix.originalContrastRatio, 4.47);
  assert.ok(wcag(fix.suggestedValue, '#ffffff') >= 4.5);
  assert.ok(fix.expectedContrastRatio >= 4.5 && fix.expectedContrastRatio < 4.7, 'small change, not black');
  const [r, g, b] = [1, 3, 5].map(i => fix.suggestedValue.slice(i, i + 2));
  assert.ok(r === g && g === b, 'neutral grey stays neutral');
});

test('large text targets 3:1, not 4.5:1', () => {
  const { fix } = suggestFix(issue('#999999', '#ffffff', 3));
  assert.ok(wcag(fix.suggestedValue, '#ffffff') >= 3);
  assert.ok(fix.expectedContrastRatio < 3.3);
});

test('light text on a dark background moves lighter', () => {
  const { fix } = suggestFix(issue('#555555', '#222222'));
  assert.ok(luminance(fix.suggestedValue) > luminance('#555555'));
  assert.ok(wcag(fix.suggestedValue, '#222222') >= 4.5);
});

test('colored text keeps its hue family', () => {
  const { fix } = suggestFix(issue('#4a90e2', '#ffffff'));
  const [r, g, b] = [1, 3, 5].map(i => parseInt(fix.suggestedValue.slice(i, i + 2), 16));
  assert.ok(b > g && g > r, `still blue: ${fix.suggestedValue}`);
  assert.ok(wcag(fix.suggestedValue, '#ffffff') >= 4.5);
});

test('accepts computed-style formats: rgb(), named, lab(), oklch()', () => {
  for (const color of ['rgb(153, 153, 153)', 'darkgray', 'lab(65 0 0)', 'oklch(0.7 0.1 250)']) {
    const result = suggestFix(issue(color, 'rgb(255, 255, 255)'));
    assert.equal(result.ok, true, color);
    assert.ok(wcag(result.fix.suggestedValue, '#ffffff') >= 4.5, color);
  }
});

test('unsupported inputs are explained, never fixed (FIX-08)', () => {
  const reason = (text, bg) => suggestFix(issue(text, bg)).reason;
  assert.equal(reason('#000000', '#ffffff'), 'already-passes');
  assert.equal(reason('rgba(0, 0, 0, 0.5)', '#ffffff'), 'transparent-color');
  assert.equal(reason('#999999', 'rgba(255, 255, 255, 0.9)'), 'transparent-color');
  assert.equal(reason('transparent', '#ffffff'), 'transparent-color');
  assert.equal(reason('linear-gradient(red, blue)', '#ffffff'), 'invalid-color');
  assert.equal(reason('#999999', 'not-a-color'), 'invalid-color');
  assert.match(suggestFix(issue('rgba(0, 0, 0, 0.5)', '#ffffff')).message, /manual review/);
  assert.equal(suggestFix(issue('#ffffff', '#ffffff')).ok, true, 'white on white (1:1) is fixable');
});

test('every failing random pair gets a fix that passes by the independent formula', () => {
  let seed = 7;
  const random = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  const hex = () => '#' + Array.from({ length: 3 }, () => Math.floor(random() * 256).toString(16).padStart(2, '0')).join('');
  let checked = 0;
  for (let i = 0; i < 300; i++) {
    const [text, bg, required] = [hex(), hex(), random() < 0.5 ? 4.5 : 3];
    if (wcag(text, bg) >= required) continue;
    const result = suggestFix(issue(text, bg, required));
    assert.equal(result.ok, true, `${text} on ${bg}`);
    assert.ok(wcag(result.fix.suggestedValue, bg) >= required, `${result.fix.suggestedValue} on ${bg}`);
    assert.ok(result.fix.expectedContrastRatio <= wcag(result.fix.suggestedValue, bg));
    checked++;
  }
  assert.ok(checked > 100);
});

test('helpers: ratio matches WCAG, floor never rounds up', () => {
  assert.ok(Math.abs(contrastRatio('#777777', '#ffffff') - wcag('#777777', '#ffffff')) < 1e-9);
  assert.equal(floorRatio(4.499), 4.49);
  assert.equal(floorRatio(21), 21);
});

test('enhanced 7:1 on a mid-tone background falls back to changing the background', () => {
  // White text on #777777 is 4.48:1; neither black (4.69:1) nor white text can reach 7:1.
  const result = suggestFix(issue('#ffffff', '#777777', 7));
  assert.equal(result.ok, true);
  assert.equal(result.fix.property, 'background-color');
  assert.equal(result.fix.originalValue, '#777777');
  assert.ok(wcag('#ffffff', result.fix.suggestedValue) >= 7);
  assert.ok(result.fix.expectedContrastRatio >= 7);
});

test('enhanced 7:1 prefers a text change when one exists', () => {
  const result = suggestFix(issue('#4b5563', '#f4f1ea', 7));
  assert.equal(result.ok, true);
  assert.equal(result.fix.property, 'color');
  assert.ok(wcag(result.fix.suggestedValue, '#f4f1ea') >= 7);
});
