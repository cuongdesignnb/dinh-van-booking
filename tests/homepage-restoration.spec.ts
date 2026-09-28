import { mkdirSync } from 'node:fs';
import { expect, test, type Page } from '@playwright/test';
import { browserApi, createUniqueTestPng, signInAsOwner } from './admin/helpers';

type Setting = { key: string; value: Record<string, unknown>; version: number; isDefault: boolean };
type Property = { id: string; contentId: string; code: string; title: string; slug: string; path: string; version: number; contentVersion: number; publicationStatus: string; featured: boolean };
type Media = { id: string; url: string; originalFilename: string; altText: string };

const SETTINGS = ['home.sections', 'home.hero', 'home.trust', 'home.featured', 'home.promo', 'home.why', 'home.contactPanel', 'home.faq'];

async function settings(page: Page): Promise<Setting[]> {
  const result = await browserApi(page, '/settings');
  expect(result.status).toBe(200);
  return (result.body as { items: Setting[] }).items;
}

async function putSetting(page: Page, key: string, patch: Record<string, unknown>): Promise<void> {
  const current = (await settings(page)).find((item) => item.key === key);
  if (!current) throw new Error('Missing setting ' + key);
  const result = await browserApi(page, '/settings/' + encodeURIComponent(key), 'PUT', {
    value: { ...current.value, ...patch }, expectedVersion: current.version,
  });
  expect(result.status, key).toBe(200);
}

async function restoreSettings(page: Page, baseline: Setting[]): Promise<void> {
  for (const snapshot of baseline) {
    const current = (await settings(page)).find((item) => item.key === snapshot.key);
    if (!current) throw new Error('Missing setting during cleanup ' + snapshot.key);
    if (snapshot.isDefault) {
      if (!current.isDefault) {
        const result = await browserApi(page, '/settings/' + encodeURIComponent(snapshot.key) + '?expectedVersion=' + current.version, 'DELETE');
        expect(result.status).toBe(200);
      }
    } else if (JSON.stringify(current.value) !== JSON.stringify(snapshot.value)) {
      const result = await browserApi(page, '/settings/' + encodeURIComponent(snapshot.key), 'PUT', {
        value: snapshot.value, expectedVersion: current.version,
      });
      expect(result.status).toBe(200);
    }
  }
}

async function upload(page: Page, filename: string, alt: string, seed: number): Promise<Media> {
  const base64 = createUniqueTestPng(seed).toString('base64');
  const result = await page.evaluate(async ({ filename, alt, base64 }) => {
    const bytes = Uint8Array.from(atob(base64), (char) => char.charCodeAt(0));
    const form = new FormData();
    form.append('altText', alt);
    form.append('file', new Blob([bytes], { type: 'image/png' }), filename);
    const csrf = document.cookie.split('; ').find((part) => part.startsWith('dvb_csrf='));
    const response = await fetch('/api/v1/media/upload', {
      method: 'POST', credentials: 'include',
      headers: csrf ? { 'x-csrf-token': decodeURIComponent(csrf.slice('dvb_csrf='.length)) } : {},
      body: form,
    });
    return { status: response.status, body: await response.json() };
  }, { filename, alt, base64 });
  expect([200, 201]).toContain(result.status);
  return result.body as Media;
}

async function property(page: Page, id: string): Promise<Property> {
  const result = await browserApi(page, '/properties/' + id);
  expect(result.status).toBe(200);
  return result.body as Property;
}

async function updateProperty(page: Page, id: string, patch: Record<string, unknown>): Promise<Property> {
  const current = await property(page, id);
  const result = await browserApi(page, '/properties/' + id, 'PATCH', {
    ...patch, expectedVersion: current.version, expectedContentVersion: current.contentVersion,
  });
  expect(result.status).toBe(200);
  return result.body as Property;
}

async function createProperty(page: Page, suffix: string, coverMediaId: string): Promise<Property> {
  const title = `HOME-QA ${suffix}`;
  const description = `Bản ghi kiểm thử bố cục ${suffix}; đây không phải nơi lưu trú thật và sẽ được xoá sau khi kiểm thử.`;
  const result = await browserApi(page, '/properties', 'POST', {
    title, code: `HOME-QA-${suffix}`, kind: 'homestay', area: 'Cúc Phương, Ninh Bình',
    address: 'Địa chỉ kiểm thử local, không phải cơ sở kinh doanh thật.', description,
    descriptionDocument: { type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'text', text: description }] }] },
    roomCode: `HOME-ROOM-${suffix}`, roomName: 'Phòng kiểm thử', maxAdults: 2, maxChildren: 0,
    unitCount: 1, rateVnd: 500000, coverMediaId,
  });
  expect([200, 201]).toContain(result.status);
  const created = result.body as Property;
  expect(created.code).toBe(`HOME-QA-${suffix}`);
  return created;
}

async function status(page: Page, id: string, next: 'published' | 'draft'): Promise<void> {
  const current = await property(page, id);
  const result = await browserApi(page, `/content/${current.contentId}/status`, 'PATCH', {
    status: next, expectedVersion: current.contentVersion,
  });
  expect(result.status).toBe(200);
}

async function assertDirectMedia(page: Page, selector: string): Promise<void> {
  const image = page.locator(selector).first();
  await expect(image).toBeVisible();
  const src = await image.getAttribute('src');
  expect(src).toMatch(/^\/media\/[^?]+\.webp$/);
  const response = await page.request.get(src!);
  expect(response.status()).toBe(200);
  expect(response.headers()['content-type']).toContain('image/webp');
}

async function assertNoHorizontalOverflow(page: Page): Promise<void> {
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  expect(overflow).toBeLessThanOrEqual(1);
}

test('classic homepage slots, direct public media, featured modes and safe upload metadata', async ({ browser, page }) => {
  test.setTimeout(240_000);
  const baseURL = String(test.info().project.use.baseURL ?? process.env.BASE_URL ?? '');
  expect(baseURL).toMatch(/^http:\/\/(127\.0\.0\.1|localhost):\d+$/);
  await signInAsOwner(page);
  const baseline = (await settings(page)).filter((item) => SETTINGS.includes(item.key)).map((item) => structuredClone(item));
  expect(baseline).toHaveLength(SETTINGS.length);
  const publicContext = await browser.newContext({ baseURL, reducedMotion: 'reduce' });
  const publicPage = await publicContext.newPage();
  const createdIds: string[] = [];
  const ownMediaIds: string[] = [];
  const stamp = Date.now();

  try {
    await putSetting(page, 'home.sections', {
      order: ['hero', 'search', 'trust', 'featured', 'promo', 'combos', 'why', 'destinations', 'reviews', 'contact', 'faq'], hidden: [],
    });
    await putSetting(page, 'home.hero', { enabled: true, titleLine1: 'Kiểm thử bố cục trang chủ' });
    await putSetting(page, 'home.trust', { enabled: true, items: [{ id: 'home-qa', icon: 'leaf', line1: 'Kiểm thử', line2: 'bố cục' }] });
    await putSetting(page, 'home.featured', { enabled: true, title: 'Phòng nghỉ nổi bật', selectionMode: 'featured', limit: 6 });
    await putSetting(page, 'home.promo', { enabled: true, titleLine1: 'Khám phá', titleLine2: 'Cúc Phương' });
    await putSetting(page, 'home.why', { enabled: true, title: 'Vì sao chọn chúng tôi', reasons: [{ id: 'home-qa', icon: 'user', title: 'Kiểm thử bố cục', description: 'Dữ liệu tạm thời' }] });
    await putSetting(page, 'home.contactPanel', { enabled: true, title: 'Tư vấn hành trình' });
    await putSetting(page, 'home.faq', { enabled: true, title: 'FAQ', items: [{ id: 'home-qa', question: 'Kiểm thử?', answer: 'Nội dung tạm thời.' }] });

    const badUpload = await upload(page, 'undefined.jpg', 'undefined.jpg', stamp);
    ownMediaIds.push(badUpload.id);
    expect(badUpload.originalFilename).toMatch(/^upload-[a-f0-9]{8}\.webp$/);
    expect(badUpload.altText).toBe('Ảnh tải lên');

    const site = await browserApi(page, '/public/site');
    expect(site.status).toBe(200);
    const siteSettings = (site.body as { settings: Record<string, Record<string, unknown>> }).settings;
    let coverMediaId = siteSettings['home.hero']?.imageMediaId as string | null;
    if (!coverMediaId) {
      const cover = await upload(page, `home-qa-${stamp}.png`, 'Ảnh kiểm thử bố cục', stamp + 1);
      ownMediaIds.push(cover.id);
      coverMediaId = cover.id;
    }

    const a = await createProperty(page, `${stamp}-A`, coverMediaId);
    createdIds.push(a.id);
    const b = await createProperty(page, `${stamp}-B`, coverMediaId);
    createdIds.push(b.id);
    await updateProperty(page, a.id, { operatingStatus: 'active', featured: false });
    await updateProperty(page, b.id, { operatingStatus: 'active', featured: true });
    await status(page, a.id, 'published');
    await status(page, b.id, 'published');

    await page.goto('/admin/phong-nghi');
    const bCard = page.locator('.property-card', { hasText: b.code });
    await expect(bCard).toContainText('Nổi bật trang chủ');
    await bCard.getByRole('button', { name: 'Sửa' }).click();
    await expect(page.getByRole('checkbox', { name: /Nổi bật trên trang chủ/ })).toBeChecked();
    await page.getByRole('button', { name: 'Đổi ảnh đại diện' }).click();
    await expect(page.locator('dialog[open]').getByLabel('Alt mặc định cho ảnh tải lên')).toHaveValue(b.title);
    await page.locator('dialog[open]').getByRole('button', { name: 'Đóng hộp thoại' }).click();

    await page.goto('/admin/cai-dat');
    const featuredCard = page.locator('[data-setting-key="home.featured"]');
    await expect(featuredCard.getByText('Phạm vi phòng nghỉ trên trang chủ')).toBeVisible();
    await expect(featuredCard.getByRole('radio', { name: /Chỉ phòng nổi bật/ })).toBeChecked();
    await expect(featuredCard.getByText('Cần bật “Nổi bật trên trang chủ”')).toBeVisible();

    await publicPage.setViewportSize({ width: 1440, height: 900 });
    await publicPage.goto('/');
    await expect(publicPage.locator('.hero .hero__search .search')).toBeVisible();
    await expect(publicPage.locator('.trust')).toBeVisible();
    await expect(publicPage.locator('.featured .featured__main')).toBeVisible();
    await expect(publicPage.locator('.featured .promo')).toBeVisible();
    await expect(publicPage.locator('.featured .stay')).toHaveCount(1);
    await expect(publicPage.locator('.featured')).toContainText(b.title);
    await expect(publicPage.locator('.featured')).not.toContainText(a.title);
    await assertDirectMedia(publicPage, '.featured .stay__img');
    if (await publicPage.locator('.hero__img').count()) await assertDirectMedia(publicPage, '.hero__img');
    if (await publicPage.locator('.featured .promo__img').count()) await assertDirectMedia(publicPage, '.featured .promo__img');
    const mainBox = await publicPage.locator('.featured__main').boundingBox();
    const promoBox = await publicPage.locator('.featured .promo').boundingBox();
    const leftBox = await publicPage.locator('.lower__left').boundingBox();
    const rightBox = await publicPage.locator('.lower__right').boundingBox();
    if (!mainBox || !promoBox || !leftBox || !rightBox) throw new Error('Missing homepage geometry');
    expect(Math.abs(mainBox.y - promoBox.y)).toBeLessThan(30);
    expect(mainBox.x + mainBox.width).toBeLessThan(promoBox.x + 5);
    expect(Math.abs(leftBox.y - rightBox.y)).toBeLessThan(30);
    expect(leftBox.x + leftBox.width).toBeLessThan(rightBox.x + 5);
    expect(await publicPage.locator('.home-content-order > *').evaluateAll((nodes) => nodes.map((node) => node.getAttribute('data-home-group'))))
      .toEqual(['hero', 'trust', 'featured', 'lower', 'faq']);

    for (const [width, height] of [[390, 844], [768, 1024], [1024, 768], [1440, 900], [1920, 1080]]) {
      await publicPage.setViewportSize({ width, height });
      await assertNoHorizontalOverflow(publicPage);
      const hero = await publicPage.locator('.hero').boundingBox();
      const search = await publicPage.locator('.hero__search').boundingBox();
      if (!hero || !search) throw new Error('Hero search missing at ' + width);
      expect(search.x).toBeGreaterThanOrEqual(-1);
      expect(search.x + search.width).toBeLessThanOrEqual(width + 1);
      const featured = await publicPage.locator('.featured').boundingBox();
      const main = await publicPage.locator('.featured__main').boundingBox();
      const promo = await publicPage.locator('.featured .promo').boundingBox();
      if (!featured || !main || !promo) throw new Error('Featured composition missing at ' + width);
      expect(promo.x + promo.width).toBeLessThanOrEqual(width + 1);
      const promoCta = await publicPage.locator('.featured .promo .btn').boundingBox();
      if (promoCta) expect(promoCta.x + promoCta.width).toBeLessThanOrEqual(width + 1);
      if (width < 1024) expect(promo.y).toBeGreaterThanOrEqual(main.y + main.height - 1);
      if (process.env.DVB_HOME_VISUAL_ARTIFACTS === '1' && width !== 1024) {
        mkdirSync('artifacts', { recursive: true });
        await publicPage.screenshot({ path: `artifacts/homepage-restored-${width}.png`, fullPage: true, animations: 'disabled' });
      }
    }

    await publicPage.setViewportSize({ width: 1440, height: 900 });
    await publicPage.goto('/phong-nghi');
    await expect(publicPage.locator('.lcard', { hasText: a.title })).toBeVisible();
    await expect(publicPage.locator('.lcard', { hasText: b.title })).toBeVisible();
    await assertDirectMedia(publicPage, '.lcard__img');
    if (process.env.DVB_HOME_VISUAL_ARTIFACTS === '1') await publicPage.screenshot({ path: 'artifacts/stays-media-1440.png', fullPage: true, animations: 'disabled' });
    await publicPage.goto(`/phong-nghi/${b.slug}`);
    await assertDirectMedia(publicPage, '.gallery__main .gallery__img');

    await featuredCard.getByRole('radio', { name: /Tất cả phòng đã xuất bản/ }).check();
    await featuredCard.getByRole('button', { name: 'Lưu thay đổi' }).click();
    await publicPage.goto('/');
    await expect(publicPage.locator('.featured .stay')).toHaveCount(2);
    await expect(publicPage.locator('.featured')).toContainText(a.title);
    await expect(publicPage.locator('.featured')).toContainText(b.title);

    await status(page, a.id, 'draft');
    await status(page, b.id, 'draft');
    await publicPage.reload();
    await expect(publicPage.locator('.featured__main')).toHaveCount(0);
    await expect(publicPage.locator('.featured .promo')).toBeVisible();
    const promoOnly = await publicPage.locator('.featured .promo').boundingBox();
    expect(promoOnly?.width).toBeLessThanOrEqual(360);
    await assertNoHorizontalOverflow(publicPage);

    await putSetting(page, 'home.why', { reasons: [{ id: 'empty', icon: 'user', title: '', description: '' }] });
    await putSetting(page, 'home.faq', { items: [{ id: 'empty', question: '', answer: '' }] });
    await publicPage.reload();
    await expect(publicPage.locator('.lower__left')).toHaveCount(0);
    await expect(publicPage.locator('.lower--single .lower__right')).toBeVisible();
    const singleRight = await publicPage.locator('.lower--single .lower__right').boundingBox();
    const singleContact = await publicPage.locator('.lower--single .contact').boundingBox();
    if (!singleRight || !singleContact) throw new Error('Single-column contact layout missing');
    expect(singleContact.width).toBeGreaterThanOrEqual(singleRight.width - 1);
    await expect(publicPage.locator('.home-faq')).toHaveCount(0);
  } finally {
    await publicContext.close();
    for (const id of createdIds.reverse()) {
      const current = await browserApi(page, '/properties/' + id);
      if (current.status === 404) continue;
      expect(current.status).toBe(200);
      const item = current.body as Property;
      if (!item.code.startsWith('HOME-QA-')) throw new Error('Refusing to delete non-test property');
      if (item.publicationStatus === 'published') await status(page, id, 'draft');
      const fresh = await property(page, id);
      const removed = await browserApi(page, `/properties/${id}?expectedVersion=${fresh.version}`, 'DELETE');
      expect([204, 404]).toContain(removed.status);
    }
    await restoreSettings(page, baseline);
    for (const id of ownMediaIds) {
      const removed = await browserApi(page, '/media/' + id, 'DELETE');
      expect([204, 404]).toContain(removed.status);
    }
  }
});
