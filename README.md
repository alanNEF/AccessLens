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

WXT builds the browser extension into `.output/`. The simulator, inspector,
and fixer currently contain placeholders for future implementation.

## Project layout

- `entrypoints/`: WXT background, popup, and content script entrypoints.
- `src/components/`: Extension panel and shared UI components.
- `src/features/`: Simulator, inspector, and fixer modules.
- `src/shared/`: Shared types, messages, and constants.
- `src/styles/`: Shared styles.
- `tests/unit/` and `tests/e2e/`: Reserved for future tests.
- `demo-site/`: Local accessibility demo page.
- `docs/`: Feature PRD placeholders.
