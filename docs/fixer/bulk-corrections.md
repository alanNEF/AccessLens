# Bulk correction previews

**Fix all** in the Fix tab (scanning the page first if needed) generates suggestions from the
current scan and picked element. Every successfully applied and validated correction starts checked.
Each row shows the Inspector label/selector, original and suggested color, measured contrast, target
and any application failure. Select All, Deselect All and Restore Original retain suggestions for reuse.

Scanned images missing alternative text also appear with a checkbox and editable description.
Image rows start unchecked until a developer supplies a meaningful description; AccessLens does
not infer image content. Enter the description and check the row to preview it. Editing an enabled
description updates the preview. Fix all preserves existing image drafts and enables
those with nonempty descriptions. Select All, Deselect All and Restore Original include images.

Inspector's **Fix image** opens the individual editor alongside the bulk controls. The individual
editor and checklist share one draft and enabled state for that element. Switching tabs or editing
an image individually keeps bulk actions available and leaves other corrections alone.

## Integration and ownership

- `correction-generator.ts` extracts the existing individual eligibility checks and delegates to the
  unchanged Culori `suggestFix` engine. Generation finishes before preview application starts.
- `bulk-corrections.ts` follows the existing frozen external-store pattern, with stable IDs based on
  Inspector issue ID and CSS property. Generated suggestions remain separate from enabled state.
  Live element references are kept in a runtime map; selectors are never used to find replacements.
- The existing preview manager now supports keyed previews. It still owns all page style writes,
  stores prior inline values/priorities and restores only the property it changed. It rejects competing
  owners of the same element/property and preserves unrelated inline properties and page-script edits.
- Image attribute writes also go through the preview manager. It restores the exact prior `alt`
  attribute, distinguishing a missing attribute from an empty one, and preserves later page-authored
  changes. Scanning, clearing, mode changes, navigation and panel disposal restore image previews.
- Duplicate/conflicting Inspector results use the first result deterministically; others are reported
  as unavailable. Generation and application failures are isolated to the affected issue.
- Starting a bulk run ends the individual preview first. Starting an individual preview disables the
  corresponding bulk row only. Enabling that row again ends the overlapping individual preview.
- Inspector scans/picks cancel pending generation and restore previews before axe reads styles.
  Clearing Inspector results clears the bulk workflow. Panel disposal, extension invalidation and
  existing navigation cleanup dispose all keyed previews.
- Shared issue/message contracts, Simulator code and the color correction algorithm are unchanged.

## Files

Created:

- `src/features/fixer/BulkCorrections.tsx`: checklist, generation feedback and bulk controls.
- `src/features/fixer/bulk-corrections.ts`: generation, validation, enabled state and cleanup.
- `src/features/fixer/correction-generator.ts`: shared single/bulk eligibility and generation.
- `demo-site/bulk-corrections.html`: three confirmed failures, a gradient and passing text.
- `tests/unit/bulk-corrections.test.ts`: DOM/state, failure, ownership and restoration coverage.
- `tests/e2e/bulk-corrections.mjs`: production-extension browser workflow.
- `docs/fixer/bulk-corrections.md`: this implementation and validation record.

Modified:

- `src/features/fixer/preview-manager.ts`: keyed property ownership and complete cleanup.
- `src/features/fixer/fixer-controller.ts`: composition and single/bulk ownership transfer.
- `src/features/fixer/connect-inspector.ts`: cancel/restore before scanning, picking and reset.
- `src/features/fixer/FixerTab.tsx` and `src/components/AccessLensPanel.tsx`: mount the bulk UI.
- `vitest.config.ts`, `package.json`: include bulk DOM tests and dedicated scripts.
- `tests/e2e/phase1.mjs`: reuse the existing isolated Chrome/CDP harness for bulk tests.
- `README.md`: workflow and test commands.

No dependencies were added. Graphify discovery and reverse-impact queries were checked against actual
source before editing. The local code graph was rebuilt with `graphify update . --no-cluster`, and a
query confirmed the new bulk controller and its connection to Fixer. To avoid a large generated diff,
the refreshed graph was retained at `/private/tmp/accesslens-bulk-graph-dva1_v_f/graph.json`; tracked
Graphify snapshots were restored. Query the refreshed graph with `--graph` and that path, or rerun
`graphify update . --no-cluster` to replace the repository snapshot locally.

## Verification (2026-11-14)

- `npm run typecheck`: passed.
- `npm run test:unit`: all 41 existing Node tests passed, including individual Fixer and restoration.
- `npm run test:visionless`: all 28 Vitest tests passed, including 14 bulk DOM/state tests.
- `npm run test:bulk`: all 14 bulk tests passed after the final Inspector-reset change.
- `npm run build`: production MV3 build passed.
- `npm run test:bulk:e2e`: its production build and browser test were run separately because the
  sandbox blocks the temporary localhost server. The Chrome test passed with the required sandbox
  escalation. It covers generation/default selection, independent WCAG ratio calculation, keyboard
  toggles, select/deselect/restore, repeated runs, simulation isolation, original-style rescans,
  individual Fixer coexistence, stale element references, toolbar close, SPA navigation and actual
  extension uninstall with active previews.
- `node tests/e2e/phase1.mjs`: existing Chrome regression suite passed, including visual isolation,
  theme/accessibility controls, navigation and actual extension disable/re-enable/uninstall cleanup.
- Real-site bulk smoke test on Hacker News: 242 corrections enabled; Restore Original preserved all
  captured inline foreground values, priorities and style-attribute presence. Run with
  `ACCESSLENS_BULK_ONLY=1 ACCESSLENS_BULK_SITE_URL=https://news.ycombinator.com/ node tests/e2e/phase1.mjs`.
- Browser: Chrome 157.0.8103.51. Screenshot reviewed for checklist layout and readable controls.
- `git diff --check`: passed. No lint script is configured. Browser checks reuse the repository's CDP
  harness; Playwright was not installed or added.

## Scope and limitations

Only the existing verified, opaque text-contrast fixes and developer-authored image descriptions are
supported. Gradients, background images,
uncertain colors and other accessibility issue types remain unsupported/manual review. Read-back
validation uses the rendered foreground and Inspector's verified background, matching individual
Fixer behavior; rescan after the host page changes its styles or backgrounds. Detached/replaced
targets are rejected on application, without redirecting a correction to a similar selector. Author
changes to a previewed property are preserved on restoration and reported for review.

Inspector highlights describe the original scan and remain until Inspector is cleared or rerun.
Turning off a child element's override can reveal a still-enabled ancestor's inherited color.
Suggestions and previews are local to the current page session and never edit website source.

## Image correction integration (2026-11-14)

The image editor previously returned early from FixerTab, hiding all bulk controls, while bulk
generation accepted only contrast results. Image previews also lived in the editor component and
were restored on tab unmount. Image rows now live in the bulk store and use the shared preview
manager, so individual and bulk editing share state and cleanup follows the panel's lifecycle.

- `npm run typecheck`: passed.
- `npm run test:bulk`: all 25 tests passed, including two UI reproductions written before the fix,
  mixed/image-only scans, shared drafts, repeated runs, exact attribute restoration, page edits,
  disconnected targets, cancellation and preview ownership.
- `npm run test:unit`: all 83 existing Node tests passed.
- `npm run test:visionless`: 60 passed and three existing User Mode tests failed at assertions
  expecting scoped roots in argument 2; the current scan signature passes the contrast level there.
  These same failures were observed before this change.
- `npm run build`: production build passed.
- Chrome bulk integration: passed contrast regressions plus image checkbox/textbox, individual
  editing, bulk availability, tab persistence, repeated runs, restore, original-attribute rescans,
  panel closure and actual extension uninstall. Screenshot checked for readable checklist controls.
- Chrome User Mode integration: passed activation, contrast counts, dynamic content, mode switches,
  page-script edits, navigation and cleanup.
- General Chrome suite: simulator/UI checks passed, then the test-only esbuild bundle failed because
  its PNG loader is missing for existing brand imports. The production build and both focused Chrome
  integration suites above passed.
- Graphify was refreshed and `BulkImageCorrection` was verified in the graph at
  `/private/tmp/accesslens-image-graph-w86piG/graph.json` using the `GRAPHIFY_OUT` override. Repository
  Graphify outputs were left unchanged. Query it with `graphify query BulkImageCorrection --graph`
  followed by that path.
- No lint script is configured. No dependencies or shared issue/message contracts changed.
