import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createIssueHandoffStore } from '../../src/shared/issue-handoff';
import { createInspectorStore } from '../../src/features/inspector/inspector-store';
import { scanTextContrast, type InspectedIssue } from '../../src/features/inspector/axe-runner';
import { createFixerController } from '../../src/features/fixer/fixer-controller';
import { createPreviewManager } from '../../src/features/fixer/preview-manager';
import { createUserModeController } from '../../src/features/user-mode/user-mode-controller';

vi.mock('../../src/features/inspector/axe-runner', () => ({ scanTextContrast: vi.fn(), inspectElement: vi.fn() }));
const scan = vi.mocked(scanTextContrast);
const cleanup: Array<() => void> = [];
const pause = (ms = 90) => new Promise(resolve => setTimeout(resolve, ms));

function target(id: string): InspectedIssue & { element: HTMLParagraphElement } {
  const element = document.createElement('p');
  element.id = id;
  element.textContent = `Please read this ${id}`;
  element.style.cssText = 'color: #ccc !important; background-color: white; font-size: 16px; margin: 7px';
  document.body.append(element);
  return { element, issue: { id, selector: `#${id}`, elementLabel: id, textColor: '#cccccc', backgroundColor: '#ffffff', contrastRatio: 1.6,
    requiredRatio: 4.5, isLargeText: false, status: 'failed', wcagCriterion: '1.4.3' } };
}

function fixture(readComputed?: (element: Element, property: string) => string) {
  const host = document.createElement('aside');
  document.body.append(host);
  const inspector = createInspectorStore(host);
  const previews = createPreviewManager();
  const fixer = createFixerController({ previewManager: previews, readComputed });
  const simulator = { reset: vi.fn() };
  const controller = createUserModeController({ host, inspector, previews, fixer, simulator, handoff: createIssueHandoffStore(), debounceMs: 15 });
  cleanup.push(() => { controller.dispose(); inspector.dispose(); fixer.dispose(); });
  const settled = () => vi.waitFor(() => expect(controller.getState().status).not.toBe('scanning'), { interval: 5 });
  const enable = async () => { controller.setMode('user'); controller.setEnabled(true); await settled(); };
  return { host, inspector, previews, fixer, simulator, controller, enable, settled };
}

beforeEach(() => { scan.mockReset().mockResolvedValue([]); });
afterEach(() => {
  cleanup.splice(0).forEach(dispose => dispose());
  document.body.replaceChildren();
  vi.restoreAllMocks();
});

describe('User Mode page workflow', () => {
  it('keeps improvements stable while a live quote replaces text without changing contrast', async () => {
    const f = fixture();
    const one = target('one');
    const quote = document.createElement('span');
    quote.textContent = '$100.00';
    document.body.append(quote);
    scan.mockResolvedValueOnce([one]).mockResolvedValue([]);
    await f.enable();
    let writes = 0;
    const watcher = new MutationObserver(records => { writes += records.length; });
    watcher.observe(one.element, { attributes: true, attributeFilter: ['style'] });
    for (let i = 0; i < 5; i++) {
      quote.textContent = `$${101 + i}.00`;
      await pause(25);
    }
    await pause();
    watcher.disconnect();
    expect(scan).toHaveBeenCalledOnce();
    expect(writes).toBe(0);
    expect(f.controller.getState().count).toBe(1);
  });

  it('ignores animation-only inline styles and non-content node removal', async () => {
    const f = fixture();
    const one = target('one');
    scan.mockResolvedValueOnce([one]).mockResolvedValue([]);
    await f.enable();
    for (let i = 0; i < 4; i++) {
      one.element.style.transform = `translateX(${i}px)`;
      const script = document.createElement('script');
      document.body.append(script);
      script.remove();
      await pause(25);
    }
    await pause();
    expect(scan).toHaveBeenCalledOnce();
    expect(f.controller.getState().count).toBe(1);
  });

  it('leaves unrelated improvements applied while auditing a new subtree', async () => {
    const f = fixture();
    const one = target('one');
    scan.mockResolvedValueOnce([one]);
    await f.enable();
    const fixed = one.element.style.color;
    let writes = 0;
    const watcher = new MutationObserver(records => { writes += records.length; });
    watcher.observe(one.element, { attributes: true, attributeFilter: ['style'] });
    const next = target('next');
    scan.mockResolvedValue([next]);
    await vi.waitFor(() => expect(f.controller.getState().count).toBe(2), { interval: 5 });
    watcher.disconnect();
    expect(writes).toBe(0);
    expect(one.element.style.color).toBe(fixed);
  });

  it('restores corrected ancestors before scanning newly introduced descendants', async () => {
    const f = fixture();
    const parent = target('parent');
    scan.mockResolvedValueOnce([parent]);
    await f.enable();
    const child = target('child');
    parent.element.append(child.element);
    let originalRead = '';
    scan.mockImplementation(async () => {
      originalRead = parent.element.style.color;
      return [parent, child];
    });
    await vi.waitFor(() => expect(f.controller.getState().count).toBe(2), { interval: 5 });
    expect(originalRead).toBe('rgb(204, 204, 204)');
    expect(scan.mock.calls[1][1]).toEqual([parent.element]);
    f.controller.restore();
    expect(parent.element.style.color).toBe('rgb(204, 204, 204)');
    expect(child.element.style.color).toBe('rgb(204, 204, 204)');
  });

  it('rechecks changed contrast styles without restoring an unrelated correction', async () => {
    const f = fixture();
    const first = target('first');
    const second = target('second');
    scan.mockResolvedValueOnce([first, second]);
    await f.enable();
    const fixed = second.element.style.color;
    const statuses: string[] = [];
    f.controller.subscribe(() => statuses.push(f.controller.getState().status));
    scan.mockResolvedValue([]);
    first.element.style.backgroundColor = 'black';
    await vi.waitFor(() => expect(f.controller.getState().count).toBe(1), { interval: 5 });
    expect(scan.mock.calls[1][1]).toEqual([first.element]);
    expect(second.element.style.color).toBe(fixed);
    expect(statuses).not.toContain('scanning');
    expect(first.element.style.color).toBe('rgb(204, 204, 204)');
  });

  it('prunes removed targets without rescanning the page or cancelling an active audit', async () => {
    const f = fixture();
    const one = target('one');
    const removable = document.createElement('div');
    document.body.append(removable);
    let finish!: (items: InspectedIssue[]) => void;
    scan.mockReturnValueOnce(new Promise(resolve => { finish = resolve; }));
    f.controller.setMode('user');
    f.controller.setEnabled(true);
    await vi.waitFor(() => expect(scan).toHaveBeenCalledOnce(), { interval: 5 });
    removable.remove();
    finish([one]);
    await vi.waitFor(() => expect(f.controller.getState().count).toBe(1), { interval: 5 });
    await pause();
    expect(f.controller.getState().count).toBe(1);
    one.element.remove();
    await vi.waitFor(() => expect(f.fixer.bulk.getState().corrections).toHaveLength(0), { interval: 5 });
    expect(f.controller.getState().count).toBe(0);
    expect(scan).toHaveBeenCalledOnce();
    expect(one.element.style.color).toBe('rgb(204, 204, 204)');
  });

  it('audits text introduced into an empty element and preserves existing fixes on a refresh error', async () => {
    const f = fixture();
    const one = target('one');
    const empty = target('empty');
    empty.element.replaceChildren(document.createTextNode(''));
    scan.mockResolvedValueOnce([one]);
    await f.enable();
    scan.mockResolvedValue([empty]);
    empty.element.firstChild!.textContent = 'Newly visible text';
    await vi.waitFor(() => expect(f.controller.getState().count).toBe(2), { interval: 5 });
    const fixed = one.element.style.color;
    scan.mockRejectedValue(new Error('Injected incremental failure'));
    empty.element.style.fontSize = '18px';
    await vi.waitFor(() => expect(scan).toHaveBeenCalledTimes(3), { interval: 5 });
    await pause();
    expect(f.controller.getState()).toMatchObject({ status: 'enabled', count: 1 });
    expect(one.element.style.color).toBe(fixed);
  });

  it('changes mode without activation, stops picking and simulation, and restores developer corrections', async () => {
    const f = fixture();
    const one = target('one');
    const original = one.element.getAttribute('style');
    await f.fixer.bulk.run([one]);
    f.inspector.startPicking();
    f.controller.setMode('user');
    expect(f.inspector.getState().picking).toBe(false);
    expect(f.inspector.getState().selectedId).toBeNull();
    expect(f.simulator.reset).toHaveBeenCalledOnce();
    expect(f.previews.getMode()).toBe('user');
    expect(one.element.getAttribute('style')).toBe(original);
    expect(scan).not.toHaveBeenCalled();
    expect(f.controller.getState()).toEqual({ mode: 'user', enabled: false, status: 'disabled', count: 0 });
  });

  it('automatically reuses the scan and bulk engine without developer selection or highlights', async () => {
    const f = fixture();
    const items = [target('one'), target('two')];
    scan.mockResolvedValue(items);
    await f.enable();
    expect(scan).toHaveBeenCalledOnce();
    expect(f.controller.getState()).toEqual({ mode: 'user', enabled: true, status: 'enabled', count: 2 });
    expect(f.fixer.bulk.getState().owner).toBe('user');
    expect(f.fixer.bulk.getState().corrections.every(item => item.enabled && item.measuredRatio! >= 4.5)).toBe(true);
    expect(f.inspector.getState().issues).toHaveLength(0);
    expect(f.inspector.getState().selectedId).toBeNull();
  });

  it('repeated enable/disable and explicit restoration preserve exact original styles', async () => {
    const f = fixture();
    const one = target('one');
    const original = one.element.getAttribute('style');
    scan.mockResolvedValue([one, one]);
    for (let round = 0; round < 3; round++) {
      await f.enable();
      f.controller.setEnabled(true);
      expect(f.controller.getState().count).toBe(1);
      expect(f.fixer.bulk.getState().corrections).toHaveLength(1);
      if (round === 2) f.controller.restore();
      else f.controller.setEnabled(false);
      expect(one.element.getAttribute('style')).toBe(original);
      expect(f.previews.hasActivePreview()).toBe(false);
      expect(f.fixer.bulk.getState().corrections).toHaveLength(0);
    }
    expect(scan).toHaveBeenCalledTimes(3);
  });

  it('preserves author updates to the corrected property and unrelated inline styles on disable', async () => {
    const f = fixture();
    const one = target('one');
    scan.mockResolvedValue([one]);
    await f.enable();
    one.element.style.setProperty('color', 'blue');
    one.element.style.setProperty('padding', '9px');
    f.controller.setEnabled(false);
    expect(one.element.style.color).toBe('blue');
    expect(one.element.style.padding).toBe('9px');
    expect(one.element.style.margin).toBe('7px');
  });

  it('returns to Developer with a clean registry and working bulk controls', async () => {
    const f = fixture();
    const one = target('one');
    const original = one.element.getAttribute('style');
    scan.mockResolvedValue([one]);
    await f.enable();
    f.controller.setMode('developer');
    expect(f.controller.getState().enabled).toBe(false);
    expect(one.element.getAttribute('style')).toBe(original);
    await f.fixer.bulk.run([one]);
    expect(f.fixer.bulk.getState().corrections[0].enabled).toBe(true);
    f.fixer.bulk.restore();
    expect(one.element.getAttribute('style')).toBe(original);
  });

  it('skips unsupported, uncertain, stale, detached and faded text while applying valid corrections', async () => {
    const f = fixture();
    const review = target('review');
    const stale = target('stale');
    stale.element.style.backgroundColor = 'black';
    const faded = target('faded');
    faded.element.style.opacity = '0.5';
    const gradient = target('gradient');
    gradient.element.style.backgroundImage = 'linear-gradient(white, gray)';
    const detached = target('detached');
    detached.element.remove();
    const good = target('good');
    scan.mockResolvedValue([{ ...review, issue: { ...review.issue, status: 'needs-review' } }, stale, faded, gradient, detached, good]);
    await f.enable();
    expect(f.controller.getState().count).toBe(1);
    expect(f.fixer.bulk.getState().corrections.filter(item => item.enabled).map(item => item.issue.id)).toEqual(['good']);
    expect(faded.element.style.color).toBe('rgb(204, 204, 204)');
    expect(gradient.element.style.color).toBe('rgb(204, 204, 204)');
  });

  it('isolates application errors so other valid corrections remain applied', async () => {
    const f = fixture((el, property) => {
      if (el.id === 'bad') throw new Error('Injected application error');
      return getComputedStyle(el).getPropertyValue(property);
    });
    const items = [target('bad'), target('good')];
    scan.mockResolvedValue(items);
    await f.enable();
    expect(f.controller.getState().count).toBe(1);
    expect(items[0].element.style.color).toBe('rgb(204, 204, 204)');
    expect(f.fixer.bulk.getState().corrections.map(item => item.enabled)).toEqual([false, true]);
  });

  it('reports no supported improvements without asserting accessibility', async () => {
    const f = fixture();
    const unsupported = target('unsupported');
    unsupported.element.style.opacity = '0.5';
    scan.mockResolvedValue([unsupported]);
    await f.enable();
    expect(f.controller.getState().status).toBe('empty');
    expect(f.controller.getState().count).toBe(0);
    expect(f.previews.hasActivePreview()).toBe(false);
  });

  it('handles scan errors and allows a successful retry', async () => {
    const f = fixture();
    scan.mockRejectedValueOnce(new Error('axe failed')).mockResolvedValue([target('one')]);
    await f.enable();
    expect(f.controller.getState().status).toBe('error');
    f.controller.setEnabled(true);
    await f.settled();
    expect(f.controller.getState().count).toBe(1);
  });

  it.each(['disable', 'switch', 'dispose', 'navigate'] as const)('cancels a pending audit on %s', async action => {
    const f = fixture();
    const one = target('one');
    const original = one.element.getAttribute('style');
    let finish!: (items: InspectedIssue[]) => void;
    scan.mockReturnValue(new Promise(resolve => { finish = resolve; }));
    f.controller.setMode('user');
    f.controller.setEnabled(true);
    await vi.waitFor(() => expect(scan).toHaveBeenCalledOnce(), { interval: 5 });
    if (action === 'disable') f.controller.setEnabled(false);
    else if (action === 'switch') f.controller.setMode('developer');
    else if (action === 'dispose') f.controller.dispose();
    else f.controller.resetPage();
    finish([one]);
    await pause(20);
    expect(one.element.getAttribute('style')).toBe(original);
    expect(f.previews.hasActivePreview()).toBe(false);
  });

  it('coalesces dynamic additions into scoped scans, reads originals, and ignores its own writes', async () => {
    const f = fixture();
    const one = target('one');
    const original = one.element.getAttribute('style');
    scan.mockResolvedValueOnce([one]);
    await f.enable();
    const fixed = one.element.style.color;
    const next = target('next');
    const reads: string[][] = [];
    scan.mockImplementation(async () => {
      reads.push([one.element.style.color, next.element.style.color]);
      return [next];
    });
    next.element.append(document.createTextNode(' and more text'));
    await vi.waitFor(() => expect(f.controller.getState().count).toBe(2), { interval: 5 });
    await pause();
    expect(scan).toHaveBeenCalledTimes(2);
    expect(reads).toEqual([[fixed, 'rgb(204, 204, 204)']]);
    expect(scan.mock.calls[1][1]).toEqual([next.element]);
    f.controller.restore();
    expect(one.element.getAttribute('style')).toBe(original);
    target('after-disable');
    await pause();
    expect(scan).toHaveBeenCalledTimes(2);
  });

  it('retains additions made while the asynchronous audit is running', async () => {
    const f = fixture();
    const one = target('one');
    let finish!: (items: InspectedIssue[]) => void;
    scan.mockReturnValueOnce(new Promise(resolve => { finish = resolve; }));
    f.controller.setMode('user');
    f.controller.setEnabled(true);
    await vi.waitFor(() => expect(scan).toHaveBeenCalledOnce(), { interval: 5 });
    const next = target('next');
    scan.mockResolvedValue([next]);
    finish([one]);
    await vi.waitFor(() => expect(f.controller.getState().count).toBe(2), { interval: 5 });
    expect(scan).toHaveBeenCalledTimes(2);
  });

  it('serializes rapid off/on activation without stale application or duplicate corrections', async () => {
    const f = fixture();
    const one = target('one');
    let finish!: (items: InspectedIssue[]) => void;
    scan.mockReturnValueOnce(new Promise(resolve => { finish = resolve; })).mockResolvedValue([one]);
    f.controller.setMode('user');
    f.controller.setEnabled(true);
    await vi.waitFor(() => expect(scan).toHaveBeenCalledOnce(), { interval: 5 });
    f.controller.setEnabled(false);
    f.controller.setEnabled(true);
    finish([one]);
    await vi.waitFor(() => expect(f.controller.getState().count).toBe(1), { interval: 5 });
    expect(f.fixer.bulk.getState().corrections).toHaveLength(1);
  });

  it('enforces ownership in the single preview registry', () => {
    const f = fixture();
    const one = target('one');
    const original = one.element.getAttribute('style');
    f.previews.apply(one.element, 'color', '#333333', 'dev');
    f.previews.setMode('user');
    expect(one.element.getAttribute('style')).toBe(original);
    expect(f.previews.apply(one.element, 'color', '#333333', 'dev').ok).toBe(false);
    expect(f.previews.apply(one.element, 'color', '#333333', 'auto', 'user').ok).toBe(true);
    f.previews.revertOwner('developer');
    expect(f.previews.isApplied('auto')).toBe(true);
    f.previews.revertOwner('user');
    expect(one.element.getAttribute('style')).toBe(original);
  });
});
