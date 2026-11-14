# Phase 0 feasibility report

**Decision: proceed to Phase 1 for the controlled demo layout.** The rendering
strategy passes the Phase 0 exit gate in Chrome 157.0.8103.51 on macOS. This is
not evidence of universal website compatibility. Inspector, Fixer, the complete
mode selector, intensity slider, and controller/integration contracts remain
outside this delivery.

## Target selection and ownership

The WXT content script mounts the existing React panel in an isolated Shadow
Root, as a fixed-position body sibling. Shadow DOM isolates styles; sibling
targeting prevents ancestor-filter compositing from affecting the panel.

The page must opt in with `body[data-accesslens-simulator-demo="phase-0"]`.
Only direct body children bearing `data-accesslens-simulator-target` are filtered:
the demo header, main, dialog, and footer. Nothing is wrapped or reparented.
Existing filters on roots/ancestors and `<base>` are rejected with an error and Off state. Existing descendant filters remain
unchanged and compose with the root effect. Unmarked body siblings (including
third-party injected overlays) remain untouched and do not prevent simulation.
The marked roots define coverage; the spike does not claim to filter every
body child. Validation runs on selection, not
continuously; dynamically restructuring the page during simulation is unsupported.

Each active effect owns one stylesheet; color additionally owns one zero-size
SVG definition with a unique ID. Switches replace these resources. Off, Reset,
failed application, pagehide, and WXT invalidation remove them by reference.
The panel stays mounted on Off/Reset. No website attributes or inline styles
are overwritten. A one-second WXT validity tick detects extension removal
without scanning DOM; background-tab timer throttling can delay that cleanup.
BFCache return remounts the panel in Off state.

## Tested layouts and evidence

`npm run typecheck`, `npm run build`, and `npm run test:phase0` pass. The committed
smoke test loads the actual production extension in a fresh headless Chrome
profile and serves the actual demo HTML. It verifies:

- Both color and blur change rendered swatch screenshots; the panel heading's
  pixels are identical to Off. Reset restores the original swatch screenshot.
- A direct-body fixed header retains its viewport position; a sticky descendant
  retains its 78 px offset while the main root is filtered.
- Text, color-coded swatches, an image, and a descendant grayscale filter coexist.
  Form keyboard input, selection, checkbox changes, submission, modal input,
  anchor navigation, document scrolling, and nested scrolling work.
- Reset preserves input values, current scroll offsets, page-owned grayscale,
  and the identity/parents of the original body children.
- Keyboard activation, 40 mode switches, repeated requests, Off/Reset, reload,
  pagehide/pageshow lifecycle hooks, unsupported pages, and conflicting root
  filters behave correctly, with no accumulating owned styles/SVGs or panel hosts.
- Panel bounds fit 1280×900 and 480×900 viewports. The narrow blurred screenshot
  was visually inspected. Actual extension uninstall clears effects and panel.

## Known limitations and Phase 1 implications

Separate roots create independent stacking/compositing contexts. Blur edges and
cross-root overlap differ from a whole-viewport effect. Fixed descendants inside
a filtered root may acquire a different containing block; the supported fixed
header is deliberately its own body root. The page background and dialog
backdrop are not simulated. Native `showModal()` makes the panel inert along
with the rest of the document; close the modal before switching/Reset.

The single color matrix uses the [Machado et al. (2009) model coefficients](https://www.inf.ufrgs.br/~oliveira/pubs_files/CVD_Simulation/CVD_Simulation.html)
for severity-1 protanopia. This spike applies them in sRGB (alpha preserved),
whereas the published model uses linear RGB. It proves SVG rendering only;
Phase 1 must resolve color-space fidelity and validate reference swatches.
Blur is fixed at 2 px. No clinical or accessibility-compliance claims are made.

Strict CSP, cross-origin frames, arbitrary layouts, nested fixed descendants,
and browser-internal pages are not validated. `<base>` is explicitly refused.
The lifecycle event test does not constitute a real BFCache round-trip test.
No performance benchmark or general disable/re-enable compatibility claim is
made. Continue with this opt-in sibling strategy; broaden compatibility only
with additional browser evidence and explicit failure handling.

## Manual-demo regression

The original clean-profile test missed injected body siblings. A real-browser
regression now injects an unmarked fixed overlay before the interaction suite.
Previously this reproduced “Unsupported layout: unmarked body content.” The
validator now accepts unrelated siblings while retaining the demo opt-in,
root-filter checks, panel exclusion, and narrow effect selector. Both effects
and Reset are tested with that sibling present; its filter stays unchanged.
