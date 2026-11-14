# Graph Report - AccessLens  (2026-11-14)

## Corpus Check
- 34 files · ~12,557 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 209 nodes · 212 edges · 46 communities (22 shown, 24 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS · INFERRED: 1 edges (avg confidence: 0.8)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `7b0f104d`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- [[_COMMUNITY_Contrast Inspection and Fixes|Contrast Inspection and Fixes]]
- [[_COMMUNITY_React Extension Panel|React Extension Panel]]
- [[_COMMUNITY_Application Package Metadata|Application Package Metadata]]
- [[_COMMUNITY_Project Setup and Documentation|Project Setup and Documentation]]
- [[_COMMUNITY_Build Tool Dependencies|Build Tool Dependencies]]
- [[_COMMUNITY_Development Commands|Development Commands]]
- [[_COMMUNITY_TypeScript Compiler Configuration|TypeScript Compiler Configuration]]
- [[_COMMUNITY_Simulation Filters Placeholder|Simulation Filters Placeholder]]
- [[_COMMUNITY_Simulation Engine Placeholder|Simulation Engine Placeholder]]
- [[_COMMUNITY_simulator-prd|simulator-prd.md]]
- [[_COMMUNITY_phase0.mjs|phase0.mjs]]
- [[_COMMUNITY_7. Delivery plan|7. Delivery plan]]
- [[_COMMUNITY_types.ts|types.ts]]
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
- [[_COMMUNITY_Fixer module (implementation placeholder)|Fixer module (implementation placeholder)]]
- [[_COMMUNITY_Inspector module (implementation placeholder)|Inspector module (implementation placeholder)]]
- [[_COMMUNITY_Node.js 22 or newer|Node.js 22 or newer]]
- [[_COMMUNITY_Simulator module (implementation placeholder)|Simulator module (implementation placeholder)]]
- [[_COMMUNITY_Unit and end-to-end test directories|Unit and end-to-end test directories]]
- [[_COMMUNITY_WXT extension build|WXT extension build]]
- [[_COMMUNITY_Phase 2 — controller and Simulator UI|Phase 2 — controller and Simulator UI]]

## God Nodes (most connected - your core abstractions)
1. `scripts` - 11 edges
2. `AccessLens — Simulator Implementation Plan` - 10 edges
3. `SimulationMode` - 9 edges
4. `AccessLens — Coding Agent Instructions` - 9 edges
5. `evaluate()` - 5 edges
6. `AccessLens` - 5 edges
7. `7. Delivery plan` - 5 edges
8. `Phase 0 feasibility report` - 5 edges
9. `Phase 3 — read-only integration and QA` - 5 edges
10. `BLUR` - 4 edges

## Surprising Connections (you probably didn't know these)
- `fixture()` --calls--> `createSimulatorController()`  [INFERRED]
  tests/unit/simulator-controller.test.mjs → src/features/simulator/simulator-controller.ts
- `AccessLens popup HTML` --references--> `AccessLens`  [EXTRACTED]
  entrypoints/popup/index.html → README.md
- `createSimulatorController()` --calls--> `snapshot()`  [EXTRACTED]
  src/features/simulator/simulator-controller.ts → src/features/simulator/simulator-state.ts
- `SimulationSettings` --references--> `SimulationMode`  [EXTRACTED]
  src/features/simulator/simulator-state.ts → src/shared/types.ts
- `SimulatorModeReader` --references--> `SimulationMode`  [EXTRACTED]
  src/shared/simulator-mode-reader.ts → src/shared/types.ts

## Import Cycles
- None detected.

## Communities (46 total, 24 thin omitted)

### Community 1 - "React Extension Panel"
Cohesion: 0.16
Nodes (19): AccessLensPanel(), BLUR, normalizeBlur(), createSimulationEngine(), SimulationEngine, createSimulatorController(), SimulatorController, DEFAULT_SETTINGS (+11 more)

### Community 2 - "Application Package Metadata"
Cohesion: 0.13
Nodes (14): dependencies, react, react-dom, description, devDependencies, @types/react, @types/react-dom, typescript (+6 more)

### Community 3 - "Project Setup and Documentation"
Cohesion: 0.11
Nodes (15): Known limitations and Phase 1 implications, Manual-demo regression, Phase 0 feasibility report, Target selection and ownership, Tested layouts and evidence, Compatibility limits, Delivered scope, Phase 3 — read-only integration and QA (+7 more)

### Community 4 - "Build Tool Dependencies"
Cohesion: 0.15
Nodes (12): AccessLens — Coding Agent Instructions, Architecture and feature ownership, Coding conventions, Expected repository layout, Fixer (`src/features/fixer/`), Inspector (`src/features/inspector/`), Mission, Required Graphify workflow (+4 more)

### Community 5 - "Development Commands"
Cohesion: 0.10
Nodes (20): 1. Goal and product boundaries, 2. Architecture and execution boundaries, 3. Data model and contracts, 4. UI specification, 5. Folder changes, 6. External integration boundaries (SIM-07 only), 7. Delivery plan, 8. Testing matrix and acceptance checks (+12 more)

### Community 6 - "TypeScript Compiler Configuration"
Cohesion: 0.40
Nodes (4): compilerOptions, jsx, strict, extends

### Community 12 - "Simulation Filters Placeholder"
Cohesion: 0.14
Nodes (13): Design, Frontend Developer, Functional Requirements, Non-Functional Requirements, Overview, Problem, Requirements, UI (+5 more)

### Community 13 - "Simulation Engine Placeholder"
Cohesion: 0.14
Nodes (13): Design, Frontend Developer, Functional Requirements, Non-Functional Requirements, Overview, Problem, Requirements, Student Developer (+5 more)

### Community 16 - "simulator-prd.md"
Cohesion: 0.14
Nodes (13): Design, Frontend Developer, Functional Requirements, Non-Functional Requirements, Overview, Problem, Requirements, UI (+5 more)

### Community 17 - "phase0.mjs"
Cohesion: 0.18
Nodes (11): scripts, build, demo, dev, postinstall, test:phase0, test:phase1, test:phase2 (+3 more)

### Community 18 - "7. Delivery plan"
Cohesion: 0.27
Nodes (10): cdp(), chrome, edgeCapture(), evaluate(), profile, screenshot(), select(), server (+2 more)

### Community 45 - "Phase 2 — controller and Simulator UI"
Cohesion: 0.40
Nodes (4): Blur edge clipping, Phase 2 — controller and Simulator UI, Run the local demo, Verification

## Knowledge Gaps
- **122 isolated node(s):** `name`, `description`, `private`, `version`, `type` (+117 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **24 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `scripts` connect `phase0.mjs` to `Application Package Metadata`?**
  _High betweenness centrality (0.009) - this node is a cross-community bridge._
- **What connects `name`, `description`, `private` to the rest of the system?**
  _122 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Application Package Metadata` be split into smaller, more focused modules?**
  _Cohesion score 0.13333333333333333 - nodes in this community are weakly interconnected._
- **Should `Project Setup and Documentation` be split into smaller, more focused modules?**
  _Cohesion score 0.1111111111111111 - nodes in this community are weakly interconnected._
- **Should `Development Commands` be split into smaller, more focused modules?**
  _Cohesion score 0.09523809523809523 - nodes in this community are weakly interconnected._
- **Should `Simulation Filters Placeholder` be split into smaller, more focused modules?**
  _Cohesion score 0.14285714285714285 - nodes in this community are weakly interconnected._
- **Should `Simulation Engine Placeholder` be split into smaller, more focused modules?**
  _Cohesion score 0.14285714285714285 - nodes in this community are weakly interconnected._