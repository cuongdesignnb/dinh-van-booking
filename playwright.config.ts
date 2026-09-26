import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: 'tests',
  timeout: 60_000,
  use: { baseURL: process.env.BASE_URL ?? 'http://localhost:3100' },
  ...(!process.env.BASE_URL ? {
    webServer: {
      command: 'npm run start -- -p 3100',
      url: 'http://localhost:3100',
      reuseExistingServer: true,
      timeout: 120_000,
    },
  } : {}),
});
