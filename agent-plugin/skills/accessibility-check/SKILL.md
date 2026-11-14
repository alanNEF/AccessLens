---
name: accessibility-check
description: Check a web page's accessibility with the AccessLens MCP tools after changing UI, styles or colors, or when asked to audit or fix contrast. Use accesslens_scan (JSON) rather than screenshots.
---

# Accessibility check with AccessLens

Use the `accesslens_scan` tool whenever you change how a page looks (colors, typography, components, themes), before saying UI work is done, or when the user asks about accessibility or contrast.

## Loop

1. Make sure the page is reachable: a running dev server (`http://localhost:…`) or a `file://` path.
2. Call `accesslens_scan` with the `url`. Use `level: "AAA"` when the user cares about low vision, older users or "enhanced" contrast; otherwise the default `AA`.
3. For each item with `status: "fail"`:
   - If it has `fix`, apply the same change **in the source code** (the stylesheet, component, or design token that sets that color). `fix.css` shows the property and value for the element's selector; prefer changing the token or shared class over adding a new selector rule.
   - If it has `no_fix`, explain why to the user instead of guessing.
4. Optional: before editing source, pass the candidate CSS in the `css` argument and scan again to confirm it passes.
5. Scan again after editing and report what changed.

## Reading the results

- `wcag` `1.4.3`: text contrast (AA: 4.5:1, or 3:1 for large text). `1.4.6`: enhanced contrast (AAA: 7:1 / 4.5:1). `1.4.1`: a link inside text that differs from the text only by color; the fix is an underline.
- `status: "review"`: AccessLens could not measure it (gradient or image background, overlapping elements, transparency). Tell the user it needs a human check; do not invent a pass or fail.
- `ratio` / `required`: measured contrast and the target.

## Limits to state honestly

- A scan with no failures does **not** mean the page is accessible. It only covers text contrast and color-only links.
- `accesslens_simulate` returns an image and costs far more tokens. Use it only when the user wants to see a simulation (e.g. `achromatopsia`, `cataracts`, `protanopia`). Simulations are approximations, not anyone's lived experience.
