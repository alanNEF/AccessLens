# AccessLens

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

WXT builds the browser extension into `.output/`. The Simulator has a Phase 0 feasibility spike. Inspector and Fixer remain
placeholders. See [the feasibility report](docs/simulator/phase-0-feasibility.md).

## Project layout

- `entrypoints/`: WXT background, popup, and content script entrypoints.
- `src/components/`: Extension panel and shared UI components.
- `src/features/`: Simulator, inspector, and fixer modules.
- `src/shared/`: Shared types, messages, and constants.
- `src/styles/`: Shared styles.
- `tests/unit/` and `tests/e2e/`: Reserved for future tests.
- `demo-site/`: Local accessibility demo page.
- `docs/`: Feature PRD placeholders.

## Phase 0 demo

Run `npm run build`, load `.output/chrome-mv3` as an unpacked extension in
Chrome, then serve the demo with `python3 -m http.server 8080 --directory demo-site`.
Open `http://localhost:8080`; the in-page panel offers Off, Protanopia, fixed
2 px blur, and Reset. Other pages show an unsupported-page message when an
effect is requested. No Inspector or Fixer functionality is included.

Run `npm run test:phase0` after building for the real Chrome smoke test. It uses
a temporary profile and local server, installs/removes only its own test
extension, and prints the location of screenshots. Requires a Chrome version
supporting the CDP `Extensions` domain and `--enable-unsafe-extension-debugging`.
On other systems set `CHROME_PATH` to the Chrome executable.
