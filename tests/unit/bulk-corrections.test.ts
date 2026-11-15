import { afterEach, describe, expect, it, vi } from 'vitest';
import type { ContrastIssue } from '../../src/shared/types';
import { createIssueHandoffStore } from '../../src/shared/issue-handoff';
import { createInspectorStore } from '../../src/features/inspector/inspector-store';
import { connectInspectorToFixer } from '../../src/features/fixer/connect-inspector';
import { contrastRatio } from '../../src/features/fixer/color-suggester';
import { createFixerController } from '../../src/features/fixer/fixer-controller';
import { createPreviewManager } from '../../src/features/fixer/preview-manager';
import type { CorrectionTarget } from '../../src/features/fixer/correction-generator';
import { act, createElement } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { FixerTab } from '../../src/features/fixer/FixerTab';
import type { ImageIssue } from '../../src/features/inspector/image-runner';

const controllers: ReturnType<typeof createFixerController>[] = [];
const roots: Root[] = [];
Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
function controller(readComputed?: (element: Element, property: string) => string) {
  const c = createFixerController({ previewManager: createPreviewManager(), readComputed });
  controllers.push(c);
  return c;
}
function target(id: string, overrides: Partial<ContrastIssue> = {}): CorrectionTarget & { element: HTMLParagraphElement } {
  const element = document.createElement('p');
  element.id = id;
  element.textContent = `Low contrast ${id}`;
  element.style.setProperty('color', 'rgb(204, 204, 204)', 'important');
  element.style.setProperty('background-color', 'white');
  element.style.setProperty('margin', '7px');
  document.body.append(element);
  return { element, issue: { id, selector: `#${id}`, elementLabel: `<p> ${element.textContent}`, textColor: '#cccccc', backgroundColor: '#ffffff', contrastRatio: 1.6,
    requiredRatio: 4.5, isLargeText: false, status: 'failed', wcagCriterion: '1.4.3', ...overrides } };
}

afterEach(() => {
  act(() => roots.splice(0).forEach(root => root.unmount()));
  controllers.splice(0).forEach(c => c.dispose());
  document.body.replaceChildren();
  vi.restoreAllMocks();
});

function imageTarget(id: string): ImageIssue & { element: HTMLImageElement } {
  const element = document.createElement('img');
  element.id = id;
  element.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg"/%3E';
  document.body.append(element);
  return { id, selector: `#${id}`, element, description: 'Missing alternative text' };
}

function mountFixer(selectedImage: (ImageIssue & { element: HTMLImageElement }) | null = null) {
  const c = controller();
  const image = selectedImage ?? imageTarget('unlabeled');
  const item = target('contrast');
  const host = document.createElement('aside');
  document.body.append(host);
  const inspector = createInspectorStore(host);
  vi.spyOn(inspector, 'getState').mockReturnValue({ ...inspector.getState(), status: 'done', issues: [item], imageIssues: [image] });
  const root = createRoot(host);
  roots.push(root);
  const render = (selectedImage: ImageIssue | null) => act(() => root.render(createElement(FixerTab, { controller: c, inspector, selectedImage,
    modeReader: { getActiveMode: () => 'none' as const, subscribeActiveMode: () => () => {} } })));
  render(selectedImage);
  const button = (label: string) => [...host.querySelectorAll('button')].find(button => button.textContent === label);
  return { c, host, image, item, button, render };
}

function enterText(input: HTMLTextAreaElement, value: string) {
  act(() => {
    Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value')!.set!.call(input, value);
    input.dispatchEvent(new Event('input', { bubbles: true }));
  });
}

describe('image and contrast Fixer UI', () => {
  it('includes an image checkbox and label textbox when running all corrections', async () => {
    const f = mountFixer();
    await act(async () => {
      f.button('Run All Corrections')!.click();
      await new Promise(resolve => setTimeout(resolve, 10));
    });
    expect(f.host.querySelectorAll('input[type=checkbox]')).toHaveLength(2);
    expect(f.host.querySelector('textarea')).not.toBeNull();
    expect(f.image.element.hasAttribute('alt')).toBe(false);
    enterText(f.host.querySelector('textarea')!, 'Red sun above green hills');
    act(() => f.host.querySelectorAll<HTMLInputElement>('input[type=checkbox]')[1].click());
    expect(f.image.element.alt).toBe('Red sun above green hills');
    expect(f.host.textContent).toContain('2 of 2 corrections enabled');
    enterText(f.host.querySelector('textarea')!, 'A red sun and green hills');
    expect(f.image.element.alt).toBe('A red sun and green hills');
    act(() => f.button('Restore Original')!.click());
    expect(f.image.element.hasAttribute('alt')).toBe(false);
    expect(f.item.element.style.color).toBe('rgb(204, 204, 204)');
  });

  it('keeps bulk controls and image edits available after an individual preview and switching views', async () => {
    const f = mountFixer(imageTarget('selected-image'));
    expect(f.button('Preview alt text')).toBeDefined();
    expect(f.button('Run All Corrections')).toBeDefined();
    const selected = f.host.querySelector('section[aria-label="Selected image correction"]')!;
    enterText(selected.querySelector('textarea')!, 'The selected landscape');
    act(() => f.button('Preview alt text')!.click());
    expect(f.image.element.alt).toBe('The selected landscape');
    await act(async () => {
      f.button('Run All Corrections')!.click();
      await new Promise(resolve => setTimeout(resolve, 10));
    });
    expect(f.host.querySelectorAll('input[type=checkbox]')).toHaveLength(2);
    expect(f.host.textContent).toContain('2 of 2 corrections enabled');
    expect(f.button('Run All Corrections')).toBeDefined();
    f.render(null);
    expect(f.image.element.alt).toBe('The selected landscape');
    expect(f.host.querySelector('textarea')!.value).toBe('The selected landscape');
    act(() => f.button('Deselect All')!.click());
    expect(f.image.element.hasAttribute('alt')).toBe(false);
    f.render(f.image);
    expect(f.host.querySelector('section[aria-label="Selected image correction"] textarea')).toHaveProperty('value', 'The selected landscape');
    act(() => f.button('Select All')!.click());
    expect(f.image.element.alt).toBe('The selected landscape');
  });
});

describe('shared image correction lifecycle', () => {
  it.each([null, '', 'Original description'])('restores the exact original alt attribute (%s) after edits and repeated runs', async original => {
    const c = controller();
    const image = imageTarget('landscape');
    if (original !== null) image.element.setAttribute('alt', original);
    image.element.setAttribute('title', 'Page title');
    const contrast = target('text');
    await c.bulk.run([contrast], 'developer', { imageIssues: [image, image] });
    expect(c.bulk.getState().imageCorrections).toHaveLength(1);
    const [row] = c.bulk.getState().imageCorrections;
    expect(row.enabled).toBe(false);
    c.bulk.setImageEnabled(row.id, true);
    expect(c.bulk.getState().imageCorrections[0].failure).toMatch(/enter an image description/);
    expect(image.element.getAttribute('alt')).toBe(original);
    c.bulk.setImageText(row.id, '  Red sun over green hills  ');
    c.bulk.setImageEnabled(row.id, true);
    expect(image.element.alt).toBe('Red sun over green hills');
    c.bulk.setImageText(row.id, 'Updated landscape');
    expect(image.element.alt).toBe('Updated landscape');
    await c.bulk.run([contrast], 'developer', { imageIssues: [image] });
    expect(c.bulk.getState().imageCorrections[0].id).toBe(row.id);
    expect(image.element.alt).toBe('Updated landscape');
    c.bulk.restore();
    expect(image.element.getAttribute('alt')).toBe(original);
    expect(image.element.getAttribute('title')).toBe('Page title');
    expect(contrast.element.style.color).toBe('rgb(204, 204, 204)');
    expect(c.bulk.getState().imageCorrections[0].text).toBe('Updated landscape');
    c.bulk.setAllEnabled(true);
    expect(image.element.alt).toBe('Updated landscape');
    c.bulk.setImageText(row.id, '   ');
    expect(image.element.getAttribute('alt')).toBe(original);
    expect(c.bulk.getState().imageCorrections[0].enabled).toBe(false);
  });

  it('shares an individual image edit with its bulk row without touching other corrections', async () => {
    const c = controller();
    const image = imageTarget('one');
    const second = imageTarget('two');
    const contrast = target('text');
    await c.bulk.run([contrast], 'developer', { imageIssues: [image, second] });
    const id = c.bulk.ensureImage({ ...image, id: 'another-scan-id' })!;
    expect(c.bulk.getState().imageCorrections).toHaveLength(2);
    c.bulk.setImageText(id, 'First description');
    c.bulk.setImageEnabled(id, true);
    const secondId = c.bulk.getState().imageCorrections[1].id;
    c.bulk.setImageText(secondId, 'Second description');
    c.bulk.setImageEnabled(secondId, true);
    const fixedColor = contrast.element.style.color;
    c.bulk.setImageEnabled(id, false);
    expect(image.element.hasAttribute('alt')).toBe(false);
    expect(second.element.alt).toBe('Second description');
    expect(contrast.element.style.color).toBe(fixedColor);
    c.bulk.setAllEnabled(false);
    expect(second.element.hasAttribute('alt')).toBe(false);
    expect(c.hasActivePreview()).toBe(false);
  });

  it('rejects stale image targets without writing to a replacement with the same selector', () => {
    const c = controller();
    const image = imageTarget('replace');
    const id = c.bulk.ensureImage(image)!;
    c.bulk.setImageText(id, 'Landscape');
    const replacement = image.element.cloneNode(true) as HTMLImageElement;
    image.element.replaceWith(replacement);
    c.bulk.setImageEnabled(id, true);
    expect(c.bulk.getState().imageCorrections[0].failure).toMatch(/no longer on the page/);
    expect(replacement.hasAttribute('alt')).toBe(false);
    expect(c.hasActivePreview()).toBe(false);
  });

  it('preserves alt text written by the host page during a preview', () => {
    const c = controller();
    const image = imageTarget('changed');
    const id = c.bulk.ensureImage(image)!;
    c.bulk.setImageText(id, 'Temporary description');
    c.bulk.setImageEnabled(id, true);
    image.element.alt = 'Page-authored description';
    c.bulk.restore();
    expect(image.element.alt).toBe('Page-authored description');
    expect(c.bulk.getState().imageCorrections[0].failure).toMatch(/page changed/);
    expect(c.hasActivePreview()).toBe(false);
  });

  it('cleans up image previews on inspection, clearing, cancellation and disposal', async () => {
    for (const action of ['clear', 'prepareForInspection', 'dispose'] as const) {
      const c = controller();
      const image = imageTarget(action);
      const id = c.bulk.ensureImage(image)!;
      c.bulk.setImageText(id, 'Temporary description');
      c.bulk.setImageEnabled(id, true);
      expect(c.hasActivePreview()).toBe(true);
      c[action]();
      expect(image.element.hasAttribute('alt')).toBe(false);
      expect(c.bulk.getState().imageCorrections).toHaveLength(0);
      expect(c.hasActivePreview()).toBe(false);
      const next = controller();
      const pending = next.bulk.run([target(`${action}-text`)], 'developer', { imageIssues: [image] });
      next[action]();
      await pending;
      expect(image.element.hasAttribute('alt')).toBe(false);
      expect(next.bulk.getState().imageCorrections).toHaveLength(0);
    }
  });

  it('handles an image-only scan without inventing descriptions or needing a contrast failure', async () => {
    const c = controller();
    const image = imageTarget('image-only');
    await c.bulk.run([], 'developer', { imageIssues: [image] });
    expect(c.bulk.getState().corrections).toHaveLength(0);
    expect(c.bulk.getState().imageCorrections).toHaveLength(1);
    const [item] = c.bulk.getState().imageCorrections;
    expect(item.text).toBe('');
    expect(item.enabled).toBe(false);
    c.bulk.setImageText(item.id, 'A meaningful image description');
    c.bulk.setAllEnabled(true);
    expect(image.element.alt).toBe('A meaningful image description');
    expect(c.hasActivePreview()).toBe(true);
  });
});

describe('bulk correction workflow', () => {
  it('generates several stable suggestions, enables all by default and validates rendered contrast', async () => {
    const c = controller();
    const items = [target('navigation'), target('submit'), target('footer')];
    const pending = c.bulk.run(items);
    expect(c.bulk.getState().phase).toBe('generating');
    expect(items[0].element.style.color).toBe('rgb(204, 204, 204)');
    await pending;
    const state = c.bulk.getState();
    expect(state.corrections).toHaveLength(3);
    expect(new Set(state.corrections.map(item => item.id)).size).toBe(3);
    expect(c.bulk.getState()).toBe(state);
    expect(Object.isFrozen(state.corrections)).toBe(true);
    for (const [index, item] of state.corrections.entries()) {
      expect(item.enabled).toBe(true);
      expect(item.measuredRatio).toBeGreaterThanOrEqual(4.5);
      expect(contrastRatio(getComputedStyle(items[index].element).color, '#fff')).toBeGreaterThanOrEqual(4.5);
    }
  });

  it('toggles just one correction repeatedly and restores exact properties and priorities', async () => {
    const c = controller();
    const items = [target('one'), target('two')];
    const original = items.map(item => item.element.getAttribute('style'));
    await c.bulk.run(items);
    const [first, second] = c.bulk.getState().corrections;
    const fixed = items.map(item => item.element.style.color);
    for (let i = 0; i < 3; i++) {
      c.bulk.setEnabled(first.id, false);
      expect(items[0].element.getAttribute('style')).toBe(original[0]);
      expect(items[1].element.style.color).toBe(fixed[1]);
      expect(c.bulk.getState().corrections.find(item => item.id === second.id)?.enabled).toBe(true);
      c.bulk.setEnabled(first.id, true);
      expect(items[0].element.style.color).toBe(fixed[0]);
    }
    c.bulk.restore();
    items.forEach((item, index) => expect(item.element.getAttribute('style')).toBe(original[index]));
    expect(c.hasActivePreview()).toBe(false);
  });

  it('select/deselect all and Restore Original retain suggestions for reuse', async () => {
    const c = controller();
    const items = [target('one'), target('two')];
    const original = items.map(item => item.element.style.color);
    await c.bulk.run(items);
    const fixes = c.bulk.getState().corrections.map(item => item.fix);
    c.bulk.setAllEnabled(false);
    expect(c.bulk.getState().corrections.every(item => !item.enabled)).toBe(true);
    expect(items.map(item => item.element.style.color)).toEqual(original);
    c.bulk.setAllEnabled(true);
    expect(c.bulk.getState().corrections.every(item => item.enabled)).toBe(true);
    c.bulk.restore();
    expect(items.map(item => item.element.style.color)).toEqual(original);
    expect(c.bulk.getState().corrections.map(item => item.fix)).toEqual(fixes);
    c.bulk.setAllEnabled(true);
    expect(c.bulk.getState().corrections.every(item => item.enabled)).toBe(true);
  });

  it('repeated and overlapping Run All calls never stack previews or replace originals', async () => {
    const c = controller();
    const items = [target('one'), target('two')];
    const original = items.map(item => item.element.getAttribute('style'));
    await Promise.all([c.bulk.run(items), c.bulk.run(items)]);
    const ids = c.bulk.getState().corrections.map(item => item.id);
    await c.bulk.run(items);
    expect(c.bulk.getState().corrections.map(item => item.id)).toEqual(ids);
    c.bulk.restore();
    expect(items.map(item => item.element.getAttribute('style'))).toEqual(original);
  });

  it('deduplicates the same element/property deterministically, including competing thresholds', async () => {
    const c = controller();
    const one = target('one');
    await c.bulk.run([one, { ...one, issue: { ...one.issue, id: 'conflict', requiredRatio: 3 } }, target('two')]);
    expect(c.bulk.getState().corrections).toHaveLength(2);
    expect(c.bulk.getState().corrections[0].issue.id).toBe('one');
    expect(c.bulk.getState().failures[0].message).toMatch(/conflicting/);
    c.bulk.restore();
    expect(one.element.style.color).toBe('rgb(204, 204, 204)');
  });

  it('empty and manual-review results are never represented as corrected', async () => {
    const c = controller();
    await c.bulk.run([]);
    expect(c.bulk.getState().phase).toBe('ready');
    expect(c.bulk.getState().corrections).toHaveLength(0);
    await c.bulk.run([target('review', { status: 'needs-review', textColor: null }), target('passed', { status: 'passed' })]);
    expect(c.bulk.getState().skipped).toBe(2);
    expect(c.bulk.getState().corrections).toHaveLength(0);
    expect(c.hasActivePreview()).toBe(false);
  });

  it('skips generation failures and exceptions and continues with the remaining issues', async () => {
    const c = controller();
    const broken = target('throw');
    const invalid = target('invalid', { textColor: 'not-a-color' });
    Object.defineProperty(broken.element, 'isConnected', { get() { throw new Error('Injected generation failure'); } });
    await c.bulk.run([broken, invalid, target('good')]);
    expect(c.bulk.getState().failures).toHaveLength(2);
    expect(c.bulk.getState().corrections).toHaveLength(1);
    expect(c.bulk.getState().corrections[0].enabled).toBe(true);
  });

  it('rolls back rejected, throwing or noncompliant application and enables other fixes', async () => {
    const readComputed = (element: Element, property: string) => {
      if (element.id === 'throw') throw new Error('Injected computed-style failure');
      if (element.id === 'fails') return '#cccccc';
      return getComputedStyle(element).getPropertyValue(property);
    };
    const c = controller(readComputed);
    const items = [target('reject'), target('throw'), target('fails'), target('good')];
    vi.spyOn(items[0].element.style, 'setProperty').mockImplementation(() => undefined);
    await c.bulk.run(items);
    expect(c.bulk.getState().corrections.map(item => item.enabled)).toEqual([false, false, false, true]);
    expect(c.bulk.getState().corrections.slice(0, 3).every(item => Boolean(item.failure))).toBe(true);
    items.slice(0, 3).forEach(item => expect(item.element.style.color).toBe('rgb(204, 204, 204)'));
  });

  it('uses element identity after replacement and never writes to a matching selector', async () => {
    const c = controller();
    const one = target('one');
    await c.bulk.run([one]);
    c.bulk.setAllEnabled(false);
    const replacement = one.element.cloneNode(true) as HTMLParagraphElement;
    one.element.replaceWith(replacement);
    c.bulk.setAllEnabled(true);
    expect(c.bulk.getState().corrections[0].enabled).toBe(false);
    expect(c.bulk.getState().corrections[0].failure).toMatch(/no longer on the page/);
    expect(replacement.style.color).toBe('rgb(204, 204, 204)');
  });

  it('preserves page-authored changes during preview restoration', async () => {
    const c = controller();
    const one = target('one');
    await c.bulk.run([one]);
    one.element.style.setProperty('color', 'blue');
    c.bulk.restore();
    expect(one.element.style.color).toBe('blue');
    expect(c.bulk.getState().corrections[0].failure).toMatch(/page-changed/);
  });

  it('transfers ownership between individual and bulk fixes without corrupting originals', async () => {
    const c = controller();
    const items = [target('one'), target('two')];
    const original = items.map(item => item.element.getAttribute('style'));
    await c.bulk.run(items);
    c.selectIssue(items[0].issue, items[0].element);
    c.preview();
    expect(c.getState().phase).toBe('previewing');
    expect(c.bulk.getState().corrections.map(item => item.enabled)).toEqual([false, true]);
    c.showOriginal();
    expect(items[0].element.getAttribute('style')).toBe(original[0]);
    c.showFixed();
    c.bulk.setAllEnabled(true);
    expect(c.getState().phase).toBe('ready');
    expect(c.bulk.getState().corrections.every(item => item.enabled)).toBe(true);
    c.bulk.restore();
    expect(items.map(item => item.element.getAttribute('style'))).toEqual(original);
    c.preview();
    await c.bulk.run(items);
    expect(c.getState().phase).toBe('ready');
    c.clear();
    expect(items.map(item => item.element.getAttribute('style'))).toEqual(original);
  });

  it('cancels pending generation on reset, inspection and disposal', async () => {
    for (const action of ['clear', 'prepareForInspection', 'dispose'] as const) {
      const c = controller();
      const one = target(action);
      const original = one.element.getAttribute('style');
      const pending = c.bulk.run([one]);
      c[action]();
      await pending;
      expect(c.bulk.getState().phase).toBe('idle');
      expect(c.bulk.getState().corrections).toHaveLength(0);
      expect(one.element.getAttribute('style')).toBe(original);
      expect(c.hasActivePreview()).toBe(false);
    }
  });

  it('Inspector picking and clearing results restore bulk previews before reading the page', async () => {
    const c = controller();
    const host = document.createElement('aside');
    document.body.append(host);
    const inspector = createInspectorStore(host);
    const disconnect = connectInspectorToFixer(inspector, createIssueHandoffStore(), c);
    const items = [target('one'), target('two')];
    await c.bulk.run(items);
    inspector.startPicking();
    expect(c.hasActivePreview()).toBe(false);
    expect(c.bulk.getState().phase).toBe('idle');
    items.forEach(item => expect(item.element.style.color).toBe('rgb(204, 204, 204)'));
    inspector.cancelPicking();
    await c.bulk.run(items);
    inspector.clear();
    expect(c.hasActivePreview()).toBe(false);
    expect(c.bulk.getState().phase).toBe('idle');
    disconnect();
    inspector.dispose();
  });
});

describe('shared preview ownership', () => {
  it('enforces image ownership and restores attributes on mode changes and disposal', () => {
    const manager = createPreviewManager();
    const { element } = imageTarget('owned-image');
    expect(manager.applyAlt(element, 'First description', 'image').ok).toBe(true);
    expect(manager.isApplied('image')).toBe(true);
    expect(manager.applyAlt(element, 'Competing description', 'another')).toEqual({ ok: false, reason: 'conflict' });
    expect(manager.apply(element, 'color', 'red', 'image')).toEqual({ ok: false, reason: 'conflict' });
    manager.setMode('user');
    expect(element.hasAttribute('alt')).toBe(false);
    expect(manager.hasActivePreview()).toBe(false);
    expect(manager.applyAlt(element, 'Wrong owner', 'image')).toEqual({ ok: false, reason: 'conflict' });
    expect(manager.applyAlt(element, 'User description', 'image', 'user').ok).toBe(true);
    manager.dispose();
    expect(element.hasAttribute('alt')).toBe(false);
    expect(manager.hasActivePreview()).toBe(false);
  });

  it('rejects property conflicts and preserves each snapshot when another key is toggled', () => {
    const manager = createPreviewManager();
    const element = document.createElement('p');
    document.body.append(element);
    expect(manager.apply(element, 'color', '#595959', 'first').ok).toBe(true);
    expect(manager.apply(element, 'color', '#000000', 'second')).toEqual({ ok: false, reason: 'conflict' });
    expect(manager.apply(element, 'background-color', '#ffffff', 'background').ok).toBe(true);
    manager.revert('first');
    expect(element.style.backgroundColor).toBe('rgb(255, 255, 255)');
    manager.revert('background');
    expect(element.hasAttribute('style')).toBe(false);
    expect(manager.hasActivePreview()).toBe(false);
  });
});
