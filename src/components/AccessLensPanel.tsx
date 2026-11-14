import { useId, useRef, useState, type KeyboardEvent } from 'react';
import { SimulatorTab } from '../features/simulator/SimulatorTab';
import { InspectorTab } from '../features/inspector/InspectorTab';
import { HighlightLayer } from '../features/inspector/HighlightLayer';
import { FixerTab } from '../features/fixer/FixerTab';
import type { SimulatorController } from '../features/simulator/simulator-controller';
import type { InspectorStore } from '../features/inspector/inspector-store';
import type { InspectedIssue } from '../features/inspector/axe-runner';
import type { SimulatorModeReader } from '../shared/simulator-mode-reader';
import type { IssueHandoffStore } from '../shared/issue-handoff';
import { isVerifiedFailure, type FeatureId } from '../shared/types';
import { APP_NAME } from '../shared/constants';

const TABS: { id: FeatureId; label: string }[] = [
  { id: 'simulator', label: 'Simulator' },
  { id: 'inspector', label: 'Inspector' },
  { id: 'fixer', label: 'Fixer' },
];

export function AccessLensPanel({ controller, modeReader, inspector, handoff }: {
  controller: SimulatorController;
  modeReader: SimulatorModeReader;
  inspector: InspectorStore;
  handoff: IssueHandoffStore;
}) {
  const baseId = useId();
  const [active, setActive] = useState<FeatureId>('simulator');
  const tabRefs = useRef<Partial<Record<FeatureId, HTMLButtonElement | null>>>({});

  function focusTab(id: FeatureId) {
    setActive(id);
    tabRefs.current[id]?.focus();
  }
  function onTabKey(event: KeyboardEvent<HTMLButtonElement>, index: number) {
    const step = event.key === 'ArrowRight' ? 1 : event.key === 'ArrowLeft' ? -1 : 0;
    if (step) { event.preventDefault(); focusTab(TABS[(index + step + TABS.length) % TABS.length].id); }
    if (event.key === 'Home') { event.preventDefault(); focusTab(TABS[0].id); }
    if (event.key === 'End') { event.preventDefault(); focusTab(TABS[TABS.length - 1].id); }
  }
  function previewFix(item: InspectedIssue) {
    if (!isVerifiedFailure(item.issue)) return;
    handoff.set({ issue: item.issue, element: item.element });
    setActive('fixer');
  }

  return (
    <>
      <HighlightLayer store={inspector} />
      <section className="accesslens-panel" aria-label={APP_NAME}>
        <h1>{APP_NAME}</h1>
        <div role="tablist" aria-label="AccessLens features" className="accesslens-tabs">
          {TABS.map((tab, index) => (
            <button
              key={tab.id}
              ref={node => { tabRefs.current[tab.id] = node; }}
              role="tab"
              id={`${baseId}-tab-${tab.id}`}
              aria-selected={active === tab.id}
              aria-controls={`${baseId}-panel-${tab.id}`}
              tabIndex={active === tab.id ? 0 : -1}
              type="button"
              onClick={() => setActive(tab.id)}
              onKeyDown={event => onTabKey(event, index)}
            >
              {tab.label}
            </button>
          ))}
        </div>
        {TABS.map(tab => (
          <div
            key={tab.id}
            role="tabpanel"
            id={`${baseId}-panel-${tab.id}`}
            aria-labelledby={`${baseId}-tab-${tab.id}`}
            hidden={active !== tab.id}
          >
            {tab.id === 'simulator' && <SimulatorTab controller={controller} modeReader={modeReader} />}
            {tab.id === 'inspector' && <InspectorTab store={inspector} modeReader={modeReader} onPreviewFix={previewFix} />}
            {tab.id === 'fixer' && active === 'fixer' && <FixerTab />}
          </div>
        ))}
      </section>
    </>
  );
}
