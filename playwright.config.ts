import { defineConfig, devices } from '@playwright/test';

const BASE = '/jnl-traders-business-system-demo/';
const PORT = 5174;

export default defineConfig({
  testDir: 'e2e',
  timeout: 60_000,
  expect: { timeout: 8_000 },
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: [['list'], ['html', { open: 'never' }]],
  use: {
    baseURL: process.env.LIVE_URL ?? `http://localhost:${PORT}${BASE}`,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    ...devices['Desktop Chrome'],
  },
  webServer: process.env.LIVE_URL
    ? undefined
    : {
        command: `npm run dev -- --port ${PORT} --strictPort`,
        url: `http://localhost:${PORT}${BASE}`,
        reuseExistingServer: true,
        timeout: 60_000,
      },
});
