import { expect, test } from '@playwright/test';
import { browserApi, createUniqueTestPng, signInAsOwner } from './helpers';

type ContentRecord = {
  id: string;
  kind: string;
  title: string;
  slug: string;
  path: string;
  publicationStatus: string;
  version: number;
  media: Array<{ mediaId: string; role: string; url: string }>;
  details?: {
    destination?: { category: string; location: string | null };
    combo?: { code: string; inclusions: string[]; days: Array<{ title: string }> };
  };
};

type HomeSetting = { key: string; value: Record<string, unknown>; version: number; isDefault: boolean };

async function homeSettings(page: Parameters<typeof browserApi>[0]): Promise<HomeSetting[]> {
  const response = await browserApi(page, '/settings');
  expect(response.status).toBe(200);
  return (response.body as { items: HomeSetting[] }).items;
}

async function saveHomeSetting(page: Parameters<typeof browserApi>[0], key: string, value: Record<string, unknown>) {
  const current = (await homeSettings(page)).find((item) => item.key === key);
  if (!current) throw new Error(`Thiếu setting ${key}`);
  const response = await browserApi(page, `/settings/${encodeURIComponent(key)}`, 'PUT', { value, expectedVersion: current.version });
  expect(response.status).toBe(200);
}

async function restoreHomeSettings(page: Parameters<typeof browserApi>[0], baseline: HomeSetting[]) {
  for (const saved of baseline) {
    const current = (await homeSettings(page)).find((item) => item.key === saved.key);
    if (!current) throw new Error(`Thiếu setting ${saved.key} khi khôi phục`);
    if (saved.isDefault) {
      if (!current.isDefault) {
        const response = await browserApi(page, `/settings/${encodeURIComponent(saved.key)}?expectedVersion=${current.version}`, 'DELETE');
        expect(response.status).toBe(200);
      }
    } else if (JSON.stringify(current.value) !== JSON.stringify(saved.value)) {
      const response = await browserApi(page, `/settings/${encodeURIComponent(saved.key)}`, 'PUT', { value: saved.value, expectedVersion: current.version });
      expect(response.status).toBe(200);
    }
  }
}

type PropertyRecord = {
  id: string;
  contentId: string;
  code: string;
  title: string;
  slug: string;
  path: string;
  publicationStatus: string;
  operatingStatus: string;
  version: number;
  contentVersion: number;
  roomTypes: Array<{ name: string; maxAdults: number; maxChildren: number; unitCount: number; rate: { baseRateVnd: number } | null }>;
};

async function findContent(page: Parameters<typeof browserApi>[0], kind: string, title: string) {
  const result = await browserApi(page, `/content?kind=${kind}&page=1&pageSize=100`);
  expect(result.status).toBe(200);
  return (result.body as { items: ContentRecord[] }).items.find((item) => item.title === title);
}

async function chooseCover(page: Parameters<typeof browserApi>[0], alt: string, filename: string) {
  await page.getByRole('button', { name: 'Chọn ảnh đại diện' }).click();
  const picker = page.locator('dialog[open]');
  await expect(picker).toBeVisible();
  await picker.getByLabel('Tìm trong thư viện ảnh').fill(alt);
  await picker.locator('.media-library__card').filter({ hasText: filename }).click();
  await expect(page.locator('dialog[open]')).toHaveCount(0);
}

async function setStringList(page: Parameters<typeof browserApi>[0], label: string, values: string[]) {
  const section = page.locator('.content-editor__list-editor').filter({ has: page.getByText(label, { exact: true }) });
  await expect(section).toHaveCount(1);
  let currentCount = await section.locator('.settings-form__string-row').count();
  while (currentCount < values.length) {
    await section.getByRole('button', { name: 'Thêm mục' }).click();
    currentCount += 1;
  }
  for (const [index, value] of values.entries()) {
    await section.getByLabel(`${label}, mục ${index + 1}`).fill(value);
  }
}

test('destination và combo CRUD, publish, public propagation, redirect slug cũ, archive/unpublish', async ({ page, browser }) => {
  test.setTimeout(180_000);
  await signInAsOwner(page);
  page.on('dialog', (dialog) => dialog.accept());

  const homeKeys = ['home.destinations', 'home.sections'];
  const homeBaseline = (await homeSettings(page)).filter((item) => homeKeys.includes(item.key)).map((item) => structuredClone(item));
  expect(homeBaseline).toHaveLength(homeKeys.length);
  expect(homeBaseline.find((item) => item.key === 'home.destinations')?.value.title, 'Refusing to preserve a leaked QA destination setting').not.toBe('Điểm đến kiểm thử');

  const stamp = Date.now();
  const coverAlt = `ATG ảnh danh mục ${stamp}`;
  const coverFilename = `atg-catalog-${stamp}.png`;
  const galleryAlt = `ATG ảnh album điểm đến ${stamp}`;
  const galleryFilename = `atg-destination-gallery-${stamp}.png`;
  const baseURL = String(test.info().project.use.baseURL ?? process.env.BASE_URL ?? '');
  const publicContext = await browser.newContext({ baseURL, reducedMotion: 'reduce' });
  const publicPage = await publicContext.newPage();
  const pageErrors: string[] = [];
  const serverErrors: string[] = [];
  publicPage.on('pageerror', (error) => pageErrors.push(error.message));
  publicPage.on('response', (response) => { if (response.status() >= 500) serverErrors.push(`${response.status()} ${response.url()}`); });
  let mediaId: string | null = null;
  let galleryMediaId: string | null = null;
  const records: Array<{ route: string; kind: string; publicRoute: string; title: string; slug: string; renamedSlug: string; id?: string }> = [
    {
      route: '/admin/diem-den', kind: 'destination', publicRoute: 'destinations',
      title: `ATG Điểm đến ${stamp}`, slug: `atg-destination-${stamp}`, renamedSlug: `atg-destination-new-${stamp}`,
    },
    {
      route: '/admin/combo-du-lich', kind: 'combo', publicRoute: 'combos',
      title: `ATG Combo ${stamp}`, slug: `atg-combo-${stamp}`, renamedSlug: `atg-combo-new-${stamp}`,
    },
  ];

  try {
    const destinationSetting = homeBaseline.find((item) => item.key === 'home.destinations')!;
    await saveHomeSetting(page, 'home.destinations', { ...destinationSetting.value, enabled: true, title: 'Điểm đến kiểm thử', selectionMode: 'featured', limit: 12 });
    const sectionsSetting = homeBaseline.find((item) => item.key === 'home.sections')!;
    const savedOrder = Array.isArray(sectionsSetting.value.order) ? sectionsSetting.value.order.filter((item): item is string => typeof item === 'string') : [];
    const savedHidden = Array.isArray(sectionsSetting.value.hidden) ? sectionsSetting.value.hidden.filter((item): item is string => typeof item === 'string') : [];
    await saveHomeSetting(page, 'home.sections', { ...sectionsSetting.value, order: ['destinations', ...savedOrder.filter((item) => item !== 'destinations')], hidden: savedHidden.filter((item) => item !== 'destinations') });

    await page.goto('/admin/thu-vien-anh');
    await page.getByLabel('Alt mặc định cho ảnh tải lên').fill(coverAlt);
    const uploadResponse = page.waitForResponse((response) =>
      response.url().endsWith('/api/v1/media/upload') && response.request().method() === 'POST',
    );
    await page.locator('.media-library__upload input[type="file"]').setInputFiles({
      name: coverFilename,
      mimeType: 'image/png',
      buffer: createUniqueTestPng(stamp),
    });
    expect([200, 201]).toContain((await uploadResponse).status());
    const coverSearch = await browserApi(page, `/media?search=${encodeURIComponent(coverAlt)}`);
    expect(coverSearch.status).toBe(200);
    const cover = (coverSearch.body as { items: Array<{ id: string; mimeType: string }> }).items[0];
    expect(cover).toBeTruthy();
    expect(cover.mimeType).toBe('image/webp');
    mediaId = cover.id;

    await page.getByLabel('Alt mặc định cho ảnh tải lên').fill(galleryAlt);
    const galleryUploadResponse = page.waitForResponse((response) =>
      response.url().endsWith('/api/v1/media/upload') && response.request().method() === 'POST',
    );
    await page.locator('.media-library__upload input[type="file"]').setInputFiles({
      name: galleryFilename,
      mimeType: 'image/png',
      // A one-step colour change can encode to identical lossy WebP bytes and
      // legitimately dedupe to the cover; use a clearly different pixel.
      buffer: createUniqueTestPng(stamp ^ 0xffffff),
    });
    expect([200, 201]).toContain((await galleryUploadResponse).status());
    const gallerySearch = await browserApi(page, `/media?search=${encodeURIComponent(galleryAlt)}`);
    expect(gallerySearch.status).toBe(200);
    const galleryAsset = (gallerySearch.body as { items: Array<{ id: string; mimeType: string }> }).items[0];
    expect(galleryAsset?.mimeType).toBe('image/webp');
    galleryMediaId = galleryAsset.id;

    for (const record of records) {
      await page.goto(record.route);
      await page.getByRole('button', { name: 'Tạo mới' }).click();
      await page.getByLabel('Tiêu đề *').fill(record.title);
      await page.getByLabel('Slug đường dẫn').fill(record.slug);
      await page.getByLabel('Tóm tắt').fill(`Bản ghi kiểm thử ${record.kind} được tạo trên PostgreSQL.`);

      if (record.kind === 'destination') {
        await page.getByLabel('Nhóm điểm đến *').fill('Sinh thái kiểm thử');
        await page.getByLabel('Khu vực').fill('Cúc Phương, Ninh Bình');
      } else {
        await page.getByLabel('Mã combo *').fill(`ATG-COMBO-${stamp}`);
        await page.getByLabel('Khu vực').fill('Cúc Phương');
        await page.getByRole('checkbox', { name: 'Gia đình' }).check();
        const day = page.locator('.content-editor__days .content-editor__subsection').first();
        await day.getByLabel('Tiêu đề ngày').fill('Ngày kiểm thử');
        await setStringList(page, 'Hoạt động trong ngày', ['Tham quan rừng', 'Nghỉ ngơi']);
        await setStringList(page, 'Bao gồm', ['Hướng dẫn viên địa phương']);
        await setStringList(page, 'Không bao gồm', ['Chi phí cá nhân']);
        await setStringList(page, 'Điều khoản', ['Lịch trình mẫu chỉ dùng kiểm thử local.']);
      }

      await page.locator('.rte [contenteditable="true"]').fill(
        `Nội dung ${record.kind} kiểm thử được lưu trên PostgreSQL, có revision và chỉ được công khai khi chủ động xuất bản. `.repeat(5),
      );
      await page.getByLabel('Tiêu đề SEO *').fill(record.title);
      await page.getByLabel('Mô tả SEO *').fill(`Mô tả SEO kiểm thử cho ${record.kind}, không dùng dữ liệu khách hàng.`);
      await chooseCover(page, coverAlt, coverFilename);
      if (record.kind === 'destination') {
        const album = page.getByRole('region', { name: 'Album điểm đến' });
        await album.getByRole('button', { name: 'Thêm ảnh' }).click();
        const picker = page.locator('dialog[open]');
        await picker.getByLabel('Tìm trong thư viện ảnh').fill(galleryAlt);
        await picker.locator('.media-library__card').filter({ hasText: galleryFilename }).click();
        await expect(album.locator('.album-editor__list li')).toHaveCount(1);
      }
      await page.getByRole('button', { name: 'Lưu bản nháp' }).click();
      await expect(page.locator('.settings-screen__message--success')).toContainText('Đã tạo bản nháp thật');

      const stored = await findContent(page, record.kind, record.title);
      expect(stored).toBeTruthy();
      record.id = stored!.id;
      expect(stored!.publicationStatus).toBe('draft');
      expect((await browserApi(page, `/public/${record.publicRoute}/${record.slug}`)).status).toBe(404);

      const originalVersion = stored!.version;
      const card = page.locator('.content-manager__item', { hasText: record.title });
      await card.getByRole('button', { name: 'Sửa' }).click();
      const editedTitle = `${record.title} — đã sửa với lịch trình trải nghiệm thiên nhiên Cúc Phương dành cho gia đình nhiều thế hệ`;
      await page.getByLabel('Tiêu đề *').fill(editedTitle);
      if (record.kind === 'destination') {
        await page.getByLabel('Nhóm điểm đến *').fill('Thiên nhiên đã xác minh');
        const featuredToggle = page.getByRole('checkbox', { name: /Hiển thị nổi bật/ });
        await featuredToggle.locator('xpath=..').click();
        await expect(featuredToggle).toBeChecked();
      }
      const updateResponsePromise = page.waitForResponse((response) =>
        response.url().includes(`/api/v1/content/${record.id}`) && response.request().method() === 'PUT',
        { timeout: 10_000 },
      );
      await page.getByRole('button', { name: 'Lưu thay đổi' }).click({ timeout: 10_000 });
      const updateResponse = await updateResponsePromise;
      const updateBody = await updateResponse.json().catch(() => null);
      expect(updateResponse.status(), JSON.stringify(updateBody)).toBe(200);
      await expect(page.locator('.content-manager__item', { hasText: editedTitle })).toBeVisible();

      const detail = await browserApi(page, `/content/${record.id}`);
      expect(detail.status).toBe(200);
      const edited = detail.body as ContentRecord;
      expect(edited.title).toBe(editedTitle);
      expect(edited.version).toBeGreaterThan(originalVersion);
      expect(edited.media.some((item) => item.mediaId === mediaId && item.role === 'cover')).toBeTruthy();
      if (record.kind === 'destination') {
        expect(edited.details?.destination?.category).toBe('Thiên nhiên đã xác minh');
        expect(edited.media.some((item) => item.mediaId === galleryMediaId && item.role === 'gallery')).toBeTruthy();
      }
      if (record.kind === 'combo') expect(edited.details?.combo?.inclusions).toContain('Hướng dẫn viên địa phương');

      const editedCard = page.locator('.content-manager__item', { hasText: editedTitle });
      await editedCard.getByRole('button', { name: 'Xuất bản' }).click();
      await expect(editedCard).toContainText('Đã xuất bản');
      const publicPath = `/public/${record.publicRoute}/${record.slug}`;
      const published = await browserApi(page, publicPath);
      expect(published.status).toBe(200);
      const publishedContent = published.body as { title?: string; name?: string };
      expect(publishedContent.title ?? publishedContent.name).toBe(editedTitle);
      if (record.kind === 'destination') {
        expect((published.body as { featured?: boolean }).featured).toBe(true);
        const gallery = (published.body as { gallery: Array<{ src: string; alt: string }> }).gallery;
        expect(gallery).toHaveLength(2);
        expect(new Set(gallery.map((image) => image.src)).size).toBe(2);
        expect(gallery.map((image) => image.alt)).toContain(galleryAlt);
        const galleryImage = gallery.find((image) => image.alt === galleryAlt)!;
        const failingGalleryPath = new URL(galleryImage.src, baseURL).pathname;
        await publicPage.route((url) => url.pathname === failingGalleryPath, (route) => route.abort());
        await publicPage.goto('/diem-den');
        await expect(publicPage.locator('.dest-filters')).toBeVisible();
        await expect(publicPage.locator('.dest-list__all')).toBeVisible();
        await publicPage.getByRole('button', { name: 'Ẩm thực' }).click();
        await expect(publicPage.locator('.catalog-empty-state h3')).toHaveText('Không có điểm đến phù hợp với bộ lọc');
        await publicPage.locator('.catalog-empty-state').getByRole('button', { name: 'Xem tất cả điểm đến' }).click();
        await expect(publicPage.locator('.dcard', { hasText: editedTitle })).toBeVisible();
        await publicPage.goto('/');
        const homeCard = publicPage.locator('.explore .dest', { hasText: editedTitle });
        await expect(homeCard).toBeVisible();
        await expect(homeCard).toHaveAttribute('href', `/diem-den/${record.slug}`);
        await homeCard.click();
        await expect(publicPage).toHaveURL(new RegExp(`/diem-den/${record.slug}$`));
        await expect(publicPage.locator('main h1')).toHaveText(editedTitle);
      }
      if (record.kind === 'combo') {
        const publicCombo = published.body as { fromPriceVnd: number | null; departures: unknown[] };
        expect(publicCombo.fromPriceVnd).toBeNull();
        expect(publicCombo.departures).toEqual([]);
        await publicPage.goto('/combo-du-lich');
        const card = publicPage.locator('.ccard', { hasText: editedTitle });
        await expect(card).toBeVisible();
        await expect(publicPage.locator('.combo-chips')).toBeVisible();
        await expect(publicPage.locator('.combo-sort')).toHaveCount(0);
        await publicPage.getByRole('button', { name: '3N2D' }).click();
        await expect(publicPage.locator('.catalog-empty-state h3')).toHaveText('Không có combo phù hợp với bộ lọc');
        await publicPage.locator('.catalog-empty-state').getByRole('button', { name: 'Xem tất cả combo' }).click();
        await expect(card).toBeVisible();
        await expect(card.locator('.ccard__price')).toContainText('Liên hệ để nhận giá');
        const cardGeometry = await card.evaluate((element) => ({
          cardBottom: element.getBoundingClientRect().bottom,
          titleBottom: element.querySelector('.ccard__title')!.getBoundingClientRect().bottom,
          priceTop: element.querySelector('.ccard__price')!.getBoundingClientRect().top,
          buttonBottom: element.querySelector('.ccard__cta')!.getBoundingClientRect().bottom,
        }));
        expect(cardGeometry.titleBottom, JSON.stringify(cardGeometry)).toBeLessThan(cardGeometry.priceTop);
        expect(cardGeometry.buttonBottom, JSON.stringify(cardGeometry)).toBeLessThanOrEqual(cardGeometry.cardBottom);
        await card.getByRole('button', { name: /Xem chi tiết/ }).click();
        await expect(publicPage.locator('dialog[open]')).toContainText('Liên hệ để nhận giá');
        await expect(publicPage.locator('dialog[open]').getByRole('button', { name: /Liên hệ/ })).toBeVisible();
        await publicPage.locator('dialog[open]').getByRole('button', { name: 'Đóng hộp thoại' }).click();
        await expect(publicPage.locator('dialog[open]')).toHaveCount(0);
        await expect(publicPage).toHaveURL(/\/combo-du-lich$/);
      }

      const detailPath = `/${record.kind === 'destination' ? 'diem-den' : 'combo-du-lich'}/${record.slug}`;
      for (const width of [390, 768, 1024, 1440, 1920]) {
        pageErrors.length = 0;
        serverErrors.length = 0;
        await publicPage.setViewportSize({ width, height: 900 });
        const detailResponse = await publicPage.goto(detailPath, { waitUntil: 'load' });
        expect(detailResponse?.status()).toBe(200);
        await expect(publicPage.locator('main h1')).toHaveText(editedTitle);
        const displayFont = await publicPage.evaluate(async () => {
          await document.fonts.ready;
          return {
            family: getComputedStyle(document.querySelector('main h1')!).fontFamily,
            loaded: document.fonts.check('600 36px "Playfair Display"'),
          };
        });
        expect(displayFont.family).toContain('Playfair Display');
        expect(displayFont.loaded).toBe(true);
        await expect(publicPage.locator('footer')).toBeVisible();
        if (record.kind === 'combo') {
          await expect(publicPage.locator('.static-page__offer')).toContainText('Liên hệ để nhận giá');
          await expect(publicPage.locator('.static-page__offer a')).toHaveAttribute('href', `/lien-he?intent=combo&item=${record.slug}`);
          const offerGeometry = await publicPage.evaluate(() => ({
            coverHeight: document.querySelector('.static-page__cover')!.getBoundingClientRect().height,
            coverImageHeight: document.querySelector('.static-page__cover img')!.getBoundingClientRect().height,
            ctaHeight: document.querySelector('.static-page__offer .btn')!.getBoundingClientRect().height,
          }));
          expect(offerGeometry.coverHeight).toBeGreaterThanOrEqual(200);
          expect(offerGeometry.coverImageHeight).toBeGreaterThanOrEqual(offerGeometry.coverHeight - 1);
          expect(offerGeometry.ctaHeight).toBeGreaterThanOrEqual(44);
          await expect(publicPage.locator('.static-page__section').first()).toContainText('Ngày kiểm thử');
        } else {
          await expect(publicPage.locator('.static-page__gallery .gallery__all')).toContainText('2 ảnh');
          await expect(publicPage.locator('.static-page__gallery .gallery__thumb .gallery__image-fallback')).toBeVisible();
          if (width === 390 || width === 1440) {
            const opener = publicPage.locator('.static-page__gallery .gallery__main');
            await opener.focus();
            await publicPage.keyboard.press('Enter');
            const dialog = publicPage.getByRole('dialog', { name: `Ảnh ${editedTitle}` });
            await expect(dialog).toBeVisible();
            await expect(dialog.locator('.gview__cap [aria-live="polite"]')).toHaveText('1 / 2');
            await publicPage.keyboard.press('ArrowRight');
            await expect(dialog.locator('.gview__cap [aria-live="polite"]')).toHaveText('2 / 2');
            await expect(dialog.locator('.gview__fallback')).toBeVisible();
            await expect(dialog.getByRole('button', { name: `Ảnh 2 không tải được: ${galleryAlt}` }).locator('.gview__thumb-fallback')).toBeVisible();
            const dialogGeometry = await dialog.evaluate((element) => ({ width: element.scrollWidth, client: element.clientWidth }));
            expect(dialogGeometry.width, JSON.stringify(dialogGeometry)).toBeLessThanOrEqual(dialogGeometry.client + 1);
            if (process.env.DVB_GALLERY_VISUAL_ARTIFACTS === '1') {
              await publicPage.screenshot({ path: `artifacts/public-destination-gallery-broken-${width}.png` });
            }
            await publicPage.keyboard.press('Escape');
            await expect(dialog).toHaveCount(0);
            await expect(opener).toBeFocused();
          }
        }
        await publicPage.locator('footer').scrollIntoViewIfNeeded();
        const geometry = await publicPage.evaluate(() => ({
          document: document.documentElement.scrollWidth,
          body: document.body.scrollWidth,
          viewport: window.innerWidth,
          protruding: [...document.querySelectorAll<HTMLElement>('body *')]
            .map((element) => ({
              tag: element.tagName.toLowerCase(),
              className: typeof element.className === 'string' ? element.className.slice(0, 100) : '',
              right: Math.round(element.getBoundingClientRect().right),
              left: Math.round(element.getBoundingClientRect().left),
            }))
            .filter((item) => item.right > window.innerWidth + 1 && item.right < window.innerWidth + 150)
            .sort((a, b) => a.right - b.right)
            .slice(0, 30),
        }));
        expect(geometry.document, JSON.stringify(geometry)).toBeLessThanOrEqual(width + 1);
        expect(geometry.body, JSON.stringify(geometry)).toBeLessThanOrEqual(width + 1);
        expect(pageErrors).toEqual([]);
        expect(serverErrors).toEqual([]);
        if (process.env.DVB_DETAIL_VISUAL_ARTIFACTS === '1' && (width === 390 || width === 1440)) {
          await publicPage.screenshot({ path: `artifacts/public-detail-${record.kind}-${width}.png`, fullPage: true });
        }
      }

      await editedCard.getByRole('button', { name: 'Sửa' }).click();
      await page.getByLabel('Slug đường dẫn').fill(record.renamedSlug);
      await page.getByRole('button', { name: 'Lưu thay đổi' }).click();
      const renamed = await browserApi(page, `/content/${record.id}`);
      expect(renamed.status).toBe(200);
      expect((renamed.body as ContentRecord).slug).toBe(record.renamedSlug);
      const resolution = await browserApi(page, `/public/routes/resolve?path=${encodeURIComponent(`/${record.kind === 'destination' ? 'diem-den' : 'combo-du-lich'}/${record.slug}`)}`);
      expect(resolution.status).toBe(200);
      expect(resolution.body).toMatchObject({ kind: 'redirect', path: `/${record.kind === 'destination' ? 'diem-den' : 'combo-du-lich'}/${record.renamedSlug}`, status: 308 });
      expect((await browserApi(page, `/public/${record.publicRoute}/${record.renamedSlug}`)).status).toBe(200);
      if (record.kind === 'destination') {
        await publicPage.goto('/');
        await expect(publicPage.locator('.explore .dest', { hasText: editedTitle })).toHaveAttribute('href', `/diem-den/${record.renamedSlug}`);
      }

      const renamedCard = page.locator('.content-manager__item').filter({ hasText: editedTitle });
      await renamedCard.getByRole('button', { name: 'Lưu trữ' }).click();
      await expect(renamedCard.locator('.settings-item__meta')).toContainText('Lưu trữ');
      const archived = await browserApi(page, `/content/${record.id}`);
      expect((archived.body as ContentRecord).publicationStatus).toBe('archived');
      expect((await browserApi(page, `/public/${record.publicRoute}/${record.renamedSlug}`)).status).toBe(404);
      await renamedCard.getByRole('button', { name: 'Đưa về nháp' }).click();
      await expect(renamedCard).toContainText('Bản nháp');
      await renamedCard.getByRole('button', { name: 'Xoá' }).click();
      await expect(renamedCard).toHaveCount(0);
      expect((await browserApi(page, `/content/${record.id}`)).status).toBe(404);
      record.id = undefined;
    }
  } finally {
    try {
      await publicContext.close();
      for (const record of records) {
        if (!record.id) continue;
        const current = await browserApi(page, `/content/${record.id}`);
        if (current.status !== 200) continue;
        const node = current.body as ContentRecord;
        if (node.publicationStatus === 'published') {
          const draft = await browserApi(page, `/content/${node.id}/status`, 'PATCH', {
            status: 'draft', expectedVersion: node.version,
          });
          if (draft.status === 200) node.version = (draft.body as ContentRecord).version;
        }
        const removed = await browserApi(page, `/content/${node.id}?expectedVersion=${node.version}`, 'DELETE');
        expect([204, 404]).toContain(removed.status);
      }
      if (mediaId) {
        const removed = await browserApi(page, `/media/${mediaId}`, 'DELETE');
        expect([204, 404]).toContain(removed.status);
      }
      if (galleryMediaId) {
        const removed = await browserApi(page, `/media/${galleryMediaId}`, 'DELETE');
        expect([204, 404]).toContain(removed.status);
      }
    } finally {
      await restoreHomeSettings(page, homeBaseline);
    }
  }
});

test('tạo nơi lưu trú không sinh phòng mẫu; thêm hạng riêng rồi xuất bản và dọn bản ghi kiểm thử', async ({ page }) => {
  test.setTimeout(120_000);
  await signInAsOwner(page);
  page.on('dialog', (dialog) => dialog.accept());

  const stamp = Date.now();
  const code = `ATG-STAY-${stamp}`;
  const title = `ATG Nơi lưu trú ${stamp}`;
  let propertyId: string | null = null;
  let mediaId: string | null = null;
  const coverAlt = `ATG ảnh nơi lưu trú ${stamp}`;

  try {
    await page.goto('/admin/phong-nghi');
    await page.getByRole('button', { name: 'Thêm nơi lưu trú' }).click();
    await expect(page).toHaveURL(/\/admin\/phong-nghi\?action=create/);
    await page.getByLabel('Tên nơi lưu trú *').fill(title);
    await page.getByLabel('Mã nơi lưu trú *').fill(code);
    await page.getByLabel('Khu vực *').fill('Cúc Phương, Ninh Bình');
    await page.getByLabel('Địa chỉ *').fill('Địa chỉ kiểm thử local, không phải cơ sở lưu trú thật.');
    await page.locator('.rte [contenteditable="true"]').fill(
      'Nội dung kiểm thử riêng trong database local, tạo room, đơn vị và rate để xác nhận form lưu cùng một giao dịch.',
    );
    await page.getByRole('button', { name: 'Chọn ảnh đại diện' }).click();
    const picker = page.locator('dialog[open]');
    await expect(picker).toBeVisible();
    await picker.getByLabel('Alt mặc định cho ảnh tải lên').fill(coverAlt);
    const uploadResponse = page.waitForResponse((response) =>
      response.url().endsWith('/api/v1/media/upload') && response.request().method() === 'POST',
    );
    await picker.locator('.media-library__upload input[type="file"]').setInputFiles({
      name: `atg-stay-${stamp}.png`,
      mimeType: 'image/png',
      buffer: createUniqueTestPng(stamp),
    });
    expect([200, 201]).toContain((await uploadResponse).status());
    await expect(page.locator('dialog[open]')).toHaveCount(0);
    const coverList = await browserApi(page, `/media?search=${encodeURIComponent(coverAlt)}`);
    expect(coverList.status).toBe(200);
    const cover = (coverList.body as { items: Array<{ id: string; mimeType: string; url: string }> }).items[0];
    expect(cover).toBeTruthy();
    expect(cover.mimeType).toBe('image/webp');
    mediaId = cover.id;

    await page.getByRole('button', { name: 'Lưu cơ sở và thêm hạng phòng' }).click();
    await expect(page).toHaveURL(/\/admin\/hang-phong\?property=[^&]+&room=create/);

    const list = await browserApi(page, '/properties');
    expect(list.status).toBe(200);
    let property = (list.body as { items: PropertyRecord[] }).items.find((item) => item.code === code);
    expect(property).toBeTruthy();
    propertyId = property!.id;
    expect(property!.publicationStatus).toBe('draft');
    expect(property!.operatingStatus).toBe('pending_verification');
    expect(property!.roomTypes).toHaveLength(0);
    await expect(page.locator('.room-catalog__property-context')).toContainText(title);
    await page.getByLabel('Mã hạng phòng *').fill(`ATG-ROOM-${stamp}`);
    await page.getByLabel('Tên hạng phòng *').fill('Phòng kiểm thử local');
    await page.getByLabel('Kiểu chỗ ở của hạng *').selectOption('room');
    await page.getByLabel('Người lớn tối đa').fill('2');
    await page.getByLabel('Trẻ em tối đa').fill('0');
    await page.locator('label.atoggle', { hasText: 'Đã xác minh sức chứa' }).click();
    await expect(page.getByRole('checkbox', { name: /Đã xác minh sức chứa/ })).toBeChecked();
    await page.getByLabel('Số phòng thuộc hạng này').fill('1');
    await page.getByLabel('Giá ngày thường (VND)').fill('1000');
    await page.getByLabel('Trạng thái hạng phòng').selectOption('active');
    await page.getByRole('button', { name: 'Lưu và thêm hạng khác' }).click();
    await expect(page).toHaveURL(/room=create&new=1/);
    await expect(page.locator('.room-catalog__existing li')).toHaveCount(1);
    await expect(page.getByLabel('Tên hạng phòng *')).toHaveValue('');
    await page.getByLabel('Mã hạng phòng *').fill(`ATG-FAMILY-${stamp}`);
    await page.getByLabel('Tên hạng phòng *').fill('Bungalow gia đình kiểm thử');
    await page.getByLabel('Kiểu chỗ ở của hạng *').selectOption('bungalow');
    await page.getByLabel('Số phòng ngủ của mỗi căn').fill('2');
    await page.getByLabel('Số phòng tắm riêng của mỗi căn').fill('1');
    await page.getByLabel('Người lớn tối đa').fill('4');
    await page.getByLabel('Trẻ em tối đa').fill('2');
    await page.locator('label.atoggle', { hasText: 'Đã xác minh sức chứa' }).click();
    await expect(page.getByRole('checkbox', { name: /Đã xác minh sức chứa/ })).toBeChecked();
    await page.getByLabel('Số căn thuộc hạng này').fill('1');
    await page.getByLabel('Giá ngày thường (VND)').fill('0');
    await page.getByLabel('Trạng thái hạng phòng').selectOption('active');
    await page.getByRole('button', { name: 'Lưu hạng phòng' }).click();
    await expect(page.locator('.room-catalog__card')).toHaveCount(2);
    const withRoom = await browserApi(page, `/properties/${propertyId}`);
    expect(withRoom.status).toBe(200);
    property = withRoom.body as PropertyRecord;
    expect(property.roomTypes).toHaveLength(2);
    expect(property.roomTypes[0]?.unitCount).toBe(1);
    expect(property.roomTypes[0]?.rate?.baseRateVnd).toBe(1000);
    expect(property.roomTypes[1]).toMatchObject({ name: 'Bungalow gia đình kiểm thử', unitKind: 'bungalow', bedroomCount: 2, bathroomCount: 1, maxAdults: 4, maxChildren: 2, unitCount: 1, rate: { baseRateVnd: 0 } });
    await page.goto('/admin/phong-nghi');
    const publicResponse = await page.request.get(property!.path);
    expect(publicResponse.status()).toBe(404);

    const card = page.locator('.property-card', { hasText: code });
    await card.getByRole('button', { name: 'Sửa' }).click();
    const editedTitle = `${title} — đã sửa`;
    await page.getByLabel('Tên nơi lưu trú *').fill(editedTitle);
    await page.getByLabel('Địa chỉ *').fill('Địa chỉ kiểm thử local đã chỉnh sửa.');
    await page.getByLabel('Trạng thái vận hành').selectOption('active');
    await page.getByLabel('Tiêu đề SEO').fill(editedTitle);
    await page.getByLabel('Mô tả SEO').fill('Thông tin SEO kiểm thử local, không phải dữ liệu bán hàng thật.');
    await page.getByRole('button', { name: 'Lưu thay đổi' }).click();
    await expect(page.locator('.property-card', { hasText: editedTitle })).toBeVisible();

    const detail = await browserApi(page, `/properties/${propertyId}`);
    expect(detail.status).toBe(200);
    property = detail.body as PropertyRecord;
    expect(property.title).toBe(editedTitle);
    expect(property.version).toBeGreaterThan(1);
    expect(property.roomTypes[0]?.rate?.baseRateVnd).toBe(1000);
    expect((await browserApi(page, `/public/stays/${property.slug}`)).status).toBe(404);

    await page.locator('.property-card', { hasText: code }).getByRole('button', { name: 'Sửa' }).click();
    const staleEdit = `${editedTitle} — phiên bản cũ`;
    const latestEdit = `${editedTitle} — cập nhật đồng thời`;
    await page.getByLabel('Tên nơi lưu trú *').fill(staleEdit);
    const concurrentUpdate = await browserApi(page, `/properties/${propertyId}`, 'PATCH', {
      title: latestEdit,
      expectedVersion: property.version,
      expectedContentVersion: property.contentVersion,
    });
    expect(concurrentUpdate.status).toBe(200);
    await page.getByRole('button', { name: 'Lưu thay đổi' }).click();
    await expect(page.locator('.settings-screen__message--error')).toContainText('Tải lại rồi lưu lại');
    const protectedProperty = await browserApi(page, `/properties/${propertyId}`);
    expect((protectedProperty.body as PropertyRecord).title).toBe(latestEdit);
    await page.reload();
    await expect(page.getByLabel('Tên nơi lưu trú *')).toHaveValue(latestEdit);
    property = protectedProperty.body as PropertyRecord;
    await page.getByRole('button', { name: 'Quay lại danh sách' }).click();

    const editedCard = page.locator('.property-card', { hasText: code });
    await editedCard.getByRole('button', { name: 'Xuất bản' }).click();
    await expect(editedCard).toContainText('Đã xuất bản');
    const publicStay = await browserApi(page, `/public/stays/${property.slug}`);
    expect(publicStay.status).toBe(200);
    expect((publicStay.body as { name: string }).name).toBe(latestEdit);
    expect((publicStay.body as { roomTypes: Array<{ name: string; pricePerNight: number }> }).roomTypes).toEqual(expect.arrayContaining([
      expect.objectContaining({ name: 'Phòng kiểm thử local', pricePerNight: 1000 }),
      expect.objectContaining({ name: 'Bungalow gia đình kiểm thử', pricePerNight: 0 }),
    ]));
    expect((await page.request.get(property.path)).status()).toBe(200);

    await editedCard.getByRole('button', { name: 'Gỡ xuất bản' }).click();
    await expect(editedCard).toContainText('Bản nháp');
    expect((await browserApi(page, `/public/stays/${property.slug}`)).status).toBe(404);

    await editedCard.getByRole('button', { name: 'Xoá' }).click();
    await expect(editedCard).toHaveCount(0);
    expect((await browserApi(page, `/properties/${propertyId}`)).status).toBe(404);
    expect((await page.request.get(property.path)).status()).toBe(404);
    propertyId = null;
  } finally {
    if (propertyId) {
      const current = await browserApi(page, `/properties/${propertyId}`);
      if (current.status === 200) {
        const property = current.body as PropertyRecord;
        if (property.publicationStatus === 'published') {
          const content = await browserApi(page, `/content/${property.contentId}`);
          if (content.status === 200) {
            const node = content.body as { version: number };
            const drafted = await browserApi(page, `/content/${property.contentId}/status`, 'PATCH', {
              status: 'draft', expectedVersion: node.version,
            });
            expect([200, 404]).toContain(drafted.status);
          }
        }
        const removed = await browserApi(page, `/properties/${propertyId}?expectedVersion=${property.version}`, 'DELETE');
        expect([204, 404]).toContain(removed.status);
      }
    }
    if (mediaId) {
      const removed = await browserApi(page, `/media/${mediaId}`, 'DELETE');
      expect([204, 404]).toContain(removed.status);
    }
  }
});
