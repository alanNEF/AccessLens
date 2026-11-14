import { useMemo, useSyncExternalStore } from 'react';
import type { InspectorStore } from './inspector-store';
import { useTrackedRects } from './element-highlighter';

/**
 * Draws outlines over page elements from inside the AccessLens shadow root, so the page's own
 * styles are never touched and the outlines are not affected by simulation filters.
 * Fail and review outlines differ by line style and label text, not only by color.
 */
export function HighlightLayer({ store }: { store: InspectorStore }) {
  const state = useSyncExternalStore(store.subscribe, store.getState);

  const items = useMemo(() => {
    const list = state.issues
      .filter(item => item.issue.status !== 'passed')
      .map(item => ({ id: item.issue.id, element: item.element, status: item.issue.status }));
    if (state.picked && !list.some(item => item.element === state.picked!.element)) {
      list.push({ id: state.picked.issue.id, element: state.picked.element, status: state.picked.issue.status });
    }
    if (state.hovered) list.push({ id: '__hover', element: state.hovered, status: 'passed' as const });
    return list;
  }, [state.issues, state.picked, state.hovered]);

  const elements = useMemo(() => items.map(item => item.element), [items]);
  const rects = useTrackedRects(elements);

  if (!items.length) return null;
  return (
    <div className="inspector-highlights" aria-hidden="true">
      {items.map((item, index) => {
        const rect = rects[index];
        if (!rect) return null;
        const hover = item.id === '__hover';
        const selected = item.id === state.selectedId;
        const kind = hover ? 'hover' : item.status === 'failed' ? 'fail' : item.status === 'needs-review' ? 'review' : 'pass';
        return (
          <div
            key={item.id}
            className={`inspector-highlight inspector-highlight--${kind}${selected ? ' is-selected' : ''}`}
            style={{ top: rect.top - 4, left: rect.left - 4, width: rect.width + 8, height: rect.height + 8 }}
          >
            {!hover && <span className="inspector-highlight-label">{kind === 'fail' ? 'Fail' : kind === 'review' ? 'Review' : 'Pass'}</span>}
          </div>
        );
      })}
    </div>
  );
}
