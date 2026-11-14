# Extension UI redesign

The existing floating panel now uses shadcn/ui, Tailwind CSS 4 and lucide icons.
The Simulator controller, mode reader, SVG matrices, simulation engine and shared
feature contracts are unchanged. Inspector and Fixer were placeholders before
this work; their new tabs show explicit unavailable states.

## Implementation

- `src/components/AccessLensPanel.tsx`: compact header, three keyboard-accessible
  feature tabs, theme controls, internal scrolling and footer.
- `src/features/simulator/SimulatorTab.tsx`: selectable mode cards, current-mode
  status, labelled shadcn slider, Reset and approximation notice. Blur still spans
  0–8 px in 0.5 px steps with a 2 px default.
- `src/features/inspector/InspectorTab.tsx` and `src/features/fixer/FixerTab.tsx`:
  styled placeholder states, without new inspection or fix behavior.
- `src/components/ui/`: generated shadcn Button, Tabs, Card, Slider, Separator,
  Tooltip and Switch, adapted for the extension. Tabs use local focus handling
  because Radix's document-level activeElement checks cannot see shadow focus.
  Slider labels and value text are placed on the actual focusable thumb.
- `src/components/shared/`: class merging, theme hook and local tooltip portal
  container. Light/dark preference is stored as `accesslens.theme` in
  `browser.storage.local`; the monitor button restores system preference.
  Rendering waits for storage to avoid showing the wrong saved theme initially.
- `src/styles/globals.css` and `entrypoints/accesslens.content/style.css`:
  shadcn-compatible theme tokens and Shadow DOM styles. No theme class is added
  to the host document. Pixel-based spacing/type tokens prevent host rem sizes
  from resizing the tool. Reduced motion disables transitions.
- `wxt.config.ts`: Tailwind Vite plugin and the `storage` permission.
- `components.json` and `tsconfig.json`: shadcn configuration and explicit
  repository-relative alias resolution for generated components.
- `entrypoints/popup/main.tsx`: keeps the existing fallback popup readable with
  the scoped theme styles; toolbar activation behavior is unchanged.
- `tests/e2e/ui-redesign.mjs`: UI integration checks added to the existing real
  Chrome suite; existing simulator selectors now target accessible controls.

Small light-mode muted text uses `#5D6F86`, a slightly deeper slate than the
requested `#64748B`: the latter measures about 4.34:1 on `#F1F5F9`. The adjusted
shade exceeds 4.5:1 on white, secondary and selected surfaces. Other major palette
colors follow the brief. Theme controls are a switch and system button instead
of a dropdown, avoiding document-level focus guards and scroll locking.

## Dependencies

Runtime additions: `radix-ui`, `lucide-react`, `class-variance-authority`, `clsx`,
`tailwind-merge`. Build additions: `tailwindcss`, `@tailwindcss/vite`.
No backend, state manager or test framework was added.

## Verification

Validated November 14, 2026 with Chrome 157.0.8103.51:

- `npm run typecheck` — passed.
- `npm run build` — passed; unpacked output is `.output/chrome-mv3`.
- `node --test tests/unit/simulator-controller.test.mjs` — all six tests passed.
- `node tests/e2e/phase1.mjs` — passed, including the new UI integration checks.
- `ACCESSLENS_CROSS_SITE=1 ACCESSLENS_SITE_URL=https://news.ycombinator.com/ node tests/e2e/phase1.mjs`
  — passed on Hacker News and the controlled demo.
- Theme switching, saved preference after close/reopen/reload, system changes,
  local tooltip portals, keyboard controls, pointer slider adjustment, theme text contrast, reduced motion,
  host style isolation and internal scrolling at 360 × 480 are covered.
- Existing checks still verify all simulator modes, reference pixels, identical
  panel heading pixels, blur limits, Reset, author style preservation, forms,
  scrolling, SPA changes and disable/re-enable/uninstall cleanup.
- Light, dark, low-acuity, placeholder and short-viewport screenshots were
  inspected. The suite prints the temporary screenshot directory.

The repository uses Node's test runner and Chrome CDP integration tests; no
Vitest, Playwright or lint script is currently configured. These checks verify
this UI and the supported simulator workflow, not comprehensive accessibility
of the host website. Inspector/Fixer end-to-end behavior remains outside the
existing implementation.

Graphify was queried before implementation and refreshed with
`graphify update . --no-cluster`; the updated graph contains 310 nodes and 470
edges, including the new theme and UI components. Generated outputs remain
unstaged.
