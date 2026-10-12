import { defineConfig } from 'vitest/config';

/**
 * Standalone runner for the schematics (codemod) and CLI tests.
 *
 * These live outside `src/`, so the Angular `@angular/build:unit-test` target (`npm test`) does not discover
 * them — and they must not run in that target anyway: they are plain Node tests (ts-morph codemods, the
 * i18n codegen CLI against a temp directory) with no TestBed involved.
 *
 * Run with `npm run test:schematics`.
 */
export default defineConfig({
  test: {
    name: 'schematics',
    environment: 'node',
    include: [
      'projects/hakistack/*/schematics/**/*.spec.ts',
      'projects/hakistack/*/cli/**/*.spec.ts',
      'projects/hakistack/*/engine/**/*.spec.ts',
    ],
  },
});
