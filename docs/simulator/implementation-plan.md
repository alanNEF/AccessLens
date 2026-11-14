# AccessLens — Simulator Implementation Plan

**Version:** Draft v0.2  
**Scope:** Simulator only  
**Source of truth:** `simulator-prd.md` (requirements SIM-01–SIM-07)  
**Stack:** TypeScript, WXT, Chrome Manifest V3, React, Tailwind CSS, native CSS/SVG filters, lucide-react, Vitest.

## 1. Goal and product boundaries

Build an interactive, reversible **visual approximation** tool for developers on the active Chrome webpage. Supported modes: **Off, Protanopia, Deuteranopia, Tritanopia, Low Acuity**. Users can inspect and interact with the site under a single selected effect, adjust Low Acuity blur, change modes, and restore the original appearance. Simulations are educational approximations, **not an individual's lived experience**, clinical representations, WCAG audits, or evidence of a defect by themselves.

### PRD requirement traceability

| ID | Requirement | Technical acceptance condition |
|---|---|---|
| SIM-01 | Simulator tab with Off, Protanopia, Deuteranopia, Tritanopia, Low Acuity | All five visible; types map `Off → none`, `Low Acuity → blur` |
| SIM-02 | Apply effect to active supported page without reload | CSS/SVG changes visible in-page; no navigation/reload |
| SIM-03 | Low Acuity slider; one active mode | Slider only shown for `blur`; never compose two mode filters |
| SIM-04 | Immediate switch and restore | Switching replaces previous mode, Off and Reset clear all effects without residual artifacts |
| SIM-05 | Panel unaffected, normal interactions where possible | Panel remains crisp and keyboard usable; links/forms/scroll work on demo page |
| SIM-06 | Active label and explicit disclaimer | Always show active mode; show approximation-not-lived-experience wording |
| SIM-07 | Expose active mode to Inspector/Fixer, no simulated-issue claims | Read-only `getActiveMode` / `subscribe` interface; no issue detection emitted |

### Nonfunctional requirements

- **Performance:** target less than **300 ms** for mode changes on the controlled demo site, measured from user action to rendered update; avoid continuous DOM scans.
- **Extension compatibility:** controlled demo page first, then ordinary top-level Chrome HTML pages; restricted Chrome pages and cross-origin frames out of scope.
- **Reversibility:** do not persist website source changes; disabling/resetting effects or removing the extension restores the appearance. Navigation/reload clears per-document state by default.
- **Scalability:** mode definitions are data-driven presets; adding modes should not require rewriting React controls or the controller.
- **Unsupported layouts:** display clear failure/limitation rather than claiming complete simulation.

### Explicit non-goals

No axe-core audits, contrast checks, CSS fix suggestions, WCAG scores, automatic issue detection, backends, databases, AI, permanent code changes, simulating cross-origin iframe contents, or arbitrary browser-internal pages. No color-vision severity slider (the PRD only asks for Low Acuity intensity).

## 2. Architecture and execution boundaries

```text
WXT / Chrome MV3
└── entrypoints/accesslens.content/index.tsx
    ├── mount AccessLensPanel via isolated WXT Shadow Root
    └── instantiate one SimulatorController (per tab document)
        ├── SimulatorTab.tsx                 React presentation / accessible controls
        ├── simulator-controller.ts         actions, validated transitions, listeners
        ├── simulator-state.ts              types, defaults, pure invariants
        ├── simulation-engine.ts            apply/replace/remove effect transaction
        ├── filters.ts                      pure effect preset registry / SVG matrices
        └── simulator-dom.ts                owned DOM artifacts, page targeting, cleanup
                     │
                     ▼
             live webpage visual rendering

Other feature boundary: readonly mode getter/subscription; no imports from
inspector/ or fixer/ into simulator/. Background and popup not required.
```

**Ownership:** React presents and dispatches; controller is source of truth; engine is sole component allowed to mutate the page for simulations. Keep the engine React-independent, so unit tests can exercise it directly.

### Rendering approach and critical spike

A browser CSS filter transforms an element's composited contents; filtering `html` or `body` will typically also filter an extension panel inside that subtree, despite Shadow DOM style encapsulation. It can also alter containing blocks, stacking contexts, and fixed-positioned elements. Do **not** assume Shadow DOM alone isolates the visuals.

**Phase 0 spike:** On `demo-site/index.html`, mount the panel in a WXT Shadow Root, then test a **limited, extension-owned page-target strategy**: apply an extension-owned CSS rule to content-level siblings of the panel host, with SVG filter definitions for color modes and `filter: blur(Npx)` for Low Acuity. Confirm panel stays unfiltered and clickable. Test scrolling, forms, links, sticky/fixed headers, dialogs, images, existing CSS filters and reset. **This sibling-level strategy has limitations:** individual elements are composited separately, so overlapping content, blur boundaries and interactions may differ from a whole-viewport effect. Document the supported demo page structure and fail gracefully elsewhere. Do not automatically wrap/reparent arbitrary live DOM: it can disrupt page frameworks, selectors and layout.

If page-wide fidelity is not acceptable, **narrow the MVP to controlled supported page layouts** rather than silently applying misleading effects. The best architecture cannot guarantee identical behavior across all websites using CSS/SVG alone.

### Effect presets

- `none`: no injected simulation styles.
- `protanopia`, `deuteranopia`, `tritanopia`: distinct SVG `feColorMatrix` filters (one preset per mode); checked-in, documented coefficients based on a named color-vision approximation model, validated against reference swatches. Set `color-interpolation-filters="sRGB"` and retain alpha. No unspecified slider.
- `blur`: one CSS `blur(blurPx)` effect; show slider only in this mode. Proposed initial UI settings: default **2 px**, range **0–8 px**, step **0.5 px**. These numbers are engineering proposals, **not specified in the PRD**; confirm visually in demo tests.
- Use uniquely namespaced element/filter IDs and CSS markers. When feasible, preserve already-present styles; never replace host `style` attributes or source stylesheets. Test SVG URL-fragment behavior under `<base>` tags and site CSP.

### Simulation lifecycle

1. Content script initializes controller; default state is `none` + `idle`.
2. User selects mode; controller validates requested preset.
3. Engine installs required SVG definitions/stylesheet if absent and swaps **only its own** effect rule; controller publishes actual resulting state.
4. Blur slider changes update the value of a single existing rule, ideally using a CSS variable rather than rebuilding all nodes.
5. Switching modes replaces the prior effect, not stacks them.
6. `Off` or `Reset` removes the owned effect and restores the original page appearance; preserve any page-owned styles.
7. Controller `dispose()` removes listeners and all owned nodes (e.g., content script teardown). Page reload discards transient state automatically. Chrome extension removal/reload typically tears down extension-injected styles, but validate behavior, particularly for nodes injected into the page DOM.
8. On rendering failure, clear incomplete owned state, set `error`, and provide reset functionality. Report failure rather than claiming the requested mode is active.

## 3. Data model and contracts

Retain the existing shared union without breaking other modules:

```ts
// src/shared/types.ts (existing)
export type SimulationMode =
  | 'none'
  | 'protanopia'
  | 'deuteranopia'
  | 'tritanopia'
  | 'blur';
```

Add feature-owned types:

```ts
// src/features/simulator/simulator-state.ts
import type { SimulationMode } from '../../shared/types';

export type SimulationStatus = 'idle' | 'applying' | 'active' | 'error';

export interface SimulationSettings {
  mode: SimulationMode;
  blurPx: number; // retained setting even when mode !== 'blur'
}

export interface SimulatorState {
  settings: SimulationSettings;
  status: SimulationStatus;
  error?: string;
}

export const DEFAULT_SETTINGS: SimulationSettings = {
  mode: 'none',
  blurPx: 2,
};

export interface SimulatorPublicState {
  activeMode: SimulationMode; // successfully applied, not merely requested
}

export interface SimulatorController {
  getState(): Readonly<SimulatorState>;
  getActiveMode(): SimulationMode;
  subscribe(listener: (state: Readonly<SimulatorState>) => void): () => void;
  subscribeActiveMode(listener: (mode: SimulationMode) => void): () => void;
  setMode(mode: SimulationMode): void;
  setBlurPx(blurPx: number): void;
  reset(): void;
  dispose(): void;
}
```

The controller API assumes synchronous DOM mutations for the MVP. If rendering needs async initialization, return Promises and guard rapid updates with a revision counter or last-write-wins queue. A mode should become `active` **only after** the engine successfully applies it; `getActiveMode()` must reflect actual rendering state. Do not publish an unsatisfied mode request as active.

Invariants:

- Exactly one mode at a time; `none` is the off state.
- Slider value is finite and clamped to chosen bounds; nonnumeric values rejected.
- `blurPx` can be remembered within the current document when switching out of blur, but does not affect other modes.
- No storage needed for MVP. Do not persist per-site simulation state unless product requirements change.
- Public read-only subscriptions return the applied mode without leaking mutable controller state.

## 4. UI specification

`SimulatorTab.tsx` (React + Tailwind + lucide-react) contains:

1. **Mode selector:** Off, Protanopia, Deuteranopia, Tritanopia, Low Acuity (keyboard accessible; native radio group/buttons recommended).
2. **Active mode label:** always visible; reflect applied mode, including Off.
3. **Low Acuity intensity slider:** conditionally rendered only when `mode === 'blur'`; labeled control with human-readable pixel value. Maintain accessible focus and arrow-key interaction.
4. **Reset:** separate action calling `reset()`; resets to Off and restores original rendering. Can leave blur setting at default to make reset semantically complete.
5. **Disclaimer:** visible text, e.g., “These simulations are approximations of visual barriers, not anyone's lived experience. They do not determine whether a website is accessible.”
6. **Feedback:** show actionable unsupported/error state; no success claim until actual effect applied.

The entire panel, including focus indicators and tooltips, must remain unfiltered. Use an extension-owned host and WXT Shadow Root; ensure the **simulation target** excludes that host. Validate keyboard accessibility and tab order.

## 5. Folder changes

Keep the supplied structure. Add only simulator-scoped modules:

```text
entrypoints/
  accesslens.content/
    index.tsx                # initialize content UI + simulator controller
    style.css                # panel-only styles
src/
  components/
    AccessLensPanel.tsx      # mounts SimulatorTab, passes controller
  features/
    simulator/
      SimulatorTab.tsx       # existing; implement UI
      simulator-controller.ts # NEW; orchestration and active-mode publication
      simulator-state.ts     # NEW; typed state/defaults/validation
      simulation-engine.ts   # existing; implement effect lifecycle
      filters.ts             # existing; preset registry and matrices
      simulator-dom.ts       # NEW; owned CSS/SVG nodes and safe targets
  shared/
    types.ts                 # existing SimulationMode kept unchanged
    messages.ts              # no new messaging necessary for MVP
    constants.ts             # add only cross-feature values if truly shared
tests/
  unit/
    simulator-state.test.ts
    simulator-controller.test.ts
    filters.test.ts
    simulation-engine.test.ts
  e2e/
    simulator.spec.ts        # real Chrome workflow tests (runner chosen by team)
demo-site/
  index.html                # build controlled interaction + color scenarios
docs/
  simulator-prd.md          # authoritative PRD (copy correct version into repo)
  simulator-implementation-plan.md
```

## 6. External integration boundaries (SIM-07 only)

Simulator must expose *only applied mode state* to the rest of the extension. E.g., after the content-script host constructs the controller, pass `getActiveMode` and `subscribeActiveMode` as read-only dependencies from the common AccessLens composition root. This avoids tightly coupling simulator to Inspector/Fixer implementation.

```ts
export interface SimulatorModeReader {
  getActiveMode(): SimulationMode;
  subscribeActiveMode(listener: (mode: SimulationMode) => void): () => void;
}
```

- Do **not** call axe-core, compute contrast, mutate other features' data, or emit detected issues from the Simulator.
- Downstream consumers may show “Simulation active: Deuteranopia,” but must not treat the simulated appearance as automated proof of an issue.
- Simulated effects should not overwrite computed source color values or original DOM semantics.
- If different extension entrypoints need the state in the future, introduce typed messages in `src/shared/messages.ts`. No background channel needed in this MVP because the controlling UI and engine share a content script.

## 7. Delivery plan

### Phase 0 — Feasibility spike (highest risk)

- [x] Use demo page with fixed header, text, color-coded elements, image, form controls and modal.
- [x] Mount unfiltered keyboard-accessible React panel in Shadow Root.
- [x] Prototype one SVG color matrix and one blur effect without page reload.
- [x] Switch between them and Off, verify interaction and cleanup.
- [x] Document unsupported layouts and select final safe target strategy.

**Exit gate:** effect works on the controlled demo page, UI remains crisp, normal navigation/input works, reset restores original appearance. If not, resolve rendering strategy before proceeding.

### Phase 1 — Presets and engine (SIM-02, SIM-03, SIM-04)

- [ ] Implement documented preset registry for all three color-vision modes.
- [ ] Implement Low Acuity blur value and bounds.
- [ ] Implement extension-owned DOM lifecycle without host style overrides.
- [ ] Ensure replace/reset/dispose are idempotent, with no accumulating styles or SVG IDs.
- [ ] Define and test failure/rollback behavior.

### Phase 2 — Controller and UI (SIM-01, SIM-03, SIM-04, SIM-06)

- [x] Build controller with typed state and single-mode invariants.
- [x] Build accessible five-mode selector and conditional slider.
- [x] Display active-mode label, Reset, disclaimer, and errors.
- [x] Keyboard test all controls; confirm excluded panel remains visually unaffected.

### Phase 3 — Read-only integration and QA (SIM-05, SIM-07, NFRs)

- [x] Add `SimulatorModeReader` interface and wire at extension composition root.
- [x] Confirm downstream feature boundaries need no simulator internals.
- [x] Profile mode-switch latency (<300 ms target on controlled demo page).
- [x] Run Chrome end-to-end tests for interactions, scrolling, reset, tab reload, and unsupported pages.
- [x] Verify extension disable/removal doesn't leave persistent page visual changes in supported conditions.

### Phase 4 — Cross-Site Compatibility

#### Objective

Extend the Simulator beyond the controlled demo site to support ordinary external HTTP/HTTPS webpages. The existing simulation modes, state management, and React UI should remain unchanged wherever possible.

The goal is to make AccessLens site-agnostic while preserving the requirements defined in SIM-01 through SIM-07.

#### 4.1 Expand Content Script Injection

**Files:** `entrypoints/accesslens.content/index.tsx`, `wxt.config.ts`

- Update WXT content-script match patterns to support HTTP and HTTPS websites instead of only localhost.
- Continue using the existing content-script entrypoint to initialize the AccessLens panel and Simulator controller.
- Run the content script in the top-level frame only for the MVP.
- Ensure the extension initializes only once per page.
- Handle unsupported or restricted pages gracefully.

**Implementation example:**

```typescript
export default defineContentScript({
  matches: ["http://*/*", "https://*/*"],
  runAt: "document_idle",
  allFrames: false,
  cssInjectionMode: "ui",

  async main(ctx) {
    // Initialize existing AccessLens panel
    // Initialize Simulator controller
  },
});
```

**Acceptance criteria:**
- AccessLens loads on supported external websites.
- Existing demo-site functionality remains intact.
- No duplicate panels or controllers are created.

#### 4.2 Make DOM Targeting Site-Agnostic

**Files:** `src/features/simulator/simulator-dom.ts`, `simulation-engine.ts`

The current implementation must not depend on the demo site's DOM structure.

- Remove assumptions about specific containers such as `#root`, `#app`, or `main`.
- Introduce a DOM adapter responsible for identifying simulation targets on arbitrary webpages.
- Apply simulation effects through extension-owned CSS/SVG resources.
- Exclude the AccessLens panel and its host from simulation effects.
- Avoid overwriting existing inline styles or permanently modifying website elements.
- Ensure switching modes replaces the previous effect instead of stacking filters.
- Restore the original rendering when the simulation is disabled.

**Important:** Shadow DOM isolates panel styles but does not protect the panel from filters applied to ancestor elements. Validate the filtering strategy on external sites before finalizing it.

Applying filters to multiple individual elements can also produce different visual results from filtering the entire composited page. Prioritize a reliable implementation for ordinary webpages rather than attempting universal rendering support.

**Acceptance criteria:**
- Simulations work without site-specific selectors.
- The AccessLens panel remains unaffected.
- Page scrolling, links, and buttons continue working where technically possible.
- Reset removes all extension-owned effects.

#### 4.3 Support Dynamic Websites and SPA Navigation

**Files:** `entrypoints/accesslens.content/index.tsx`, `simulator-dom.ts`

Modern websites frequently update their DOM without a full page reload.

- Preserve the active simulation during ordinary client-side navigation.
- Detect when simulation targets are replaced or removed.
- Reapply effects to newly created top-level content when necessary.
- Use a narrowly scoped `MutationObserver` only if required.
- Batch or debounce DOM updates to avoid unnecessary processing.
- Prevent duplicate observers, stylesheets, and SVG filter definitions.
- Clean up listeners and observers when the content script is invalidated.

Do not continuously scan the entire DOM.

**Acceptance criteria:**
- Simulation remains active during supported SPA navigation.
- Newly rendered content receives the appropriate effect.
- Navigation does not produce duplicate filters or controllers.
- Performance remains responsive.

#### 4.4 Cross-Site Testing

**Files:** `tests/e2e/`, `demo-site/`

Validate the Simulator on websites with different rendering architectures.

| Test website | Primary test |
|---|---|
| Wikipedia | Traditional HTML, scrolling, and text-heavy layouts |
| Hacker News | Simple HTML and links |
| GitHub | Dynamic components and SPA-style navigation |
| MDN Web Docs | Documentation layouts and sticky elements |
| YouTube | Dynamic content and complex rendering |

For each supported test website, verify:

- AccessLens initializes correctly.
- Protanopia, Deuteranopia, and Tritanopia apply.
- Low Acuity blur and its intensity slider work.
- The AccessLens panel remains readable and keyboard accessible.
- Switching between modes does not stack effects.
- Off/Reset restores the original appearance.
- Ordinary webpage interactions remain functional.
- No significant console errors or resource leaks occur.

Use automated browser tests where practical and manual visual verification for rendering fidelity.

#### 4.5 Performance and Compatibility

Maintain the Simulator PRD's performance target of mode changes feeling immediate, with a target under 300 ms on the controlled demo site.

Additional requirements:

- Avoid expensive DOM traversal during mode changes.
- Reuse injected filter definitions where possible.
- Minimize layout shifts and unnecessary style recalculations.
- Keep all simulation processing client-side.
- Preserve existing TypeScript interfaces and the single-active-mode behavior.

**Explicitly out of scope:**
- Restricted Chrome pages (`chrome://`).
- Cross-origin iframe simulation.
- Guaranteed compatibility with every website.
- Perfect simulation of an individual's visual impairment.
- Permanent modifications to website source code.
- Backend services or persistent storage.

#### 4.6 Completion Criteria

Phase 4 is complete when:

1. AccessLens runs on ordinary external HTTP/HTTPS websites.
2. All five Simulator options behave according to the PRD.
3. The panel remains unaffected by simulation effects.
4. Simulations can be switched or reset without reloading.
5. Supported SPA navigation does not break active simulations.
6. At least three external websites pass the cross-site testing checklist.
7. The original demo site continues to pass all Phase 3 tests.
8. Known compatibility limitations are documented.

#### Recommended Implementation Order

| Priority | Task |
|---|---|
| P0 | Expand WXT content-script matches |
| P0 | Test existing Simulator on external websites |
| P0 | Remove demo-specific DOM assumptions |
| P0 | Ensure panel isolation and reliable reset |
| P1 | Handle dynamic DOM updates and SPA navigation |
| P1 | Add cross-site browser tests |
| P1 | Document unsupported cases and compatibility limitations |

**Engineering recommendation:** Start by changing the content-script match patterns and testing the existing implementation on Wikipedia and GitHub. Identify actual compatibility failures before modifying the simulation engine. This minimizes unnecessary changes and protects the functionality already completed in Phases 0–3.

## 8. Testing matrix and acceptance checks

| Test | Expected behavior |
|---|---|
| Open Simulator | Off selected, no effect, disclaimer and active label visible |
| Select each of three CVD modes | Correct distinct preset applied; no reload; panel crisp |
| Select Low Acuity | Blur visible; slider appears and updates blur |
| Change Low Acuity → Protanopia | Blur removed; only Protanopia applied; slider hides |
| Select Off | All owned effects removed; page appearance restored |
| Reset | Off, default blur setting, no residual CSS/SVG nodes |
| Click links, focus inputs, type, scroll | Normal interactions preserved on demo page |
| Rapid switching | Last selected mode is final applied mode, no accumulation |
| Request same mode twice | Idempotent result; no extra DOM nodes |
| Unsupported page or broken filter | Clear error; no false active status; reset available |
| Mode reader subscription | Emits actual applied mode, not a guessed accessibility issue |
| Performance on demo page | User action to visual update target <300 ms |
| Refresh page | No simulation active by default |

**Unit tests (Vitest):** mode preset mapping, blur bounds, pure state transitions, controller listeners, cleanup calls, and DOM owner lifecycle with fake document. **Browser integration/E2E:** verify visual effects and rendering, because JSDOM cannot accurately simulate CSS/SVG filter painting; screenshots or pixel sampling and user interactions require actual Chrome.

## 9. Risks and decisions to validate

1. **Panel filtering:** Shadow DOM protects CSS, not ancestor compositing. Scope effects away from panel host; validate visually.
2. **Page-wide fidelity:** sibling-level filtering can produce seams and compositing differences; MVP prioritizes supported controlled layout, not universal fidelity.
3. **Existing filters and transforms:** replacing website filters is not acceptable; test predictable additive effects and clearly limit unsupported cases.
4. **SVG URL/CSP/browser behavior:** validate actual CSS `url(#id)` filter application on Chrome, including sites with `<base>` and CSP, before assuming universal compatibility.
5. **Fixed, sticky, dialogs, overlays and cross-origin frames:** test on demo; cross-origin frames explicitly out of scope.
6. **Matrix quality:** checked-in documented approximation matrices and reference fixtures. No claims of precise individual perception.
7. **Lifecycle:** clean extension-owned nodes on Reset/Off/dispose; site code must never be permanently changed.

---

**PRD ambiguities resolved as implementation proposals, not changes to requirements:** blur range `0–8px` step `0.5px`, default `2px`; transient state per document; `none` corresponds to Off; `blur` corresponds to Low Acuity; Reset returns slider to default; read-only in-process mode integration. Confirm these if the product team later specifies otherwise.
