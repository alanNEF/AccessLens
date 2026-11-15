# AccessLens for coding agents

An MCP server (and Claude Code plugin) that lets an AI coding agent run the same accessibility
checks as the AccessLens extension on any URL, and get the results as compact JSON instead of
screenshots. A typical scan of `demo-site/market.html` is about 1–2 KB of JSON; one simulated
screenshot is ~50–60 KB.

## Tools

| Tool | Returns | Use for |
|---|---|---|
| `accesslens_scan` | JSON: failures and review items with selector, colors, ratio, target, and a CSS fix | Checking UI changes; verifying fixes (pass candidate CSS in `css`) |
| `accesslens_simulate` | JPEG screenshot with a vision simulation | Only when someone needs to *see* it |

`accesslens_scan` arguments: `url` (required; `http(s)://`, `localhost`, or `file://`), `level` (`AA` default, or
`AAA` for enhanced contrast), `selector`, `css`, `max_issues`, `viewport_width`, `viewport_height`, `wait_ms`.

Example issue:

```json
{"id":"link-in-text-block-failed-0","status":"fail","wcag":"1.4.1","kind":"link-color-only",
 "selector":".policy-link","element":"<a> “vendor safety policy”","link_color":"#1e40af",
 "surrounding_text_color":"#1f2937","ratio":1.68,"required":3,
 "fix":{"property":"text-decoration-line","value":"underline","css":".policy-link { text-decoration-line: underline; }"}}
```

It reuses the extension's own code: axe-core rules (`color-contrast`, `color-contrast-enhanced`,
`link-in-text-block`), the Inspector's mapping (`src/features/inspector/contrast-mapping.ts`), the
Fixer's color search with opacity handling (`src/features/fixer/color-suggester.ts`) and the
Simulator's filter presets (`src/features/simulator/filters.ts`).

## Build and test

```sh
npm install
npm run build:agent   # writes agent-plugin/server/accesslens-mcp.mjs (single file, no runtime deps)
npm run test:agent    # starts the server over stdio and scans demo-site/market.html in headless Chrome
```

Commit `agent-plugin/server/accesslens-mcp.mjs` after building, so the plugin installs from GitHub
without a build step. Requires Node.js 22+ and Google Chrome (or set `CHROME_PATH`).

## Install

**Claude Code (plugin, from this repo):**

```
/plugin install accesslens --marketplace alanNEF/accesslens
```

On older Claude Code versions: `/plugin marketplace add alanNEF/AccessLens`, then `/plugin install accesslens@accesslens`.

Or while developing: `claude --plugin-dir ./agent-plugin`. The plugin adds the MCP server and an
`accessibility-check` skill that tells the agent when to scan and how to apply fixes.

**Any other MCP client** (Cursor, VS Code, Codex, …): add a stdio server

```json
{ "command": "node", "args": ["/absolute/path/to/AccessLens/agent-plugin/server/accesslens-mcp.mjs"] }
```

**Use the agent's own browser** instead of a separate headless Chrome: start that browser with
`--remote-debugging-port=9222` and set `ACCESSLENS_CDP_URL=http://127.0.0.1:9222` in the server's
environment. Scans then open a tab there.

## Limits

Automated checks cover text contrast (WCAG 1.4.3 / 1.4.6) and color-only links (1.4.1). A clean scan
does not mean a page is accessible, and `review` items need a human. Simulations are approximations.
