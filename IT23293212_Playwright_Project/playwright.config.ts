import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  // Avoid hammering the public translator site.
  workers: process.env.CI ? 1 : (process.env.PW_WORKERS ? Number(process.env.PW_WORKERS) : 1),
  reporter: [['html', { open: 'never' }]],
  use: {
    trace: 'on-first-retry'
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] }
    }
  ]
});
