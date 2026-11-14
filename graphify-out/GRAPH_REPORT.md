# Graph Report - .  (2026-11-14)

## Corpus Check
- Corpus is ~2,365 words - fits in a single context window. You may not need a graph.

## Summary
- 74 nodes · 70 edges · 16 communities
- Extraction: 94% EXTRACTED · 6% INFERRED · 0% AMBIGUOUS · INFERRED: 4 edges (avg confidence: 0.92)
- Token cost: 0 input · 0 output

## Community Hubs (Navigation)
- [[_COMMUNITY_Contrast Inspection and Fixes|Contrast Inspection and Fixes]]
- [[_COMMUNITY_React Extension Panel|React Extension Panel]]
- [[_COMMUNITY_Application Package Metadata|Application Package Metadata]]
- [[_COMMUNITY_Project Setup and Documentation|Project Setup and Documentation]]
- [[_COMMUNITY_Build Tool Dependencies|Build Tool Dependencies]]
- [[_COMMUNITY_Development Commands|Development Commands]]
- [[_COMMUNITY_TypeScript Compiler Configuration|TypeScript Compiler Configuration]]

## God Nodes (most connected - your core abstractions)
1. `Inspector text-contrast requirements` - 9 edges
2. `Fixer reversible contrast-preview requirements` - 8 edges
3. `AccessLens accessibility simulator` - 7 edges
4. `scripts` - 6 edges
5. `AccessLensPanel()` - 3 edges
6. `compilerOptions` - 3 edges
7. `FixerTab()` - 2 edges
8. `InspectorTab()` - 2 edges
9. `SimulatorTab()` - 2 edges
10. `FeatureId` - 2 edges

## Surprising Connections (you probably didn't know these)
- `Inspector module (implementation placeholder)` --conceptually_related_to--> `Inspector text-contrast requirements`  [INFERRED]
  README.md → docs/inspector-prd.md
- `Fixer module (implementation placeholder)` --conceptually_related_to--> `Fixer reversible contrast-preview requirements`  [INFERRED]
  README.md → docs/fixer-prd.md
- `AccessLens popup HTML` --references--> `AccessLens accessibility simulator`  [EXTRACTED]
  entrypoints/popup/index.html → README.md
- `Inspector requirements in simulator-prd.md` --semantically_similar_to--> `Inspector text-contrast requirements`  [INFERRED] [semantically similar]
  docs/simulator-prd.md → docs/inspector-prd.md
- `Controlled demo on-demand scan` --conceptually_related_to--> `AccessLens demo page`  [INFERRED]
  docs/inspector-prd.md → demo-site/index.html

## Import Cycles
- None detected.

## Communities (16 total, 0 thin omitted)

### Community 0 - "Contrast Inspection and Fixes"
Cohesion: 0.12
Nodes (18): AccessLens demo page, Replacement foreground or solid background color, Original/fixed comparison preserving Simulator mode, Copyable CSS declaration, Exact prior inline-style restoration, Fixer reversible contrast-preview requirements, Selected-element temporary style override, Unsupported fix state (+10 more)

### Community 1 - "React Extension Panel"
Cohesion: 0.21
Nodes (5): AccessLensPanel(), FixerTab(), InspectorTab(), SimulatorTab(), FeatureId

### Community 2 - "Application Package Metadata"
Cohesion: 0.22
Nodes (8): dependencies, react, react-dom, description, name, private, type, version

### Community 3 - "Project Setup and Documentation"
Cohesion: 0.29
Nodes (7): AccessLens popup HTML, AccessLens accessibility simulator, Inspector module (implementation placeholder), Node.js 22 or newer, Simulator module (implementation placeholder), Unit and end-to-end test directories, WXT extension build

### Community 4 - "Build Tool Dependencies"
Cohesion: 0.33
Nodes (6): devDependencies, @types/react, @types/react-dom, typescript, wxt, @wxt-dev/module-react

### Community 5 - "Development Commands"
Cohesion: 0.33
Nodes (6): scripts, build, dev, postinstall, typecheck, zip

### Community 6 - "TypeScript Compiler Configuration"
Cohesion: 0.40
Nodes (4): compilerOptions, jsx, strict, extends

## Knowledge Gaps
- **34 isolated node(s):** `name`, `description`, `private`, `version`, `type` (+29 more)
  These have ≤1 connection - possible missing edges or undocumented components.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `Inspector text-contrast requirements` connect `Contrast Inspection and Fixes` to `Project Setup and Documentation`?**
  _High betweenness centrality (0.057) - this node is a cross-community bridge._
- **Why does `AccessLens accessibility simulator` connect `Project Setup and Documentation` to `Contrast Inspection and Fixes`?**
  _High betweenness centrality (0.043) - this node is a cross-community bridge._
- **Are the 2 inferred relationships involving `Inspector text-contrast requirements` (e.g. with `Inspector requirements in simulator-prd.md` and `Inspector module (implementation placeholder)`) actually correct?**
  _`Inspector text-contrast requirements` has 2 INFERRED edges - model-reasoned connections that need verification._
- **What connects `name`, `description`, `private` to the rest of the system?**
  _34 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Contrast Inspection and Fixes` be split into smaller, more focused modules?**
  _Cohesion score 0.12418300653594772 - nodes in this community are weakly interconnected._
## Extraction limitations

- Semantic extraction used the host session. Token usage was unavailable; zero token counters are placeholders, not measured usage or a claim of zero cost.
- The integrity check found 16 dangling-endpoint edges, including external dependencies, CSS imports, and APP_NAME. These edges were omitted from the final graph, so it is incomplete. See `graph-health.json`.
- `docs/simulator-prd.md` currently duplicates the Inspector PRD; sources were left unchanged.
