import { execFileSync } from 'node:child_process';
import { expect, test } from '@playwright/test';

test.skip(process.env.DVB_PUBLIC_API_OUTAGE_QA !== '1', 'Opt-in local-only outage check; temporarily stops the API container.');

test('public API outage shows an honest retry state and recovers after API restart', async ({ page }) => {
  test.setTimeout(120_000);
  const baseURL = String(test.info().project.use.baseURL ?? process.env.BASE_URL ?? '');
  if (!baseURL.startsWith('http://127.0.0.1:')) throw new Error('Refusing to stop API outside the explicit localhost gateway.');
  const compose = ['compose', '--env-file', '.env.docker', '--env-file', '.env.ports'];
  const docker = (...args: string[]) => execFileSync('docker', [...compose, ...args], {
    cwd: process.cwd(), encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'], timeout: 30_000,
  });
  const healthy = async () => {
    try { return (await fetch(`${baseURL}/api/v1/health`, { cache: 'no-store' })).status === 200; }
    catch { return false; }
  };
  expect(await healthy()).toBe(true);
  const apiContainer = docker('ps', '-q', 'api').trim();
  if (!apiContainer) throw new Error('Local API container is not running.');
  let stopped = false;
  try {
    docker('stop', 'api');
    stopped = true;
    await expect.poll(healthy, { timeout: 20_000 }).toBe(false);
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/phong-nghi', { waitUntil: 'domcontentloaded' });
    await expect(page.getByRole('heading', { name: 'Chưa thể tải trang này' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Tải lại trang' })).toBeVisible();
    await expect(page.locator('.property-card')).toHaveCount(0);
    const width = await page.evaluate(() => document.documentElement.scrollWidth);
    expect(width).toBeLessThanOrEqual(391);

    docker('start', 'api');
    stopped = false;
    await expect.poll(healthy, { timeout: 50_000 }).toBe(true);
    await page.getByRole('button', { name: 'Tải lại trang' }).click();
    await expect(page.locator('main.page-stays')).toBeVisible({ timeout: 20_000 });
    await expect(page.getByRole('heading', { name: 'Chưa thể tải trang này' })).toHaveCount(0);
  } finally {
    if (stopped) docker('start', 'api');
    await expect.poll(healthy, { timeout: 50_000 }).toBe(true);
  }
});
