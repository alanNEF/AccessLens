# Graph Report - AccessLens  (2026-11-14)

## Corpus Check
- 64 files · ~33,647 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 5 file(s) not represented in the graph (top: (none) 3, .css 2)

## Summary
- 523 nodes · 939 edges · 44 communities (20 shown, 24 thin omitted)
- Extraction: 97% EXTRACTED · 3% INFERRED · 0% AMBIGUOUS · INFERRED: 32 edges (avg confidence: 0.9)
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
- AccessLens — Fixer Implementation Plan
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
- element-highlighter.ts
- compilerOptions
- Phase 3 — read-only integration and QA
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
- Inspector module (implementation placeholder)
- Node.js 22 or newer
- Simulator module (implementation placeholder)
- Unit and end-to-end test directories
- WXT extension build

## God Nodes (most connected - your core abstractions)
1. `cn()` - 31 edges
2. `AccessLensPanel()` - 23 edges
3. `react` - 18 edges
4. `scripts` - 15 edges
5. `Button()` - 13 edges
6. `createFixerController()` - 12 edges
7. `FixerTab()` - 11 edges
8. `SimulationMode` - 11 edges
9. `isVerifiedFailure()` - 11 edges
10. `IssueDetail()` - 11 edges

## Surprising Connections (you probably didn't know these)
- `Phase 3 — Read-only integration and QA (SIM-05, SIM-07, NFRs)` --references--> `SimulatorModeReader`  [INFERRED]
  docs/simulator/implementation-plan.md → src/shared/simulator-mode-reader.ts
- `Delivered scope` --references--> `SimulatorModeReader`  [INFERRED]
  docs/simulator/phase-3-validation.md → src/shared/simulator-mode-reader.ts
- `Fixer-owned, in `src/features/fixer/fixer-state.ts`` --references--> `revert()`  [INFERRED]
  docs/fixer/implementation-plan.md → src/features/fixer/preview-manager.ts
- `9. Decisions needed before coding` --references--> `ContrastIssue`  [INFERRED]
  docs/fixer/implementation-plan.md → src/shared/types.ts
- `2. Architecture and execution boundaries` --references--> `SimulatorModeReader`  [INFERRED]
  docs/fixer/implementation-plan.md → src/shared/simulator-mode-reader.ts

## Import Cycles
- None detected.

## Communities (44 total, 24 thin omitted)

### Community 1 - "AccessLensPanel.tsx"
Cohesion: 0.09
Nodes (51): class-variance-authority, lucide-react, radix-ui, react, AccessLensPanel(), OverlayContainerContext, isTheme(), ThemePreference (+43 more)

### Community 2 - "fixer-harness.tsx"
Cohesion: 0.07
Nodes (47): 7. Delivery plan, Color suggestion algorithm (`color-suggester.ts`), Phase F0 — Contracts and dependency, Phase F1 — Color suggester (FIX-02, FIX-08), Phase F2 — Preview manager (FIX-04, FIX-06, Safety), Phase F3 — Controller and state (FIX-01, FIX-05), Phase F4 — UI and wiring (FIX-03, FIX-07), Phase F5 — Browser verification (NFRs) (+39 more)

### Community 3 - "Project Setup and Documentation"
Cohesion: 0.11
Nodes (15): Known limitations and Phase 1 implications, Manual-demo regression, Phase 0 feasibility report, Target selection and ownership, Tested layouts and evidence, Dependencies, Extension UI redesign, Implementation (+7 more)

### Community 4 - "phase1.mjs"
Cohesion: 0.07
Nodes (20): runCrossSite(), cdp(), chrome, edgeCapture(), evaluate(), profile, screenshot(), select() (+12 more)

### Community 5 - "AccessLens — Fixer Implementation Plan"
Cohesion: 0.11
Nodes (22): 10. Risks, 1. Goal and product boundaries, 2. Architecture and execution boundaries, 3. Data model and contracts, 4. UI specification (`FixerTab.tsx`), 5. Folder changes, 6. Integration boundaries, 8. Testing matrix (+14 more)

### Community 6 - "contrast-mapping.ts"
Cohesion: 0.12
Nodes (29): collect(), InspectedIssue, inspectElement(), queue, runAxe(), scanTextContrast(), toInspected(), AxeContrastData (+21 more)

### Community 7 - "types.ts"
Cohesion: 0.14
Nodes (26): Shared, in `src/shared/types.ts` (coordinate with the Inspector owner), BLUR, normalizeBlur(), PRESETS, createSimulationEngine(), apply(), reset(), SimulationEngine (+18 more)

### Community 8 - "Color Suggestion Placeholder"
Cohesion: 0.05
Nodes (37): 1. Goal and product boundaries, 2. Architecture and execution boundaries, 3. Data model and contracts, 4.1 Expand Content Script Injection, 4.2 Make DOM Targeting Site-Agnostic, 4.3 Support Dynamic Websites and SPA Navigation, 4.4 Cross-Site Testing, 4.5 Performance and Compatibility (+29 more)

### Community 9 - "index.tsx"
Cohesion: 0.09
Nodes (23): main(), react-dom@^19.0.0, react-dom, connectInspectorToFixer(), FixerController, InspectorStore, createIssueHandoffStore(), IssueHandoff (+15 more)

### Community 10 - "package.json"
Cohesion: 0.07
Nodes (35): dependencies, axe-core@^4.14.0, class-variance-authority@^0.7.1, clsx@^2.1.1, culori@^4.0.2, lucide-react@^1.73.0, radix-ui@^1.8.1, react@^19.0.0 (+27 more)

### Community 11 - "components.json"
Cohesion: 0.12
Nodes (16): aliases, components, hooks, lib, ui, utils, iconLibrary, rsc (+8 more)

### Community 12 - "scripts"
Cohesion: 0.13
Nodes (15): scripts, build, demo, dev, dev:fixer, postinstall, test:fixer, test:phase0 (+7 more)

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

### Community 17 - "element-highlighter.ts"
Cohesion: 0.48
Nodes (5): measure(), sameRects(), TrackedRect, useTrackedRects(), HighlightLayer()

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
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 223 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **24 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `SimulatorModeReader` connect `AccessLensPanel.tsx` to `Color Suggestion Placeholder`, `Phase 3 — read-only integration and QA`, `AccessLens — Fixer Implementation Plan`, `types.ts`?**
  _High betweenness centrality (0.146) - this node is a cross-community bridge._
- **What connects `./.wxt/tsconfig.json`, `AccessLens demo page`, `Replacement foreground or solid background color` to the rest of the system?**
  _25 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `AccessLensPanel.tsx` be split into smaller, more focused modules?**
  _Cohesion score 0.09036658141517477 - nodes in this community are weakly interconnected._
- **Why does `measure()` connect `fixer-harness.tsx` to `phase1.mjs`?**
  _High betweenness centrality (0.132) - this node is a cross-community bridge._
- **Should `fixer-harness.tsx` be split into smaller, more focused modules?**
  _Cohesion score 0.07013574660633484 - nodes in this community are weakly interconnected._
- **Why does `element()` connect `phase1.mjs` to `fixer-harness.tsx`?**
  _High betweenness centrality (0.129) - this node is a cross-community bridge._
- **Should `Project Setup and Documentation` be split into smaller, more focused modules?**
  _Cohesion score 0.1111111111111111 - nodes in this community are weakly interconnected._