# Graph Report - AccessLens  (2026-11-14)

## Corpus Check
- 74 files · ~35,672 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 486 nodes · 737 edges · 60 communities (25 shown, 35 thin omitted)
- Extraction: 98% EXTRACTED · 2% INFERRED · 0% AMBIGUOUS · INFERRED: 15 edges (avg confidence: 0.7)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `40d84528`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- [[_COMMUNITY_Contrast Inspection and Fixes|Contrast Inspection and Fixes]]
- [[_COMMUNITY_AccessLensPanel.tsx|AccessLensPanel.tsx]]
- [[_COMMUNITY_fixer-controller.ts|fixer-controller.ts]]
- [[_COMMUNITY_Project Setup and Documentation|Project Setup and Documentation]]
- [[_COMMUNITY_phase1.mjs|phase1.mjs]]
- [[_COMMUNITY_messages.ts|messages.ts]]
- [[_COMMUNITY_axe-runner.ts|axe-runner.ts]]
- [[_COMMUNITY_simulator-controller.ts|simulator-controller.ts]]
- [[_COMMUNITY_Color Suggestion Placeholder|Color Suggestion Placeholder]]
- [[_COMMUNITY_index.tsx|index.tsx]]
- [[_COMMUNITY_color-suggester.test.mjs|color-suggester.test.mjs]]
- [[_COMMUNITY_components.json|components.json]]
- [[_COMMUNITY_scripts|scripts]]
- [[_COMMUNITY_fixer-prd|fixer-prd.md]]
- [[_COMMUNITY_inspector-prd|inspector-prd.md]]
- [[_COMMUNITY_simulator-prd|simulator-prd.md]]
- [[_COMMUNITY_AccessLens — Coding Agent Instructions|AccessLens — Coding Agent Instructions]]
- [[_COMMUNITY_compilerOptions|compilerOptions]]
- [[_COMMUNITY_Phase 3 — read-only integration and QA|Phase 3 — read-only integration and QA]]
- [[_COMMUNITY_Phase 2 — controller and Simulator UI|Phase 2 — controller and Simulator UI]]
- [[_COMMUNITY_Replacement foreground or solid background color|Replacement foreground or solid background color]]
- [[_COMMUNITY_Originalfixed comparison preserving Simulator mode|Original/fixed comparison preserving Simulator mode]]
- [[_COMMUNITY_Copyable CSS declaration|Copyable CSS declaration]]
- [[_COMMUNITY_Exact prior inline-style restoration|Exact prior inline-style restoration]]
- [[_COMMUNITY_Fixer reversible contrast-preview requirements|Fixer reversible contrast-preview requirements]]
- [[_COMMUNITY_Selected-element temporary style override|Selected-element temporary style override]]
- [[_COMMUNITY_Unsupported fix state|Unsupported fix state]]
- [[_COMMUNITY_Controlled demo on-demand scan|Controlled demo on-demand scan]]
- [[_COMMUNITY_Non-destructive failing-element highlights|Non-destructive failing-element highlights]]
- [[_COMMUNITY_Inspector text-contrast requirements|Inspector text-contrast requirements]]
- [[_COMMUNITY_Needs manual review state|Needs manual review state]]
- [[_COMMUNITY_Original computed foreground and background colors|Original computed foreground and background colors]]
- [[_COMMUNITY_Optional Simulator mode|Optional Simulator mode]]
- [[_COMMUNITY_Verified contrast issue and stable element reference|Verified contrast issue and stable element reference]]
- [[_COMMUNITY_WCAG AA text-contrast thresholds|WCAG AA text-contrast thresholds]]
- [[_COMMUNITY_Inspector requirements in simulator-prd|Inspector requirements in simulator-prd.md]]
- [[_COMMUNITY_phase-1-validation|phase-1-validation.md]]
- [[_COMMUNITY_Fixer module (implementation placeholder)|Fixer module (implementation placeholder)]]
- [[_COMMUNITY_Node.js 22 or newer|Node.js 22 or newer]]
- [[_COMMUNITY_Simulator module (implementation placeholder)|Simulator module (implementation placeholder)]]
- [[_COMMUNITY_Unit and end-to-end test directories|Unit and end-to-end test directories]]
- [[_COMMUNITY_WXT extension build|WXT extension build]]
- [[_COMMUNITY_entrypoints_accesslens_content_style|entrypoints_accesslens_content_style]]
- [[_COMMUNITY_ref_esbuild|ref_esbuild]]
- [[_COMMUNITY_ref_node_assert|ref_node_assert]]
- [[_COMMUNITY_ref_node_child_process|ref_node_child_process]]
- [[_COMMUNITY_ref_node_fs|ref_node_fs]]
- [[_COMMUNITY_ref_node_http|ref_node_http]]
- [[_COMMUNITY_ref_node_os|ref_node_os]]
- [[_COMMUNITY_ref_node_path|ref_node_path]]
- [[_COMMUNITY_ref_node_test|ref_node_test]]
- [[_COMMUNITY_src_styles_globals|src_styles_globals]]
- [[_COMMUNITY_types.ts|types.ts]]
- [[_COMMUNITY_panel-position.ts|panel-position.ts]]
- [[_COMMUNITY_panel-position.test.mjs|panel-position.test.mjs]]

## God Nodes (most connected - your core abstractions)
1. `cn()` - 29 edges
2. `scripts` - 15 edges
3. `SimulationMode` - 10 edges
4. `AccessLens — Simulator Implementation Plan` - 10 edges
5. `AccessLens — Coding Agent Instructions` - 9 edges
6. `Phase 4 — Cross-Site Compatibility` - 9 edges
7. `suggestFix()` - 8 edges
8. `ContrastIssue` - 8 edges
9. `evaluate()` - 8 edges
10. `AccessLens` - 8 edges

## Surprising Connections (you probably didn't know these)
- `fixture()` --calls--> `createFixerController()`  [INFERRED]
  tests/unit/fixer-controller.test.mjs → src/features/fixer/fixer-controller.ts
- `fixture()` --calls--> `createSimulatorController()`  [INFERRED]
  tests/unit/simulator-controller.test.mjs → src/features/simulator/simulator-controller.ts
- `announcement()` --calls--> `describeElement()`  [EXTRACTED]
  tests/unit/visionless.test.ts → src/features/simulator/visionless/accessible-label.ts
- `createSpeechClient()` --calls--> `send`  [INFERRED]
  src/features/simulator/visionless/speech-client.ts → tests/unit/visionless-client.test.ts
- `AccessLens popup HTML` --references--> `AccessLens`  [EXTRACTED]
  entrypoints/popup/index.html → README.md

## Import Cycles
- None detected.

## Communities (60 total, 35 thin omitted)

### Community 1 - "AccessLensPanel.tsx"
Cohesion: 0.10
Nodes (30): cn(), Button(), buttonVariants, Card(), CardAction(), CardContent(), CardDescription(), CardFooter() (+22 more)

### Community 2 - "fixer-controller.ts"
Cohesion: 0.08
Nodes (37): closestReplacement(), colorDifference, contrastRatio(), floorRatio(), intoSrgb, MESSAGES, parseOpaque(), searchLightness() (+29 more)

### Community 3 - "Project Setup and Documentation"
Cohesion: 0.05
Nodes (32): Known limitations and Phase 1 implications, Manual-demo regression, Phase 0 feasibility report, Target selection and ownership, Tested layouts and evidence, Automated/local verification, Cross-site results, Implementation (+24 more)

### Community 4 - "phase1.mjs"
Cohesion: 0.24
Nodes (13): runCrossSite(), cdp(), chrome, edgeCapture(), evaluate(), profile, screenshot(), select() (+5 more)

### Community 5 - "messages.ts"
Cohesion: 0.08
Nodes (24): createSimulationEngine(), describeElement(), ElementDescription, text(), visible(), attachFocusAnnouncer(), createSpeechBroker(), Session (+16 more)

### Community 6 - "axe-runner.ts"
Cohesion: 0.19
Nodes (18): collect(), inspectElement(), queue, runAxe(), scanTextContrast(), toInspected(), AxeContrastData, describeElement() (+10 more)

### Community 7 - "simulator-controller.ts"
Cohesion: 0.13
Nodes (15): scripts, build, demo, dev, postinstall, test:fixer, test:phase0, test:phase1 (+7 more)

### Community 8 - "Color Suggestion Placeholder"
Cohesion: 0.07
Nodes (29): 1. Goal and product boundaries, 2. Architecture and execution boundaries, 3. Data model and contracts, 4.1 Expand Content Script Injection, 4.2 Make DOM Targeting Site-Agnostic, 4.3 Support Dynamic Websites and SPA Navigation, 4.4 Cross-Site Testing, 4.5 Performance and Compatibility (+21 more)

### Community 9 - "index.tsx"
Cohesion: 0.09
Nodes (25): AccessLensPanel(), OverlayContainerContext, usePanelPosition(), ThemePreference, useTheme(), Tooltip(), TooltipContent(), TooltipProvider() (+17 more)

### Community 11 - "components.json"
Cohesion: 0.12
Nodes (16): aliases, components, hooks, lib, ui, utils, iconLibrary, rsc (+8 more)

### Community 12 - "scripts"
Cohesion: 0.07
Nodes (26): dependencies, axe-core, class-variance-authority, clsx, culori, lucide-react, radix-ui, react (+18 more)

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
Nodes (6): compilerOptions, jsx, paths, strict, extends, @/*

### Community 19 - "Phase 3 — read-only integration and QA"
Cohesion: 0.33
Nodes (5): Compatibility limits, Delivered scope, Phase 3 — read-only integration and QA, Run and validate locally, Verification and performance

### Community 20 - "Phase 2 — controller and Simulator UI"
Cohesion: 0.40
Nodes (4): Blur edge clipping, Phase 2 — controller and Simulator UI, Run the local demo, Verification

### Community 57 - "types.ts"
Cohesion: 0.21
Nodes (13): BLUR, normalizeBlur(), SimulationEngine, createSimulatorController(), createSimulatorDom(), DEFAULT_SETTINGS, SimulationSettings, SimulationStatus (+5 more)

### Community 58 - "panel-position.ts"
Cohesion: 0.33
Nodes (9): clampNumber(), clampOffset(), DEFAULT_OFFSET, dragOffset(), isPanelOffset(), nudgeOffset(), PanelOffset, passedThreshold() (+1 more)

## Knowledge Gaps
- **202 isolated node(s):** `$schema`, `style`, `rsc`, `tsx`, `config` (+197 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **35 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `AccessLens — Simulator Implementation Plan` connect `Color Suggestion Placeholder` to `Project Setup and Documentation`?**
  _High betweenness centrality (0.011) - this node is a cross-community bridge._
- **Why does `cn()` connect `AccessLensPanel.tsx` to `index.tsx`?**
  _High betweenness centrality (0.010) - this node is a cross-community bridge._
- **What connects `$schema`, `style`, `rsc` to the rest of the system?**
  _202 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `AccessLensPanel.tsx` be split into smaller, more focused modules?**
  _Cohesion score 0.10188261351052048 - nodes in this community are weakly interconnected._
- **Should `fixer-controller.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.07536231884057971 - nodes in this community are weakly interconnected._
- **Should `Project Setup and Documentation` be split into smaller, more focused modules?**
  _Cohesion score 0.05263157894736842 - nodes in this community are weakly interconnected._
- **Should `messages.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.08292682926829269 - nodes in this community are weakly interconnected._