# User Mode

The panel now offers Developer and User operating modes. User Mode provides one
page-local accessibility switch, a count of applied improvements, and Restore Original Page.
It reports checking, active, no supported improvements, and retryable error states.
Status updates use a polite live region; all controls support keyboard operation and focus indication.
The extension retains its existing AccessLens name.

## Shared engine and ownership

User Mode calls `InspectorStore.scanSilently`, which uses the existing queued axe-core
`color-contrast` scan and excludes the panel. It does not populate Developer results,
select elements, install picking handlers, draw highlights, or open the bulk checklist.
Silent audits leave the panel available, so the user can cancel a running audit.
Any text obscured by the panel that axe cannot measure is skipped.

Both modes call the same `fixer.bulk.run`, `generateCorrection`, Culori suggestion engine,
and preview manager. There is one bulk state and one CSS registry, rather than separate
Developer and User correction engines. The bulk state tracks generated suggestions,
application failures, enabled entries, verified ratios, and workflow owner. The preview
manager tracks active mode, owner, element identity, property, original value/priority,
and the browser-normalized written value. A WeakMap assigns stable runtime element IDs;
selectors and per-scan issue IDs do not identify correction ownership.

Mode policy is deliberately simple: **restore the departing workflow before switching**.
Entering User clears Developer previews, pending generation, results, handoff, picking,
and simulation. The switch initially remains off. Returning to Developer disables User
improvements, cancels queued work, restores its properties, and reveals the existing
Developer interface with its selected tab retained. Neither workflow silently inherits
the other's original-style snapshots. The manager rejects writes from an inactive owner
and conflicting element/property claims. Individual Developer selection releases an
existing bulk color before validating the original measurement.

Unattended corrections accept verified failures only. In addition to the shared engine's
checks, solid-color read-back verifies current foreground/background and font threshold
before application and checks actual contrast afterward. Unsupported opacity, gradients,
images, blend/filter effects, uncertain colors, and detached targets are skipped.
One correction failing does not stop other valid corrections.

Restoration changes individual inline properties only, preserving their original values
and priorities and other page-authored properties. If page script replaces a corrected
property, AccessLens leaves the page's new value in place. The toggle, explicit Restore,
mode switches, panel close, pagehide, extension invalidation, and SPA path changes all
cancel pending work and restore corrections. SPA navigation requires activation again;
hash changes preserve the current session. Nothing is persisted or transmitted.

## Dynamic content

A MutationObserver watches new content and contrast-relevant class/style/hidden changes.
An 800 ms coalescing window scans minimal affected subtrees instead of polling the full
page. Nonempty text updates, such as live prices and timers, reuse the existing contrast
decision. Text introduced into an empty element is audited. Script/style node churn,
no-op attributes, and inline animation/position changes do not schedule contrast scans.

Before a refresh, `fixer.bulk.prepareRefresh` restores only corrections within its audit
scopes. Corrected ancestors expand the scope where inheritance would affect the result.
The shared bulk engine appends new corrections while leaving unrelated corrections and
their original snapshots applied. Removed targets are pruned without scanning their
whole parent. Background refreshes keep the active confirmation visible; an incremental
scan error preserves unaffected improvements.

The observer stays active during asynchronous audits and generation. Preview-manager
write notifications drain external mutations before each synchronous style write and
discard the engine's own records afterward. New content arriving during an audit is
queued for a subsequent pass; correction writes do not trigger a scan loop. Disabling
disconnects the observer and clears pending roots/timers. Version guards prevent late
scan/generation results from reapplying changes after cancellation.

## Files

Created:

- `src/features/user-mode/UserMode.tsx`: simplified controls and live status.
- `src/features/user-mode/user-mode-controller.ts`: page workflow, cancellation, and monitoring.
- `src/features/fixer/solid-contrast.ts`: conservative original/actual color verification.
- `demo-site/user-mode.html`: controlled text failures, manual-review gradient, typing and dynamic controls.
- `tests/unit/user-mode.test.ts`: workflow, ownership, restoration, errors, and mutation regressions.
- `tests/e2e/user-mode.mjs`: production-extension browser journey.
- `docs/user-mode.md`: implementation and reproducible validation.

Modified:

- `entrypoints/accesslens.content/index.tsx`: compose and dispose the workflow; reset on SPA navigation.
- `src/components/AccessLensPanel.tsx`: mode selector, conditional UI and highlights.
- `src/shared/types.ts`: shared `OperatingMode` union.
- `src/features/inspector/axe-runner.ts`: optional subtree audit roots.
- `src/features/inspector/inspector-store.ts`: serialized silent audits.
- `src/features/fixer/preview-manager.ts`: ownership, applied-state checks, and write notifications.
- `src/features/fixer/bulk-corrections.ts`: shared workflow owner, identity IDs, and unattended validation.
- `src/features/fixer/fixer-controller.ts`: validate individual handoffs against original bulk target colors.
- `tests/e2e/phase1.mjs`: User Mode fixture/runner and scope Simulator's pressed-button assertion.
- `package.json`, `vitest.config.ts`: test commands/discovery.
- `README.md`: usage and test entry points.

## Verification

Run from the repository root:

```sh
npm run typecheck
npm run build
npm run test:unit
npx vitest run
npm run test:user:e2e
npm run test:bulk:e2e
npm run test:phase1
```

The repository uses its existing real-Chrome/CDP extension harness instead of adding a
Playwright dependency. It creates its own temporary profile and local server; no user
Chrome profile is modified. Chrome must support `Extensions.loadUnpacked` and
`Extensions.triggerAction`; set `CHROME_PATH` when needed.
An optional external-page check is available with
`ACCESSLENS_USER_SITE_URL=https://news.ycombinator.com/ npm run test:user:e2e`.

Vitest covers cancellation at scan time, rapid off/on, ownership isolation, exact styles,
page-authored updates, unsupported cases, partial failures, retry, empty results, scoped
dynamic scans, content arriving during a scan, and observer cleanup. The browser journey
covers Developer bulk → User → Developer, native keyboard toggling, independent contrast
measurement, counts, no overlays/checklist, repeat restoration, dynamic replacements,
normal typing/actions, a quiet interval without scan loops, empty results, SPA consent,
toolbar close/reopen, and uninstall cleanup. Existing suites cover Simulator and Fixer.
There is no configured lint script.

Verified on November 14, 2026, with Chrome 157.0.8103.51:

| Check | Result |
| --- | --- |
| TypeScript and production WXT build | Passed |
| Vitest (including 24 User Mode tests and 14 bulk tests) | 52 passed |
| Existing Node unit suite | 48 passed |
| User Mode Chrome journey | Passed |
| Existing bulk Fixer Chrome journey | Passed |
| Existing full Chrome regression suite | Passed during initial implementation; not repeated for the refresh fix |
| Hacker News smoke check | 212 improvements applied; exact inline restoration passed |
| CoinMarketCap refresh-fix smoke check | 16 improvements active, no loading-state restart during live updates, exact restoration passed |
| Chrome live-quote regression | Zero unrelated correction writes during 100 ms updates and new-content auditing |
| Diff whitespace check | Passed |

The Chrome harness needed execution outside the restricted sandbox to open its localhost
server and temporary browser profile. Headless Chrome reported local TTS unavailable;
the existing Visionless keyboard/blackout tests passed, but audible narration was not verified.

Graphify's existing local graph was queried before implementation and checked against
source. After implementation it was refreshed to ignored local output, keeping tracked
generated graph files out of the change:

```sh
GRAPHIFY_OUT=.wxt/graphify-out graphify update . --no-cluster
GRAPHIFY_OUT=.wxt/graphify-out graphify query "createUserModeController matchesOriginalContrast"
```

The refreshed graph is queried to verify the new workflow, silent scan, scoped bulk
refresh, color guard, and their shared dependencies.

## Live-page refresh regression

The initial monitor treated every live-price text replacement, animation style write,
and removed script as an accessibility change. Each update ran a scoped audit but first
restored and regenerated **all** existing corrections, repeatedly flashing their original
colors and restarting the checking status. The static demo did not exercise that pattern.

A deterministic regression reproduced five quote updates causing five unnecessary
rescans, and a new subtree causing two style writes on unrelated corrected text. The
fix filters mutations by contrast relevance and gives the existing bulk engine a scoped
refresh path. Tests now require zero unrelated correction writes while live updates run,
continued auditing of new content, original-color auditing through corrected ancestors,
and preservation of unaffected fixes after an incremental failure. The demo's **Start
live updates** control and the Chrome test run this pattern continuously at 100 ms intervals.

## MVP limits and follow-ups

- Automatic changes cover supported, verified opaque text contrast only. A clean scan
  cannot certify accessibility; other barriers still need human review.
- Monitoring covers the top-level light DOM. Cross-origin frames, restricted browser
  pages, and PDFs remain out of scope. Shadow-root mutations, CSSOM stylesheet edits,
  hover/focus-only changes, media queries, and every SPA rendering technique are not monitored.
- A dynamic refresh briefly restores corrections within the affected scope so auditing
  uses original author colors. Global class/contrast changes can legitimately require a
  broad scope. Tighter class invalidation and a scan budget remain possible follow-ups.
- Existing nonempty text changes and geometry-only inline animations do not trigger a
  contrast audit. New overlaps or text-semantics changes may need a manual Developer scan.
- The color guard is conservative: transparent canvas backgrounds without a known
  opaque ancestor, CSS opacity, filters, and complex composition are left unchanged.
- Mode selection is session-local, and improvements never activate automatically on a
  new page. Persistent opt-in preferences and more fix categories are future work.
