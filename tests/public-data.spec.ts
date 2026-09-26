import { expect, test } from '@playwright/test';

test('public API hides the draft-only catalogue instead of falling back to fixtures', async ({ page, request }) => {
  const paths = ['stays', 'combos', 'destinations', 'articles', 'pages'];
  for (const path of paths) {
    const response = await request.get(`/api/v1/public/${path}`);
    expect(response.status(), path).toBe(200);
    expect((await response.json()).items).toEqual([]);
  }

  await page.goto('/');
  await expect(page.locator('h1')).toContainText('Cúc Phương');
  const homeText = await page.locator('body').innerText();
  expect(homeText).not.toMatch(/Mộc Sơn Homestay|An Nhiên Retreat|bản sao demo|Cẩm nang 48 giờ ở Cúc Phương/);

  const listing = await page.goto('/phong-nghi?demo=loading&fixture=extended');
  expect(listing?.status()).toBe(200);
  const listingText = await page.locator('body').innerText();
  expect(listingText).not.toMatch(/Mộc Sơn Homestay|An Nhiên Retreat|bản sao demo/);
  expect(await page.locator('.stay-card, .lcard').count()).toBe(0);

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
