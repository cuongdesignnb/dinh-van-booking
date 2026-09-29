import { randomUUID } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { expect, test } from '@playwright/test';
import { assertLocalPostgresCleanupAvailable, browserApi, signInAsOwner } from './admin/helpers';

const TEST_WEBP = readFileSync(join(process.cwd(), 'public/images/dinh-van-booking/stays/cuc-phuong-bungalow.webp'));
const widths = [390, 768, 1024, 1440, 1920];

type ContentRecord = { id: string; version: number; title: string; slug: string; path: string; publicationStatus: string };
type MediaRecord = { id: string; altText: string | null; url: string };

test('published article and standalone page render long-form API content without page overflow', async ({ browser, page }) => {
  test.setTimeout(180_000);
  assertLocalPostgresCleanupAvailable();
  await signInAsOwner(page);

  const marker = `ATG-RICH-${randomUUID().slice(0, 12)}`;
  const alt = `${marker} ảnh nội dung kiểm thử`;
  const entries = [
    { kind: 'page', slug: `${marker.toLowerCase()}-page`, title: `${marker} Chính sách và câu hỏi thường gặp khi chuẩn bị hành trình Cúc Phương` },
    { kind: 'article', slug: `${marker.toLowerCase()}-article`, title: `${marker} Cẩm nang tham khảo lưu trú và trải nghiệm thiên nhiên Cúc Phương` },
  ] as const;
  const baseURL = String(test.info().project.use.baseURL ?? process.env.BASE_URL ?? '');
  const publicContext = await browser.newContext({ baseURL, reducedMotion: 'reduce' });
  const publicPage = await publicContext.newPage();
  const errors: string[] = [];
  publicPage.on('pageerror', (error) => errors.push(error.message));
  publicPage.on('response', (response) => {
    if (response.status() >= 500) errors.push(`${response.status()} ${response.url()}`);
  });
  const createdIds = new Set<string>();
  let mediaId: string | null = null;

  try {
    for (const entry of entries) {
      const existing = await browserApi(page, `/content?kind=${entry.kind}&search=${encodeURIComponent(marker)}&page=1&pageSize=100`);
      expect(existing.status).toBe(200);
      expect((existing.body as { items: ContentRecord[] }).items.filter((item) => item.title === entry.title)).toHaveLength(0);
    }
    const existingMedia = await browserApi(page, `/media?search=${encodeURIComponent(alt)}`);
    expect(existingMedia.status).toBe(200);
    expect((existingMedia.body as { items: MediaRecord[] }).items.filter((item) => item.altText === alt)).toHaveLength(0);

    await page.goto('/admin/thu-vien-anh');
    await page.getByLabel('Alt mặc định cho ảnh tải lên').fill(alt);
    const uploadResponse = page.waitForResponse((response) =>
      response.url().endsWith('/api/v1/media/upload') && response.request().method() === 'POST');
    await page.locator('.media-library__upload input[type="file"]').setInputFiles({
      name: `${marker.toLowerCase()}.webp`, mimeType: 'image/webp', buffer: TEST_WEBP,
    });
    const uploaded = await uploadResponse;
    expect([200, 201]).toContain(uploaded.status());
    const media = await uploaded.json() as MediaRecord;
    mediaId = media.id;
    expect(media.altText).toBe(alt);
    expect(media.url).toMatch(/^\/media\//);

    const longWord = `NoiDungKhongDauCach${'ABCDEFGH'.repeat(30)}`;
    const body = {
      type: 'doc',
      content: [
        { type: 'heading', attrs: { level: 2 }, content: [{ type: 'text', text: 'Chuẩn bị trước chuyến đi' }] },
        { type: 'paragraph', content: [
          { type: 'text', text: 'Thông tin kiểm thử này do quản trị tạo trong PostgreSQL. Nội dung dài vẫn cần dễ đọc trên màn hình nhỏ và không thay đổi khi mở ở một phiên khác. ' },
          { type: 'text', text: 'Liên hệ tư vấn', marks: [{ type: 'link', attrs: { href: '/lien-he' } }] },
          { type: 'text', text: ' để nhận thông tin đã xác minh.' },
        ] },
        { type: 'bulletList', content: [
          { type: 'listItem', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Chọn nơi lưu trú phù hợp với số khách và lịch trình.' }] }] },
          { type: 'listItem', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Kiểm tra ảnh, giá và điều kiện thực tế trước khi đặt.' }] }] },
        ] },
        { type: 'image', attrs: { mediaId, src: media.url, alt, width: 1600 } },
        { type: 'heading', attrs: { level: 2 }, content: [{ type: 'text', text: 'Bảng đối chiếu thông tin' }] },
        { type: 'table', content: [
          { type: 'tableRow', content: ['Nội dung', 'Nguồn', 'Trạng thái', 'Ghi chú'].map((value) => ({ type: 'tableHeader', content: [{ type: 'paragraph', content: [{ type: 'text', text: value }] }] })) },
          { type: 'tableRow', content: ['Ảnh', 'Media Library', 'Chờ duyệt', longWord].map((value) => ({ type: 'tableCell', content: [{ type: 'paragraph', content: [{ type: 'text', text: value }] }] })) },
        ] },
        { type: 'heading', attrs: { level: 3 }, content: [{ type: 'text', text: 'Lưu ý khi đọc trên điện thoại' }] },
        { type: 'paragraph', content: [{ type: 'text', text: `Đây là đoạn dài để thử ngắt dòng: ${longWord}. `.repeat(3) }] },
      ],
    };

    for (const entry of entries) {
      const created = await browserApi(page, '/content', 'POST', {
        kind: entry.kind, title: entry.title, slug: entry.slug,
        excerpt: 'Bản kiểm thử bố cục nội dung dài, ảnh và bảng từ API thật.',
        body, metaTitle: entry.title, metaDescription: 'Bản kiểm thử local, không phải nội dung kinh doanh.',
        noindex: true,
        media: [{ mediaId, role: 'cover', position: 0 }, { mediaId, role: 'inline', position: 1 }],
      });
      expect(created.status, JSON.stringify(created.body)).toBe(201);
      const record = created.body as ContentRecord;
      createdIds.add(record.id);
      expect(record.publicationStatus).toBe('draft');
      expect((await publicPage.request.get(record.path)).status()).toBe(404);

      const published = await browserApi(page, `/content/${record.id}/status`, 'PATCH', {
        status: 'published', expectedVersion: record.version,
      });
      expect(published.status, JSON.stringify(published.body)).toBe(200);
      const publicPath = (published.body as ContentRecord).path;
      expect(publicPath).toBeTruthy();

      for (const width of widths) {
        await publicPage.setViewportSize({ width, height: 900 });
        const response = await publicPage.goto(publicPath, { waitUntil: 'domcontentloaded' });
        expect(response?.status()).toBe(200);
        await expect(publicPage.locator('main h1')).toHaveCount(1);
        await expect(publicPage.locator('main h1')).toHaveText(entry.title);
        await expect(publicPage.locator('.static-page__body h2')).toHaveCount(2);
        await expect(publicPage.locator('.static-page__body h3')).toHaveCount(1);
        await expect(publicPage.locator('.static-page__body ul li')).toHaveCount(2);
        await expect(publicPage.locator('.static-page__body a', { hasText: 'Liên hệ tư vấn' })).toHaveAttribute('href', '/lien-he');
        const inlineImage = publicPage.locator(`.static-page__body img[alt="${alt}"]`);
        await inlineImage.scrollIntoViewIfNeeded();
        await expect.poll(() => inlineImage.evaluate((image: HTMLImageElement) => image.naturalWidth)).toBeGreaterThan(0);
        const inlineWidth = await inlineImage.evaluate((image) => ({
          image: image.getBoundingClientRect().width,
          body: image.closest('.static-page__body')!.getBoundingClientRect().width,
        }));
        expect(inlineWidth.image, JSON.stringify(inlineWidth)).toBeGreaterThan(inlineWidth.body * 0.9);
        const tableWrap = publicPage.locator('.static-page__body .rich-content__table-wrap');
        await tableWrap.scrollIntoViewIfNeeded();
        const headerWidths = await tableWrap.locator('th').evaluateAll((headers) =>
          headers.map((header) => header.getBoundingClientRect().width));
        expect(Math.min(...headerWidths), JSON.stringify(headerWidths)).toBeGreaterThan(100);
        const geometry = await publicPage.evaluate(() => ({
          document: document.documentElement.scrollWidth,
          body: document.body.scrollWidth,
          viewport: window.innerWidth,
        }));
        expect(geometry.document, JSON.stringify({ entry: entry.kind, width, geometry })).toBeLessThanOrEqual(width + 1);
        expect(geometry.body, JSON.stringify({ entry: entry.kind, width, geometry })).toBeLessThanOrEqual(width + 1);
        if (width === 390) {
          const tableGeometry = await tableWrap.evaluate((element) => ({ client: element.clientWidth, scroll: element.scrollWidth }));
          expect(tableGeometry.scroll).toBeGreaterThan(tableGeometry.client);
          await tableWrap.evaluate((element) => { element.scrollLeft = element.scrollWidth; });
          expect(await tableWrap.evaluate((element) => element.scrollLeft)).toBeGreaterThan(0);
        }
        if (process.env.DVB_RICH_VISUAL_ARTIFACTS === '1' && (width === 390 || width === 1440)) {
          await publicPage.locator('footer').scrollIntoViewIfNeeded();
          await publicPage.screenshot({ path: `artifacts/public-rich-${entry.kind}-${width}.png`, fullPage: true });
        }
      }
    }
    expect(errors).toEqual([]);
  } finally {
    for (const entry of entries) {
      const result = await browserApi(page, `/content?kind=${entry.kind}&search=${encodeURIComponent(marker)}&page=1&pageSize=100`);
      if (result.status !== 200) continue;
      for (const record of (result.body as { items: ContentRecord[] }).items.filter((item) => item.title === entry.title && item.slug === entry.slug)) {
        if (!createdIds.has(record.id)) continue;
        const fresh = await browserApi(page, `/content/${record.id}`);
        if (fresh.status !== 200) continue;
        let current = fresh.body as ContentRecord;
        if (current.publicationStatus === 'published') {
          const drafted = await browserApi(page, `/content/${record.id}/status`, 'PATCH', { status: 'draft', expectedVersion: current.version });
          expect(drafted.status).toBe(200);
          current = drafted.body as ContentRecord;
        }
        const deleted = await browserApi(page, `/content/${record.id}?expectedVersion=${current.version}`, 'DELETE');
        expect(deleted.status).toBe(204);
      }
    }
    if (mediaId) {
      const mediaList = await browserApi(page, `/media?search=${encodeURIComponent(alt)}`);
      if (mediaList.status === 200) {
        const ownMedia = (mediaList.body as { items: MediaRecord[] }).items.find((item) => item.id === mediaId && item.altText === alt);
        if (ownMedia) expect((await browserApi(page, `/media/${ownMedia.id}`, 'DELETE')).status).toBe(204);
      }
    }
    await publicContext.close();
  }
});
