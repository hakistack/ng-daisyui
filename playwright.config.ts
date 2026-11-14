import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env['CI'],
  retries: process.env['CI'] ? 2 : 0,
  // Each viewer page runs PDFium (WASM) in workers; more than three such pages at once against the dev
  // server can crash a renderer ("Page crashed") on a laptop.
  workers: process.env['CI'] ? 1 : 3,
  reporter: process.env['CI'] ? 'github' : 'html',
  use: {
    baseURL: 'http://localhost:58790',
    trace: 'on-first-retry',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    // Cross-browser coverage for the docs platform (shell, search, i18n, playgrounds, a11y).
    {
      name: 'firefox',
      testMatch: /docs-platform\.spec\.ts/,
      use: { ...devices['Desktop Firefox'] },
    },
    {
      name: 'webkit',
      testMatch: /docs-platform\.spec\.ts/,
      use: { ...devices['Desktop Safari'] },
    },
  ],
  webServer: {
    // No --open: `npm start` opens a browser, which CI cannot do.
    command: 'npx ng serve demo --port 58790',
    url: 'http://localhost:58790',
    reuseExistingServer: !process.env['CI'],
    timeout: 120_000,
  },
});
