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

test('enhanced (AAA) standard: 7:1 normal, 4.5:1 large, criterion 1.4.6', () => {
  assert.deepEqual(m.requiredRatioFor({ fontSize: '12.0pt (16px)', fontWeight: 'normal' }, 'AAA'), { requiredRatio: 7, isLargeText: false });
  assert.deepEqual(m.requiredRatioFor({ fontSize: '21.0pt (28px)' }, 'AAA'), { requiredRatio: 4.5, isLargeText: true });
  assert.deepEqual(m.requiredRatioFor({ expectedContrastRatio: '7:1' }, 'AAA'), { requiredRatio: 7, isLargeText: false });
  const issue = m.toContrastIssue({ id: 'e', status: 'failed', selector: '.meta', elementLabel: '<p>', level: 'AAA',
    data: { fgColor: '#4b5563', bgColor: '#f4f1ea', contrastRatio: 6.7, expectedContrastRatio: '7:1', fontSize: '9.0pt (12px)' } });
  assert.equal(issue.wcagCriterion, '1.4.6');
  assert.equal(issue.requiredRatio, 7);
  assert.equal(issue.kind, 'text-contrast');
  assert.match(m.explainIssue(issue), /AAA \(1\.4\.6\).*7:1/);
});

test('AA issues keep criterion 1.4.3 by default', () => {
  assert.equal(failure({ fgColor: '#a3a3a3', bgColor: '#ffffff', contrastRatio: 2.52 }).wcagCriterion, '1.4.3');
});

test('color-only links map to WCAG 1.4.1 with link and surrounding text colors (market.html T9)', () => {
  const link = m.toLinkIssue({ id: 'l', status: 'failed', selector: '.policy-link', elementLabel: '<a>',
    data: { nodeColor: '#1e40af', parentColor: '#1f2937', contrastRatio: 1.68 } });
  assert.equal(link.kind, 'link-color-only');
  assert.equal(link.wcagCriterion, '1.4.1');
  assert.equal(link.requiredRatio, 3);
  assert.equal(link.textColor, '#1e40af');
  assert.equal(link.backgroundColor, '#1f2937');
  assert.equal(link.contrastRatio, 1.68);
  assert.match(m.explainIssue(link), /no underline.*1\.68:1/);
});

test('link colors fall back to computed styles, and the ratio is computed when axe gives none', () => {
  const link = m.toLinkIssue({ id: 'l', status: 'failed', selector: 'a', elementLabel: '<a>', data: {},
    computedLinkColor: 'rgb(30, 64, 175)', computedTextColor: 'rgb(31, 41, 55)' });
  assert.equal(link.status, 'failed');
  assert.ok(Math.abs(link.contrastRatio - 1.68) < 0.01, String(link.contrastRatio));
  const unknown = m.toLinkIssue({ id: 'l', status: 'failed', selector: 'a', elementLabel: '<a>', data: null, computedLinkColor: null });
  assert.equal(unknown.status, 'needs-review', 'never claims a failure without colors');
});

test('cssContrastRatio reads hex and rgb(), and refuses transparent or unknown formats', () => {
  assert.ok(Math.abs(m.cssContrastRatio('#000', '#ffffff') - 21) < 1e-9);
  assert.ok(Math.abs(m.cssContrastRatio('rgb(119, 119, 119)', 'rgb(255 255 255)') - 4.48) < 0.01);
  assert.equal(m.cssContrastRatio('rgba(0, 0, 0, 0.5)', '#fff'), null);
  assert.equal(m.cssContrastRatio('oklch(0.5 0.1 200)', '#fff'), null);
  assert.ok(m.cssContrastRatio('rgba(0, 0, 0, 1)', '#fff') > 20);
});

test('at AAA, a failure found by the AA rule is judged against the AAA target (axe enhanced rule skips < 4.5:1)', () => {
  const data = { fgColor: '#a3a3a3', bgColor: '#ffffff', contrastRatio: 2.52, expectedContrastRatio: '4.5:1', fontSize: '10.5pt (14px)', fontWeight: 'normal' };
  const issue = m.toContrastIssue({ id: 'a', status: 'failed', selector: '.fine-print', elementLabel: '<p>', data, level: 'AAA', fromMinimumRule: true });
  assert.equal(issue.requiredRatio, 7);
  assert.equal(issue.isLargeText, false, 'the AA "4.5:1" must not be read as AAA large text');
  assert.equal(issue.wcagCriterion, '1.4.6');
  const large = m.toContrastIssue({ id: 'b', status: 'failed', selector: 'h2', elementLabel: '<h2>', level: 'AAA', fromMinimumRule: true,
    data: { fgColor: '#bbbbbb', bgColor: '#ffffff', contrastRatio: 1.9, expectedContrastRatio: '3:1', fontSize: '21.0pt (28px)' } });
  assert.deepEqual([large.requiredRatio, large.isLargeText], [4.5, true]);
  const nullData = m.toContrastIssue({ id: 'c', status: 'needs-review', selector: 'p', elementLabel: '<p>', data: null, level: 'AAA', fromMinimumRule: true });
  assert.equal(nullData.requiredRatio, 7);
});
