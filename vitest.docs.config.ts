import { defineConfig } from 'vitest/config';

/**
 * Plain-Node tests for the docs platform's pure logic (search scoring,
 * playground code generation, catalog integrity). No TestBed: these modules
 * have no Angular dependencies. Run with `npm run test:docs`.
 *
 * The cross-source checks (API ↔ catalog ↔ routes ↔ content) live in
 * scripts/check-docs-coverage.mjs (`npm run docs:check`).
 */
export default defineConfig({
  test: {
    name: 'docs',
    environment: 'node',
    include: ['projects/shared-demos/platform/**/*.spec.ts'],
  },
});
