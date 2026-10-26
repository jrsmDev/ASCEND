// @ts-check
import { defineConfig, devices } from '@playwright/test';

/**
 * openGym E2E Test Configuration
 *
 * These tests run against the full Docker Compose stack.
 * Start the stack before running tests:
 *   docker compose up -d
 *   npx playwright test
 *
 * Or test against the dev server:
 *   cd frontend && npm run dev  (in one terminal)
 *   npx playwright test         (in another)
 */
export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'html',
  timeout: 30000,

  use: {
    baseURL: process.env.E2E_BASE_URL || 'http://localhost:8080',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'mobile-chrome',
      use: { ...devices['Pixel 5'] },
    },
  ],
});
