import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    coverage: {
      provider: 'istanbul',
      reporter: ['text', 'lcov', 'html'],
      reportsDirectory: './coverage',
      thresholds: {
        statements: 80,
        branches: 80,
        functions: 80,
        lines: 80,
      },
      exclude: ['**/*.spec.ts', '**/*.types.ts', '**/index.ts', '**/public-api.ts', '**/node_modules/**', '**/dist/**'],
    },
  },
});
