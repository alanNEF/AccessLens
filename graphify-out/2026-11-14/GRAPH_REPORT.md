# Graph Report - AccessLens  (2026-11-14)

## Corpus Check
- 112 files · ~89,109 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 5 file(s) not represented in the graph (top: (none) 3, .css 2)

## Summary
- 912 nodes · 1851 edges · 66 communities (34 shown, 32 thin omitted)
- Extraction: 97% EXTRACTED · 3% INFERRED · 0% AMBIGUOUS · INFERRED: 54 edges (avg confidence: 0.86)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `7d25ba96`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- Contrast Inspection and Fixes
- AccessLensPanel.tsx
- preview-manager.ts
- Project Setup and Documentation
- ref_node_assert
- speech-client.ts
- axe-runner.ts
- simulator-controller.ts
- Color Suggestion Placeholder
- accesslens-mcp.mjs
- fixer-controller.ts
- components.json
- package.json
- fixer-prd.md
- inspector-prd.md
- simulator-prd.md
- AccessLens — Coding Agent Instructions
- fixer-controller.ts
- compilerOptions
- server.ts
- Phase 2 — controller and Simulator UI
- phase1.mjs
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
- bulk-corrections.test.ts
- Node.js 22 or newer
- Simulator module (implementation placeholder)
- Unit and end-to-end test directories
- WXT extension build
- smoke-test.mjs
- inline-images.d.ts
- dependencies
- phase1.mjs
- createBulkCorrections
- color-vision.ts
- ref_node_assert
- solid-contrast.ts
- color-suggester.test.mjs
- Accessibility check with AccessLens
- runUiRedesign
- simulator-controller.ts
- panel-position.ts
- react-dom
- @tailwindcss/vite
- image-handoff.ts
- runBulkCorrections
- runUserMode
- accesslens
- env.d.ts

## God Nodes (most connected - your core abstractions)
1. `cn()` - 37 edges
2. `AccessLensPanel()` - 27 edges
3. `usePanelPosition()` - 25 edges
4. `react` - 24 edges
5. `scripts` - 21 edges
6. `Button()` - 21 edges
7. `createFixerController()` - 21 edges
8. `createBulkCorrections()` - 19 edges
9. `suggestFix()` - 16 edges
10. `createInspectorStore()` - 16 edges

## Surprising Connections (you probably didn't know these)
- `Shared engine and ownership` --references--> `generateCorrection()`  [INFERRED]
  docs/user-mode.md → src/features/fixer/correction-generator.ts
- `Phase 3 — Read-only integration and QA (SIM-05, SIM-07, NFRs)` --references--> `SimulatorModeReader`  [INFERRED]
  docs/simulator/implementation-plan.md → src/shared/simulator-mode-reader.ts
- `Files` --references--> `SimulationMode`  [INFERRED]
  docs/simulator/visionless-lite.md → src/shared/types.ts
- `Delivered scope` --references--> `SimulatorModeReader`  [INFERRED]
  docs/simulator/phase-3-validation.md → src/shared/simulator-mode-reader.ts
- `Files` --references--> `OperatingMode`  [INFERRED]
  docs/user-mode.md → src/shared/types.ts

## Import Cycles
- None detected.

## Communities (66 total, 32 thin omitted)

### Community 1 - "AccessLensPanel.tsx"
Cohesion: 0.06
Nodes (73): class-variance-authority, lucide-react, radix-ui, react, AccessLensPanel(), previewFix(), OverlayContainerContext, PanelFooter() (+65 more)

### Community 2 - "preview-manager.ts"
Cohesion: 0.13
Nodes (16): Dynamic content, Files, Live-page refresh regression, MVP limits and follow-ups, Shared engine and ownership, User Mode, Verification, BulkState (+8 more)

### Community 3 - "Project Setup and Documentation"
Cohesion: 0.05
Nodes (36): AccessLens for coding agents, Build and test, Install, Limits, Tools, Bulk correction previews, Files, Image correction integration (2026-11-14) (+28 more)

### Community 4 - "ref_node_assert"
Cohesion: 0.15
Nodes (6): panel, viewport, box, viewport, element(), entries

### Community 5 - "speech-client.ts"
Cohesion: 0.06
Nodes (31): vitest@^5.1.0, vitest, wxt, LOGO_DARK, LOGO_DARK_LARGE, LOGO_LIGHT, describeElement(), ElementDescription (+23 more)

### Community 6 - "axe-runner.ts"
Cohesion: 0.10
Nodes (37): AgentFix, AgentIssue, AgentReport, fixFor(), toReport(), collect(), inspectElement(), optionsFor() (+29 more)

### Community 7 - "simulator-controller.ts"
Cohesion: 0.10
Nodes (21): scripts, build, build:agent, demo, dev, postinstall, test:agent, test:bulk (+13 more)

### Community 8 - "Color Suggestion Placeholder"
Cohesion: 0.05
Nodes (37): 1. Goal and product boundaries, 2. Architecture and execution boundaries, 3. Data model and contracts, 4.1 Expand Content Script Injection, 4.2 Make DOM Targeting Site-Agnostic, 4.3 Support Dynamic Websites and SPA Navigation, 4.4 Cross-Site Testing, 4.5 Performance and Compatibility (+29 more)

### Community 9 - "accesslens-mcp.mjs"
Cohesion: 0.05
Nodes (57): checkUrl(), clampGamut(), closestPaletteColor(), closestReplacement(), connect(), consumeCoords(), contrast(), contrastRatio() (+49 more)

### Community 10 - "fixer-controller.ts"
Cohesion: 0.18
Nodes (19): Accept, Candidate, closestPaletteColor(), closestReplacement(), colorDifference, intoSrgb, MESSAGES, PALETTE_PREFERENCE (+11 more)

### Community 11 - "components.json"
Cohesion: 0.12
Nodes (16): aliases, components, hooks, lib, ui, utils, iconLibrary, rsc (+8 more)

### Community 12 - "package.json"
Cohesion: 0.12
Nodes (21): description, devDependencies, jsdom@^31.0.1, tailwindcss@^4.3.5, @types/culori@^4.0.1, @types/react@^19.0.0, @types/react-dom@^19.0.0, typescript@^5.0.0 (+13 more)

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

### Community 17 - "fixer-controller.ts"
Cohesion: 0.15
Nodes (24): BulkCorrection, BulkFailure, INITIAL, CorrectionTarget, DETACHED_MESSAGE, DrawnText, FADED_BACKGROUND_MESSAGE, generateCorrection() (+16 more)

### Community 18 - "compilerOptions"
Cohesion: 0.29
Nodes (6): ./.wxt/tsconfig.json, compilerOptions, jsx, paths, strict, extends

### Community 19 - "server.ts"
Cohesion: 0.07
Nodes (28): Browser, CHROME_CANDIDATES, Connection, Listener, openSocket(), Page, Pending, resolveEndpoint() (+20 more)

### Community 20 - "Phase 2 — controller and Simulator UI"
Cohesion: 0.40
Nodes (4): Blur edge clipping, Phase 2 — controller and Simulator UI, Run the local demo, Verification

### Community 21 - "phase1.mjs"
Cohesion: 0.35
Nodes (12): enable(), contrastRatio(), floorRatio(), renderedColor(), createFixerController(), backToReady(), drawnTextColor(), measure() (+4 more)

### Community 40 - "bulk-corrections.test.ts"
Cohesion: 0.09
Nodes (37): createPreviewManager(), mutate(), restoreOriginal(), revert(), revertAll(), unwrite(), write(), fail() (+29 more)

### Community 45 - "smoke-test.mjs"
Cohesion: 0.15
Nodes (6): axeSource, outfile, require, child, http, waiting

### Community 47 - "dependencies"
Cohesion: 0.15
Nodes (13): dependencies, axe-core@^4.14.0, class-variance-authority@^0.7.1, clsx@^2.1.1, culori@^4.0.2, lucide-react@^1.73.0, radix-ui@^1.8.1, react@^19.0.0 (+5 more)

### Community 48 - "phase1.mjs"
Cohesion: 0.26
Nodes (11): cdp(), chrome, edgeCapture(), evaluate(), profile, screenshot(), select(), server (+3 more)

### Community 49 - "createBulkCorrections"
Cohesion: 0.33
Nodes (11): createBulkCorrections(), clear(), disable(), disableImage(), elementId(), enableImage(), imageCorrection(), prepareRefresh() (+3 more)

### Community 50 - "color-vision.ts"
Cohesion: 0.27
Nodes (8): MATRICES, simulateColor(), SimulatedRatios, simulatedRatios(), toLinear(), toSrgb(), VISION_CHECKS, VisionCheck

### Community 52 - "solid-contrast.ts"
Cohesion: 0.46
Nodes (7): isClear(), matchesOriginalContrast(), readDrawnOpacity(), readLayers(), readSolidContrast(), sameColor(), isLargeText()

### Community 54 - "color-suggester.test.mjs"
Cohesion: 0.47
Nodes (3): luminance(), simulatedOk(), wcag()

### Community 55 - "Accessibility check with AccessLens"
Cohesion: 0.40
Nodes (4): Accessibility check with AccessLens, Limits to state honestly, Loop, Reading the results

### Community 57 - "simulator-controller.ts"
Cohesion: 0.07
Nodes (42): Compatibility limits, Delivered scope, Phase 3 — read-only integration and QA, Run and validate locally, Verification and performance, main(), connectInspectorToFixer(), InspectorStore (+34 more)

### Community 58 - "panel-position.ts"
Cohesion: 0.11
Nodes (34): clampNumber(), clampOffset(), DEFAULT_OFFSET, DRAG_THRESHOLD, dragOffset(), EDGE_MARGIN, isPanelOffset(), NUDGE_STEP (+26 more)

### Community 62 - "runBulkCorrections"
Cohesion: 0.67
Nodes (3): runBulkCorrections(), scan(), tab()

### Community 63 - "runUserMode"
Cohesion: 0.67
Nodes (3): runUserMode(), scanAndBulk(), tab()

## Knowledge Gaps
- **25 isolated node(s):** `node`, `./.wxt/tsconfig.json`, `AccessLens demo page`, `Replacement foreground or solid background color`, `Original/fixed comparison preserving Simulator mode` (+20 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 334 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **32 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `SimulationMode` connect `simulator-controller.ts` to `Project Setup and Documentation`, `AccessLensPanel.tsx`, `server.ts`?**
  _High betweenness centrality (0.091) - this node is a cross-community bridge._
- **Are the 8 inferred relationships involving `usePanelPosition()` (e.g. with `guardClick()` and `onKeyDown()`) actually correct?**
  _`usePanelPosition()` has 8 INFERRED edges - model-reasoned connections that need verification._
- **What connects `node`, `./.wxt/tsconfig.json`, `AccessLens demo page` to the rest of the system?**
  _25 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `AccessLensPanel.tsx` be split into smaller, more focused modules?**
  _Cohesion score 0.06400343642611683 - nodes in this community are weakly interconnected._
- **Why does `SimulatorModeReader` connect `simulator-controller.ts` to `Color Suggestion Placeholder`, `AccessLensPanel.tsx`?**
  _High betweenness centrality (0.066) - this node is a cross-community bridge._
- **Should `preview-manager.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.1323529411764706 - nodes in this community are weakly interconnected._
- **Should `Project Setup and Documentation` be split into smaller, more focused modules?**
  _Cohesion score 0.046511627906976744 - nodes in this community are weakly interconnected._