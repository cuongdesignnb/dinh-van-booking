import { randomUUID } from 'node:crypto';
import { expect, test } from '@playwright/test';
import { assertLocalPostgresCleanupAvailable, browserApi, createUniqueTestPng, signInAsOwner } from './admin/helpers';

type Kind = 'article' | 'page';
type Content = { id: string; version: number; title: string; slug: string; path: string; publicationStatus: string };
type Media = { id: string; altText: string | null; url: string };

const routeFor = (kind: Kind) => kind === 'article' ? '/bai-viet' : '/chuyen-trang';
const apiFor = (kind: Kind) => kind === 'article' ? '/public/articles' : '/public/pages';

test('article and specialist-page indexes show an honest empty state then 1–2 published API records', async ({ browser, page }) => {
  test.setTimeout(180_000);
  assertLocalPostgresCleanupAvailable();
  await signInAsOwner(page);

  const baseURL = String(test.info().project.use.baseURL ?? process.env.BASE_URL ?? '');
  expect(baseURL).toMatch(/^http:\/\/(127\.0\.0\.1|localhost):\d+$/);
  const marker = `ATG-INDEX-${randomUUID().slice(0, 10)}`;
  const alt = `${marker} ảnh QA danh sách`;
  const publicContext = await browser.newContext({ baseURL, reducedMotion: 'reduce' });
  const publicPage = await publicContext.newPage();
  const errors: string[] = [];
  publicPage.on('pageerror', (error) => errors.push(error.message));
  publicPage.on('response', (response) => { if (response.status() >= 500) errors.push(`${response.status()} ${response.url()}`); });
  const created = new Map<string, Content>();
  let mediaId: string | null = null;

  try {
    await publicPage.setViewportSize({ width: 390, height: 900 });
    for (const kind of ['article', 'page'] as const) {
      const baseline = await publicPage.request.get(`/api/v1${apiFor(kind)}`);
      expect(baseline.status()).toBe(200);
      expect((await baseline.json()).items).toEqual([]);
      const response = await publicPage.goto(routeFor(kind));
      expect(response?.status()).toBe(200);
      await expect(publicPage.locator('main h1')).toHaveCount(1);
      await expect(publicPage.locator('.static-page__empty-state')).toBeVisible();
      await expect(publicPage.locator('.static-page__index-card')).toHaveCount(0);
      await expect(publicPage.locator('.static-page__empty-state a[href="/"]')).toBeVisible();
      if (process.env.DVB_INDEX_VISUAL_ARTIFACTS === '1') {
        await publicPage.screenshot({ path: `artifacts/public-index-${kind}-empty-390.png`, fullPage: true });
      }
    }

    await page.goto('/admin/thu-vien-anh');
    await page.getByLabel('Alt mặc định cho ảnh tải lên').fill(alt);
    const uploadResponse = page.waitForResponse((response) => response.url().endsWith('/api/v1/media/upload') && response.request().method() === 'POST');
    await page.locator('.media-library__upload input[type="file"]').setInputFiles({
      name: `${marker.toLowerCase()}.png`, mimeType: 'image/png', buffer: createUniqueTestPng(Date.now()),
    });
    const uploaded = await uploadResponse;
    expect([200, 201]).toContain(uploaded.status());
    const media = await uploaded.json() as Media;
    mediaId = media.id;
    expect(media.altText).toBe(alt);

    for (const index of [1, 2]) {
      for (const kind of ['article', 'page'] as const) {
        const title = index === 1
          ? `${marker} ${kind === 'article' ? 'Bài viết' : 'Chuyên trang'} thứ nhất`
          : `${marker} ${kind === 'article' ? 'Bài viết' : 'Chuyên trang'} thứ hai với tiêu đề dài để kiểm tra xuống dòng trên màn hình nhỏ`;
        const slug = `${marker.toLowerCase()}-${kind}-${index}`;
        const result = await browserApi(page, '/content', 'POST', {
          kind, title, slug,
          excerpt: 'Nội dung kiểm thử danh sách được tạo trên local rồi xoá sau bài kiểm thử.',
          body: { type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'text', text: `Nội dung ${marker} chỉ dùng kiểm tra đường đi từ API đến trang danh sách và trang chi tiết. Không phải thông tin kinh doanh.` }] }] },
          metaTitle: title, metaDescription: `Mô tả kiểm thử ${marker}, không phải nội dung kinh doanh.`,
          noindex: true, media: [{ mediaId, role: 'cover', position: 0 }],
        });
        expect(result.status, JSON.stringify(result.body)).toBe(201);
        const draft = result.body as Content;
        created.set(draft.id, draft);
        const published = await browserApi(page, `/content/${draft.id}/status`, 'PATCH', { status: 'published', expectedVersion: draft.version });
        expect(published.status, JSON.stringify(published.body)).toBe(200);
        created.set(draft.id, published.body as Content);

        const list = await publicPage.request.get(`/api/v1${apiFor(kind)}`);
        expect(list.status()).toBe(200);
        expect((await list.json()).items.filter((item: { title: string }) => item.title.startsWith(marker))).toHaveLength(index);
        for (const width of [390, 768, 1440, 1920]) {
          await publicPage.setViewportSize({ width, height: 900 });
          const response = await publicPage.goto(routeFor(kind));
          expect(response?.status()).toBe(200);
          await expect(publicPage.locator('main h1')).toHaveCount(1);
          await expect(publicPage.locator('.static-page__empty-state')).toHaveCount(0);
          await expect(publicPage.locator('.static-page__index-card')).toHaveCount(index);
          await expect(publicPage.locator('.static-page__index-card', { hasText: title })).toBeVisible();
          const geometry = await publicPage.evaluate(() => ({ document: document.documentElement.scrollWidth, body: document.body.scrollWidth }));
          expect(geometry.document, JSON.stringify({ kind, index, width, geometry })).toBeLessThanOrEqual(width + 1);
          expect(geometry.body, JSON.stringify({ kind, index, width, geometry })).toBeLessThanOrEqual(width + 1);
          if (index === 2 && (width === 390 || width === 1440) && process.env.DVB_INDEX_VISUAL_ARTIFACTS === '1') {
            await publicPage.screenshot({ path: `artifacts/public-index-${kind}-${width}.png`, fullPage: true });
          }
        }
        const detailLink = publicPage.locator('.static-page__index-card', { hasText: title }).getByRole('link', { name: title }).last();
        await expect(detailLink).toHaveAttribute('href', (published.body as Content).path);
        await detailLink.click();
        await expect(publicPage.locator('main h1')).toHaveText(title);
      }
    }
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

  for (const kind of ['article', 'page'] as const) {
    const list = await page.request.get(`/api/v1${apiFor(kind)}`);
    expect((await list.json()).items).toEqual([]);
    await page.goto(routeFor(kind));
    await expect(page.locator('.static-page__empty-state')).toBeVisible();
  }
});
