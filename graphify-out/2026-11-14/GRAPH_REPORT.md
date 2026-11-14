# Graph Report - AccessLens  (2026-11-14)

## Corpus Check
- 74 files · ~36,912 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 5 file(s) not represented in the graph (top: (none) 3, .css 2)

## Summary
- 564 nodes · 1023 edges · 45 communities (21 shown, 24 thin omitted)
- Extraction: 97% EXTRACTED · 3% INFERRED · 0% AMBIGUOUS · INFERRED: 32 edges (avg confidence: 0.86)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `6a7c4bfa`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- Contrast Inspection and Fixes
- AccessLensPanel.tsx
- fixer-controller.ts
- Project Setup and Documentation
- phase1.mjs
- messages.ts
- axe-runner.ts
- simulator-controller.ts
- Color Suggestion Placeholder
- index.tsx
- dependencies
- components.json
- scripts
- fixer-prd.md
- inspector-prd.md
- simulator-prd.md
- AccessLens — Coding Agent Instructions
- wxt.config.ts
- compilerOptions
- Phase 2 — controller and Simulator UI
- main.tsx
- Replacement foreground or solid background color
- Original/fixed comparison preserving Simulator mode
- Copyable CSS declaration
- Exact prior inline-style restoration
- Fixer reversible contrast-preview requirements
- Selected-element temporary style override
- Unsupported fix state
- Controlled demo on-demand scan
- Non-destructive failing-element highlights
- Inspector text-contrast requirements
- Needs manual review state
- Original computed foreground and background colors
- Optional Simulator mode
- Verified contrast issue and stable element reference
- WCAG AA text-contrast thresholds
- Inspector requirements in simulator-prd.md
- phase-1-validation.md
- Fixer module (implementation placeholder)
- Node.js 22 or newer
- Simulator module (implementation placeholder)
- Unit and end-to-end test directories
- WXT extension build
- SimulatorTab.tsx
- panel-position.ts

## God Nodes (most connected - your core abstractions)
1. `cn()` - 31 edges
2. `AccessLensPanel()` - 23 edges
3. `react` - 19 edges
4. `scripts` - 15 edges
5. `usePanelPosition()` - 14 edges
6. `Button()` - 13 edges
7. `createFixerController()` - 13 edges
8. `FixerTab()` - 11 edges
9. `IssueDetail()` - 11 edges
10. `SimulationMode` - 11 edges

## Surprising Connections (you probably didn't know these)
- `Phase 3 — Read-only integration and QA (SIM-05, SIM-07, NFRs)` --references--> `SimulatorModeReader`  [INFERRED]
  docs/simulator/implementation-plan.md → src/shared/simulator-mode-reader.ts
- `Files` --references--> `SimulationMode`  [INFERRED]
  docs/simulator/visionless-lite.md → src/shared/types.ts
- `Delivered scope` --references--> `SimulatorModeReader`  [INFERRED]
  docs/simulator/phase-3-validation.md → src/shared/simulator-mode-reader.ts
- `measure()` --indirect_call--> `element()`  [INFERRED]
  src/features/fixer/fixer-controller.ts → tests/unit/preview-manager.test.mjs
- `announcement()` --calls--> `describeElement()`  [EXTRACTED]
  tests/unit/visionless.test.ts → src/features/simulator/visionless/accessible-label.ts

## Import Cycles
- None detected.

## Communities (45 total, 24 thin omitted)

### Community 1 - "AccessLensPanel.tsx"
Cohesion: 0.08
Nodes (56): lucide-react@^1.73.0, class-variance-authority, lucide-react, radix-ui, react, AccessLensPanel(), previewFix(), OverlayContainerContext (+48 more)

### Community 2 - "fixer-controller.ts"
Cohesion: 0.08
Nodes (44): closestReplacement(), colorDifference, contrastRatio(), floorRatio(), intoSrgb, MESSAGES, parseOpaque(), renderedColor() (+36 more)

### Community 3 - "Project Setup and Documentation"
Cohesion: 0.05
Nodes (32): Known limitations and Phase 1 implications, Manual-demo regression, Phase 0 feasibility report, Target selection and ownership, Tested layouts and evidence, Automated/local verification, Cross-site results, Implementation (+24 more)

### Community 4 - "phase1.mjs"
Cohesion: 0.07
Nodes (19): runCrossSite(), cdp(), chrome, edgeCapture(), evaluate(), profile, screenshot(), select() (+11 more)

### Community 5 - "messages.ts"
Cohesion: 0.08
Nodes (26): vitest@^5.1.0, vitest, describeElement(), ElementDescription, text(), visible(), attachFocusAnnouncer(), createSpeechBroker() (+18 more)

### Community 6 - "axe-runner.ts"
Cohesion: 0.12
Nodes (29): collect(), InspectedIssue, inspectElement(), queue, runAxe(), scanTextContrast(), toInspected(), AxeContrastData (+21 more)

### Community 7 - "simulator-controller.ts"
Cohesion: 0.13
Nodes (15): scripts, build, demo, dev, postinstall, test:fixer, test:phase0, test:phase1 (+7 more)

### Community 8 - "Color Suggestion Placeholder"
Cohesion: 0.07
Nodes (29): 1. Goal and product boundaries, 2. Architecture and execution boundaries, 3. Data model and contracts, 4.1 Expand Content Script Injection, 4.2 Make DOM Targeting Site-Agnostic, 4.3 Support Dynamic Websites and SPA Navigation, 4.4 Cross-Site Testing, 4.5 Performance and Compatibility (+21 more)

### Community 9 - "index.tsx"
Cohesion: 0.18
Nodes (14): main(), connectInspectorToFixer(), FixerController, createPreviewManager(), restoreOriginal(), revert(), unwrite(), write() (+6 more)

### Community 10 - "dependencies"
Cohesion: 0.17
Nodes (12): dependencies, axe-core@^4.14.0, class-variance-authority@^0.7.1, clsx@^2.1.1, culori@^4.0.2, radix-ui@^1.8.1, react@^19.0.0, tailwind-merge@^3.7.0 (+4 more)

### Community 11 - "components.json"
Cohesion: 0.12
Nodes (16): aliases, components, hooks, lib, ui, utils, iconLibrary, rsc (+8 more)

### Community 12 - "scripts"
Cohesion: 0.13
Nodes (20): description, devDependencies, jsdom@^31.0.1, tailwindcss@^4.3.5, @types/culori@^4.0.1, @types/react@^19.0.0, @types/react-dom@^19.0.0, typescript@^5.0.0 (+12 more)

### Community 13 - "fixer-prd.md"
Cohesion: 0.14
Nodes (13): Design, Frontend Developer, Functional Requirements, Non-Functional Requirements, Overview, Problem, Requirements, UI (+5 more)

### Community 14 - "inspector-prd.md"
Cohesion: 0.14
Nodes (13): Design, Frontend Developer, Functional Requirements, Non-Functional Requirements, Overview, Problem, Requirements, Student Developer (+5 more)

### Community 15 - "simulator-prd.md"
Cohesion: 0.14
Nodes (13): Design, Frontend Developer, Functional Requirements, Non-Functional Requirements, Overview, Problem, Requirements, UI (+5 more)

### Community 16 - "AccessLens — Coding Agent Instructions"
Cohesion: 0.15
Nodes (12): AccessLens — Coding Agent Instructions, Architecture and feature ownership, Coding conventions, Expected repository layout, Fixer (`src/features/fixer/`), Inspector (`src/features/inspector/`), Mission, Required Graphify workflow (+4 more)

### Community 17 - "wxt.config.ts"
Cohesion: 0.33
Nodes (4): @tailwindcss/vite@^4.3.5, wxt@^0.20.0, @tailwindcss/vite, wxt

### Community 18 - "compilerOptions"
Cohesion: 0.29
Nodes (6): ./.wxt/tsconfig.json, compilerOptions, jsx, paths, strict, extends

### Community 20 - "Phase 2 — controller and Simulator UI"
Cohesion: 0.40
Nodes (4): Blur edge clipping, Phase 2 — controller and Simulator UI, Run the local demo, Verification

### Community 57 - "SimulatorTab.tsx"
Cohesion: 0.10
Nodes (32): Compatibility limits, Delivered scope, Phase 3 — read-only integration and QA, Run and validate locally, Verification and performance, BLUR, normalizeBlur(), PRESETS (+24 more)

### Community 58 - "panel-position.ts"
Cohesion: 0.16
Nodes (16): clampNumber(), clampOffset(), DEFAULT_OFFSET, DRAG_THRESHOLD, dragOffset(), EDGE_MARGIN, isPanelOffset(), NUDGE_STEP (+8 more)

## Knowledge Gaps
- **24 isolated node(s):** `./.wxt/tsconfig.json`, `AccessLens demo page`, `Replacement foreground or solid background color`, `Original/fixed comparison preserving Simulator mode`, `Copyable CSS declaration` (+19 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 227 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **24 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `SimulatorModeReader` connect `SimulatorTab.tsx` to `Color Suggestion Placeholder`, `AccessLensPanel.tsx`?**
  _High betweenness centrality (0.103) - this node is a cross-community bridge._
- **Are the 6 inferred relationships involving `usePanelPosition()` (e.g. with `guardClick()` and `onKeyDown()`) actually correct?**
  _`usePanelPosition()` has 6 INFERRED edges - model-reasoned connections that need verification._
- **What connects `./.wxt/tsconfig.json`, `AccessLens demo page`, `Replacement foreground or solid background color` to the rest of the system?**
  _24 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `AccessLensPanel.tsx` be split into smaller, more focused modules?**
  _Cohesion score 0.07997038134024435 - nodes in this community are weakly interconnected._
- **Why does `SimulationMode` connect `SimulatorTab.tsx` to `AccessLensPanel.tsx`, `fixer-controller.ts`, `Project Setup and Documentation`?**
  _High betweenness centrality (0.099) - this node is a cross-community bridge._
- **Should `fixer-controller.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.08489795918367347 - nodes in this community are weakly interconnected._
- **Should `Project Setup and Documentation` be split into smaller, more focused modules?**
  _Cohesion score 0.05263157894736842 - nodes in this community are weakly interconnected._