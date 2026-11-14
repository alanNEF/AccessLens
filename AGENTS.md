# AccessLens — Coding Agent Instructions

## Mission

AccessLens is a developer-facing Chrome extension that helps developers **Simulate → Inspect → Fix → Compare → Restore** accessibility barriers on existing websites. It is a 36-hour HackUMass MVP for 2–3 developers. Prioritize a reliable end-to-end demo over feature breadth. Simulations are educational approximations, not replicas of disability experiences; automated checks cannot certify accessibility.

## Sources of truth

Read the relevant requirements first: `docs/simulator-prd.md`, `docs/inspector-prd.md`, `docs/fixer-prd.md` (locate equivalent filenames if paths differ). Treat PRDs and existing code as authoritative; ask or flag contradictions instead of inventing scope. Avoid unrelated refactoring.

## Stack

- **Language:** Strict TypeScript
- **Extension:** WXT, Chrome Manifest V3
- **Interface:** React + Tailwind CSS, isolated from the host page; lucide-react icons
- **Simulator:** Native CSS and SVG filters
- **Inspector:** axe-core
- **Fixer:** Culori for color conversions and contrast calculations
- **Tests:** Vitest and Playwright
- **Infrastructure:** No backend, database, AI models, or accounts for MVP; local ephemeral state

Don't add Next.js, FastAPI, Express, Supabase, Firebase, a new state manager, or additional libraries without clear need and approval.

## Expected repository layout

```text
entrypoints/
  background.ts
  popup/
  accesslens.content/
src/
  components/
    AccessLensPanel.tsx
    shared/
  features/
    simulator/
    inspector/
    fixer/
  shared/
    types.ts
    messages.ts
    constants.ts
  styles/
tests/
  unit/
  e2e/
demo-site/
docs/
  simulator-prd.md
  inspector-prd.md
  fixer-prd.md
wxt.config.ts
```

Follow the actual repository if it differs. Feature logic belongs in its own `features/` directory; reusable contracts belong in `shared/`. Avoid circular feature dependencies.

## Required Graphify workflow

**The team uses Graphify for codebase discovery, dependency tracing, and change impact assessment.**

1. Before cross-file changes, check whether this repository has a usable Graphify graph via connected MCP or local CLI. Do not assume indexing is configured.
2. Prefer **targeted graph queries** to broad source searching for architecture, ownership, callers, callees and cross-feature interactions.
   - **MCP (if connected):** use available tools such as `query_graph`, `graphify_node`, `graphify_callers`, `graphify_callees`, `graphify_impact`, and `graphify_rank_files`.
   - **Local CLI (if installed):** use `graphify query "where is the page controller?"`, `graphify explain "SymbolName"`, or `graphify path "Source" "Target"`.
3. Before changing `src/shared/`, a central page controller, or a feature API, inspect the likely impacted dependencies and tests. Summarize expected cross-feature effects.
4. **Always inspect actual source before editing.** Graphify may be stale, incomplete, or infer relationships; a missing edge does not prove no dependency.
5. After structural changes, update the local graph if configured (e.g. `graphify update .`) or follow the hosted indexing workflow. Never claim indexing succeeded without checking.
6. If Graphify is unavailable, use ordinary code search and inspection, mention that graph-based analysis was unavailable, and continue. Do not block work on setup.
7. Never commit secrets or Graphify-generated outputs by default; follow `.gitignore` policy. Do not let Graphify setup overwrite this `AGENTS.md`.

Hosted Graphify MCP (`https://api.graphify.com/mcp`) and local Graphify CLI are **alternative integration paths**, not interchangeable commands. Use the one actually connected in the coding environment.

## Architecture and feature ownership

- **Entry points:** WXT initializes the extension; background service worker handles activation/messaging, not DOM references.
- **Page controller:** A single content-script controller coordinates simulation effects, audit runs, selection/highlighting, and style previews. Do not build multiple modules that independently mutate the same host DOM.
- **UI:** Mount the React floating panel in isolated Shadow DOM (or equivalent). The panel must remain unaffected by simulations and excluded from audits.
- **Selected elements:** Use a runtime map from generated IDs to DOM elements. CSS selectors are for explanation/debugging, not sole persistent identity; validate element connectivity before operations.
- **Shared contracts:** Define simulation state, issue status, selected element IDs, and fix suggestions in typed shared interfaces. Coordinate any changes to them across owners.
- **Permissions:** Prefer `activeTab` and `scripting` over broad host permissions; don't transmit page content. Restricted Chrome pages, browser stores, PDFs and cross-origin iframe contents are outside MVP scope.

### Simulator (`src/features/simulator/`)

Implement protanopia, deuteranopia and tritanopia color vision deficiency approximations using tested SVG color matrices, plus adjustable blur for low visual acuity. Support one active mode, switching and complete reset; keep normal interactions and AccessLens controls functioning. Clean up filters/listeners reliably. Filters are *not* WCAG compliance measurements.

### Inspector (`src/features/inspector/`)

Start with axe-core's `color-contrast` rule. Highlight and inspect DOM targets, report verified ratios and applicable guidance, and distinguish `failed` from `needs-review`. Run against **original author styles**, not simulated rendering or temporary Fixer changes. Avoid claims of comprehensive WCAG coverage; skip uncertain contrast cases rather than presenting them as confirmed failures.

### Fixer (`src/features/fixer/`)

Only automatically suggest supported text-contrast fixes for verified failures. Use Culori to compute and validate replacement foreground/background colors (typically ≥4.5:1 for normal text, ≥3:1 for qualifying large text). Preview temporary style changes, compare before/after, and restore **exact** original inline property values and priorities. Never replace the entire element's `style` attribute. Gradients, background images, complex alpha composition and unsupported cases are manual review, not automatic fixes.

## Coding conventions

- Prefer small, typed, testable functions; isolate DOM mutations and color calculations from React presentation components.
- Avoid `any`, unvalidated messages, arbitrary source rewrites and unnecessary abstractions.
- Clean up injected DOM, event listeners, observers, filters and previews on disable/unmount/navigation where feasible.
- Preserve the original host page's behavior; account for scrolling, fixed elements, dynamic DOM updates and stale selections.
- Keep AccessLens itself keyboard accessible with visible focus, accessible names, readable contrast and status announcements.
- Never claim the extension permanently fixes the website or makes it universally accessible.

## Testing and delivery

1. Write Vitest tests for pure color/contrast logic, state changes and precise style restoration.
2. Keep a controlled intentionally inaccessible `demo-site/` for reliable presentation and repeatable tests.
3. Test the core journey in Playwright Chromium: open panel → simulate → scan → select → preview suggested fix → validate contrast → restore.
4. Run available lint, typecheck and test scripts after changes. Report actual results and anything not run; do not fabricate passing tests.
5. Where possible, smoke-test a second real website and verify cleanup after disabling the extension.

Before implementing: read the relevant PRD, inspect the actual repo, use Graphify for impact analysis if available, and identify impacted shared contracts. After implementing: report changed files, behavior, verification, risks, and follow-ups.

**Definition of done:** The feature meets its PRD acceptance criteria, works within the shared end-to-end workflow, has reversible DOM effects, doesn't impair AccessLens UI, and has appropriate automated or reproducible manual tests.
