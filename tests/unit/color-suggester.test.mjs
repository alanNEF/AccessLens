import { test } from 'node:test';
import assert from 'node:assert/strict';
import { build } from 'esbuild';
const { outputFiles } = await build({ entryPoints: ['src/features/fixer/color-suggester.ts'], bundle: true, write: false, format: 'esm' });
const { suggestFix, contrastRatio, floorRatio, renderedColor } = await import('data:text/javascript;base64,' + Buffer.from(outputFiles[0].text).toString('base64'));

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

// Independent CSS compositing: color faded to `alpha` over the background, per sRGB channel.
function blend(hex, bgHex, alpha) {
  const ch = (h, i) => parseInt(h.slice(i, i + 2), 16);
  return '#' + [1, 3, 5].map(i => Math.round(alpha * ch(hex, i) + (1 - alpha) * ch(bgHex, i)).toString(16).padStart(2, '0')).join('');
}

test('renderedColor matches CSS opacity compositing', () => {
  assert.equal(renderedColor('#07271c', '#43e8b0', 0.6), blend('#07271c', '#43e8b0', 0.6));
  assert.equal(renderedColor('#07271c', '#43e8b0', 0.6), '#1f7457', 'the Health card as Inspector reported it');
  assert.equal(renderedColor('rgb(10, 20, 30)', '#ffffff', 1), '#0a141e');
});

test('opacity: suggests the CSS color that passes after fading (Health card)', () => {
  const result = suggestFix({ ...issue('#07271c', '#43e8b0'), opacity: 0.6 });
  assert.equal(result.ok, true);
  const { fix } = result;
  assert.equal(fix.originalValue, '#07271c');
  assert.equal(fix.originalContrastRatio, 3.62, 'measured as drawn, like Inspector');
  assert.ok(wcag(blend(fix.suggestedValue, '#43e8b0', 0.6), '#43e8b0') >= 4.5, 'passes once faded');
  assert.ok(luminance(fix.suggestedValue) < luminance('#07271c'), 'darker, not lighter');
});

test('opacity: too faint for any color is explained', () => {
  assert.equal(suggestFix({ ...issue('#07271c', '#43e8b0'), opacity: 0.3 }).reason, 'too-transparent');
  assert.equal(suggestFix({ ...issue('#999999', '#ffffff'), opacity: 0 }).reason, 'too-transparent');
});

test('opacity: random cases pass as drawn, or are honestly impossible', () => {
  let seed = 11;
  const random = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  const hex = () => '#' + Array.from({ length: 3 }, () => Math.floor(random() * 256).toString(16).padStart(2, '0')).join('');
  let fixed = 0, impossible = 0;
  for (let i = 0; i < 300; i++) {
    const [text, bg, alpha, required] = [hex(), hex(), 0.3 + random() * 0.7, random() < 0.5 ? 4.5 : 3];
    if (wcag(blend(text, bg, alpha), bg) >= required) continue;
    const result = suggestFix({ ...issue(text, bg, required), opacity: alpha });
    if (result.ok) {
      assert.ok(wcag(blend(result.fix.suggestedValue, bg, alpha), bg) >= required, `${result.fix.suggestedValue} at ${alpha} on ${bg}`);
      fixed++;
    } else {
      assert.equal(result.reason, 'too-transparent');
      const best = Math.max(wcag(blend('#000000', bg, alpha), bg), wcag(blend('#ffffff', bg, alpha), bg));
      assert.ok(best < required + 0.05, `claimed impossible but black/white reach ${best.toFixed(2)}`);
      impossible++;
    }
  }
  assert.ok(fixed > 50 && impossible > 5, `fixed ${fixed}, impossible ${impossible}`);
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

// ── Color-blind-safe suggestions and the site's own palette ──────────────────
const vision = await import('data:text/javascript;base64,' + Buffer.from((await build({ entryPoints: ['src/features/fixer/color-vision.ts'], bundle: true, write: false, format: 'esm' })).outputFiles[0].text).toString('base64'));
const simulatedOk = (text, bg, required) => vision.VISION_CHECKS.every(check => wcag(vision.simulateColor(text, check), vision.simulateColor(bg, check)) >= required);

test('Health card: the fix now also passes with Deuteranopia (old fix reached only 4.46:1)', () => {
  const { fix } = suggestFix({ ...issue('#07271c', '#43e8b0'), opacity: 0.6 });
  assert.equal(fix.colorBlindSafe, true);
  assert.ok(fix.simulatedRatios.deuteranopia >= 4.5);
  assert.ok(simulatedOk(blend(fix.suggestedValue, '#43e8b0', 0.6), '#43e8b0', 4.5));
});

test('color-blind-safe claims hold for random colors; WCAG is always met', () => {
  let seed = 23;
  const random = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  const hex = () => '#' + Array.from({ length: 3 }, () => Math.floor(random() * 256).toString(16).padStart(2, '0')).join('');
  let safe = 0;
  for (let i = 0; i < 300; i++) {
    const [text, bg, required] = [hex(), hex(), random() < 0.5 ? 4.5 : 3];
    if (wcag(text, bg) >= required) continue;
    const result = suggestFix(issue(text, bg, required));
    if (!result.ok || result.fix.property !== 'color') continue;
    assert.ok(wcag(result.fix.suggestedValue, bg) >= required);
    assert.equal(result.fix.colorBlindSafe, simulatedOk(result.fix.suggestedValue, bg, required), `${result.fix.suggestedValue} on ${bg}`);
    if (result.fix.colorBlindSafe) safe++;
  }
  assert.ok(safe > 100, `color-blind safe in ${safe} cases`);
});

test('a passing site color is preferred; the adjusted shade becomes the alternative (market Subscribe button)', () => {
  const result = suggestFix({ ...issue('#ffffff', '#f59e0b'), palette: ['#1f2937', '#ffffff', '#1f5135'] });
  assert.equal(result.fix.source, 'site-palette');
  assert.equal(result.fix.suggestedValue, '#1f2937');
  assert.ok(wcag('#1f2937', '#f59e0b') >= 4.5);
  assert.equal(result.alternative.source, 'adjusted');
});

test('a much closer adjusted shade wins; the site color is offered as the alternative', () => {
  const result = suggestFix({ ...issue('#999999', '#ffffff'), palette: ['#1f5135'] });
  assert.equal(result.fix.source, 'adjusted');
  assert.equal(result.alternative.suggestedValue, '#1f5135');
  assert.equal(result.alternative.source, 'site-palette');
});

test('site colors that fail, are transparent or invalid are ignored', () => {
  const result = suggestFix({ ...issue('#999999', '#ffffff'), palette: ['#aaaaaa', 'rgba(0, 0, 0, 0.5)', 'not-a-color'] });
  assert.equal(result.fix.source, 'adjusted');
  assert.equal(result.alternative, undefined);
});
