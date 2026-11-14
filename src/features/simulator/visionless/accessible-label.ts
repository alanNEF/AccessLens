/** Deliberately approximate, not an implementation of the full AccName spec. */
export interface ElementDescription { name: string; role: string; states: string[]; announcement: string }
function visible(node: Element): boolean {
  for (let current: Element | null = node; current; current = current.parentElement) {
    if (current.matches('[hidden],[aria-hidden="true"],script,style,template')) return false;
    const css = node.ownerDocument.defaultView?.getComputedStyle(current);
    if (css?.display === 'none' || css?.visibility === 'hidden') return false;
  }
  return true;
}
function text(node: Element): string {
  if (!visible(node) || node.matches('input,textarea,select,option,[contenteditable]')) return '';
  return [...node.childNodes].map(child => child.nodeType === 3 ? child.textContent : child.nodeType === 1 ? text(child as Element) : '').join(' ').replace(/\s+/g,' ').trim();
}
export function describeElement(node: Element): ElementDescription | null {
  const tag = node.localName;
  const type = node.getAttribute('type')?.toLowerCase() || 'text';
  const explicit = node.getAttribute('role');
  const roles: Record<string,string> = { button:'button', a:'link', select:'combo box', textarea:'edit text', summary:'button' };
  let role = explicit || roles[tag] || (tag === 'input' ? ({checkbox:'checkbox',radio:'radio button',button:'button',submit:'button',reset:'button'}[type] || 'edit text') : '');
  if (!role && node.matches('[tabindex],[contenteditable="true"]')) role = 'focusable element';
  if (!role || !visible(node)) return null;
  const root = node.getRootNode() as Document | ShadowRoot;
  const labelled = (node.getAttribute('aria-labelledby') || '').split(/\s+/).filter(Boolean).map(id => root.getElementById?.(id)).filter((el): el is HTMLElement => Boolean(el)).map(text).filter(Boolean).join(' ');
  const labels = 'labels' in node ? [...((node as HTMLInputElement).labels || [])].map(text).filter(Boolean).join(' ') : '';
  // Never inspect values, placeholders, selected-option text, or arbitrary input content.
  const nativeText = ['button','a','summary'].includes(tag) || explicit === 'button' || explicit === 'link' ? text(node) : '';
  const alt = tag === 'img' || tag === 'input' && type === 'image' ? node.getAttribute('alt') : '';
  const name = (labelled || node.getAttribute('aria-label')?.trim() || labels || nativeText || alt || node.getAttribute('title') || '').replace(/\s+/g,' ').trim().slice(0,300);
  const states: string[] = [];
  if (node.matches(':disabled,[aria-disabled="true"]')) states.push('disabled');
  if (node.matches('[required],[aria-required="true"]')) states.push('required');
  if (role === 'checkbox' || role === 'radio' || role === 'radio button') {
    const checked = node.getAttribute('aria-checked') ?? ('checked' in node ? String((node as HTMLInputElement).checked) : 'false');
    states.push(checked === 'mixed' ? 'mixed' : checked === 'true' ? role === 'checkbox' ? 'checked' : 'selected' : role === 'checkbox' ? 'unchecked' : 'not selected');
  }
  if (node.hasAttribute('aria-expanded')) states.push(node.getAttribute('aria-expanded') === 'true' ? 'expanded' : 'collapsed');
  if (tag === 'input' && type === 'password') states.push('password');
  return {name,role,states,announcement:[name || `Unlabeled ${role}`, ...(name ? [role] : []), ...states].join(', ')};
}
