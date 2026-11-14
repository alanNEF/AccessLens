import { useSyncExternalStore } from 'react';
import type { InspectorStore } from './inspector-store';
import type { InspectedIssue } from './axe-runner';
import { explainIssue, formatRatio } from './contrast-mapping';
import { revealElement } from './element-highlighter';
import type { SimulatorModeReader } from '../../shared/simulator-mode-reader';
import { isVerifiedFailure, type ContrastStatus } from '../../shared/types';

const STATUS_TEXT: Record<ContrastStatus, { badge: string; icon: string }> = {
  failed: { badge: 'Fail', icon: '✕' },
  'needs-review': { badge: 'Needs manual review', icon: '?' },
  passed: { badge: 'Pass', icon: '✓' },
};

const WCAG_LINK = 'https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum.html';

function StatusBadge({ status }: { status: ContrastStatus }) {
  const { badge, icon } = STATUS_TEXT[status];
  return <span className={`inspector-badge inspector-badge--${status}`}><span aria-hidden="true">{icon} </span>{badge}</span>;
}

function ratioLine(item: InspectedIssue) {
  const { contrastRatio, requiredRatio } = item.issue;
  return contrastRatio === null ? `Needs ${requiredRatio}:1` : `${formatRatio(contrastRatio)}:1 · needs ${requiredRatio}:1`;
}

function IssueList({ title, items, selectedId, onSelect }: {
  title: string; items: InspectedIssue[]; selectedId: string | null; onSelect: (item: InspectedIssue) => void;
}) {
  if (!items.length) return null;
  return (
    <section className="inspector-group" aria-label={title}>
      <h2>{title} ({items.length})</h2>
      <ul className="inspector-list">
        {items.map(item => (
          <li key={item.issue.id}>
            <button type="button" className="inspector-card" aria-pressed={item.issue.id === selectedId} onClick={() => onSelect(item)}>
              <StatusBadge status={item.issue.status} />
              <span className="inspector-card-label">{item.issue.elementLabel}</span>
              <span className="inspector-card-ratio">{ratioLine(item)}</span>
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}

function Swatch({ label, color }: { label: string; color: string | null }) {
  return (
    <div className="inspector-swatch">
      <span className="inspector-swatch-chip" style={{ background: color ?? 'transparent' }} aria-hidden="true">{color ? '' : '?'}</span>
      <span>{label}<br /><code>{color ?? 'Unknown'}</code></span>
    </div>
  );
}

function IssueDetail({ item, onPreviewFix }: { item: InspectedIssue; onPreviewFix: (item: InspectedIssue) => void }) {
  const { issue } = item;
  const fixable = isVerifiedFailure(issue);
  return (
    <section className="inspector-detail" aria-label="Selected element details">
      <div className="inspector-detail-head">
        <StatusBadge status={issue.status} />
        <strong>{issue.elementLabel}</strong>
      </div>
      {issue.textColor && issue.backgroundColor && (
        <div className="inspector-sample" style={{ color: issue.textColor, background: issue.backgroundColor }} aria-hidden="true">
          Aa Sample text
        </div>
      )}
      <div className="inspector-swatches">
        <Swatch label="Text" color={issue.textColor} />
        <Swatch label="Background" color={issue.backgroundColor} />
      </div>
      <dl className="inspector-facts">
        <dt>Contrast ratio</dt><dd>{issue.contrastRatio === null ? 'Could not be measured' : `${formatRatio(issue.contrastRatio)}:1`}</dd>
        <dt>Required</dt><dd>{issue.requiredRatio}:1 ({issue.isLargeText ? 'large text' : 'normal text'}, WCAG AA)</dd>
        <dt>Selector</dt><dd><code>{issue.selector}</code></dd>
      </dl>
      <p>{explainIssue(issue)} <a href={WCAG_LINK} target="_blank" rel="noreferrer">About WCAG 1.4.3</a></p>
      <div className="inspector-actions">
        <button type="button" onClick={() => revealElement(item.element)}>Show on page</button>
        {fixable && <button type="button" className="inspector-primary" onClick={() => onPreviewFix(item)}>Preview fix →</button>}
      </div>
      {!fixable && issue.status === 'needs-review' && <p className="inspector-note">Fixer only handles measured failures, so there is no automatic fix for this one.</p>}
    </section>
  );
}

export function InspectorTab({ store, modeReader, onPreviewFix }: {
  store: InspectorStore;
  modeReader: SimulatorModeReader;
  onPreviewFix: (item: InspectedIssue) => void;
}) {
  const state = useSyncExternalStore(store.subscribe, store.getState);
  const simulationMode = useSyncExternalStore(modeReader.subscribeActiveMode, modeReader.getActiveMode);
  const failures = state.issues.filter(item => item.issue.status === 'failed');
  const reviews = state.issues.filter(item => item.issue.status === 'needs-review');
  const selected = store.getSelected();
  const select = (item: InspectedIssue) => { store.select(item.issue.id); revealElement(item.element); };

  return (
    <div className="inspector">
      <div className="inspector-toolbar">
        <button type="button" className="inspector-primary" onClick={() => void store.scan()} disabled={state.status === 'scanning'}>
          {state.status === 'scanning' ? 'Scanning…' : 'Scan text contrast'}
        </button>
        {state.picking
          ? <button type="button" onClick={() => store.cancelPicking()}>Cancel picking</button>
          : <button type="button" onClick={() => store.startPicking()}>Pick element</button>}
        {(state.issues.length > 0 || state.picked) && <button type="button" onClick={() => store.clear()}>Clear</button>}
      </div>

      <div role="status" aria-live="polite" className="inspector-status">
        {state.picking && 'Click any text on the page to check it. Press Esc to cancel.'}
        {!state.picking && state.status === 'done' && (
          failures.length || reviews.length
            ? `${failures.length} contrast ${failures.length === 1 ? 'failure' : 'failures'}, ${reviews.length} needing manual review.`
            : 'No measurable contrast failures found.'
        )}
      </div>
      {state.status === 'error' && <p role="alert" className="inspector-error">Scan failed: {state.message}</p>}
      {state.status !== 'error' && state.message && <p role="alert" className="inspector-error">{state.message}</p>}

      {simulationMode !== 'none' && (
        <p className="inspector-note">A simulation is on. Ratios are calculated from the page’s real colors, not the simulated view.</p>
      )}

      {selected && <IssueDetail item={selected} onPreviewFix={onPreviewFix} />}

      <IssueList title="Failures" items={failures} selectedId={state.selectedId} onSelect={select} />
      <IssueList title="Needs manual review" items={reviews} selectedId={state.selectedId} onSelect={select} />

      {state.status === 'done' && (
        <p className="inspector-note">Automated checks only cover measurable text contrast. A clean scan does not mean the page is accessible.</p>
      )}
    </div>
  );
}
