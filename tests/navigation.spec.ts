import { expect, test } from '@playwright/test';

test.describe('floating menu (desktop)', () => {
  test.use({ viewport: { width: 1448, height: 900 } });

  test('floats at the right edge and opens the right-hand drawer', async ({ page }) => {
    await page.goto('/');
    const button = page.locator('.menu-float');
    await expect(button).toBeVisible();

    // It follows the screen while scrolling.
    const first = await button.boundingBox();
    await page.evaluate(() => window.scrollTo({ top: 400, behavior: 'instant' }));
    await page.waitForTimeout(200);
    const box = await button.boundingBox();
    expect(Math.round(box!.y)).toBe(Math.round(first!.y));
    const width = page.viewportSize()!.width;
    expect(box!.x + box!.width).toBeGreaterThan(width - 40);

    await button.click();
    const drawer = page.locator('.drawer[data-open] .drawer__panel');
    await expect(drawer).toBeVisible();
    // The panel is anchored to the right edge.
    const panel = await drawer.boundingBox();
    expect(panel!.x + panel!.width).toBeGreaterThan(width - 4);

    await page.keyboard.press('Escape');
    await expect(page.locator('.drawer[data-open]')).toHaveCount(0);
    await expect(button).toBeFocused();
  });

  test('drawer navigates and closes', async ({ page }) => {
    await page.goto('/');
    await page.locator('.menu-float').click();
    await page.locator('.drawer__panel').getByRole('link', { name: 'Combo du lịch' }).click();
    await expect(page).toHaveURL(/\/combo-du-lich/);
    await expect(page.locator('.drawer[data-open]')).toHaveCount(0);
  });
});

test.describe('mobile navigation', () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test('bottom bar follows the screen and marks the current page', async ({ page }) => {
    await page.goto('/phong-nghi');
    const bar = page.locator('.mobilebar');
    await expect(bar).toBeVisible();
    await expect(bar.getByRole('link', { name: 'Phòng nghỉ' })).toHaveAttribute('aria-current', 'page');

    const before = await bar.boundingBox();
    await page.mouse.wheel(0, 1600);
    await page.waitForTimeout(300);
    const after = await bar.boundingBox();
    expect(Math.round(after!.y)).toBe(Math.round(before!.y));
    expect(Math.round(after!.y + after!.height)).toBeLessThanOrEqual(844);

    // Every tap target is comfortable on a phone.
    for (const link of await bar.getByRole('link').all()) {
      const box = await link.boundingBox();
      expect(box!.height).toBeGreaterThanOrEqual(44);
    }

    await bar.getByRole('link', { name: 'Liên hệ' }).click();
    await expect(page).toHaveURL(/\/lien-he/);
    await expect(bar.getByRole('link', { name: 'Liên hệ' })).toHaveAttribute('aria-current', 'page');
  });

  test('the bar never covers the page footer', async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => window.scrollTo({ top: document.body.scrollHeight, behavior: 'instant' }));
    await page.waitForTimeout(400);
    const overlap = await page.evaluate(() => {
      const bar = document.querySelector('.mobilebar')!.getBoundingClientRect();
      const last = document.querySelector('.footer__copy, .site-footer')!.getBoundingClientRect();
      return last.bottom - bar.top;
    });
    expect(overlap).toBeLessThanOrEqual(0);
  });

  test('the hamburger lives in the header and opens the drawer', async ({ page }) => {
    await page.goto('/');
    const toggle = page.locator('.menu-toggle');
    await expect(toggle).toBeVisible();
    // The floating pill is a desktop-only affordance.
    await expect(page.locator('.menu-float')).toBeHidden();

    // It sits in the header row, next to the search button.
    const header = await page.locator('.site-header__inner').boundingBox();
    const box = await toggle.boundingBox();
    expect(box!.y).toBeLessThan(header!.y + header!.height);
    expect(box!.x + box!.width).toBeGreaterThan(page.viewportSize()!.width - 60);
    expect(box!.height).toBeGreaterThanOrEqual(44);

    await toggle.click();
    await expect(page.locator('.drawer[data-open]')).toHaveCount(1);
    await expect(page.locator('.mobilebar')).toBeHidden();

    await page.keyboard.press('Escape');
    await expect(page.locator('.drawer[data-open]')).toHaveCount(0);
    await expect(toggle).toBeFocused();
    await expect(page.locator('.mobilebar')).toBeVisible();
  });

  test('admin keeps its own layout without the public bar', async ({ page }) => {
    await page.goto('/admin');
    await expect(page.locator('.mobilebar')).toHaveCount(0);
    await expect(page.locator('.menu-float')).toHaveCount(0);
    const pad = await page.evaluate(() => getComputedStyle(document.body).paddingBottom);
    expect(pad).toBe('0px');
  });
});

for (const width of [1440, 1280, 1024, 900, 768, 430, 390, 375, 360]) {
  test(`no horizontal overflow at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    for (const path of ['/', '/phong-nghi', '/phong-nghi/cuc-phuong-forest-homestay', '/combo-du-lich', '/diem-den', '/lien-he']) {
      await page.goto(path);
      await page.waitForTimeout(1800);
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
      expect(overflow, `${path} @ ${width}`).toBeLessThanOrEqual(0);
    }
  });
}
