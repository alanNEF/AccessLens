const NON_CONTENT = 'script,style,link,meta,title,template,noscript,base';

/** Direct-body roots only: no wrapping, subtree scans, or source style edits. */
export function createSimulatorDom(doc: Document, panelHost: HTMLElement, owner: string) {
  const marker = `data-${owner}-target`;
  const marked = new Map<Element, string>();
  let sequence = 0;
  let frame: number | undefined;
  let observers: MutationObserver[] = [];
  const view = doc.defaultView!;

  function isContent(node: Node) {
    return node.nodeType === 1 && node !== panelHost &&
      !(node as Element).matches(NON_CONTENT) &&
      !(node as Element).hasAttribute('data-accesslens-simulator-owned');
  }
  function disconnect() {
    for (const observer of observers) observer.disconnect();
    observers = [];
    if (frame !== undefined) view.cancelAnimationFrame(frame);
    frame = undefined;
  }
  function clear() {
    disconnect();
    for (const node of marked.keys()) node.removeAttribute(marker);
    marked.clear();
  }
  function targets() {
    if (!doc.body || doc.contentType !== 'text/html' || !/^https?:$/.test(doc.location.protocol)) {
      throw new Error('Unsupported page: use an ordinary top-level HTTP or HTTPS HTML page.');
    }
    // Only the extension host is reattached after a body replacement.
    if (panelHost.parentElement !== doc.body) doc.body.append(panelHost);
    if ([doc.documentElement, doc.body].some(node => view.getComputedStyle(node).filter !== 'none')) {
      throw new Error('Unsupported layout: an html/body filter would also affect the AccessLens panel.');
    }
    if ([...doc.body.childNodes].some(node => node.nodeType === 3 && node.textContent?.trim())) {
      throw new Error('Unsupported layout: bare body text cannot be filtered safely without moving page nodes.');
    }
    const roots = [...doc.body.children].filter(isContent);
    if (!roots.length) throw new Error('No supported page content was found.');
    const rootSet = new Set(roots);
    for (const node of marked.keys()) {
      if (!rootSet.has(node)) { node.removeAttribute(marker); marked.delete(node); }
    }
    return roots.map(node => {
      const original = view.getComputedStyle(node);
      let token = marked.get(node);
      if (!token) { token = String(++sequence); marked.set(node, token); }
      if (node.getAttribute(marker) !== token) node.setAttribute(marker, token);
      return { node, selector: `body > [${marker}="${token}"]`, filter: original.filter, clipPath: original.clipPath };
    });
  }
  function watch(update: () => void) {
    disconnect();
    const schedule = () => {
      if (frame !== undefined) return;
      frame = view.requestAnimationFrame(() => { frame = undefined; update(); });
    };
    function observe(node: Node, options: MutationObserverInit) {
      const observer = new view.MutationObserver(records => {
        if (records.some(record => record.type === 'attributes' ||
          [...record.removedNodes].some(child => child === panelHost || child.nodeType === 1 && (child as Element).getAttribute('data-accesslens-simulator-owned') === owner) ||
          [...record.addedNodes, ...record.removedNodes].some(child => isContent(child) || (child.nodeType === 3 && Boolean(child.textContent?.trim())) || child.nodeName === 'BODY' || child.nodeName === 'HEAD'))) schedule();
      });
      observer.observe(node, options);
      observers.push(observer);
    }
    // No subtree observation: page children and relevant root attributes only.
    const attributes = { attributes: true, attributeFilter: ['style', 'class', 'hidden'] };
    observe(doc.documentElement, { childList: true, ...attributes });
    observe(doc.body, { childList: true, ...attributes });
    if (doc.head) observe(doc.head, { childList: true });
    for (const root of marked.keys()) observe(root, attributes);
  }
  return { targets, watch, clear };
}
