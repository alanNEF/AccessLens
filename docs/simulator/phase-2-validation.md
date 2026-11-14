# Phase 2 — controller and Simulator UI

Phase 2 implements SIM-01/03/04/06 on the controlled demo. The simulator
controller owns one immutable snapshot of applied mode, retained blur intensity,
status, and error. React subscribes through useSyncExternalStore; it dispatches
commands and does not own simulation state or mutate the page. Only successfully
applied modes are published as active. Synchronous transitions publish final
states (idle, active, error), without an intermediate applying announcement.
Errors clear effects and publish Off; Reset clears errors and restores 2 px.
Disposal cleans the engine and subscribers. State stays transient per document.

The panel has a Simulator tab, five labeled toggle buttons with aria-pressed,
a polite active-mode announcement, conditional labeled Low Acuity slider with
pixel value and native keyboard operation, a separate Reset, an alert for
failures, and the explicit approximation/not-lived-experience disclaimer.
Existing CSS was extended; no new UI or test libraries were added. Tests use the
existing dependency-free Node/Chrome harness rather than introducing Vitest or
Playwright in this phase. No Phase 3 reader/integration, Inspector or Fixer was
implemented. The Phase 1 rendering strategy and support limitations are unchanged.

## Run the local demo

```sh
npm run build
npm run demo
```

Open chrome://extensions, enable Developer mode, and Load unpacked from
`.output/chrome-mv3`. If already installed, click Reload for AccessLens.
Open or refresh http://127.0.0.1:8081 in Chrome.

1. Start in Off with no slider. Tab to the mode buttons and activate each with
   Enter or Space. Exactly one is selected; the active label follows the effect.
2. Select Low Acuity. Tab to its slider and use arrow keys. The label, pixel
   value, and rendering update together within 0–8 px in 0.5 px steps.
3. Switch to a color mode: the slider disappears and blur is replaced. Switch
   back to Low Acuity: the prior intensity is retained.
4. Click Reset, including by keyboard: Off is selected, effects and slider are
   removed. Reopen Low Acuity: the value is 2 px. Off alone retains the setting.
5. Fill the form, scroll, switch, and reset. Input values and scroll position
   remain. Close native modal dialogs before operating the panel.
6. To test failure feedback, set `document.querySelector('main').style.filter =
   'sepia(1)'` in DevTools, then select a mode. Expect Off plus an error and no
   extension-owned effects. Reset clears the error. Remove the test style with
   `document.querySelector('main').style.removeProperty('filter')` and retry.

## Verification

`npm run typecheck`, `npm run build`, and `npm run test:phase2` pass. Four unit
tests cover immutable snapshots, single-mode transitions, retained/bounded
blur, invalid input, errors, unsubscribe, recovery, Reset, and disposal. The
Chrome suite tests tab/selection semantics, full keyboard sequence through
modes/slider/Reset, slider keyboard changes, error/Off agreement, all presets,
forms, scrolling, node reuse, rollback, cleanup, and identical panel-heading
pixels across effects. The 480×900 screenshot was visually inspected. The
Phase 1 browser suite is reused and extended to avoid duplicating the harness.

Known limits remain controlled marked roots only, separate-root compositing,
no backdrop filtering, native-modal inertness, and unsupported base elements or
root filters. Phase 3 compatibility expansion and performance profiling remain
out of scope.
