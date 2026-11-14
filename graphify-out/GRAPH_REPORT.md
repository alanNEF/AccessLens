# Graph Report - AccessLens  (2026-11-14)

## Corpus Check
- 76 files · ~38,460 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 5 file(s) not represented in the graph (top: (none) 3, .css 2)

## Summary
- 586 nodes · 1079 edges · 43 communities (20 shown, 23 thin omitted)
- Extraction: 97% EXTRACTED · 3% INFERRED · 0% AMBIGUOUS · INFERRED: 35 edges (avg confidence: 0.86)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `9b31178a`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- Contrast Inspection and Fixes
- AccessLensPanel.tsx
- fixer-controller.ts
- Project Setup and Documentation
- phase1.mjs
- speech-client.ts
- axe-runner.ts
- simulator-controller.ts
- Color Suggestion Placeholder
- messages.ts
- createSimulatorDom
- components.json
- package.json
- fixer-prd.md
- inspector-prd.md
- simulator-prd.md
- AccessLens — Coding Agent Instructions
- compilerOptions
- Phase 2 — controller and Simulator UI
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
2. `usePanelPosition()` - 25 edges
3. `AccessLensPanel()` - 23 edges
4. `react` - 19 edges
5. `scripts` - 15 edges
6. `Button()` - 13 edges
7. `createFixerController()` - 13 edges
8. `SimulationMode` - 11 edges
9. `FixerTab()` - 11 edges
10. `IssueDetail()` - 11 edges

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

## Communities (43 total, 23 thin omitted)

### Community 1 - "AccessLensPanel.tsx"
Cohesion: 0.09
Nodes (41): class-variance-authority, radix-ui, react, AccessLensPanel(), OverlayContainerContext, isTheme(), ThemePreference, useTheme() (+33 more)

### Community 2 - "fixer-controller.ts"
Cohesion: 0.07
Nodes (51): previewFix(), closestReplacement(), colorDifference, contrastRatio(), floorRatio(), intoSrgb, MESSAGES, parseOpaque() (+43 more)

### Community 3 - "Project Setup and Documentation"
Cohesion: 0.05
Nodes (32): Known limitations and Phase 1 implications, Manual-demo regression, Phase 0 feasibility report, Target selection and ownership, Tested layouts and evidence, Automated/local verification, Cross-site results, Implementation (+24 more)

### Community 4 - "phase1.mjs"
Cohesion: 0.06
Nodes (21): runCrossSite(), cdp(), chrome, edgeCapture(), evaluate(), profile, screenshot(), select() (+13 more)

### Community 5 - "speech-client.ts"
Cohesion: 0.16
Nodes (14): describeElement(), ElementDescription, text(), visible(), attachFocusAnnouncer(), createSpeechClient(), run(), send() (+6 more)

### Community 6 - "axe-runner.ts"
Cohesion: 0.09
Nodes (41): Card(), CardContent(), collect(), InspectedIssue, inspectElement(), queue, runAxe(), scanTextContrast() (+33 more)

### Community 7 - "simulator-controller.ts"
Cohesion: 0.13
Nodes (15): scripts, build, demo, dev, postinstall, test:fixer, test:phase0, test:phase1 (+7 more)

### Community 8 - "Color Suggestion Placeholder"
Cohesion: 0.07
Nodes (29): 1. Goal and product boundaries, 2. Architecture and execution boundaries, 3. Data model and contracts, 4.1 Expand Content Script Injection, 4.2 Make DOM Targeting Site-Agnostic, 4.3 Support Dynamic Websites and SPA Navigation, 4.4 Cross-Site Testing, 4.5 Performance and Compatibility (+21 more)

### Community 9 - "messages.ts"
Cohesion: 0.16
Nodes (10): createSpeechBroker(), Session, SpeechBackend, isSpeechMessage(), isVisionlessNavigationMessage(), SpeechMessage, SpeechResponse, TOGGLE_PANEL (+2 more)

### Community 10 - "createSimulatorDom"
Cohesion: 0.39
Nodes (7): createSimulatorDom(), clear(), disconnect(), isContent(), targets(), watch(), observe()

### Community 11 - "components.json"
Cohesion: 0.12
Nodes (16): aliases, components, hooks, lib, ui, utils, iconLibrary, rsc (+8 more)

### Community 12 - "package.json"
Cohesion: 0.06
Nodes (42): dependencies, axe-core@^4.14.0, class-variance-authority@^0.7.1, clsx@^2.1.1, culori@^4.0.2, lucide-react@^1.73.0, radix-ui@^1.8.1, react@^19.0.0 (+34 more)

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

### Community 18 - "compilerOptions"
Cohesion: 0.29
Nodes (6): ./.wxt/tsconfig.json, compilerOptions, jsx, paths, strict, extends

### Community 20 - "Phase 2 — controller and Simulator UI"
Cohesion: 0.40
Nodes (4): Blur edge clipping, Phase 2 — controller and Simulator UI, Run the local demo, Verification

### Community 57 - "SimulatorTab.tsx"
Cohesion: 0.10
Nodes (33): Compatibility limits, Delivered scope, Phase 3 — read-only integration and QA, Run and validate locally, Verification and performance, main(), connectInspectorToFixer(), FixerController (+25 more)

### Community 58 - "panel-position.ts"
Cohesion: 0.11
Nodes (34): clampNumber(), clampOffset(), DEFAULT_OFFSET, DRAG_THRESHOLD, dragOffset(), EDGE_MARGIN, isPanelOffset(), NUDGE_STEP (+26 more)

## Knowledge Gaps
- **24 isolated node(s):** `./.wxt/tsconfig.json`, `AccessLens demo page`, `Replacement foreground or solid background color`, `Original/fixed comparison preserving Simulator mode`, `Copyable CSS declaration` (+19 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 229 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **23 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `SimulatorModeReader` connect `SimulatorTab.tsx` to `Color Suggestion Placeholder`, `AccessLensPanel.tsx`, `axe-runner.ts`?**
  _High betweenness centrality (0.101) - this node is a cross-community bridge._
- **Are the 8 inferred relationships involving `usePanelPosition()` (e.g. with `guardClick()` and `onKeyDown()`) actually correct?**
  _`usePanelPosition()` has 8 INFERRED edges - model-reasoned connections that need verification._
- **What connects `./.wxt/tsconfig.json`, `AccessLens demo page`, `Replacement foreground or solid background color` to the rest of the system?**
  _24 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `AccessLensPanel.tsx` be split into smaller, more focused modules?**
  _Cohesion score 0.09316394434361766 - nodes in this community are weakly interconnected._
- **Why does `SimulationMode` connect `SimulatorTab.tsx` to `AccessLensPanel.tsx`, `Project Setup and Documentation`?**
  _High betweenness centrality (0.095) - this node is a cross-community bridge._
- **Should `fixer-controller.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.07207792207792207 - nodes in this community are weakly interconnected._
- **Should `Project Setup and Documentation` be split into smaller, more focused modules?**
  _Cohesion score 0.05263157894736842 - nodes in this community are weakly interconnected._