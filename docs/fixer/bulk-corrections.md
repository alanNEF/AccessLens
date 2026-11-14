# Bulk contrast correction previews

After **Scan page** in Inspector, **Run All Corrections** in Fixer generates suggestions from the
current scan and picked element. Every successfully applied and validated correction starts checked.
Each row shows the Inspector label/selector, original and suggested color, measured contrast, target
and any application failure. Select All, Deselect All and Restore Original retain suggestions for reuse.

## Integration and ownership

- `correction-generator.ts` extracts the existing individual eligibility checks and delegates to the
  unchanged Culori `suggestFix` engine. Generation finishes before preview application starts.
- `bulk-corrections.ts` follows the existing frozen external-store pattern, with stable IDs based on
  Inspector issue ID and CSS property. Generated suggestions remain separate from enabled state.
  Live element references are kept in a runtime map; selectors are never used to find replacements.
- The existing preview manager now supports keyed previews. It still owns all page style writes,
  stores prior inline values/priorities and restores only the property it changed. It rejects competing
  owners of the same element/property and preserves unrelated inline properties and page-script edits.
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

Only the existing verified, opaque text-contrast fixes are generated. Gradients, background images,
uncertain colors and other accessibility issue types remain unsupported/manual review. Read-back
validation uses the rendered foreground and Inspector's verified background, matching individual
Fixer behavior; rescan after the host page changes its styles or backgrounds. Detached/replaced
targets are rejected on application, without redirecting a correction to a similar selector. Author
changes to a previewed property are preserved on restoration and reported for review.

Inspector highlights describe the original scan and remain until Inspector is cleared or rerun.
Turning off a child element's override can reveal a still-enabled ancestor's inherited color.
Suggestions and previews are local to the current page session and never edit website source.
