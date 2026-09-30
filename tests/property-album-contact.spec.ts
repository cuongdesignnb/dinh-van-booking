import { expect, test, type Page } from '@playwright/test';
import { execFileSync } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { assertLocalPostgresCleanupAvailable, browserApi, cleanupLocalTestInquiry, createUniqueTestPng, signInAsOwner } from './admin/helpers';

type Media = { id: string; url: string; originalFilename: string; altText: string };
type Property = { id: string; contentId: string; slug: string; version: number; contentVersion: number; roomTypes: Array<{ id: string; name: string; version: number; unitCount: number; maxAdults: number | null; maxChildren: number | null; capacityVerified: boolean; status: string; amenities: Array<{ code: string; label: string }>; gallery: Array<{ mediaId: string }>; rate: { baseRateVnd: number } | null }> };
type Content = { id: string; slug: string; version: number };

async function upload(page: Page, stamp: number, index: number): Promise<Media> {
  // WebP conversion can quantize neighbouring one-pixel colours to the same
  // checksum, so space each synthetic swatch far apart.
  const base64 = createUniqueTestPng(stamp + index * 0x100000).toString('base64');
  const filename = `album-contact-${stamp}-${index}.png`;
  const result = await page.evaluate(async ({ base64, filename }) => {
    const bytes = Uint8Array.from(atob(base64), (char) => char.charCodeAt(0));
    const form = new FormData();
    form.append('altText', `Ảnh kiểm thử album ${filename}`);
    form.append('file', new Blob([bytes], { type: 'image/png' }), filename);
    const csrf = document.cookie.split('; ').find((part) => part.startsWith('dvb_csrf='));
    const response = await fetch('/api/v1/media/upload', { method: 'POST', credentials: 'include', headers: csrf ? { 'x-csrf-token': decodeURIComponent(csrf.slice('dvb_csrf='.length)) } : {}, body: form });
    return { status: response.status, body: await response.json() };
  }, { base64, filename });
  expect([200, 201]).toContain(result.status);
  return result.body as Media;
}

function localReviewFixture(contentId: string, stamp: number, ids: string[], action: 'create' | 'cleanup'): void {
  const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  if (!uuid.test(contentId) || ids.length !== 5 || ids.some((id) => !uuid.test(id)) || !/^\d{13}$/.test(String(stamp))) {
    throw new Error('Refusing local review fixture operation without exact QA identity.');
  }
  const marker = `ALBUM-REVIEW-QA-${stamp}`;
  const rows = ids.map((id, index) =>
    `('${id}'::uuid, '${contentId}'::uuid, 'Khách QA đánh giá ${index + 1}', ${index === 4 ? 1 : [5, 4, 5, 3][index]}, '${marker} nhận xét ${index + 1}', '${index === 4 ? 'pending' : 'approved'}', false)`,
  ).join(',\n');
  const idList = ids.map((id) => `'${id}'::uuid`).join(', ');
  const sql = action === 'create' ? `
DO $qa$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.content_nodes WHERE id = '${contentId}'::uuid AND publication_status = 'published' AND is_demo = false) THEN
    RAISE EXCEPTION 'Refusing review fixture: content is not published';
  END IF;
  INSERT INTO public.reviews (id, content_id, author_name, rating, body, moderation, is_demo)
  VALUES ${rows};
END
$qa$;
` : `
DO $qa$
DECLARE removed_count integer;
BEGIN
  IF (SELECT count(*) FROM public.reviews WHERE id IN (${idList}) AND content_id = '${contentId}'::uuid AND body LIKE '${marker}%') <> 5 THEN
    RAISE EXCEPTION 'Refusing review cleanup: exact QA set is missing or changed';
  END IF;
  DELETE FROM public.reviews WHERE id IN (${idList}) AND content_id = '${contentId}'::uuid AND body LIKE '${marker}%';
  GET DIAGNOSTICS removed_count = ROW_COUNT;
  IF removed_count <> 5 THEN RAISE EXCEPTION 'Refusing review cleanup: expected five rows'; END IF;
END
$qa$;
`;
  execFileSync('docker', [
    'exec', '-i', 'dvb-booking-postgres-1', 'sh', '-lc',
    'psql -X -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "$POSTGRES_DB"',
  ], { input: sql, encoding: 'utf8', stdio: ['pipe', 'ignore', 'pipe'] });
}

test('admin room types and reusable albums publish gallery; 0đ is contact-only', async ({ browser, page }) => {
  test.setTimeout(180_000);
  const baseURL = String(test.info().project.use.baseURL ?? process.env.BASE_URL ?? '');
  expect(baseURL).toMatch(/^http:\/\/(127\.0\.0\.1|localhost):\d+$/);
  assertLocalPostgresCleanupAvailable();
  await signInAsOwner(page);
  const seedCatalog = await browserApi(page, '/properties');
  const mineral = (seedCatalog.body as { items: Array<{ id: string; code: string; roomTypes: unknown[] }> }).items
    .find((item) => item.code === 'CP-MINERAL-RETREAT');
  expect(mineral?.roomTypes).toHaveLength(5);
  const mineralBefore = await browserApi(page, `/properties/${mineral!.id}`);
  const importedRoom = (mineralBefore.body as Property).roomTypes[0];
  expect(importedRoom).toMatchObject({ capacityVerified: false, maxAdults: null, maxChildren: null, status: 'inactive', unitCount: 0, rate: null });
  const prematureActivation = await browserApi(page, `/properties/${mineral!.id}/rooms/${importedRoom.id}`, 'PATCH', {
    name: importedRoom.name, status: 'active', capacityVerified: false, unitCount: 1, rateVnd: 0,
    expectedVersion: importedRoom.version,
  });
  expect(prematureActivation.status).toBe(400);
  const mineralAfterRejection = await browserApi(page, `/properties/${mineral!.id}`);
  expect((mineralAfterRejection.body as Property).roomTypes[0]).toMatchObject({ version: importedRoom.version, capacityVerified: false, unitCount: 0, rate: null });
  await page.goto('/admin/hang-phong');
  await expect(page.locator('.room-catalog__summary')).toContainText('Hạng phòng đã tạo');
  await expect(page.locator('.room-catalog__card')).toHaveCount(5);
  await page.getByRole('button', { name: 'Chọn cơ sở để thêm hạng' }).click();
  await expect(page.locator('.room-catalog__instruction')).toContainText('Hãy chọn nơi lưu trú');
  await expect(page.getByLabel('Nơi lưu trú')).toBeFocused();
  await page.goto(`/admin/hang-phong?property=${mineral!.id}`);
  await expect(page.locator('.room-catalog__card')).toHaveCount(5);
  await expect(page.locator('.room-catalog__card').first()).toContainText('Sức chứa chờ xác minh');
  await page.locator('.room-catalog__card').first().getByRole('button', { name: 'Sửa hạng phòng' }).click();
  await expect(page.getByLabel('Giá ngày thường (VND)')).toHaveValue('');
  await expect(page.getByLabel('Người lớn tối đa')).toHaveValue('');
  await expect(page.getByRole('checkbox', { name: /Đã xác minh sức chứa/ })).not.toBeChecked();
  await expect(page.getByText('Sức chứa hạng này chưa được xác minh.', { exact: false })).toBeVisible();
  await page.getByRole('button', { name: 'Quay lại danh sách hạng phòng' }).first().click();
  await page.goto('/admin/phong-nghi');
  const unconfiguredProperty = page.locator('.property-card', { hasText: 'CP-AN-GARDEN' });
  await expect(unconfiguredProperty.locator('.property-card__rooms')).toContainText('Hạng phòng (0)');
  await unconfiguredProperty.getByRole('link', { name: 'Thêm hạng phòng' }).click();
  await expect(page).toHaveURL(/\/admin\/hang-phong\?property=[^&]+&room=create/);
  await expect(page.getByRole('heading', { name: 'Hạng phòng mới · AN Garden Homestay', level: 2 })).toBeVisible();
  await page.getByRole('button', { name: 'Quay lại danh sách hạng phòng' }).first().click();
  await page.goto(`/admin/hang-phong?property=${mineral!.id}`);
  if (process.env.DVB_ROOM_VISUAL_ARTIFACTS === '1') {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.waitForTimeout(250);
    await page.screenshot({ path: 'artifacts/admin-room-catalog-390.png', fullPage: true });
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.screenshot({ path: 'artifacts/admin-room-catalog-1440.png', fullPage: true });
  }
  const stamp = Date.now();
  const inquiryName = 'Khách kiểm thử nội bộ';
  const inquiryPhone = `09${String(stamp).slice(-8)}`;
  const inquiryMarker = `ADMIN-RUN-TO-GOAL-${stamp}`;
  const reviewIds = Array.from({ length: 5 }, () => randomUUID());
  const assets: Media[] = [];
  let propertyId: string | null = null;
  let destinationId: string | null = null;
  let inquiryId: string | null = null;
  let reviewsCreated = false;
  const publicContext = await browser.newContext({ baseURL });
  const publicPage = await publicContext.newPage();
  publicPage.setDefaultTimeout(10_000);
  const publicHydrationErrors: string[] = [];
  publicPage.on('pageerror', (error) => publicHydrationErrors.push(error.message));
  publicPage.on('console', (message) => {
    if (message.type() === 'error' && /hydration failed|hydration mismatch|server rendered html|#418|text content does not match/i.test(message.text())) {
      publicHydrationErrors.push(message.text());
    }
  });
  try {
    for (let index = 1; index <= 4; index++) assets.push(await upload(page, stamp, index));
    expect(new Set(assets.map((asset) => asset.id)).size).toBe(assets.length);
    const description = 'Nơi lưu trú chỉ dùng trong bài kiểm thử local. Ảnh và thông tin này không mô tả cơ sở kinh doanh thực tế; toàn bộ bản ghi sẽ được xoá sau kiểm thử. '.repeat(8).trim();
    const title = `ALBUM-QA ${stamp} — Tên nơi lưu trú dài để kiểm tra trang chi tiết trên điện thoại và màn hình lớn`;
    const created = await browserApi(page, '/properties', 'POST', {
      title, code: `ALBUM-QA-${stamp}`, kind: 'lodge', area: 'Cúc Phương, Ninh Bình', address: 'Địa chỉ kiểm thử local tại khu vực Cúc Phương, huyện Nho Quan, tỉnh Ninh Bình; dòng địa chỉ cố ý dài để xác nhận nội dung xuống dòng an toàn trên mọi cỡ màn hình',
      description, roomCode: 'ROOM-A', roomName: 'Hạng phòng liên hệ A', maxAdults: 2, maxChildren: 0, unitCount: 1, rateVnd: 0,
      coverMediaId: assets[0].id, galleryMediaIds: [assets[1].id], roomGalleryMediaIds: [assets[2].id],
    });
    expect([200, 201]).toContain(created.status);
    const property = created.body as Property;
    propertyId = property.id;
    expect(property.roomTypes[0].gallery.map((item) => item.mediaId)).toEqual([assets[2].id]);

    await page.goto('/admin/phong-nghi');
    const propertyCard = page.locator('.property-card', { hasText: `ALBUM-QA ${stamp}` });
    await expect(propertyCard.locator('.property-card__rooms')).toContainText('Hạng phòng (1)');
    await expect(propertyCard.locator('.property-card__rooms')).toContainText('Hạng phòng liên hệ A');
    await propertyCard.getByRole('button', { name: 'Sửa', exact: true }).click();
    await expect(page.getByRole('link', { name: 'Đến hạng phòng (1)' })).toBeVisible();
    await page.getByRole('link', { name: 'Đến hạng phòng (1)' }).click();
    await expect(page.locator('#hang-phong')).toBeInViewport();
    await expect(page.getByRole('link', { name: 'Xem danh sách hạng phòng' })).toHaveAttribute('href', `/admin/hang-phong?property=${property.id}`);
    await page.getByRole('button', { name: 'Quay lại danh sách', exact: true }).click();
    await propertyCard.getByRole('link', { name: 'Hạng phòng (1)' }).click();
    await expect(page).toHaveURL(new RegExp(`/admin/hang-phong\\?property=${property.id}`));
    await expect(page.locator('.room-catalog__card')).toHaveCount(1);
    expect(await page.getByRole('button', { name: 'Thêm hạng cho cơ sở này' }).evaluate((element) => getComputedStyle(element).color)).toBe('rgb(255, 255, 255)');
    await page.setViewportSize({ width: 390, height: 844 });
    await page.waitForTimeout(250);
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(391);
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.getByRole('button', { name: 'Thêm hạng cho cơ sở này' }).click();
    await expect(page).toHaveURL(/room=create/);
    if (process.env.DVB_ROOM_VISUAL_ARTIFACTS === '1') {
      await page.setViewportSize({ width: 390, height: 844 });
      await page.waitForTimeout(300);
      expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(391);
      await page.screenshot({ path: 'artifacts/admin-room-create-390.png', fullPage: true });
      await page.setViewportSize({ width: 1440, height: 900 });
      await page.screenshot({ path: 'artifacts/admin-room-create-1440.png', fullPage: true });
    }
    await page.getByLabel('Mã hạng phòng *').fill('ROOM-B');
    await page.getByLabel('Tên hạng phòng *').fill('Hạng phòng liên hệ B');
    await page.getByLabel('Kiểu chỗ ở của hạng *').selectOption('bungalow');
    await page.getByLabel('Số phòng ngủ của mỗi căn').fill('2');
    await page.getByLabel('Số phòng tắm riêng của mỗi căn').fill('1');
    await page.getByLabel('Người lớn tối đa').fill('2');
    await page.getByLabel('Trẻ em tối đa').fill('0');
    await page.locator('label.atoggle', { hasText: 'Đã xác minh sức chứa' }).click();
    await expect(page.getByRole('checkbox', { name: /Đã xác minh sức chứa/ })).toBeChecked();
    await page.getByLabel('Số căn thuộc hạng này').fill('1');
    await page.getByLabel('Giá ngày thường (VND)').fill('250000');
    await page.getByLabel('Trạng thái hạng phòng').selectOption('active');
    await page.getByRole('checkbox', { name: 'Wi-Fi trong phòng' }).check();
    await page.getByRole('checkbox', { name: 'Ban công' }).check();
    const album = page.locator('.album-editor');
    await album.getByRole('button', { name: 'Thêm ảnh' }).click();
    const dialog = page.locator('dialog[open]');
    await dialog.getByLabel('Tìm trong thư viện ảnh').fill(assets[3].originalFilename);
    await expect(dialog.locator('.media-library__card')).toHaveCount(1);
    await dialog.locator('.media-library__card').click();
    await page.getByRole('button', { name: 'Lưu và thêm hạng khác' }).click();
    await expect(page).toHaveURL(new RegExp(`/admin/hang-phong\\?property=${property.id}&room=create`));
    await expect(page.locator('.room-catalog__existing li')).toHaveCount(2);
    await expect(page.getByLabel('Mã hạng phòng *')).toHaveValue('');
    await expect(page.getByLabel('Tên hạng phòng *')).toHaveValue('');
    await page.getByRole('button', { name: 'Quay lại danh sách hạng phòng' }).first().click();
    await expect(page.locator('.room-catalog__card')).toHaveCount(2);
    const updated = await browserApi(page, `/properties/${property.id}`);
    expect(updated.status).toBe(200);
    const current = updated.body as Property;
    expect(current.roomTypes.find((room) => room.name === 'Hạng phòng liên hệ B')).toMatchObject({ unitKind: 'bungalow', bedroomCount: 2, bathroomCount: 1 });
    expect(current.roomTypes.find((room) => room.name === 'Hạng phòng liên hệ B')?.amenities.map((item) => item.code).sort()).toEqual(['room_balcony', 'room_wifi']);
    expect(current.roomTypes.find((room) => room.name === 'Hạng phòng liên hệ A')?.amenities).toEqual([]);
    expect(current.roomTypes.find((room) => room.name === 'Hạng phòng liên hệ B')?.gallery.map((item) => item.mediaId)).toEqual([assets[3].id]);

    await page.goto(`/admin/hang-phong?property=${mineral!.id}`);
    await expect(page.locator('.room-catalog__card')).toHaveCount(5);
    await expect(page.locator('.room-catalog__card', { hasText: 'Hạng phòng liên hệ B' })).toHaveCount(0);
    await page.goto(`/admin/hang-phong?property=${property.id}`);
    await expect(page.locator('.room-catalog__card')).toHaveCount(2);

    const roomCard = page.locator('.room-catalog__card', { hasText: 'Hạng phòng liên hệ B' });
    await roomCard.getByRole('button', { name: 'Sửa hạng phòng' }).click();
    await page.getByLabel('Số căn thuộc hạng này').fill('2');
    await page.getByRole('button', { name: 'Lưu hạng phòng' }).click();
    await expect(page.locator('.room-catalog__card', { hasText: 'Hạng phòng liên hệ B' })).toContainText('2 phòng');
    const afterUnits = await browserApi(page, `/properties/${property.id}`);
    expect(afterUnits.status).toBe(200);
    const withUnits = afterUnits.body as Property;
    const roomB = withUnits.roomTypes.find((room) => room.name === 'Hạng phòng liên hệ B');
    expect(roomB?.unitCount).toBe(2);
    expect((await browserApi(page, `/properties/${property.id}/rooms/${roomB!.id}`, 'PATCH', {
      name: roomB!.name, maxAdults: roomB!.maxAdults, maxChildren: roomB!.maxChildren,
      rateVnd: roomB!.rate!.baseRateVnd, status: roomB!.status, unitCount: 1, expectedVersion: roomB!.version,
    })).status).toBe(409);
    const afterRejectedDecrease = await browserApi(page, `/properties/${property.id}`);
    expect((afterRejectedDecrease.body as Property).roomTypes.find((room) => room.id === roomB!.id)?.unitCount).toBe(2);

    const published = await browserApi(page, `/content/${property.contentId}/status`, 'PATCH', { status: 'published', expectedVersion: withUnits.contentVersion });
    expect(published.status).toBe(200);
    const lodgingPage = await publicPage.goto('/phong-nghi');
    expect(lodgingPage?.status()).toBe(200);
    await expect(publicPage.getByRole('heading', { name: title, level: 3 })).toBeVisible();
    expect(publicHydrationErrors).toEqual([]);
    localReviewFixture(property.contentId, stamp, reviewIds, 'create');
    reviewsCreated = true;
    const reviewsApi = await browserApi(page, '/public/reviews');
    expect(reviewsApi.status).toBe(200);
    const syntheticReviews = (reviewsApi.body as { items: Array<{ body?: string; quote?: string }> }).items
      .filter((item) => JSON.stringify(item).includes(`ALBUM-REVIEW-QA-${stamp}`));
    expect(syntheticReviews).toHaveLength(4);
    await publicPage.goto('/');
    const reviewDots = publicPage.locator('.reviews .review-card__dots button');
    expect(await reviewDots.count()).toBeGreaterThan(0);
    expect(await reviewDots.count()).toBeLessThanOrEqual(4);
    const reviewsTitle = await publicPage.locator('.reviews .section-title').textContent();
    const allReviewsButton = publicPage.locator('.reviews .link-more');
    await expect(allReviewsButton).toBeVisible();
    await allReviewsButton.click();
    const reviewsDialog = publicPage.locator('dialog[open]');
    await expect(reviewsDialog.locator('.dialog__title')).toHaveText(reviewsTitle?.trim() ?? '');
    await expect(reviewsDialog.locator('.dialog__reviews li').filter({ hasText: `ALBUM-REVIEW-QA-${stamp}` })).toHaveCount(4);
    await expect(reviewsDialog).toContainText(`ALBUM-REVIEW-QA-${stamp} nhận xét 4`);
    await expect(reviewsDialog).not.toContainText(`ALBUM-REVIEW-QA-${stamp} nhận xét 5`);
    await expect(reviewsDialog).not.toContainText('Chưa có đánh giá đã được công bố');
    await expect(reviewsDialog.getByLabel('5 trên 5 sao').first()).toBeVisible();
    for (const width of [390, 1440]) {
      await publicPage.setViewportSize({ width, height: 900 });
      const reviewLayout = await reviewsDialog.evaluate((element) => ({
        pageWidth: document.documentElement.scrollWidth,
        dialogLeft: element.getBoundingClientRect().left,
        dialogRight: element.getBoundingClientRect().right,
        bodyWidth: element.querySelector('.dialog__body')!.clientWidth,
        bodyScrollWidth: element.querySelector('.dialog__body')!.scrollWidth,
      }));
      expect(reviewLayout.pageWidth).toBeLessThanOrEqual(width + 1);
      expect(reviewLayout.dialogLeft).toBeGreaterThanOrEqual(-1);
      expect(reviewLayout.dialogRight).toBeLessThanOrEqual(width + 1);
      expect(reviewLayout.bodyScrollWidth).toBeLessThanOrEqual(reviewLayout.bodyWidth + 1);
    }
    await publicPage.keyboard.press('Escape');
    await expect(allReviewsButton).toBeFocused();
    localReviewFixture(property.contentId, stamp, reviewIds, 'cleanup');
    reviewsCreated = false;
    const publicStay = await browserApi(page, `/public/stays/${property.slug}`);
    expect(publicStay.status).toBe(200);
    expect((publicStay.body as { gallery: Media[] }).gallery).toHaveLength(2);
    await publicPage.goto('/phong-nghi');
    const card = publicPage.locator('.lcard', { hasText: `ALBUM-QA ${stamp}` });
    await expect(card).toBeVisible();
    await expect(card).toContainText('250.000đ');
    await expect(card).toContainText('Hạng khác cần liên hệ giá');
    await expect(card.locator('.lcard__rating')).toHaveCount(0);
    await expect(card.getByRole('link', { name: /Xem chi tiết/ })).toHaveAttribute('href', new RegExp(`^/phong-nghi/${property.slug}(?:\\?|$)`));
    await expect(publicPage.locator('.pager')).toHaveCount(0);
    await expect(publicPage.getByRole('link', { name: 'Bản đồ' })).toHaveCount(0);
    for (const width of [390, 1440]) {
      await publicPage.setViewportSize({ width, height: 900 });
      await publicPage.evaluate(() => document.fonts.ready);
      const layout = await card.evaluate((element) => {
        const cardBox = element.getBoundingClientRect();
        const priceBox = element.querySelector('.lcard__price')!.getBoundingClientRect();
        const ctaBox = element.querySelector('.lcard__foot a')!.getBoundingClientRect();
        return { scrollWidth: document.documentElement.scrollWidth, cardLeft: cardBox.left, cardRight: cardBox.right, priceLeft: priceBox.left, ctaRight: ctaBox.right };
      });
      expect(layout.scrollWidth, `listing overflows at ${width}px`).toBeLessThanOrEqual(width + 1);
      expect(layout.priceLeft).toBeGreaterThanOrEqual(layout.cardLeft - 1);
      expect(layout.ctaRight).toBeLessThanOrEqual(layout.cardRight + 1);
    }
    await publicPage.goto('/phong-nghi?types=glamping');
    await expect(publicPage.locator('.stays-search')).toBeVisible();
    await expect(publicPage.locator('.stays-toolbar__count')).toContainText('Có 0 kết quả phù hợp');
    await expect(publicPage.locator('.stays-empty-state h2')).toHaveText('Không tìm thấy nơi lưu trú phù hợp');
    await expect(publicPage.locator('.pager')).toHaveCount(0);
    await publicPage.goto('/phong-nghi');
    await publicPage.locator('.stays-side--left label.fcheck', { hasText: 'Eco Lodge' }).click();
    await expect(publicPage.locator('.stays-side--left').getByRole('checkbox', { name: /Eco Lodge/ })).toBeChecked();
    await expect(publicPage).toHaveURL(/types=eco-lodge/);
    await expect(card).toBeVisible();
    await publicPage.goto('/phong-nghi?types=eco-lodge&max=700000');
    await expect(card).toBeVisible();
    await expect(card).toContainText('250.000đ');
    await publicPage.goto(`/phong-nghi/${property.slug}`);
    await expect(publicPage.locator('.detail-head__title')).toHaveText(title);
    await expect(publicPage.locator('.rtype')).toHaveCount(2);
    await expect(publicPage.locator('.rtype', { hasText: 'Hạng phòng liên hệ B' })).toContainText('Bungalow');
    await expect(publicPage.locator('.rtype', { hasText: 'Hạng phòng liên hệ B' })).toContainText('2 phòng ngủ');
    await expect(publicPage.locator('.rtype', { hasText: 'Hạng phòng liên hệ B' })).toContainText('1 phòng tắm');
    await expect(publicPage.locator('.rtype', { hasText: 'Hạng phòng liên hệ B' })).toContainText('Wi-Fi trong phòng');
    await expect(publicPage.locator('.rtype', { hasText: 'Hạng phòng liên hệ B' })).toContainText('Ban công');
    await expect(publicPage.locator('.rtype', { hasText: 'Hạng phòng liên hệ A' })).not.toContainText('Ban công');
    expect(await publicPage.locator('.rtype').first().evaluate((element) => getComputedStyle(element).opacity)).toBe('1');
    for (const width of [390, 768, 1024, 1440, 1920]) {
      await publicPage.setViewportSize({ width, height: 900 });
      await publicPage.evaluate(() => document.fonts.ready);
      const layout = await publicPage.evaluate(() => {
        const rect = (selector: string) => {
          const element = document.querySelector(selector);
          if (!element) throw new Error(`Missing detail region: ${selector}`);
          const { left, right, top, bottom } = element.getBoundingClientRect();
          return { left, right, top, bottom };
        };
        const regions = ['.detail-head', '.detail-top__gallery', '.detail-top__book', '.detail-top__info'].map(rect);
        const overlap = (a: typeof regions[number], b: typeof regions[number]) =>
          Math.max(0, Math.min(a.right, b.right) - Math.max(a.left, b.left))
          * Math.max(0, Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top));
        return {
          scrollWidth: document.documentElement.scrollWidth,
          overlaps: [overlap(regions[0], regions[1]), overlap(regions[0], regions[2]), overlap(regions[1], regions[2]), overlap(regions[2], regions[3])],
        };
      });
      expect(layout.scrollWidth, `horizontal overflow at ${width}px`).toBeLessThanOrEqual(width + 1);
      expect(layout.overlaps, `detail sections overlap at ${width}px`).toEqual([0, 0, 0, 0]);
      if (width === 390) {
        const fixedBars = await publicPage.evaluate(() => {
          const booking = document.querySelector('.mbar')?.getBoundingClientRect();
          const navigation = document.querySelector('.mobilebar')?.getBoundingClientRect();
          if (!booking || !navigation) throw new Error('Missing mobile booking or navigation bar');
          return { bookingBottom: booking.bottom, navigationTop: navigation.top };
        });
        expect(fixedBars.bookingBottom, 'mobile booking bar must sit above bottom navigation').toBeLessThanOrEqual(fixedBars.navigationTop + 1);
      }
      if (process.env.DVB_STAY_DETAIL_VISUAL_ARTIFACTS === '1' && [390, 1440].includes(width)) {
        await publicPage.screenshot({ path: `artifacts/public-stay-detail-${width}.png`, fullPage: true });
      }
    }
    await expect(publicPage.locator('.gallery__thumb')).toHaveCount(1);
    await expect(publicPage.locator('.bcard:not(.bcard--contact)')).toContainText('250.000đ');
    await expect(publicPage.locator('.bcard__contact-note')).toContainText('hạng khác cần liên hệ');
    await expect(publicPage.locator('.rtype__gallery')).toHaveCount(2);
    await publicPage.setViewportSize({ width: 390, height: 844 });
    const galleryOpener = publicPage.getByRole('button', { name: 'Xem tất cả 2 ảnh' });
    await galleryOpener.focus();
    await publicPage.keyboard.press('Enter');
    const propertyDialog = publicPage.locator('dialog[open]');
    await expect(propertyDialog.locator('.gview__cap [aria-live="polite"]')).toHaveText('1 / 2');
    await publicPage.keyboard.press('ArrowRight');
    await expect(propertyDialog.locator('.gview__cap [aria-live="polite"]')).toHaveText('2 / 2');
    await publicPage.keyboard.press('ArrowRight');
    await expect(propertyDialog.locator('.gview__cap [aria-live="polite"]')).toHaveText('1 / 2');
    const dialogWidth = await propertyDialog.evaluate((element) => element.getBoundingClientRect().width);
    expect(dialogWidth).toBeLessThanOrEqual(390);
    await publicPage.keyboard.press('Escape');
    await expect(propertyDialog).toHaveCount(0);
    await expect(galleryOpener).toBeFocused();
    await publicPage.locator('.rtype__gallery').first().click();
    await expect(publicPage.locator('dialog[open] .gview__figure')).toBeVisible();
    await publicPage.locator('dialog[open]').getByRole('button', { name: 'Đóng hộp thoại' }).click();
    const arrival = new Date(Date.now() + 7 * 86_400_000).toISOString().slice(0, 10);
    const departure = new Date(Date.now() + 9 * 86_400_000).toISOString().slice(0, 10);
    await publicPage.goto(`/phong-nghi/${property.slug}?checkIn=${arrival}&checkOut=${departure}&adults=2&children=0&rooms=2`);
    const contactRoom = publicPage.locator('.rtype', { hasText: 'Hạng phòng liên hệ A' });
    await expect(contactRoom).toContainText('Liên hệ để nhận giá');
    await expect(contactRoom.getByRole('link', { name: 'Liên hệ' })).toHaveAttribute('href', new RegExp(`^/lien-he\\?.*intent=stay.*item=${property.slug}.*room=${property.roomTypes[0].id}$`));
    await expect(contactRoom.getByRole('button', { name: /Chọn/ })).toHaveCount(0);
    await contactRoom.getByRole('link', { name: 'Liên hệ' }).click();
    await expect(publicPage.locator('.cform__context')).toContainText(title);
    await expect(publicPage.locator('.cform__context')).toContainText('Hạng phòng liên hệ A');
    for (const width of [390, 768, 1440]) {
      await publicPage.setViewportSize({ width, height: 900 });
      const layout = await publicPage.evaluate(() => {
        const form = document.querySelector('.cform')!.getBoundingClientRect();
        const context = document.querySelector('.cform__context')!.getBoundingClientRect();
        return { scrollWidth: document.documentElement.scrollWidth, formRight: form.right, contextRight: context.right };
      });
      expect(layout.scrollWidth, `contact overflows at ${width}px`).toBeLessThanOrEqual(width + 1);
      expect(layout.contextRight, `contact context escapes form at ${width}px`).toBeLessThanOrEqual(layout.formRight + 1);
    }
    await expect(publicPage.locator('.cfield__btn').first()).toContainText('→');
    await expect(publicPage.locator('.cfield__btn').last()).toContainText('2 phòng');
    await publicPage.locator('input[name="name"]').fill(inquiryName);
    await publicPage.locator('input[name="phone"]').fill(inquiryPhone);
    await publicPage.locator('textarea[name="message"]').fill(inquiryMarker);
    const inquiryResponse = publicPage.waitForResponse((response) => response.url().endsWith('/api/v1/inquiries') && response.request().method() === 'POST');
    await publicPage.getByRole('button', { name: /^Gửi yêu cầu/ }).click();
    const submittedInquiry = await inquiryResponse;
    expect(submittedInquiry.status()).toBe(201);
    inquiryId = ((await submittedInquiry.json()) as { id: string }).id;
    await expect(publicPage.getByRole('heading', { name: 'Đã nhận yêu cầu tư vấn' })).toBeVisible();
    const inbox = await browserApi(page, `/inquiries?search=${inquiryPhone}&page=1&pageSize=10`);
    expect(inbox.status).toBe(200);
    const linked = (inbox.body as { items: Array<{ id: string; relatedContentId: string | null; relatedContentTitle: string | null; relatedRoomTypeId: string | null; relatedRoomName: string | null; desiredCheckIn: string | null; desiredCheckOut: string | null; requestedRooms: number | null }> }).items.find((item) => item.id === inquiryId);
    expect(linked).toMatchObject({ relatedContentId: property.contentId, relatedContentTitle: title, relatedRoomTypeId: property.roomTypes[0].id, relatedRoomName: 'Hạng phòng liên hệ A', desiredCheckIn: arrival, desiredCheckOut: departure, requestedRooms: 2 });
    await page.goto('/admin/yeu-cau-tu-van');
    await expect(page.locator('.settings-item', { hasText: inquiryPhone })).toContainText(`${title} · Hạng phòng Hạng phòng liên hệ A`);
    await publicPage.goto(`/phong-nghi/${property.slug}`);
    await publicPage.getByRole('button', { name: 'Chọn Hạng phòng liên hệ B' }).click();
    await expect(publicPage.locator('.bcard:not(.bcard--contact)')).toContainText('250.000đ');

    const mediaRoute = '**/media/**';
    await publicPage.route(mediaRoute, (route) => route.abort());
    await publicPage.reload();
    await expect(publicPage.locator('.gallery__main .gallery__image-fallback')).toBeVisible();
    await expect(publicPage.locator('.rtype__image-fallback').first()).toBeVisible();
    await publicPage.locator('.gallery__main').click();
    await expect(publicPage.locator('dialog[open] .gview__fallback')).toContainText('Ảnh tạm thời không hiển thị');
    await publicPage.locator('dialog[open]').getByRole('button', { name: 'Đóng hộp thoại' }).click();
    await publicPage.unroute(mediaRoute);

    await page.goto(`/admin/hang-phong?property=${property.id}&room=create`);
    await page.getByRole('button', { name: `Tạo hạng khác cho ${title}` }).click();
    await page.getByLabel('Mã hạng phòng *').fill('ROOM-DRAFT');
    await page.getByLabel('Tên hạng phòng *').fill('Hạng phòng chờ xác minh');
    await page.getByLabel('Kiểu chỗ ở của hạng *').selectOption('room');
    await expect(page.getByLabel('Trạng thái hạng phòng')).toHaveValue('inactive');
    await page.getByLabel('Trạng thái hạng phòng').selectOption('active');
    await page.getByRole('button', { name: 'Lưu hạng phòng' }).click();
    await expect(page.locator('.property-form .settings-screen__message--error')).toContainText('xác minh sức chứa');
    await page.getByLabel('Trạng thái hạng phòng').selectOption('inactive');
    await page.getByRole('button', { name: 'Lưu hạng phòng' }).click();
    await expect(page.locator('.room-catalog__card')).toHaveCount(3);
    const withDraft = await browserApi(page, `/properties/${property.id}`);
    expect(withDraft.status).toBe(200);
    const draftRoom = (withDraft.body as Property).roomTypes.find((room) => room.name === 'Hạng phòng chờ xác minh');
    expect(draftRoom).toMatchObject({ status: 'inactive', capacityVerified: false, unitCount: 0, rate: null });
    await publicPage.reload();
    await expect(publicPage.locator('.rtype')).toHaveCount(2);

    const body = { type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Điểm đến kiểm thử album ảnh của hệ thống. Nội dung chỉ phục vụ xác nhận ảnh bìa và ảnh album hiển thị đúng trên giao diện công khai rồi được xoá sau khi chạy xong.' }] }] };
    const destination = await browserApi(page, '/content', 'POST', {
      kind: 'destination', title: `DEST-ALBUM-QA ${stamp}`, excerpt: 'Điểm đến kiểm thử album', body,
      metaTitle: `Điểm đến kiểm thử ${stamp}`, metaDescription: 'Kiểm thử hiển thị album ảnh điểm đến với Media Library và ảnh có mô tả ALT.',
      media: [{ mediaId: assets[0].id, role: 'cover', position: 0 }, { mediaId: assets[1].id, role: 'gallery', position: 1 }],
      details: { destination: { category: 'Tự nhiên', location: 'Cúc Phương' } },
    });
    expect([200, 201]).toContain(destination.status);
    const dest = destination.body as Content;
    destinationId = dest.id;
    expect((await browserApi(page, `/content/${dest.id}/status`, 'PATCH', { status: 'published', expectedVersion: dest.version })).status).toBe(200);
    await publicPage.goto(`/diem-den/${dest.slug}`);
    await expect(publicPage.locator('.static-page__gallery .gallery__thumb')).toHaveCount(1);
    await expect(publicPage.locator('.static-page__gallery .gallery__all')).toContainText('2 ảnh');
    await publicPage.goto(`/lien-he?intent=destination&item=${encodeURIComponent(dest.slug)}`);
    await expect(publicPage.locator('.cform__context')).toContainText(`DEST-ALBUM-QA ${stamp}`);
    expect((await browserApi(page, `/media/${assets[0].id}`, 'DELETE')).status).toBe(409);

    const activity = await browserApi(page, '/admin/dashboard/activity');
    expect(activity.status).toBe(200);
    const adminItems = (activity.body as { items: Array<{ kind: string; title: string; detail: string | null }> }).items.filter((item) => item.kind === 'admin');
    expect(adminItems.length).toBeGreaterThan(0);
    for (const item of adminItems) {
      expect(`${item.title} ${item.detail ?? ''}`).not.toMatch(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i);
      expect(item.title).not.toMatch(/^[a-z]+\.[a-z_]+/);
    }
  } finally {
    await publicContext.close();
    if (reviewsCreated && propertyId) {
      const currentProperty = await browserApi(page, `/properties/${propertyId}`);
      if (currentProperty.status === 200) localReviewFixture((currentProperty.body as Property).contentId, stamp, reviewIds, 'cleanup');
    }
    if (!inquiryId) {
      const inquiryLookup = await browserApi(page, `/inquiries?search=${inquiryPhone}&page=1&pageSize=10`);
      if (inquiryLookup.status === 200) {
        const exact = (inquiryLookup.body as { items: Array<{ id: string; customer: { name: string; phone: string | null }; message: string | null }> }).items
          .filter((item) => item.customer.name === inquiryName && item.customer.phone === inquiryPhone && item.message === inquiryMarker);
        if (exact.length === 1) inquiryId = exact[0].id;
      }
    }
    if (inquiryId) cleanupLocalTestInquiry({ id: inquiryId, name: inquiryName, phone: inquiryPhone, marker: inquiryMarker });
    if (destinationId) {
      const current = await browserApi(page, `/content/${destinationId}`);
      if (current.status === 200) {
        let version = (current.body as Content).version;
        const drafted = await browserApi(page, `/content/${destinationId}/status`, 'PATCH', { status: 'draft', expectedVersion: version });
        if (drafted.status === 200) version = (drafted.body as Content).version;
        expect((await browserApi(page, `/content/${destinationId}?expectedVersion=${version}`, 'DELETE')).status).toBe(204);
      }
    }
    if (propertyId) {
      const current = await browserApi(page, `/properties/${propertyId}`);
      if (current.status === 200) {
        const row = current.body as Property;
        const drafted = await browserApi(page, `/content/${row.contentId}/status`, 'PATCH', { status: 'draft', expectedVersion: row.contentVersion });
        expect(drafted.status).toBe(200);
        const after = await browserApi(page, `/properties/${propertyId}`);
        expect((await browserApi(page, `/properties/${propertyId}?expectedVersion=${(after.body as Property).version}`, 'DELETE')).status).toBe(204);
      }
    }
    for (const asset of assets) expect((await browserApi(page, `/media/${asset.id}`, 'DELETE')).status).toBe(204);
  }
});
