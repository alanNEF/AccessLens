# Visionless Lite

Visionless is a sixth, mutually exclusive Simulator mode. It is a simplified
educational approximation, not an experience of blindness or a replacement for
NVDA, VoiceOver, ChromeVox, or real screen-reader testing. No auditing behavior
was added.

## Use the demo

Build with `npm run build`, reload AccessLens in chrome://extensions to pick up
the new `tts` permission, and open http://127.0.0.1:8081/visionless.html. Start
`npm run demo` if the local server is not running. Click the pinned toolbar icon,
select Visionless, and use native Tab/Shift+Tab to navigate. Enter and Space
retain native activation; Escape stops narration. The panel is excluded from
page announcements. Stop Speech interrupts the utterance; Exit Visionless or
Reset removes the blackout and ends the speech session. Other modes also end it.

The demo includes labeled inputs, a password, checkbox/radios/select, an icon
with a name, an unnamed icon, an unnamed input, disabled controls, an expandable
button, and a native activation counter. Input values are never narrated.

For audible validation, use regular Chrome with a local OS voice installed.
Verify labels, interrupted announcements during rapid focus movement, and silence
after Escape, Stop Speech, mode switches, Reset, toolbar close, and navigation.
Headless checks cannot certify what a human hears. A direct API probe found 19
remote voices and zero local voices in this test profile, so it intentionally
does not speak webpage content through those remote engines. If speech is unavailable,
the panel reports it while preserving native keyboard navigation.

## Implementation and privacy

The existing controller remains the state owner and the existing engine selects
Visionless before using the color/blur DOM adapter. A single owned, fixed black
overlay lives inside the WXT host's Shadow Root, below the panel UI, with
pointer-events:none. Website elements, styles, visibility, and ARIA properties
are not changed. Disable removes the overlay, focus/keyboard/visibility listeners,
and speech session. Repeated enable does not duplicate resources.

A capturing focusin listener derives approximate names from visible
aria-labelledby references, aria-label, native labels, suitable native text,
and applicable alt/title. It describes roles and required/disabled/checked/
expanded states. Missing names are announced as unlabeled. It skips hidden
text, input values, placeholders, textarea values and select contents. It is
intentionally not the full accessible-name computation algorithm.

Typed, validated extension messages carry bounded descriptions to the existing
background worker. Chrome TTS uses rate 1 and enqueue:false. Only explicitly
local voices are selected; no external speech API or backend is
used. Markup characters are removed before speech to avoid page-provided SSML.
No narration history or page content is stored persistently.

The broker validates sender/frame, tab/session identity and increasing sequence
numbers. Async active-tab checks revalidate the session before speaking. Stop/end
can stop only the owning tab's speech; tab changes, loading and close release
speech. The client cancels delayed startup/focus requests after disable, collapses
pending focus requests to the newest one, and reopens an expired MV3 session only
for a current live request. Background listeners are registered once at startup.
UI feedback says “Announcement requested”, rather than falsely claiming audible
playback completed.

## Files

Created:

- `src/features/simulator/visionless/accessible-label.ts`
- `src/features/simulator/visionless/focus-announcer.ts`
- `src/features/simulator/visionless/speech-client.ts`
- `src/features/simulator/visionless/speech-broker.ts`
- `src/features/simulator/visionless/visionless-engine.ts`
- `tests/unit/visionless.test.ts`, `visionless-broker.test.ts`, `visionless-client.test.ts`
- `vitest.config.ts`, `demo-site/visionless.html`, this report

Updated:

- Shared `SimulationMode` and typed messages; simulator presets, engine,
  controller and shadcn SimulatorTab
- Background TTS adapter and WXT manifest (`tts` added)
- `FixerTab.tsx`: only the exhaustive mode-label map gains “Visionless” so the
  shared union still compiles; no Inspector/Fixer behavior was implemented
- Existing browser harness/cross-site checks, demo index, README, package manifest
  and lockfile; local source graph refreshed

New development dependencies: Vitest and jsdom. The dependency install audit
reported 10 findings (1 low, 2 moderate, 4 high, 3 critical); dependency security
remediation was not performed as part of this feature. Runtime UI dependencies are
reused. Existing activeTab, scripting and storage permissions remain unchanged.

## Verification

- `npm run test:visionless`: 14 Vitest tests pass (labels/privacy, lifecycle,
  interruption, session ownership, stale requests, failures and MV3 reconnect).
- `npm run test:unit`: all 34 existing Node unit tests pass.
- `npm run typecheck` and `npm run build`: pass.
- `npm run test:phase3`: Chrome integration passes existing modes, UI themes,
  toolbar/tab recovery, forms, scrolling, cleanup and Visionless blackout pixels,
  native Tab/Shift+Tab, Enter/Space activation, Escape and Exit.
- External check: `ACCESSLENS_CROSS_SITE=1 ACCESSLENS_SITE_URL=https://en.wikipedia.org/wiki/Accessibility node tests/e2e/phase1.mjs` passed. Visionless
  was enabled/exited and its screenshot visually inspected, alongside existing
  external-mode checks. The external heading comparison now compares decoded
  pixels with a small raster tolerance instead of byte-identical PNG encoding.
- Speech API feedback was exercised in Chrome; some headless runs reported
  unavailability. Actual audible playback/voice quality is a remaining human
  listening check, not claimed as verified by screenshots or mocks.

## Limits and next steps

Native top-layer dialogs/popovers, fullscreen content and unusual ancestor
stacking/transforms can escape the blackout or obscure/inert the panel. The UI
warns about these cases; no destructive DOM workaround is attempted. Exit the
mode if blackout is incomplete, or close a native modal first. Cross-origin
frames and browser chrome are outside this tool's control.

Names are approximate, languages use an available English local voice where
possible, and custom widgets or closed shadow roots may be incompletely
announced. No heading/landmark navigation, accessibility-tree reconstruction,
value echo, rate slider or repeat/history functionality is included.

Future work should prioritize real screen-reader comparison, listening tests
across operating systems and local voices, and richer semantic fixtures before
adding navigation shortcuts. Chrome's TTS contract is documented at
https://developer.chrome.com/docs/extensions/reference/api/tts.

## Navigation and collapsed-panel fixes

Visionless now continues across full HTTP/HTTPS document navigation within the
same tab. The background worker keeps only a tab-local boolean in ephemeral
Chrome session storage; no URL, label, narration or page content is saved.
The next supported document automatically mounts the panel and re-enables
Visionless after content-script initialization. Old-document overlay/listeners
and speech are still disposed; the new document starts a new speech session.
There can be a brief uncovered interval while the next document initializes;
this is not a browser-level blackout or a screen-reader replacement.

Exit, Reset, switching to another mode, or closing the panel clears continuation.
Other tabs do not inherit it; closing the tab removes the flag. Other simulation
modes retain their original per-document reset behavior. Background get/set
operations are serialized so new-document reads do not overtake mode updates.
Cleanup tolerates invalidated extension contexts.

The collapsed Expand AccessLens button now has its own stacking level above the
blackout, matching the expanded panel's isolation. Chrome regressions reproduce
both original failures, verify the expand icon's rendered pixel, click it to
reopen, follow a link with native Enter across origins, check automatic restoration
without a toolbar click, and verify Exit clears continuation on reload.
