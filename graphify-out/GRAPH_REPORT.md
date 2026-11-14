# Graph Report - AccessLens  (2026-11-14)

## Corpus Check
- 61 files · ~30,428 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 5 file(s) not represented in the graph (top: (none) 3, .css 2)

## Summary
- 479 nodes · 861 edges · 45 communities (20 shown, 25 thin omitted)
- Extraction: 98% EXTRACTED · 2% INFERRED · 0% AMBIGUOUS · INFERRED: 19 edges (avg confidence: 0.87)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `8496367e`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- Contrast Inspection and Fixes
- AccessLensPanel.tsx
- fixer-harness.tsx
- Project Setup and Documentation
- phase1.mjs
- dependencies
- contrast-mapping.ts
- types.ts
- Color Suggestion Placeholder
- index.tsx
- package.json
- components.json
- scripts
- fixer-prd.md
- inspector-prd.md
- simulator-prd.md
- AccessLens — Coding Agent Instructions
- wxt
- compilerOptions
- Phase 3 — read-only integration and QA
- Phase 2 — controller and Simulator UI
- react-dom
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
- Inspector module (implementation placeholder)
- Node.js 22 or newer
- Simulator module (implementation placeholder)
- Unit and end-to-end test directories
- WXT extension build

## God Nodes (most connected - your core abstractions)
1. `cn()` - 31 edges
2. `AccessLensPanel()` - 22 edges
3. `react` - 18 edges
4. `scripts` - 14 edges
5. `Button()` - 13 edges
6. `FixerTab()` - 11 edges
7. `createFixerController()` - 11 edges
8. `IssueDetail()` - 11 edges
9. `isVerifiedFailure()` - 11 edges
10. `createInspectorStore()` - 10 edges

## Surprising Connections (you probably didn't know these)
- `Phase 3 — Read-only integration and QA (SIM-05, SIM-07, NFRs)` --references--> `SimulatorModeReader`  [INFERRED]
  docs/simulator/implementation-plan.md → src/shared/simulator-mode-reader.ts
- `Delivered scope` --references--> `SimulatorModeReader`  [INFERRED]
  docs/simulator/phase-3-validation.md → src/shared/simulator-mode-reader.ts
- `measure()` --indirect_call--> `element()`  [INFERRED]
  src/features/fixer/fixer-controller.ts → tests/unit/preview-manager.test.mjs
- `4. UI specification` --references--> `reset()`  [INFERRED]
  docs/simulator/implementation-plan.md → src/features/simulator/simulation-engine.ts
- `AccessLens popup HTML` --references--> `AccessLens`  [EXTRACTED]
  entrypoints/popup/index.html → README.md

## Import Cycles
- None detected.

## Communities (45 total, 25 thin omitted)

### Community 1 - "AccessLensPanel.tsx"
Cohesion: 0.08
Nodes (57): lucide-react@^1.73.0, class-variance-authority, lucide-react, radix-ui, react, AccessLensPanel(), previewFix(), OverlayContainerContext (+49 more)

### Community 2 - "fixer-harness.tsx"
Cohesion: 0.08
Nodes (41): closestReplacement(), colorDifference, contrastRatio(), floorRatio(), intoSrgb, MESSAGES, parseOpaque(), searchLightness() (+33 more)

### Community 3 - "Project Setup and Documentation"
Cohesion: 0.07
Nodes (23): Known limitations and Phase 1 implications, Manual-demo regression, Phase 0 feasibility report, Target selection and ownership, Tested layouts and evidence, Automated/local verification, Cross-site results, Implementation (+15 more)

### Community 4 - "phase1.mjs"
Cohesion: 0.08
Nodes (16): runCrossSite(), cdp(), chrome, edgeCapture(), evaluate(), profile, screenshot(), select() (+8 more)

### Community 5 - "dependencies"
Cohesion: 0.17
Nodes (12): dependencies, axe-core@^4.14.0, class-variance-authority@^0.7.1, clsx@^2.1.1, culori@^4.0.2, radix-ui@^1.8.1, react@^19.0.0, tailwind-merge@^3.7.0 (+4 more)

### Community 6 - "contrast-mapping.ts"
Cohesion: 0.12
Nodes (30): collect(), InspectedIssue, inspectElement(), queue, runAxe(), scanTextContrast(), toInspected(), AxeContrastData (+22 more)

### Community 7 - "types.ts"
Cohesion: 0.13
Nodes (28): 4. UI specification, BLUR, normalizeBlur(), PRESETS, createSimulationEngine(), apply(), reset(), SimulationEngine (+20 more)

### Community 8 - "Color Suggestion Placeholder"
Cohesion: 0.07
Nodes (28): 1. Goal and product boundaries, 2. Architecture and execution boundaries, 3. Data model and contracts, 4.1 Expand Content Script Injection, 4.2 Make DOM Targeting Site-Agnostic, 4.3 Support Dynamic Websites and SPA Navigation, 4.4 Cross-Site Testing, 4.5 Performance and Compatibility (+20 more)

### Community 9 - "index.tsx"
Cohesion: 0.18
Nodes (12): main(), connectInspectorToFixer(), FixerController, InspectorStore, createIssueHandoffStore(), IssueHandoff, IssueHandoffStore, isTogglePanelMessage() (+4 more)

### Community 10 - "package.json"
Cohesion: 0.14
Nodes (18): description, devDependencies, tailwindcss@^4.3.5, @types/culori@^4.0.1, @types/react@^19.0.0, @types/react-dom@^19.0.0, typescript@^5.0.0, @wxt-dev/module-react@^1.0.0 (+10 more)

### Community 11 - "components.json"
Cohesion: 0.12
Nodes (16): aliases, components, hooks, lib, ui, utils, iconLibrary, rsc (+8 more)

### Community 12 - "scripts"
Cohesion: 0.14
Nodes (14): scripts, build, demo, dev, postinstall, test:fixer, test:phase0, test:phase1 (+6 more)

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

### Community 17 - "wxt"
Cohesion: 0.33
Nodes (4): @tailwindcss/vite@^4.3.5, wxt@^0.20.0, @tailwindcss/vite, wxt

### Community 18 - "compilerOptions"
Cohesion: 0.29
Nodes (6): ./.wxt/tsconfig.json, compilerOptions, jsx, paths, strict, extends

### Community 19 - "Phase 3 — read-only integration and QA"
Cohesion: 0.33
Nodes (5): Compatibility limits, Delivered scope, Phase 3 — read-only integration and QA, Run and validate locally, Verification and performance

### Community 20 - "Phase 2 — controller and Simulator UI"
Cohesion: 0.40
Nodes (4): Blur edge clipping, Phase 2 — controller and Simulator UI, Run the local demo, Verification

## Knowledge Gaps
- **25 isolated node(s):** `./.wxt/tsconfig.json`, `AccessLens demo page`, `Replacement foreground or solid background color`, `Original/fixed comparison preserving Simulator mode`, `Copyable CSS declaration` (+20 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 195 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **25 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `SimulatorModeReader` connect `types.ts` to `Color Suggestion Placeholder`, `AccessLensPanel.tsx`, `Phase 3 — read-only integration and QA`?**
  _High betweenness centrality (0.133) - this node is a cross-community bridge._
- **What connects `./.wxt/tsconfig.json`, `AccessLens demo page`, `Replacement foreground or solid background color` to the rest of the system?**
  _25 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `AccessLensPanel.tsx` be split into smaller, more focused modules?**
  _Cohesion score 0.0781981981981982 - nodes in this community are weakly interconnected._
- **Why does `measure()` connect `fixer-harness.tsx` to `AccessLensPanel.tsx`, `phase1.mjs`?**
  _High betweenness centrality (0.123) - this node is a cross-community bridge._
- **Should `fixer-harness.tsx` be split into smaller, more focused modules?**
  _Cohesion score 0.08405797101449275 - nodes in this community are weakly interconnected._
- **Why does `AccessLens — Simulator Implementation Plan` connect `Color Suggestion Placeholder` to `Project Setup and Documentation`, `types.ts`?**
  _High betweenness centrality (0.123) - this node is a cross-community bridge._
- **Should `Project Setup and Documentation` be split into smaller, more focused modules?**
  _Cohesion score 0.07142857142857142 - nodes in this community are weakly interconnected._