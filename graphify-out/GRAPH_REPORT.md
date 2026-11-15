# Graph Report - AccessLens  (2026-11-14)

## Corpus Check
- 88 files · ~48,266 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 5 file(s) not represented in the graph (top: (none) 3, .css 2)

## Summary
- 688 nodes · 1329 edges · 49 communities (25 shown, 24 thin omitted)
- Extraction: 97% EXTRACTED · 3% INFERRED · 0% AMBIGUOUS · INFERRED: 42 edges (avg confidence: 0.86)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `2e7aa745`
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
- index.tsx
- color-suggester.ts
- components.json
- package.json
- fixer-prd.md
- inspector-prd.md
- simulator-prd.md
- AccessLens — Coding Agent Instructions
- types.ts
- compilerOptions
- index.tsx
- Phase 2 — controller and Simulator UI
- createFixerController
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
- createPreviewManager
- Node.js 22 or newer
- Simulator module (implementation placeholder)
- Unit and end-to-end test directories
- WXT extension build
- Phase 3 — read-only integration and QA
- inline-images.d.ts
- simulator-controller.ts
- panel-position.ts

## God Nodes (most connected - your core abstractions)
1. `cn()` - 33 edges
2. `usePanelPosition()` - 25 edges
3. `AccessLensPanel()` - 23 edges
4. `react` - 20 edges
5. `createFixerController()` - 18 edges
6. `scripts` - 17 edges
7. `Button()` - 15 edges
8. `suggestFix()` - 15 edges
9. `ContrastIssue` - 15 edges
10. `FixerTab()` - 14 edges

## Surprising Connections (you probably didn't know these)
- `Integration and ownership` --references--> `suggestFix()`  [INFERRED]
  docs/fixer/bulk-corrections.md → src/features/fixer/color-suggester.ts
- `Phase 3 — Read-only integration and QA (SIM-05, SIM-07, NFRs)` --references--> `SimulatorModeReader`  [INFERRED]
  docs/simulator/implementation-plan.md → src/shared/simulator-mode-reader.ts
- `Delivered scope` --references--> `SimulatorModeReader`  [INFERRED]
  docs/simulator/phase-3-validation.md → src/shared/simulator-mode-reader.ts
- `Files` --references--> `SimulationMode`  [INFERRED]
  docs/simulator/visionless-lite.md → src/shared/types.ts
- `measure()` --indirect_call--> `element()`  [INFERRED]
  src/features/fixer/fixer-controller.ts → tests/unit/preview-manager.test.mjs

## Import Cycles
- None detected.

## Communities (49 total, 24 thin omitted)

### Community 1 - "AccessLensPanel.tsx"
Cohesion: 0.07
Nodes (67): class-variance-authority, lucide-react, radix-ui, react, AccessLensPanel(), OverlayContainerContext, isTheme(), ThemePreference (+59 more)

### Community 2 - "fixer-controller.ts"
Cohesion: 0.15
Nodes (19): previewFix(), DETACHED_MESSAGE, generateCorrection(), isStylable(), SUPPORTED_RATIOS, underlineFix(), UNSUPPORTED_RATIO_MESSAGE, FixerDependencies (+11 more)

### Community 3 - "Project Setup and Documentation"
Cohesion: 0.06
Nodes (29): Bulk contrast correction previews, Files, Integration and ownership, Scope and limitations, Verification (2026-11-14), Known limitations and Phase 1 implications, Manual-demo regression, Phase 0 feasibility report (+21 more)

### Community 4 - "phase1.mjs"
Cohesion: 0.05
Nodes (26): runBulkCorrections(), scan(), tab(), runCrossSite(), cdp(), chrome, edgeCapture(), evaluate() (+18 more)

### Community 5 - "speech-client.ts"
Cohesion: 0.10
Nodes (18): LOGO_DARK, LOGO_DARK_LARGE, LOGO_LIGHT, describeElement(), ElementDescription, text(), visible(), attachFocusAnnouncer() (+10 more)

### Community 6 - "axe-runner.ts"
Cohesion: 0.09
Nodes (42): collect(), InspectedIssue, inspectElement(), optionsFor(), queue, runAxe(), scanTextContrast(), surroundingTextColor() (+34 more)

### Community 7 - "simulator-controller.ts"
Cohesion: 0.12
Nodes (17): scripts, build, demo, dev, postinstall, test:bulk, test:bulk:e2e, test:fixer (+9 more)

### Community 8 - "Color Suggestion Placeholder"
Cohesion: 0.05
Nodes (38): 1. Goal and product boundaries, 2. Architecture and execution boundaries, 3. Data model and contracts, 4.1 Expand Content Script Injection, 4.2 Make DOM Targeting Site-Agnostic, 4.3 Support Dynamic Websites and SPA Navigation, 4.4 Cross-Site Testing, 4.5 Performance and Compatibility (+30 more)

### Community 9 - "index.tsx"
Cohesion: 0.13
Nodes (12): main(), createSpeechBroker(), Session, SpeechBackend, isSpeechMessage(), isTogglePanelMessage(), isVisionlessNavigationMessage(), SpeechMessage (+4 more)

### Community 10 - "color-suggester.ts"
Cohesion: 0.18
Nodes (20): Accept, Candidate, closestPaletteColor(), closestReplacement(), colorDifference, intoSrgb, MESSAGES, PALETTE_PREFERENCE (+12 more)

### Community 11 - "components.json"
Cohesion: 0.12
Nodes (16): aliases, components, hooks, lib, ui, utils, iconLibrary, rsc (+8 more)

### Community 12 - "package.json"
Cohesion: 0.06
Nodes (41): dependencies, axe-core@^4.14.0, class-variance-authority@^0.7.1, clsx@^2.1.1, culori@^4.0.2, lucide-react@^1.73.0, radix-ui@^1.8.1, react@^19.0.0 (+33 more)

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

### Community 17 - "types.ts"
Cohesion: 0.17
Nodes (14): BulkCorrection, BulkFailure, BulkState, errorText(), INITIAL, CorrectionTarget, EMPTY_STATE, FixerPhase (+6 more)

### Community 18 - "compilerOptions"
Cohesion: 0.29
Nodes (6): ./.wxt/tsconfig.json, compilerOptions, jsx, paths, strict, extends

### Community 19 - "index.tsx"
Cohesion: 0.21
Nodes (9): connectInspectorToFixer(), FixerController, createIssueHandoffStore(), IssueHandoff, IssueHandoffStore, createSimulatorModeReader(), VerifiedContrastFailure, controller() (+1 more)

### Community 20 - "Phase 2 — controller and Simulator UI"
Cohesion: 0.40
Nodes (4): Blur edge clipping, Phase 2 — controller and Simulator UI, Run the local demo, Verification

### Community 21 - "createFixerController"
Cohesion: 0.27
Nodes (16): createBulkCorrections(), clear(), disable(), enable(), publish(), restore(), contrastRatio(), floorRatio() (+8 more)

### Community 40 - "createPreviewManager"
Cohesion: 0.52
Nodes (7): createPreviewManager(), restoreOriginal(), revert(), revertAll(), unwrite(), write(), fail()

### Community 45 - "Phase 3 — read-only integration and QA"
Cohesion: 0.33
Nodes (5): Compatibility limits, Delivered scope, Phase 3 — read-only integration and QA, Run and validate locally, Verification and performance

### Community 57 - "simulator-controller.ts"
Cohesion: 0.10
Nodes (32): MATRICES, simulateColor(), SimulatedRatios, simulatedRatios(), toLinear(), toSrgb(), VISION_CHECKS, VisionCheck (+24 more)

### Community 58 - "panel-position.ts"
Cohesion: 0.11
Nodes (34): clampNumber(), clampOffset(), DEFAULT_OFFSET, DRAG_THRESHOLD, dragOffset(), EDGE_MARGIN, isPanelOffset(), NUDGE_STEP (+26 more)

## Knowledge Gaps
- **24 isolated node(s):** `./.wxt/tsconfig.json`, `AccessLens demo page`, `Replacement foreground or solid background color`, `Original/fixed comparison preserving Simulator mode`, `Copyable CSS declaration` (+19 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 268 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **24 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `SimulatorModeReader` connect `AccessLensPanel.tsx` to `Color Suggestion Placeholder`, `simulator-controller.ts`, `Phase 3 — read-only integration and QA`?**
  _High betweenness centrality (0.078) - this node is a cross-community bridge._
- **Are the 8 inferred relationships involving `usePanelPosition()` (e.g. with `guardClick()` and `onKeyDown()`) actually correct?**
  _`usePanelPosition()` has 8 INFERRED edges - model-reasoned connections that need verification._
- **What connects `./.wxt/tsconfig.json`, `AccessLens demo page`, `Replacement foreground or solid background color` to the rest of the system?**
  _24 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `AccessLensPanel.tsx` be split into smaller, more focused modules?**
  _Cohesion score 0.06950013365410318 - nodes in this community are weakly interconnected._
- **Why does `text()` connect `speech-client.ts` to `phase1.mjs`?**
  _High betweenness centrality (0.065) - this node is a cross-community bridge._
- **Should `Project Setup and Documentation` be split into smaller, more focused modules?**
  _Cohesion score 0.058823529411764705 - nodes in this community are weakly interconnected._
- **Should `phase1.mjs` be split into smaller, more focused modules?**
  _Cohesion score 0.051587301587301584 - nodes in this community are weakly interconnected._