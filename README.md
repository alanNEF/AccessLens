<p align="center">
  <img src="src/assets/perspective-logo.png" alt="Perspective logo" width="96">
</p>

<h1 align="center">Perspective</h1>

<p align="center"><strong>See what they see.</strong><br>
A Chrome extension that lets developers simulate, find and fix accessibility barriers on any webpage,<br>
and lets everyday users make hard-to-read pages readable with one switch.</p>

<p align="center">Built at HackUMass 2026</p>

---

## Why

Low-contrast text is the most common accessibility failure on the web. WebAIM's 2026 study of the top
one million home pages found it on **83.9%** of them, with an average of 34 instances per page.
Developers rarely mean to exclude anyone. They just never see their page the way someone with
colorblindness, cataracts or low vision does, and accessibility reports are a wall of numbers that
don't point at anything on the page. Meanwhile, people who struggle to read these sites can't wait
for every company to fix its CSS.

Perspective works on both sides: it helps developers fix problems at the source, and helps users
get around them today.

## What it does

### For users: Easier reading

Switch the panel to **User** and turn on **Easier reading**. Perspective finds hard-to-read text on
the current page and fixes it in place, keeps working as new content loads (infinite scroll, live
prices), and shows how many improvements it made. **Restore original page** undoes everything.
Nothing is saved or sent anywhere, and nothing runs on other sites unless you turn it on there.

### For developers: Simulate, Inspect, Fix

| Tool | What it does |
|---|---|
| **Simulator** | Shows the live page through approximate vision conditions: protanopia, deuteranopia, tritanopia, achromatopsia, cataracts, low contrast sensitivity and adjustable blur (low acuity). **Visionless** blacks out the page and reads keyboard focus aloud. The page stays interactive while a simulation is on. |
| **Inspector** | Scans for text that fails WCAG contrast (AA, or the stricter Enhanced/AAA level for low vision), links that stand out only by color, and images without alt text. Failures are outlined on the page with their colors, ratio and the rule they break. Anything it can't measure reliably, like text on a gradient, is marked **Needs review** instead of guessed. |
| **Fixer** | Suggests the smallest color change that passes, preferring colors the site already uses. Preview one fix or **Fix all**, compare before and after (even with a simulation on), and copy the CSS. For images, type alt text and preview it. Nothing touches your source code. |

Each simulation leads to a check and a fix:

| Simulation | Inspector check | Fixer |
|---|---|---|
| Low Contrast, Cataracts | Enhanced contrast, WCAG 1.4.6 (AAA): 7:1, or 4.5:1 for large text. Selected automatically for these modes. | A text color reaching 7:1, or a background color when no text color can |
| Achromatopsia and other color modes | Links that rely on color alone, WCAG 1.4.1 | `text-decoration-line: underline` |
| All modes | Text contrast, WCAG 1.4.3 (AA): 4.5:1, or 3:1 for large text | A text color that passes |
| Visionless | Images without alt text, WCAG 1.1.1 | Alt text you write and preview |

### For AI coding agents

`agent-plugin/` is an MCP server and Claude Code plugin that runs the same checks in headless Chrome
and returns compact JSON (selectors, colors, ratios and ready-to-apply CSS fixes) instead of
screenshots. A scan of the demo page is about 4 KB. Agents can also pass a candidate fix in and
rescan to verify it before editing code.

```
/plugin install accesslens --marketplace alanNEF/accesslens
```

Other MCP clients (Cursor, VS Code, Codex): run `node agent-plugin/server/accesslens-mcp.mjs` as a
stdio server. See [agent/README.md](agent/README.md).

## Quick start

Requires **Node.js 22+**, **npm** and **Google Chrome**.

```sh
git clone https://github.com/alanNEF/AccessLens.git
cd AccessLens
npm install
npm run build
```

1. Open `chrome://extensions`, turn on **Developer mode**, click **Load unpacked** and select `.output/chrome-mv3`.
2. Pin Perspective from the puzzle-piece menu.
3. Start the demo site with `npm run demo` and open <http://127.0.0.1:8081/market.html>.
4. Click the Perspective icon to open the panel. Click it again to close it and restore the page.

For live reloading while you work, run `npm run dev` instead of `npm run build`.

### Demo pages

All of these are in `demo-site/` and served by `npm run demo`:

| Page | What it shows |
|---|---|
| [`market.html`](demo-site/market.html) | The main demo: a farmers market page with contrast failures, a color-only link, a gradient case and status badges. Expected results are listed in a comment at the top. |
| [`user-mode.html`](demo-site/user-mode.html) | User mode on dynamic content |
| [`bulk-corrections.html`](demo-site/bulk-corrections.html) | Fix all |
| [`image-test.html`](demo-site/image-test.html) | Missing alt text |
| [`visionless.html`](demo-site/visionless.html) | Visionless keyboard and speech playground |
| [`index.html`](demo-site/index.html), [`compatibility.html`](demo-site/compatibility.html) | Simulator layout and single-page-app compatibility |

## Using the panel

- **Dev / User** switch in the header. Switching modes restores the page before the other mode starts.
- **Move it:** drag the header or the collapsed launcher. Keyboard users can focus the grip and use the arrow keys (Shift for bigger steps, Home to reset).
- **Resize, collapse, theme:** resize the panel, collapse it to a small launcher, and pick light, dark or system theme. Position and theme are remembered.
- **Visionless:** needs a local text-to-speech voice. Use Tab and Shift+Tab to move, Escape to stop speech.

## How it works

- **Extension:** [WXT](https://wxt.dev) (Manifest V3), React, TypeScript, Tailwind CSS and shadcn/ui (Radix). The panel lives in a shadow DOM, so page styles and ours never mix.
- **Simulator:** SVG color matrices from the Machado, Oliveira and Fernandes (2009) model for color vision deficiencies, applied in linear RGB; CSS filters for cataracts, low contrast and blur. The page is filtered in sections so fixed headers and popups keep working. Visionless uses Chrome's `tts` API.
- **Inspector:** [axe-core](https://github.com/dequelabs/axe-core) rules `color-contrast`, `color-contrast-enhanced`, `link-in-text-block` and `image-alt`, mapped into a shared issue format.
- **Fixer:** [Culori](https://culorijs.org) searches a perceptual color space for the closest passing color, accounting for text opacity, the site's own palette and color-blind-safe choices. Previews are temporary inline styles that are restored exactly.
- **User mode:** reuses the same scanner and fixing engine, verifies each change, and watches the page with a MutationObserver that rescans only what changed.
- **Agent plugin:** a dependency-free MCP server that drives Chrome over the DevTools Protocol and reuses the Inspector and Fixer code, so the extension and the agent always agree.

WCAG contrast is defined as $(L_1 + 0.05) / (L_2 + 0.05)$, where $L_1$ and $L_2$ are the relative
luminances of the lighter and darker colors.

## Project layout

```
entrypoints/        WXT background worker and content script
src/components/     Panel and shared UI (shadcn/ui)
src/features/
  simulator/        Filters, simulation engine, Visionless
  inspector/        axe-core runners, mapping, highlights
  fixer/            Color suggester, previews, Fix all, alt text
  user-mode/        Easier reading
src/shared/         Shared types and handoff stores
agent/              MCP server source, build script, smoke test
agent-plugin/       Built Claude Code plugin (server, skill, manifest)
demo-site/          Test and demo pages
docs/               PRDs and implementation notes
tests/              Unit tests (node:test, Vitest) and real-Chrome e2e tests
```

## Testing

```sh
npm run typecheck
npm run test:unit         # contrast mapping, simulator, Fixer, panel position and size
npm run test:fixer        # Fixer color search, previews, controller
npm run test:bulk         # Fix all (Vitest)
npm run test:user         # User mode (Vitest)
npm run test:visionless   # Visionless (Vitest)
npm run test:phase4       # Simulator in real Chrome, including cross-site checks
npm run build:agent && npm run test:agent   # agent plugin end to end
```

The e2e tests launch Chrome with a temporary profile. Set `CHROME_PATH` if Chrome isn't found.

## Limitations

- Automated checks cover text contrast, color-only links and missing alt text. A clean scan **does not** mean a page is accessible: keyboard access, focus order, form labels, meaningful alt text and screen reader behavior still need people to test them.
- Simulations are approximations for learning and testing, not anyone's lived experience. Cataracts and Low Contrast are illustrative filters, not clinical models.
- Fixes are temporary previews. Apply them in your own source code.
- Browser internal pages, the Chrome Web Store, PDFs and cross-origin iframes aren't supported.

## Team

Built at HackUMass 2026 by [Alan Achilles](https://github.com/alanNEF), [Sally Vakhtangishvili](https://github.com/Salikuna), [Anshuman](https://github.com/AnshumanT21) and [Aahana Garg](https://github.com/aahanagarg).

## Credits

- Color vision deficiency matrices: G. M. Machado, M. M. Oliveira and L. A. F. Fernandes, "A Physiologically-based Model for Simulation of Color Vision Deficiency", *IEEE TVCG*, 2009.
- [axe-core](https://github.com/dequelabs/axe-core) by Deque Systems (MPL-2.0), [Culori](https://culorijs.org) (MIT), [WXT](https://wxt.dev), [shadcn/ui](https://ui.shadcn.com), [Lucide](https://lucide.dev).
- Low-contrast statistics: [The WebAIM Million, 2026](https://webaim.org/projects/million/).
