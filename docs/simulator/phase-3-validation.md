# Phase 3 — read-only integration and QA

## Delivered scope

SIM-07: `src/shared/simulator-mode-reader.ts` defines `SimulatorModeReader`
(`getActiveMode`, `subscribeActiveMode`) and creates a frozen capability object
that exposes no controller commands or mutable state. The content-script
composition root constructs it and passes it through AccessLensPanel to the
Simulator's active label. This exercises the same dependency future Inspector
and Fixer consumers can receive, without implementing those features.

Subscriptions emit mode changes only, not the initial mode (call the getter).
They reflect successful engine application, Off on failed transitions/reset or
disposal, and support unsubscribe. Repeating a mode or changing only intensity
does not emit a different mode. Consumers import the shared contract; no
Inspector/Fixer imports, audit calls, contrast calculations, detected-issue
payloads, or new messaging channel are introduced by the Simulator.

SIM-05: the WXT Shadow Root stays outside the marked sibling roots. Chrome
checks confirm identical panel-heading pixels across simulations, keyboard
operation through all controls, form typing/submission, modal typing, links,
real wheel scrolling, fixed/sticky positioning, nested scrolling, and preserved
input/scroll/DOM identity on Reset. Blur clipping remains enabled.

## Verification and performance

`npm run typecheck`, `npm run build`, and `npm run test:phase3` pass. The existing
Node unit and real-Chrome CDP harness were extended rather than adding test
libraries. Five unit tests cover controller/state behavior and the frozen mode
reader. No lint script is configured. Chrome 157.0.8103.51, macOS, headless,
1280×900, controlled demo, 2026-11-14:

| Mode | Real-click samples | Mean ms | Maximum ms |
|---|---:|---:|---:|
| Protanopia | 4 | 30.3 | 31.2 |
| Deuteranopia | 4 | 31.3 | 32.7 |
| Tritanopia | 4 | 30.9 | 31.2 |
| Low Acuity (2 px) | 4 | 30.9 | 31.8 |
| Off | 4 | 31.2 | 32.2 |

Timing begins in the actual button click event and ends after two animation
frames, with the selected button and computed filter checked. This includes an
intervening paint opportunity; it is a proxy for visible update latency, not a
GPU presentation measurement. All samples meet the <300 ms demo target. The
runner saves `performance.json` and screenshots in its printed temporary output
directory. Max-blur clipping is separately pixel-tested; no claim is made that
all hardware/layouts/intensities have been profiled.

Chrome QA also covers reference swatches, repeated switches, node reuse, partial
failure rollback, existing filters/clip paths, unmarked injected siblings,
unsupported pages and `<base>`, reload to Off, and lifecycle hooks. Actual
disable/re-enable/removal is tested in a fresh temporary Chrome profile via a
separate management helper extension. Only the helper has management permission;
AccessLens gains no permission. Disabling with blur active removes the panel,
styles, SVG and clipping; re-enable plus reload starts in Off; uninstall also
cleans active effects. The 480×900 panel bounds and screenshot are checked.

No continuous DOM scan or persistence was added. Presets remain data-driven.
The one-second WXT liveness check triggers teardown when the extension becomes
invalid; background-tab timer throttling may delay it. Website nodes, inline
styles, and source files are not modified by simulation.

## Run and validate locally

```sh
npm run build
npm run demo
```

1. Open `chrome://extensions`, enable Developer mode and Load unpacked from
   `.output/chrome-mv3`. For an existing install, click Reload.
2. Open or refresh http://127.0.0.1:8081 in Chrome. The page includes a Phase 3
   checklist. Try every mode and the blur slider, using keyboard and mouse.
3. Type in the form, follow links, scroll, and Reset. Compare with Off: input and
   scroll should remain and the panel should stay crisp. Close the native modal
   before operating the panel again.
4. With Low Acuity active, disable AccessLens in Chrome's extensions page. Return
   to the demo and allow the liveness check to run. Effects/panel should clear.
5. Re-enable the extension and refresh the demo: Off should be selected.
6. Run `npm run test:phase3` after building to reproduce automated QA and timing.
   `CHROME_PATH` overrides the default macOS executable path.

The active-mode label is now a read-only-reader consumer. It describes applied
rendering context only; no result should be interpreted as evidence of an
accessibility issue.

## Compatibility limits

Support remains the explicitly marked controlled top-level HTML layout; ordinary
unmarked pages show a clear unsupported message instead of silently simulating
part of a page. No second public website was claimed as supported or tested.
Restricted pages, cross-origin iframe contents, arbitrary layouts, strict CSP
compatibility and real BFCache round trips are not validated. The test exercises
pagehide/pageshow hooks, reload, and navigation. Separate-root compositing,
nested fixed descendants, background/backdrop coverage and native-modal
inertness remain the limitations established in Phase 0. Blur clipping cuts off
overflow/shadows/focus rings beyond root bounds; existing root clip-paths are
refused rather than overwritten. These limits prevent a universal-webpage
compatibility claim, not proceeding with the controlled demo.
