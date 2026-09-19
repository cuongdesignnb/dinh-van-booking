import { expect, test, type Page } from '@playwright/test';

const collectErrors = (page: Page) => {
  const errors: string[] = [];
  page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
  page.on('pageerror', (e) => errors.push(String(e)));
  page.on('requestfailed', (r) => errors.push(`failed: ${r.url()}`));
  return errors;
};

test.describe('desktop 1448', () => {
  test.use({ viewport: { width: 1448, height: 1086 } });

  test('renders structure, fonts and icons without errors', async ({ page }) => {
    const errors = collectErrors(page);
    await page.goto('/');
    await expect(page.locator('h1')).toHaveCount(1);
    await expect(page.locator('h1')).toContainText('Đặt phòng Cúc Phương');
    await expect(page.locator('.stay')).toHaveCount(4);
    await expect(page.locator('.destination-grid > li')).toHaveCount(5);

    const fonts = await page.evaluate(async () => {
      await document.fonts.ready;
      const loaded = [...document.fonts].filter((f) => f.status === 'loaded').map((f) => f.family);
      const fam = (sel: string) => getComputedStyle(document.querySelector(sel)!).fontFamily;
      return { loaded, h1: fam('h1'), body: fam('body'), script: fam('.hero__signature') };
    });
    expect(fonts.loaded.some((f) => /Playfair/i.test(f))).toBeTruthy();
    expect(fonts.loaded.some((f) => /Roboto Condensed/i.test(f))).toBeTruthy();
    expect(fonts.loaded.some((f) => /Dancing Script/i.test(f))).toBeTruthy();
    expect(fonts.h1).toMatch(/Playfair/i);
    expect(fonts.body).toMatch(/Roboto Condensed/i);
    expect(fonts.script).toMatch(/Dancing Script/i);

    // Every icon-only control contains a visible, non-empty SVG.
    const badIcons = await page.evaluate(() =>
      [...document.querySelectorAll('button[aria-label]:not(.dot-btn), a[aria-label]')]
        .filter((b) => b.getClientRects().length && !b.textContent?.trim())
        .filter((b) => {
          const svg = b.querySelector('svg');
          const r = svg?.getBoundingClientRect();
          return !svg || !r || r.width === 0 || r.height === 0;
        })
        .map((b) => b.getAttribute('aria-label')),
    );
    expect(badIcons).toEqual([]);

    const text = await page.evaluate(() => document.body.innerText);
    expect(text).not.toMatch(/Ä‘|Æ°|áº|á»|�/);
    expect(errors).toEqual([]);
  });

  test('date range, guests and search dialog', async ({ page }) => {
    await page.goto('/');
    await page.locator('.search__submit').click();
    await expect(page.locator('.search__error')).toHaveText('Vui lòng chọn ngày nhận phòng.');

    await page.getByRole('button', { name: /Ngày nhận phòng/ }).click();
    const days = page.locator('.popover .calendar__day:not([disabled])');
    await days.nth(3).click();
    // Picking an earlier day for check-out shows a Vietnamese error.
    await days.nth(1).click();
    await expect(page.locator('.calendar__error')).toContainText('Ngày trả phòng phải sau ngày nhận phòng');
    await days.nth(5).click();
    await expect(page.locator('.popover')).toHaveCount(0);
    await expect(page.getByRole('button', { name: /Ngày trả phòng/ })).not.toContainText('Chọn ngày');

    await page.getByRole('button', { name: /Số khách/ }).click();
    await page.getByRole('button', { name: 'Tăng trẻ em' }).click();
    await page.keyboard.press('Escape');
    await expect(page.getByRole('button', { name: /Số khách/ })).toContainText('3 khách');

    await page.locator('.search__submit').click();
    const dialog = page.locator('dialog.dialog[open]');
    await expect(dialog).toContainText('Gợi ý phòng nghỉ cho bạn');
    await expect(dialog).toContainText('tình trạng phòng sẽ được xác nhận khi tư vấn');
    await page.keyboard.press('Escape');
    await expect(dialog).toHaveCount(0);
  });

  test('favorites, details, contact and header actions', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: 'Lưu An Nhiên Retreat' }).click();
    await expect(page.getByRole('button', { name: 'Bỏ lưu An Nhiên Retreat' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    await page.reload();
    await expect(page.getByRole('button', { name: 'Bỏ lưu An Nhiên Retreat' })).toBeVisible();

    await page.getByRole('button', { name: /Xem chi tiết Mộc Sơn Homestay/ }).click();
    await expect(page.locator('dialog[open] h2')).toHaveText('Mộc Sơn Homestay');
    await page.getByRole('button', { name: 'Đóng hộp thoại' }).click();
    await expect(page.locator('dialog[open]')).toHaveCount(0);

    await page.getByRole('button', { name: 'Nhắn Zalo ngay' }).click();
    await expect(page.locator('dialog[open]')).toContainText('Thông tin liên hệ đang được cập nhật');
    await page.keyboard.press('Escape');

    await page.locator('.nav').getByRole('button', { name: 'Combo du lịch' }).click();
    await expect(page.locator('dialog[open] h2')).toHaveText('Tư vấn combo du lịch');
    await page.keyboard.press('Escape');

    await page.getByRole('button', { name: 'Nhận xét tiếp theo' }).click();
    await expect(page.locator('.review-card__author')).not.toHaveText('Nguyễn Thu Hà');

    await page.locator('.btn--header').click();
    await expect(page.getByRole('button', { name: /Ngày nhận phòng/ })).toBeFocused();
  });
});

for (const [width, height] of [
  [1024, 900],
  [768, 1024],
  [390, 844],
  [375, 812],
] as const) {
  test(`responsive ${width}px: no horizontal overflow, menu works`, async ({ page }) => {
    await page.setViewportSize({ width, height });
    const errors = collectErrors(page);
    await page.goto('/');
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    );
    expect(overflow).toBeLessThanOrEqual(0);
    if (width < 1024) {
      await page.getByRole('button', { name: 'Mở menu' }).click();
      const drawer = page.locator('#mobile-drawer');
      await expect(drawer).toBeInViewport();
      await drawer.getByRole('link', { name: 'Liên hệ' }).click();
      await expect(drawer).not.toBeInViewport();
    } else {
      await expect(page.locator('.nav')).toBeVisible();
    }
    expect(errors).toEqual([]);
  });
}
