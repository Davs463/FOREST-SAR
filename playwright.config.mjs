// E2E config. Playwright lives in .bosquevivo-tools (not a project dependency).
// Run against the built site served over HTTP (not file://):
//   npm run build
//   npm run preview -- --host 127.0.0.1 --port 4173   (separate terminal)
//   node .bosquevivo-tools/node_modules/@playwright/test/cli.js test
import { defineConfig, devices } from './.bosquevivo-tools/node_modules/@playwright/test/index.mjs';

export default defineConfig({
  testDir: 'tests/e2e',
  timeout: 30_000,
  retries: 0,
  reporter: [['list']],
  outputDir: 'test-results',
  // PW_CHANNEL=chrome uses the system Google Chrome when the Playwright Chromium download is incomplete.
  use: { baseURL: 'http://127.0.0.1:4173/', trace: 'off', screenshot: 'only-on-failure', ...(process.env.PW_CHANNEL ? { channel: process.env.PW_CHANNEL } : {}) },
  projects: [
    { name: 'desktop-1440', use: { ...devices['Desktop Chrome'], viewport: { width: 1440, height: 900 } } },
    { name: 'tablet-768', use: { ...devices['Desktop Chrome'], viewport: { width: 768, height: 1024 } } },
    { name: 'mobile-390', use: { ...devices['Desktop Chrome'], viewport: { width: 390, height: 844 }, hasTouch: true } },
  ],
});
