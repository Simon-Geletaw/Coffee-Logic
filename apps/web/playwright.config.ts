import { defineConfig, devices } from '@playwright/test';

/**
 * End-to-end: shop → cart → checkout → (fake provider) → paid.
 *
 * Runs against a locally running web (3000) + api (3001) with PAYMENTS_FAKE=true
 * on the API, so no network and no real charges. Real Stripe/Chapa test-mode
 * runs are a manual/nightly concern, not a PR gate.
 *
 *   pnpm -C apps/web exec playwright install   # once, downloads browsers
 *   pnpm -C apps/web test:e2e
 */
export default defineConfig({
  testDir: './e2e',
  timeout: 60_000,
  expect: { timeout: 10_000 },
  fullyParallel: false,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [['github'], ['html', { open: 'never' }]] : 'list',
  use: {
    baseURL: process.env.E2E_WEB_URL ?? 'http://localhost:3000',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
});
