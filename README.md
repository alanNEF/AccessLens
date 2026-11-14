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

WXT builds the browser extension into `.output/`. The Simulator has a Phase 4 cross-site support. Inspector and Fixer remain
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

## Phase 4 demo

Run `npm run build`, load `.output/chrome-mv3` as an unpacked extension in
Chrome, then serve the demo with `npm run demo`.
Pin AccessLens in Chrome’s Extensions menu, then click its toolbar icon in the
active tab to show or hide the panel. Closing clears the simulation; reopening
starts in Off. Already-open tabs initialize on the first icon click without a refresh.

Open `http://127.0.0.1:8081` and click the icon; the in-page panel offers Off, three color-vision presets, adjustable
Low Acuity (0–8 px in 0.5 px steps), and Reset. Ordinary HTTP/HTTPS pages are supported through direct-body content targeting;
unsafe layouts show a limitation message. No Inspector or Fixer functionality is included.

Run `npm run test:phase4` after building for the real Chrome smoke test. It uses
a temporary profile and local server, installs/removes only its own test
extension, and prints the location of screenshots. Requires a Chrome version
supporting the CDP `Extensions` domain and `--enable-unsafe-extension-debugging`.
On other systems set `CHROME_PATH` to the Chrome executable.

See [Phase 4 compatibility results and validation](docs/simulator/phase-4-validation.md).
The [unmarked SPA playground](http://127.0.0.1:8081/compatibility.html) exercises
root replacement and new content without demo-specific markers.
