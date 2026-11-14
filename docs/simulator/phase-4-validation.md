# Phase 4 — cross-site compatibility

## Implementation

The full Phase 4 plan was reviewed. Baseline Chrome runs on Wikipedia and GitHub
confirmed that injection already worked and the engine's demo-only guard was
the blocker. Injection now explicitly uses HTTP/HTTPS, document_idle, and the
top frame only. WXT invalidation and a host guard prevent duplicate mounts.
No new permissions, dependencies, server processing or persistence were added.

`simulator-dom.ts` identifies direct body content roots without requiring demo
markers or named app containers. The panel, owned resources, and non-content
tags are excluded. Each target receives a uniquely namespaced temporary marker;
owned CSS rules use it to append the simulation to any existing author filter.
Website inline styles are never replaced, and website nodes are not wrapped or
reparented. Reset removes rules, definitions, markers, queued frames and observers,
including markers on detached former roots. Existing author clip paths remain;
blur adds inset clipping only where no author clip exists.

The adapter observes body/head child lists, html/body attributes, and direct-root
style/class/hidden attributes, with no subtree scans. Mutations are batched into
one animation-frame refresh. It handles new/replaced/removed roots, author root
style changes, removed owned styles/SVG definitions, and body replacement. Only
the extension's own panel host may be reattached. URL commits refresh absolute
SVG references, including route-only pushState navigation. A URL comparison in
the existing one-second validity tick provides a fallback; it does not scan DOM.
Navigation API currententrychange is used when available because the pre-commit
navigate event can still expose the old URL. Document navigation starts Off;
supported same-document navigation retains mode/intensity.

Dynamic reapplication failures clear effects and publish Off/error through the
existing controller and read-only mode reader. UI modes, settings, disclaimer,
and feature boundaries remain intact. Inspector and Fixer were not implemented.

## Cross-site results

Chrome 157.0.8103.51 on macOS, temporary signed-out headless profile, 1280×900,
2026-11-14. Actual public pages, not saved copies:

| Site / tested entry page | Modes, keyboard slider, panel isolation and Reset | Interactions |
|---|---|---|
| Wikipedia — `/wiki/Accessibility` | Pass | Search input, document scroll, informational link |
| Hacker News — home | Pass | Text input, document scroll, informational link |
| MDN — `/en-US/docs/Web/Accessibility` | Pass | Nested-region scroll, informational link; no visible text field |
| GitHub — `microsoft/TypeScript` repository | Pass | Text input, document scroll, informational link |
| YouTube — signed-out home | Pass | Search input, document scroll, informational link |

For each page the browser test applies all color modes and Low Acuity, verifies
one owned effect, compares page-region screenshots outside the panel, confirms
identical panel-heading pixels, keyboard-adjusts blur to 8 px, tests a safe link,
and verifies Reset restores computed source filter/clip-path and inline style.
It checks for duplicate hosts, marker cleanup and extension-origin runtime or
console errors. No form is submitted. Screenshots of all five sites were
visually inspected across representative modes. This is a bounded page-level
smoke test, not a guarantee for every route or interaction on those services.
YouTube video playback and signed-in flows were not tested. External SPA behavior
is supplemented by deterministic local SPA tests, not inferred from branding.

## Automated/local verification

```sh
npm run typecheck
npm run build
npm run test:phase3   # local regression + dynamic fixtures, no public-site dependency
npm run test:phase4   # same suite plus the five external sites
```

The existing Node/Chrome CDP harness is reused. Six controller unit tests include
dynamic-failure publication, refresh and subscription teardown. Browser fixtures
cover unmarked pages, actual SPA demo buttons, route-only pushState, root and
body replacement, resource repair, async failure feedback, existing author
filters/clip paths, bare-body-text refusal, base tags, Off/Reset, reload,
keyboard use, forms, document/nested scrolling, clipping pixels, duplicate
requests, and actual extension disable/re-enable/uninstall cleanup. Original demo
journeys remain tested; former demo-only rejection expectations were updated
because unmarked content and author root filters are now supported.

The demo mode-switch benchmark remains below the 300 ms target (20 real-click
samples; approximately 32 ms worst-case in verification). It measures through
two animation frames and checks applied rendering, a paint-opportunity proxy,
not GPU presentation timing. The runner prints a temporary artifact directory
with `performance.json`, `cross-site-results.json` and screenshots. No lint
script is configured. Source graph indexing is refreshed after structural changes.

## Manual validation

Run `npm run build`, reload AccessLens in `chrome://extensions` (Load unpacked
from `.output/chrome-mv3` for a first install), then refresh an open webpage.
Pin AccessLens in Chrome’s Extensions menu and click its toolbar icon. The
panel starts hidden on each document; the icon opens/closes it. Closing resets
effects and reopening starts in Off. No demo opt-in markers are needed.

Run `npm run demo` and open http://127.0.0.1:8081/compatibility.html for the new
unmarked playground. Select a mode, use “Replace page content / SPA route” and
“Add a top-level overlay”, then change intensity and Reset. Replaced/new content
should receive the active effect, the panel should remain crisp, and the
overlay's author contrast filter should survive Reset. Its route changes stay
on the same HTML file, so refresh works with the simple Python demo server.
The original fixture remains at http://127.0.0.1:8081/.

## Known limits

- Independent sibling compositing differs from a viewport-wide effect. Filtering
  app roots creates stacking/containing blocks and can move nested fixed elements.
  Body/html backgrounds and native dialog backdrops are not simulated. Native
  modal dialogs make the panel inert until closed. Blur clipping can cut off
  overflowing descendants, shadows or focus indicators.
- Pages with an html/body filter or bare non-whitespace body text are refused
  with an actionable error rather than moving site nodes or filtering the panel.
  Inline-important filters or restrictive site policies that block the owned
  rule also fail cleanly. Some unusual layouts may render incompletely despite
  a syntactically applied filter; no universal fidelity claim is made.
- Author root filters are sampled at refresh. Stylesheet-only changes, CSS hover
  filters/animations, and wholesale document-element replacement are not fully
  tracked. Shadow-root internals and iframe documents are not traversed. Source
  styles remain intact and Reset releases the sampled override.
- Restricted browser pages, browser stores, PDFs/non-HTML documents and
  cross-origin iframe injection are out of scope. Browser policy can prevent
  injection entirely on restricted pages, so no in-page error panel is promised.
- Background-tab timer throttling can delay disable cleanup or URL fallback.
  Real BFCache round trips, every CSP configuration and video/complex overlay
  behavior are not comprehensively validated. Public pages can change; the
  external test reports failures rather than silently skipping them.

## Toolbar activation

The toolbar now invokes the background action handler instead of a placeholder
popup. It sends a validated internal command to the top-frame content script.
Mounting is on demand; closing disposes the controller and removes effects.
A failed delivery sets a `!` badge and a refresh/restricted-page hint in the
icon tooltip. Refresh an existing tab after install or extension reload.

Chrome automation now activates the actual toolbar action when opening panels,
and specifically checks open/close/reopen with active-blur cleanup and no
host duplication. The complete local regression suite passes with this flow.
The Amazon smoke check reached Amazon's “Continue shopping” interstitial: panel
and effects rendered there, but the normal storefront was not validated. The
cross-site runner treats this access gate as limited rather than a site pass.

## Tab-switch recovery

Toolbar activation now recovers a missing content-script receiver by injecting
only AccessLens's own script into the clicked tab's top frame, then delivering
the command. This handles tabs that predate extension installation/reload.
`activeTab` and `scripting` are used for this user-triggered recovery. An in-flight
guard per tab prevents duplicate bootstraps. Restricted/denied pages still show
an error badge; page navigation and content are not reloaded by recovery.

The two-origin Chrome regression opens a second page before installing the
extension. It first reproduced the missing panel, then passes with recovery:
activating the older page opens its panel without refresh; the first tab's mode
remains intact; each tab applies a different effect; closing one leaves the
other's panel and effect untouched. The complete local regression suite also
passes with on-demand activation.

This supersedes the earlier refresh-only toolbar fallback. Reload the unpacked
extension once to load the new background code and permissions; ordinary tabs
can then be initialized through the icon.
