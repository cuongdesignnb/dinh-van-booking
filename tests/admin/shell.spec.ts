import { expect, test, type Page } from '@playwright/test';

const ROUTES: [string, string][] = [
  ['/admin', 'Tổng quan'],
  ['/admin/dat-phong', 'Quản lý đặt phòng'],
  ['/admin/phong-nghi', 'Quản lý phòng nghỉ'],
  ['/admin/combo-du-lich', 'Quản lý combo du lịch'],
  ['/admin/diem-den', 'Quản lý điểm đến & nội dung'],
  ['/admin/noi-dung', 'Quản lý điểm đến & nội dung'],
  ['/admin/khach-hang', 'Khách hàng & yêu cầu tư vấn'],
  ['/admin/yeu-cau-tu-van', 'Khách hàng & yêu cầu tư vấn'],
];

const ACTIVE: Record<string, string> = {
  '/admin': 'Tổng quan',
  '/admin/dat-phong': 'Đặt phòng',
  '/admin/phong-nghi': 'Phòng nghỉ',
  '/admin/combo-du-lich': 'Combo du lịch',
  '/admin/diem-den': 'Điểm đến',
  '/admin/noi-dung': 'Nội dung website',
  '/admin/khach-hang': 'Khách hàng',
  '/admin/yeu-cau-tu-van': 'Yêu cầu tư vấn',
};

const collectErrors = (page: Page) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  page.on('console', (m) => {
    if (m.type() === 'error' && !m.text().includes('Failed to load resource')) errors.push(m.text());
  });
  return errors;
};

test.describe('admin shell', () => {
  test.use({ viewport: { width: 1448, height: 1086 } });

  for (const [route, title] of ROUTES) {
    test(`${route}: title, active menu, Vietnamese text, no console errors`, async ({ page }) => {
      const errors = collectErrors(page);
      const res = await page.goto(route);
      expect(res?.status()).toBe(200);
      await expect(page.locator('h1')).toHaveCount(1);
      await expect(page.locator('h1')).toContainText(title);
      await expect(page.locator('.asidebar [aria-current="page"]')).toContainText(ACTIVE[route]);

      const text = await page.evaluate(() => document.body.innerText);
      expect(text).not.toMatch(/Ä‘|Æ°|áº|á»|�|undefined|NaN/);
      // The brand is "Đinh Vân", never the mockup's "Đinh Văn".
      expect(text).not.toContain('Đinh Văn');
      expect(text).toContain('Đinh Vân');

      // Icon-only controls must carry an accessible name and a rendered SVG.
      const badIcons = await page.evaluate(() =>
        [...document.querySelectorAll('button, a')]
          .filter((b) => b.getClientRects().length && !b.textContent?.trim() && !b.querySelector('img'))
          .filter((b) => !b.getAttribute('aria-label') && !b.querySelector('.sr-only'))
          .map((b) => b.className),
      );
      expect(badIcons).toEqual([]);
      expect(await page.locator('a[href="#"]').count()).toBe(0);
      expect(errors).toEqual([]);
    });
  }

  test('modules out of scope explain themselves instead of 404', async ({ page }) => {
    for (const route of ['/admin/khuyen-mai', '/admin/thanh-toan', '/admin/bao-cao', '/admin/cai-dat']) {
      const res = await page.goto(route);
      expect(res?.status()).toBe(200);
      await expect(page.locator('.apending')).toContainText('chưa nằm trong phạm vi');
    }
  });

  test('global search finds a booking and returns focus on Escape', async ({ page }) => {
    await page.goto('/admin');
    await page.keyboard.press('Control+k');
    const dialog = page.locator('.apalette__panel');
    await expect(dialog).toBeVisible();
    await page.keyboard.type('DP2403');
    await expect(dialog.locator('.apalette__hit').first()).toContainText('#DP2403');
    await page.keyboard.press('Enter');
    await expect(page).toHaveURL(/\/admin\/dat-phong\?selected=dp2403/);
    await expect(page.locator('.bk__detail-code')).toHaveText('#DP2403');

    await page.keyboard.press('Control+k');
    await page.keyboard.press('Escape');
    await expect(page.locator('.apalette__panel')).toHaveCount(0);
    await expect(page.locator('.atop__search')).toBeFocused();
  });

  test('notifications and the date range act on the same data', async ({ page }) => {
    await page.goto('/admin');
    await page.getByRole('button', { name: /Thông báo/ }).click();
    const unread = Number((await page.locator('.apop__badge').first().textContent()) ?? '0');
    expect(unread).toBeGreaterThan(0);
    await page.getByRole('button', { name: 'Đánh dấu đã đọc' }).click();
    await expect(page.locator('.anav__badge')).toHaveCount(0);

    await page.keyboard.press('Escape');
    await page.locator('.atop__range').click();
    await page.getByRole('button', { name: 'Hôm nay (15/11/2024)' }).click();
    await expect(page.locator('.atop__range')).toContainText('15/11/2024 - 15/11/2024');
    await expect(page.locator('.kpi').nth(1)).toContainText('Doanh thu');
  });

  test('viewer role cannot mutate demo data', async ({ page }) => {
    await page.goto('/admin/dat-phong');
    await page.getByRole('button', { name: /Đinh Vân/ }).click();
    await page.getByLabel('Chỉ xem').check();
    await page.keyboard.press('Escape');
    await page.locator('.bk__table tbody tr').first().click();
    const confirm = page.getByRole('button', { name: 'Xác nhận', exact: true });
    if (await confirm.isEnabled()) {
      await confirm.click();
      await page.getByRole('button', { name: 'Xác nhận đơn' }).click();
      await expect(page.locator('.atoast--error')).toContainText('Chỉ xem');
    }
  });
});

for (const [width, height] of [
  [1280, 900],
  [1024, 900],
  [768, 1024],
  [390, 844],
] as const) {
  test(`responsive ${width}px: no horizontal overflow on any admin screen`, async ({ page }) => {
    await page.setViewportSize({ width, height });
    for (const [route] of ROUTES) {
      await page.goto(route);
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
      expect(overflow, route).toBeLessThanOrEqual(0);
    }
  });
}

test('mobile: the sidebar opens as a drawer', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/admin');
  await expect(page.locator('.asidebar')).not.toBeInViewport();
  await page.getByRole('button', { name: 'Mở menu quản trị' }).click();
  await expect(page.locator('.asidebar')).toBeInViewport();
  await page.locator('.asidebar').getByRole('link', { name: 'Đặt phòng', exact: true }).click();
  await expect(page).toHaveURL(/\/admin\/dat-phong/);
});
