# Perspective

An all inclusive accessibility simulator for developers.

## Development

Requires Node.js 22 or newer and npm.

```sh
npm install
npm run dev
```

```sh
npm run typecheck
npm run build
```

WXT builds the browser extension into `.output/`. The Simulator has a Phase 4 cross-site support. The Inspector scans text
contrast with axe-core (see below). The Fixer suggests and temporarily previews a passing text color for verified Inspector failures. See [the feasibility report](docs/simulator/phase-0-feasibility.md).

## Project layout

- `entrypoints/`: WXT background, popup, and content script entrypoints.
- `src/components/`: Extension panel and shared UI components.
- `src/features/`: Simulator, inspector, and fixer modules.
- `src/shared/`: Shared types, messages, and constants.
- `src/styles/`: Shared styles.
- `tests/unit/` and `tests/e2e/`: Controller and real Chrome regression tests.
- `demo-site/`: Local accessibility demo page.
- `docs/`: Feature PRD placeholders.

## Phase 4 demo

Run `npm run build`, load `.output/chrome-mv3` as an unpacked extension in
Chrome, then serve the demo with `npm run demo`.
Pin Perspective in Chrome’s Extensions menu, then click its toolbar icon in the
active tab to show or hide the panel. Closing clears the simulation; reopening
starts in Off. Already-open tabs initialize on the first icon click without a refresh.

Open `http://127.0.0.1:8081` and click the icon; the in-page panel offers Off, three color-vision presets, adjustable
Low Acuity (0–8 px in 0.5 px steps), and Reset. Ordinary HTTP/HTTPS pages are supported through direct-body content targeting;
unsafe layouts show a limitation message.

Run `npm run test:phase4` after building for the real Chrome smoke test. It uses
a temporary profile and local server, installs/removes only its own test
extension, and prints the location of screenshots. Requires a Chrome version
supporting the CDP `Extensions` domain and `--enable-unsafe-extension-debugging`.
On other systems set `CHROME_PATH` to the Chrome executable.

See [Phase 4 compatibility results and validation](docs/simulator/phase-4-validation.md).
The [unmarked SPA playground](http://127.0.0.1:8081/compatibility.html) exercises
root replacement and new content without demo-specific markers.

## Panel appearance

Drag the panel by its header (or the collapsed launcher) to move it anywhere on the page. Keyboard users can
focus the grip button and use the arrow keys (Shift for bigger steps, Home to reset); double-clicking the
header also resets it. The position is kept on screen when the window resizes and is remembered in
`browser.storage.local` as `accesslens.position`.

Use the minus button in the panel header to collapse Perspective to a small
bottom-right launcher. Select the launcher to expand it again. Collapsing keeps
the active simulation, selected tab and settings; the toolbar icon still closes
the extension and clears simulation effects.

The in-page panel uses shadcn/ui with light, dark and system themes. Toggle the
sun/moon switch to choose light or dark; select the monitor button to follow your
system. The preference survives panel closure and page reloads. All styles and
tooltip overlays stay within the extension's Shadow DOM.

See [UI implementation and validation](docs/ui-redesign.md) for changed files,
dependencies, accessibility details and browser checks.

## For coding agents

`agent/` builds an MCP server and Claude Code plugin (`agent-plugin/`) that runs the same checks headlessly and
returns compact JSON with CSS fixes, so agents can test accessibility without screenshots. See
[agent/README.md](agent/README.md). Install in Claude Code (2.1.275+) with:

```
/plugin install accesslens --marketplace alanNEF/accesslens
```

## From simulation to fix

| Simulation | Inspector check | Fixer |
|---|---|---|
| Low Contrast, Cataracts | Enhanced contrast, WCAG 1.4.6 (AAA): 7:1, or 4.5:1 for large text. Auto-selected for these modes; switchable any time. | Text color reaching 7:1, or the background color when no text color can |
| Achromatopsia (and other color modes) | Links that rely on color alone, WCAG 1.4.1 (axe `link-in-text-block`). Checked in every scan. | `text-decoration-line: underline` |
| All | Text contrast, WCAG 1.4.3 (AA) | Text color reaching 4.5:1 / 3:1 |

Not every simulated barrier is automatically detectable: for example, status badges whose words differ
pass WCAG even if their colors look alike. Those remain review points rather than automated failures.

## Simulator modes

Protanopia, Deuteranopia and Tritanopia use the Machado et al. (2009) matrices. Achromatopsia maps every
color to its luminance (grayscale) in linear RGB. Cataracts (hazy, faded, yellowed) and Low Contrast
(washed-out light and dark) are illustrative CSS filter approximations, not calibrated clinical models.
Low Acuity is an adjustable blur; Visionless blacks out the page and narrates keyboard focus.

## Inspector

Open the Inspector tab and click **Scan text contrast**, or **Pick element** and click any text.
Failures (measured below WCAG AA 4.5:1, or 3:1 for large text) and cases that need manual review
(gradients, background images, overlaps) are outlined on the page and listed with colors, ratio,
threshold and an explanation. **Preview fix** hands a verified failure to Fixer through
`src/shared/issue-handoff.ts`. Outlines are drawn inside the Perspective shadow root, so page styles are
never changed. `demo-site/market.html` lists the expected result for each test case; `npm run test:unit`
runs the contrast-mapping and simulator unit tests.

## Bulk Fixer previews

Use **Scan page** in Inspector, open Fixer and choose **Run All Corrections**.
Supported text-contrast suggestions are validated and enabled immediately. Toggle individual
checkboxes, **Select All**, **Deselect All**, or **Restore Original** to compare temporary changes.
Unsupported results and failed corrections are reported separately. Existing single-issue previews
remain available; the latest action owns a given element/property.

Try `demo-site/bulk-corrections.html`. Run `npm run test:bulk` for DOM/state tests and
`npm run test:bulk:e2e` for the production extension in an isolated Chrome profile.
See [implementation, changed files and validation](docs/fixer/bulk-corrections.md).

## User Mode

Open the panel, choose **User**, and turn on **Enable Accessibility Improvements**.
AccessLens runs the existing Inspector and bulk Fixer automatically, shows the number of
verified text improvements, and watches for new content without Inspector highlights or a checklist.
Turn the switch off or choose **Restore Original Page** to undo the changes.

Mode changes restore the departing workflow's corrections and stop simulation/picking.
Returning to Developer keeps its tabs and controls available. Improvements require activation
for the current page; closing the panel, changing SPA routes, or navigating restores and disables them.
Nothing is activated automatically on other websites.

Try `demo-site/user-mode.html`. Run `npm run test:user`, `npm run test:user:e2e`, and
`npm run test:bulk:e2e`. Browser tests use the repository's isolated real-Chrome/CDP harness.
See [ownership, dynamic behavior, changed files, verification, and limitations](docs/user-mode.md).

## Visionless Lite

Reload the built extension for its new `tts` permission, then try
[the Visionless playground](http://127.0.0.1:8081/visionless.html).
Select Visionless from Simulator, use Tab/Shift+Tab and native Enter/Space,
and press Escape to stop speech. Stop Speech and Exit Visionless remain in
an unobscured panel. Local OS voices are required for narration.

Run `npm run test:visionless` for Vitest coverage. See
[implementation, files, validation and limitations](docs/simulator/visionless-lite.md).
