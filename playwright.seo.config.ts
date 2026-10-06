import { defineConfig } from '@playwright/test';

/** Pure unit tests for SEO rules (`npm run seo:test`): no browser, no web server. */
export default defineConfig({
  testDir: 'tests/seo-unit',
  timeout: 30_000,
  reporter: 'list',
});
