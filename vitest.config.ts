import { defineConfig } from 'vitest/config';
export default defineConfig({test:{environment:'jsdom',include:['tests/unit/visionless*.test.ts'],environmentOptions:{jsdom:{url:'https://example.test/'}}}});
