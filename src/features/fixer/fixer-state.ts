import type { ContrastIssue, SuggestedFix } from '../../shared/types';

/**
 * empty:       no issue selected
 * unsupported: issue rejected (FIX-01/FIX-08); `message` explains why
 * ready:       suggestion calculated, nothing applied to the page
 * previewing:  temporary override active; `view` says which version is shown
 */
type FixerPhase = 'empty' | 'unsupported' | 'ready' | 'previewing';
type FixerView = 'original' | 'fixed';

export interface FixerState {
  readonly phase: FixerPhase;
  readonly issue?: ContrastIssue;
  readonly fix?: SuggestedFix;
  readonly view: FixerView;
  /** FIX-06: ratio measured from the page after applying, truncated to 2 decimals. */
  readonly measuredRatio?: number;
  readonly meetsTarget?: boolean;
  readonly message?: string;
}

export const EMPTY_STATE: FixerState = Object.freeze({ phase: 'empty', view: 'original' });

/** Frozen snapshots keep React's useSyncExternalStore contract stable. */
export function snapshot(state: FixerState): FixerState {
  return Object.freeze({ ...state });
}
