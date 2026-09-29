import { expect, test } from '@playwright/test';

test('public API hides the draft-only catalogue instead of falling back to fixtures', async ({ page, request }) => {
  const paths = ['stays', 'combos', 'destinations', 'articles', 'pages'];
  for (const path of paths) {
    const response = await request.get(`/api/v1/public/${path}`);
    expect(response.status(), path).toBe(200);
    expect((await response.json()).items).toEqual([]);
  }

  await page.goto('/');
  // Presentation settings may be bootstrapped, but must never synthesize
  // catalogue cards or a fixture-backed business hero.
  await expect(page.locator('main')).toHaveCount(1);
  await expect(page.locator('.home-content-order')).toHaveCount(1);
  await expect(page.locator('.stay-card, .lcard, .review-card')).toHaveCount(0);
  const homeText = await page.locator('body').innerText();
  expect(homeText).not.toMatch(/Mộc Sơn Homestay|An Nhiên Retreat|bản sao demo|Cẩm nang 48 giờ ở Cúc Phương/);

  const listing = await page.goto('/phong-nghi?demo=loading&fixture=extended');
  expect(listing?.status()).toBe(200);
  const listingText = await page.locator('body').innerText();
  expect(listingText).not.toMatch(/Mộc Sơn Homestay|An Nhiên Retreat|bản sao demo/);
  expect(await page.locator('.stay-card, .lcard').count()).toBe(0);
  await expect(page.locator('.stays-empty-state h2')).toBeVisible();
  await expect(page.locator('.stays-search, .stays-side--left, .stays-toolbar, .pager')).toHaveCount(0);
  await expect(page.getByRole('link', { name: 'Bản đồ' })).toHaveCount(0);
  for (const width of [390, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth), `empty stays overflow at ${width}px`).toBeLessThanOrEqual(width + 1);
    const advisorWithoutImage = page.locator('.advisor-card--no-image');
    if (await advisorWithoutImage.count()) {
      const advisorAction = advisorWithoutImage.locator('.advisor-card__cta');
      if (await advisorAction.count()) await advisorAction.click({ trial: true });
      const boxes = await advisorWithoutImage.evaluate((element) => {
        const title = element.querySelector('.advisor-card__title')!.getBoundingClientRect();
        const copy = element.querySelector('.advisor-card__text')!.getBoundingClientRect();
        const action = element.querySelector('.advisor-card__cta')!.getBoundingClientRect();
        const card = element.getBoundingClientRect();
        return { titleBottom: title.bottom, copyTop: copy.top, copyBottom: copy.bottom, actionTop: action.top, actionRight: action.right, cardRight: card.right };
      });
      expect(boxes.copyTop, `advisor copy overlaps title at ${width}px`).toBeGreaterThanOrEqual(boxes.titleBottom - 1);
      expect(boxes.actionTop, `advisor action overlaps copy at ${width}px`).toBeGreaterThanOrEqual(boxes.copyBottom - 1);
      expect(boxes.actionRight, `advisor action escapes card at ${width}px`).toBeLessThanOrEqual(boxes.cardRight + 1);
    }
  }

  const oldFixtureRoute = await page.goto('/phong-nghi/cuc-phuong-forest-homestay');
  expect(oldFixtureRoute?.status()).toBe(404);
  await expect(page.locator('h1')).toContainText('Không tìm thấy');
});

test('public navigation only contains current managed or shipped links', async ({ request }) => {
  const response = await request.get('/api/v1/public/navigation/primary');
  expect(response.status()).toBe(200);
  const items = await response.json() as Array<{ label: string; href: string }>;
  expect(items).toHaveLength(5);
  expect(items.map((item) => item.href)).toEqual(['/','/phong-nghi','/combo-du-lich','/diem-den','/lien-he']);
  expect(items.some((item) => /demo|fixture|mẫu/i.test(item.label + item.href))).toBe(false);
});

test('empty combo and destination catalogues do not show filters or open empty list dialogs', async ({ page, request }) => {
  for (const path of ['combos', 'destinations']) {
    const response = await request.get(`/api/v1/public/${path}`);
    expect(response.status()).toBe(200);
    expect((await response.json()).items).toEqual([]);
  }

  for (const width of [390, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto('/combo-du-lich');
    await expect(page.locator('.combo-list--empty .catalog-empty-state h3')).toBeVisible();
    await expect(page.locator('.combo-chips, .combo-sort')).toHaveCount(0);
    expect(await page.evaluate(() => document.documentElement.scrollWidth), `empty combos overflow at ${width}px`).toBeLessThanOrEqual(width + 1);

    await page.goto('/diem-den');
    await expect(page.locator('.dest-list--empty .catalog-empty-state h3')).toBeVisible();
    await expect(page.locator('.dest-filters, .dest-list__all')).toHaveCount(0);
    await expect(page.getByRole('dialog')).toHaveCount(0);
    expect(await page.evaluate(() => document.documentElement.scrollWidth), `empty destinations overflow at ${width}px`).toBeLessThanOrEqual(width + 1);
  }
});

test('public empty catalogue copy follows current settings without technical Admin language', async ({ page, request }) => {
  const response = await request.get('/api/v1/settings/public');
  expect(response.status()).toBe(200);
  const settings = await response.json() as Record<string, Record<string, unknown>>;
  const documentText = (value: unknown): string => {
    if (!value || typeof value !== 'object') return '';
    const node = value as { text?: unknown; content?: unknown[] };
    return `${typeof node.text === 'string' ? node.text : ''}${(node.content ?? []).map(documentText).join('')}`;
  };
  const assertCustomerCopy = async () => expect(await page.locator('main').innerText()).not.toMatch(/quản trị viên|Chưa có .*được xuất bản/i);

  await page.goto('/phong-nghi');
  await expect(page.locator('.stays-empty-state h2')).toHaveText(settings['catalog.staysPage'].emptyResultTitle as string);
  await assertCustomerCopy();
  await page.goto('/combo-du-lich');
  await expect(page.locator('.combo-list__sub')).toContainText(documentText(settings['catalog.combosPage'].listSubtitle));
  await expect(page.locator('.combo-list--empty .catalog-empty-state h3')).toHaveText(settings['catalog.combosPage'].emptyTitle as string);
  await assertCustomerCopy();
  await page.goto('/diem-den');
  await expect(page.locator('.dest-list .section-sub')).toContainText(documentText(settings['catalog.destinationsPage'].listSubtitle));
  await expect(page.locator('.dest-list--empty .catalog-empty-state h3')).toHaveText(settings['catalog.destinationsPage'].emptyTitle as string);
  await assertCustomerCopy();
  await page.goto('/bai-viet');
  await expect(page.locator('.static-page__excerpt')).toContainText(documentText(settings['catalog.articlesPage'].description));
  await assertCustomerCopy();
  await page.goto('/chuyen-trang');
  await expect(page.locator('.static-page__excerpt')).toContainText(documentText(settings['catalog.staticPages'].description));
  await assertCustomerCopy();
});
