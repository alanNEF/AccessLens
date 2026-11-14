import type { VerifiedContrastFailure } from './types';

/** What Inspector hands to Fixer: the verified issue plus a live reference to the element (INS-07, FIX-01). */
export interface IssueHandoff {
  readonly issue: VerifiedContrastFailure;
  readonly element: Element;
}

/**
 * Tiny store shared by Inspector (writer) and Fixer (reader).
 * One instance per mounted panel; created in the content script and passed down as a prop.
 * Fixer usage:
 *   const handoff = useSyncExternalStore(store.subscribe, store.get);
 *   if (handoff && handoff.element.isConnected) { ... }
 */
export function createIssueHandoffStore() {
  let current: IssueHandoff | null = null;
  const listeners = new Set<() => void>();
  const notify = () => { for (const listener of [...listeners]) listener(); };
  return {
    get: (): IssueHandoff | null => current,
    set(next: IssueHandoff | null) {
      current = next ? Object.freeze({ ...next }) : null;
      notify();
    },
    subscribe(listener: () => void) {
      listeners.add(listener);
      return () => { listeners.delete(listener); };
    },
    clear() {
      current = null;
      notify();
    },
  };
}
export type IssueHandoffStore = ReturnType<typeof createIssueHandoffStore>;
