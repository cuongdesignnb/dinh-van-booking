import { randomUUID } from 'node:crypto';
import { expect, test } from '@playwright/test';
import { assertLocalPostgresCleanupAvailable, browserApi, createUniqueTestPng, signInAsOwner } from './admin/helpers';

type Content = { id: string; version: number; title: string; slug: string; publicationStatus: string };
type Media = { id: string; altText: string | null };

test('public combo audience filters and price sorting reflect persisted CMS data', async ({ browser, page }) => {
  test.setTimeout(180_000);
  assertLocalPostgresCleanupAvailable();
  const baseURL = String(test.info().project.use.baseURL ?? process.env.BASE_URL ?? '');
  expect(baseURL).toMatch(/^http:\/\/(127\.0\.0\.1|localhost):\d+$/);
  await signInAsOwner(page);

  const marker = `ATG-COMBO-FILTER-${randomUUID().slice(0, 10)}`;
  const alt = `${marker} ảnh kiểm thử combo local`;
  const created = new Map<string, Content>();
  let mediaId: string | null = null;
  const publicContext = await browser.newContext({ baseURL, reducedMotion: 'reduce' });
  const publicPage = await publicContext.newPage();
  const errors: string[] = [];
  publicPage.on('pageerror', (error) => errors.push(error.message));
  publicPage.on('response', (response) => { if (response.status() >= 500) errors.push(`${response.status()} ${response.url()}`); });

  const plans = [
    { suffix: 'A', audienceTags: ['Gia đình'], days: 2, nights: 1, price: 350_000, unit: 'person' },
    { suffix: 'B', audienceTags: ['cap-doi'], days: 3, nights: 2, price: 650_000, unit: 'booking' },
    { suffix: 'C', audienceTags: ['Gia đình', 'Nhóm – Team'], days: 2, nights: 1, price: null, unit: 'person' },
    { suffix: 'D', audienceTags: ['Trải nghiệm thiên nhiên'], days: 3, nights: 2, price: 0, unit: 'person' },
  ] as const;

  try {
    const filename = `${marker.toLowerCase()}.png`;
    const base64 = createUniqueTestPng(Date.now()).toString('base64');
    const upload = await page.evaluate(async ({ base64, filename, alt }) => {
      const bytes = Uint8Array.from(atob(base64), (char) => char.charCodeAt(0));
      const form = new FormData();
      form.append('altText', alt);
      form.append('file', new Blob([bytes], { type: 'image/png' }), filename);
      const cookie = document.cookie.split('; ').find((part) => part.startsWith('dvb_csrf='));
      const response = await fetch('/api/v1/media/upload', { method: 'POST', credentials: 'include', headers: cookie ? { 'x-csrf-token': decodeURIComponent(cookie.slice('dvb_csrf='.length)) } : {}, body: form });
      return { status: response.status, body: await response.json() };
    }, { base64, filename, alt });
    expect([200, 201]).toContain(upload.status);
    const media = upload.body as Media;
    mediaId = media.id;
    expect(media.altText).toBe(alt);

    for (const plan of plans) {
      const title = `${marker}-${plan.suffix}`;
      const slug = title.toLowerCase();
      const result = await browserApi(page, '/content', 'POST', {
        kind: 'combo', title, slug, noindex: true,
        excerpt: `Combo ${title} chỉ dùng kiểm thử bộ lọc và giá tại local; không phải sản phẩm kinh doanh.`,
        body: { type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'text', text: `Nội dung kiểm thử ${title} được tạo trên local để xác nhận dữ liệu đi từ CMS qua API tới bộ lọc và sắp xếp. Bản ghi sẽ bị xoá sau khi chạy xong.` }] }] },
        metaTitle: title, metaDescription: `Mô tả kiểm thử ${title}, không phải nội dung kinh doanh.`,
        media: [{ mediaId, role: 'cover', position: 0 }],
        details: { combo: {
          code: title, durationDays: plan.days, durationNights: plan.nights,
          pricingUnit: plan.unit, audienceTags: [...plan.audienceTags],
          inclusions: ['Thông tin kiểm thử'], exclusions: [], terms: [],
          days: [{ dayNo: 1, title: 'Ngày kiểm thử', activities: [{ text: 'Hoạt động QA local' }] }],
          departures: plan.price === null ? [] : [{ departureDate: '2026-11-20', returnDate: plan.nights === 1 ? '2026-11-21' : '2026-11-22', capacity: 10, adultPriceVnd: plan.price, status: 'open' }],
        } },
      });
      expect(result.status, JSON.stringify(result.body)).toBe(201);
      const draft = result.body as Content;
      created.set(draft.id, draft);
      const published = await browserApi(page, `/content/${draft.id}/status`, 'PATCH', { status: 'published', expectedVersion: draft.version });
      expect(published.status, JSON.stringify(published.body)).toBe(200);
      created.set(draft.id, published.body as Content);
    }

    const api = await publicPage.request.get('/api/v1/public/combos');
    expect(api.status()).toBe(200);
    const rows = (await api.json() as { items: Array<{ title: string; audienceTags: string[]; fromPriceVnd: number | null }> }).items
      .filter((item) => item.title.startsWith(marker));
    expect(rows).toHaveLength(4);
    expect(rows.find((item) => item.title.endsWith('-A'))).toMatchObject({ audienceTags: ['Gia đình'], fromPriceVnd: 350_000 });
    expect(rows.find((item) => item.title.endsWith('-B'))).toMatchObject({ audienceTags: ['cap-doi'], fromPriceVnd: 650_000 });
    expect(rows.find((item) => item.title.endsWith('-C'))).toMatchObject({ audienceTags: ['Gia đình', 'Nhóm – Team'], fromPriceVnd: null });
    expect(rows.find((item) => item.title.endsWith('-D'))).toMatchObject({ audienceTags: ['Trải nghiệm thiên nhiên'], fromPriceVnd: 0 });

    const qaCards = publicPage.locator('.ccard').filter({ hasText: marker });
    for (const width of [390, 1440]) {
      await publicPage.setViewportSize({ width, height: 900 });
      const response = await publicPage.goto('/combo-du-lich');
      expect(response?.status()).toBe(200);
      await expect(qaCards).toHaveCount(4);
      const scrollWidth = await publicPage.evaluate(() => document.documentElement.scrollWidth);
      expect(scrollWidth, `combo page overflows at ${width}px`).toBeLessThanOrEqual(width + 1);
    }

    await publicPage.getByRole('button', { name: 'Gia đình' }).click();
    await expect(qaCards).toHaveCount(2);
    await expect(qaCards.filter({ hasText: `${marker}-A` })).toBeVisible();
    await expect(qaCards.filter({ hasText: `${marker}-C` })).toBeVisible();
    await publicPage.getByRole('button', { name: 'Cặp đôi' }).click();
    await expect(qaCards).toHaveCount(1);
    await expect(qaCards).toContainText(`${marker}-B`);
    await publicPage.getByRole('button', { name: 'Nhóm – Team' }).click();
    await expect(qaCards).toHaveCount(1);
    await expect(qaCards).toContainText(`${marker}-C`);
    await publicPage.getByRole('button', { name: 'Trải nghiệm thiên nhiên' }).click();
    await expect(qaCards).toHaveCount(1);
    await expect(qaCards).toContainText(`${marker}-D`);
    await publicPage.getByRole('button', { name: '2N1D' }).click();
    await expect(qaCards).toHaveCount(2);
    await expect(qaCards.filter({ hasText: `${marker}-A` })).toBeVisible();
    await expect(qaCards.filter({ hasText: `${marker}-C` })).toBeVisible();
    await publicPage.getByRole('button', { name: '3N2D' }).click();
    await expect(qaCards).toHaveCount(2);
    await expect(qaCards.filter({ hasText: `${marker}-B` })).toBeVisible();
    await expect(qaCards.filter({ hasText: `${marker}-D` })).toBeVisible();
    await publicPage.getByRole('button', { name: 'Tất cả combo' }).click();

    const sort = publicPage.locator('.combo-sort select');
    await sort.selectOption('price-asc');
    await expect.poll(async () => (await qaCards.locator('.ccard__title').allTextContents()).slice(0, 2)).toEqual([`${marker}-A`, `${marker}-B`]);
    await sort.selectOption('price-desc');
    await expect.poll(async () => (await qaCards.locator('.ccard__title').allTextContents()).slice(0, 2)).toEqual([`${marker}-B`, `${marker}-A`]);
    expect((await qaCards.locator('.ccard__title').allTextContents()).slice(2).sort()).toEqual([`${marker}-C`, `${marker}-D`]);
    await expect(qaCards.filter({ hasText: `${marker}-C` })).toContainText('Liên hệ để nhận giá');
    await expect(qaCards.filter({ hasText: `${marker}-D` })).toContainText('Liên hệ để nhận giá');

    await qaCards.filter({ hasText: `${marker}-C` }).getByRole('button', { name: /Xem chi tiết/ }).click();
    await expect(publicPage.locator('.dialog--combo')).toContainText(`${marker}-C`);
    await expect(publicPage.locator('.dialog--combo')).toContainText('Liên hệ để nhận giá');
    await expect(publicPage.locator('.dialog--combo a[href^="/dat-phong"]')).toHaveCount(0);
    await publicPage.locator('.dialog--combo').getByRole('button', { name: /Liên hệ/ }).click();
    await expect(publicPage).toHaveURL(new RegExp(`/lien-he\\?intent=combo&item=${marker.toLowerCase()}-c`));

    await page.goto(`/admin/combo-du-lich?edit=${created.values().next().value?.id}`);
    await expect(page.getByRole('checkbox', { name: 'Gia đình' })).toBeChecked();
    expect(errors).toEqual([]);
  } finally {
    for (const [id, own] of created) {
      const fresh = await browserApi(page, `/content/${id}`);
      if (fresh.status !== 200) continue;
      let current = fresh.body as Content;
      if (current.title !== own.title || current.slug !== own.slug) continue;
      if (current.publicationStatus === 'published') {
        const drafted = await browserApi(page, `/content/${id}/status`, 'PATCH', { status: 'draft', expectedVersion: current.version });
        expect(drafted.status).toBe(200);
        current = drafted.body as Content;
      }
      expect((await browserApi(page, `/content/${id}?expectedVersion=${current.version}`, 'DELETE')).status).toBe(204);
    }
    if (mediaId) {
      const result = await browserApi(page, `/media?search=${encodeURIComponent(alt)}`);
      if (result.status === 200 && (result.body as { items: Media[] }).items.some((item) => item.id === mediaId && item.altText === alt)) {
        expect((await browserApi(page, `/media/${mediaId}`, 'DELETE')).status).toBe(204);
      }
    }
    await publicContext.close();
  }
});
