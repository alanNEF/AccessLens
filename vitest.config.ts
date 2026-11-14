import { defineConfig } from 'vitest/config';
export default defineConfig({test:{environment:'jsdom',include:['tests/unit/visionless*.test.ts','tests/unit/bulk-corrections.test.ts','tests/unit/user-mode.test.ts'],environmentOptions:{jsdom:{url:'https://example.test/'}}}});
