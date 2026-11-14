# Phase 1 — presets and engine

Implemented SIM-02/03/04 engine behavior with temporary demo controls. No
Phase 2 controller, production UI redesign, or Phase 3 mode-reader integration
is included. Inspector and Fixer remain untouched.

Run from the repository:

```sh
npm run build
npm run demo
```

In Chrome, open `chrome://extensions`, enable Developer mode and Load unpacked
from `.output/chrome-mv3`. If already loaded, click Reload. Open or refresh
http://127.0.0.1:8081. The demo retains Phase 0's explicit opt-in markers so
previously served copies remain compatible.

1. Select each color mode; compare the swatches and image. No page reload occurs.
2. Select Low Acuity and use the slider or arrow keys. Range is 0–8 px,
   step 0.5 px, default 2 px. Only one effect is ever applied.
3. Switch from blur to a color mode. Blur disappears and the slider hides.
   Switching back retains its value until Reset restores the 2 px default.
4. Enter form values, submit, scroll, and follow the anchor links. Reset/Off
   restores appearance while preserving input and scroll state.
5. Repeatedly switch and Reset. In DevTools,
   `document.querySelectorAll('[data-accesslens-simulator-owned]').length`
   should be 2 for color, 1 for blur, and 0 for Off/Reset. Panel stays crisp.
6. Open the modal, test its input, and close it before changing modes.

`npm run test:phase1` tests the actual built extension in temporary headless
Chrome. It covers all presets, independent #e00000 reference pixel fixtures
(linear RGB matrix then sRGB encoding; tolerance 3 byte values), slider keyboard
input, clamp/step validation, nonfinite rejection, stylesheet/SVG identity reuse,
partial DOM-failure rollback, repeated Reset/dispose, forms, scrolling, external
injected siblings, unsupported layouts, and uninstall cleanup.

The engine replaces its own single rule and matrix, reusing nodes during active
updates; it never edits website styles or reparents nodes. Exceptions clear
owned effects and propagate to the demo, which displays Off and an error.
Disposed engines cannot apply effects again. A new mount creates a fresh engine.

Machado et al. (2009) severity-1 matrices now run in linear RGB, correcting the
Phase 0 sRGB-only rendering spike. These remain educational approximations.
The controlled sibling-root support boundary remains: independent compositing,
blur edges, native-modal inertness/backdrop, nested fixed-position descendants,
CSP and base-element limitations described in the Phase 0 report still apply.
The old report's fixed-blur and single-preset descriptions are historical.
