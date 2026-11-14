import { test } from 'node:test';
import assert from 'node:assert/strict';
import { build } from 'esbuild';
const { outputFiles } = await build({ entryPoints: ['src/features/inspector/contrast-mapping.ts'], bundle: true, write: false, format: 'esm' });
const m = await import('data:text/javascript;base64,' + Buffer.from(outputFiles[0].text).toString('base64'));

const failure = data => m.toContrastIssue({ id: 'failed-0', status: 'failed', selector: '.x', elementLabel: '<p>', data });

test('normal text failure keeps axe colors, ratio and the 4.5 threshold (market.html T1)', () => {
  const issue = failure({ fgColor: '#a3a3a3', bgColor: '#ffffff', contrastRatio: 2.52, expectedContrastRatio: '4.5:1', fontSize: '10.5pt (14px)', fontWeight: 'normal' });
  assert.equal(issue.status, 'failed');
  assert.equal(issue.textColor, '#a3a3a3');
  assert.equal(issue.backgroundColor, '#ffffff');
  assert.equal(issue.contrastRatio, 2.52);
  assert.equal(issue.requiredRatio, 4.5);
  assert.equal(issue.isLargeText, false);
  assert.equal(issue.wcagCriterion, '1.4.3');
  assert.equal(issue.reviewReason, undefined);
});

test('large text uses the 3:1 threshold', () => {
  assert.deepEqual(m.requiredRatioFor({ expectedContrastRatio: '3:1' }), { requiredRatio: 3, isLargeText: true });
  assert.deepEqual(m.requiredRatioFor({ fontSize: '21.0pt (28px)', fontWeight: 'normal' }), { requiredRatio: 3, isLargeText: true });
  assert.deepEqual(m.requiredRatioFor({ fontSize: '14.0pt (18.6667px)', fontWeight: 'bold' }), { requiredRatio: 3, isLargeText: true });
  assert.deepEqual(m.requiredRatioFor({ fontSize: '14.0pt (18.6667px)', fontWeight: 'normal' }), { requiredRatio: 4.5, isLargeText: false });
  assert.deepEqual(m.requiredRatioFor({ fontSize: '12.0pt (16px)', fontWeight: '700' }), { requiredRatio: 4.5, isLargeText: false });
});

test('a "failure" without measurable colors is downgraded to needs-review, never claimed', () => {
  const issue = failure({ fgColor: '#ffffff', bgColor: null, contrastRatio: 0, messageKey: 'bgGradient' });
  assert.equal(issue.status, 'needs-review');
  assert.equal(issue.backgroundColor, null);
  assert.equal(issue.contrastRatio, null);
  assert.match(issue.reviewReason, /gradient/);
});

test('needs-review explains the axe reason in plain language, with a fallback', () => {
  const review = key => m.toContrastIssue({ id: 'r', status: 'needs-review', selector: '.x', elementLabel: '<p>', data: { messageKey: key } });
  assert.match(review('bgImage').reviewReason, /background image/);
  assert.match(review('somethingNew').reviewReason, /could not reliably/);
  assert.match(m.toContrastIssue({ id: 'r', status: 'needs-review', selector: '.x', elementLabel: '<p>', data: null }).reviewReason, /could not reliably/);
});

test('ratio formatting truncates instead of rounding up to a pass', () => {
  assert.equal(m.formatRatio(4.4999), '4.49');
  assert.equal(m.formatRatio(3.36), '3.36');
});

test('element labels and selectors are readable', () => {
  assert.equal(m.describeElement('P', '  Sells out by   11 am\nmost weeks. '), '<p> “Sells out by 11 am most weeks.”');
  assert.equal(m.describeElement('SPAN', ''), '<span>');
  assert.ok(m.describeElement('P', 'x'.repeat(80)).endsWith('…”'));
  assert.equal(m.selectorFromTarget(['main', ['#host', '.inner']]), 'main #host >>> .inner');
});

test('explanations state the ratio, the rule and the result', () => {
  const issue = failure({ fgColor: '#8c8c8c', bgColor: '#ffffff', contrastRatio: 3.36, expectedContrastRatio: '4.5:1' });
  const text = m.explainIssue(issue);
  assert.match(text, /3\.36:1/);
  assert.match(text, /4\.5:1/);
  assert.match(text, /normal-size text/);
});
