import { expect, test } from '@playwright/test';
import { signInAsOwner } from './helpers';

for (const width of [390, 1440]) {
  test(`Dải cam kết dùng chiều ngang cân đối tại ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await signInAsOwner(page);
    await page.goto('/admin/cai-dat');
    const card = page.locator('[data-setting-key="home.trust"]');
    await expect(card).toBeVisible();
    const grid = card.locator('.settings-form__grid').first();
    const toggle = grid.locator(':scope > .settings-form__toggle-field');
    const array = grid.locator(':scope > .settings-form__array');
    await expect(toggle).toBeVisible();
    await expect(array).toBeVisible();
    const [gridBox, toggleBox, arrayBox] = await Promise.all([grid.boundingBox(), toggle.boundingBox(), array.boundingBox()]);
    expect(gridBox && toggleBox && arrayBox).toBeTruthy();
    expect(Math.abs(arrayBox!.x - gridBox!.x)).toBeLessThan(2);
    expect(arrayBox!.width).toBeGreaterThan(gridBox!.width * 0.95);
    expect(toggleBox!.y + toggleBox!.height).toBeLessThanOrEqual(arrayBox!.y + 2);
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(width + 1);
    if (width === 1440 && process.env.DVB_HOME_DENSITY_ARTIFACTS === '1') {
      await card.screenshot({ path: 'artifacts/admin-trust-layout-1440.png' });
    }
  });
}
