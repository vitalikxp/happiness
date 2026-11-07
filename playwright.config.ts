import { defineConfig } from '@playwright/test';

// E2E smoke tests: play whole lives through the UI on the production build.
// Uses the system Chrome (preinstalled on GitHub runners), so no browser download is needed.
export default defineConfig({
  testDir: 'e2e',
  timeout: 240_000,
  reporter: process.env.CI ? 'github' : 'list',
  use: {
    baseURL: 'http://localhost:4173',
    channel: 'chrome',
    viewport: { width: 1440, height: 900 },
  },
  webServer: {
    command: 'pnpm build && pnpm preview --port 4173 --strictPort',
    url: 'http://localhost:4173',
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
