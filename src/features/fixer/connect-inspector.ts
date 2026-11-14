import type { IssueHandoffStore } from '../../shared/issue-handoff';
import type { InspectorStore } from '../inspector/inspector-store';
import type { FixerController } from './fixer-controller';

/**
 * Inspector → Fixer wiring (INS-07, FIX-01). Returns a cleanup function.
 * - Inspector's "Preview fix" puts { issue, element } in the handoff store; Fixer loads it.
 * - Starting a scan or a pick ends any Fixer preview first, so Inspector always
 *   measures the page's own colors, never the temporary fix.
 */
export function connectInspectorToFixer(inspector: InspectorStore, handoff: IssueHandoffStore, fixer: FixerController): () => void {
  const stopHandoff = handoff.subscribe(() => {
    const next = handoff.get();
    if (next) fixer.selectIssue(next.issue, next.element);
    else fixer.clear();
  });
  const stopInspector = inspector.subscribe(() => {
    const { status, picking } = inspector.getState();
    if ((status === 'scanning' || picking) && fixer.hasActivePreview()) fixer.revert();
  });
  return () => { stopHandoff(); stopInspector(); };
}
