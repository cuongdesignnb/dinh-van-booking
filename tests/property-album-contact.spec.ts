import { expect, test, type Page } from '@playwright/test';
import { browserApi, createUniqueTestPng, signInAsOwner } from './admin/helpers';

type Media = { id: string; url: string; originalFilename: string; altText: string };
type Property = { id: string; contentId: string; slug: string; version: number; contentVersion: number; roomTypes: Array<{ id: string; name: string; version: number; unitCount: number; maxAdults: number; maxChildren: number; status: string; gallery: Array<{ mediaId: string }>; rate: { baseRateVnd: number } | null }> };
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

test('admin room types and reusable albums publish gallery; 0đ is contact-only', async ({ browser, page }) => {
  test.setTimeout(180_000);
  const baseURL = String(test.info().project.use.baseURL ?? process.env.BASE_URL ?? '');
  expect(baseURL).toMatch(/^http:\/\/(127\.0\.0\.1|localhost):\d+$/);
  await signInAsOwner(page);
  const seedCatalog = await browserApi(page, '/properties');
  const mineral = (seedCatalog.body as { items: Array<{ id: string; code: string; roomTypes: unknown[] }> }).items
    .find((item) => item.code === 'CP-MINERAL-RETREAT');
  expect(mineral?.roomTypes).toHaveLength(5);
  await page.goto('/admin/hang-phong');
  await expect(page.locator('.room-catalog__summary')).toContainText('Hạng phòng đã tạo');
  await expect(page.locator('.room-catalog__card')).toHaveCount(5);
  await page.getByRole('button', { name: 'Thêm hạng phòng' }).click();
  await expect(page.locator('.room-catalog__instruction')).toContainText('Hãy chọn nơi lưu trú');
  await expect(page.getByLabel('Nơi lưu trú')).toBeFocused();
  await page.goto(`/admin/hang-phong?property=${mineral!.id}`);
  await expect(page.locator('.room-catalog__card')).toHaveCount(5);
  await expect(page.locator('.room-catalog__card').first()).toContainText('Sức chứa chờ xác minh');
  await page.locator('.room-catalog__card').first().getByRole('button', { name: 'Sửa hạng phòng' }).click();
  await expect(page.getByLabel('Giá ngày thường (VND)')).toHaveValue('');
  await page.getByRole('button', { name: 'Quay lại danh sách hạng phòng' }).first().click();
  await page.goto('/admin/phong-nghi');
  const unconfiguredProperty = page.locator('.property-card', { hasText: 'CP-AN-GARDEN' });
  await expect(unconfiguredProperty.locator('.property-card__rooms')).toContainText('Hạng phòng (0)');
  await unconfiguredProperty.getByRole('link', { name: 'Thêm hạng phòng' }).click();
  await expect(page).toHaveURL(/\/admin\/hang-phong\?property=[^&]+&room=create/);
  await expect(page.getByRole('heading', { name: 'Thêm hạng phòng' }).first()).toBeVisible();
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
  const assets: Media[] = [];
  let propertyId: string | null = null;
  let destinationId: string | null = null;
  const publicContext = await browser.newContext({ baseURL });
  const publicPage = await publicContext.newPage();
  try {
    for (let index = 1; index <= 4; index++) assets.push(await upload(page, stamp, index));
    expect(new Set(assets.map((asset) => asset.id)).size).toBe(assets.length);
    const description = 'Nơi lưu trú chỉ dùng trong bài kiểm thử local. Ảnh và thông tin này không mô tả cơ sở kinh doanh thực tế; toàn bộ bản ghi sẽ được xoá sau kiểm thử. '.repeat(8).trim();
    const title = `ALBUM-QA ${stamp} — Tên nơi lưu trú dài để kiểm tra trang chi tiết trên điện thoại và màn hình lớn`;
    const created = await browserApi(page, '/properties', 'POST', {
      title, code: `ALBUM-QA-${stamp}`, kind: 'homestay', area: 'Cúc Phương, Ninh Bình', address: 'Địa chỉ kiểm thử local tại khu vực Cúc Phương, huyện Nho Quan, tỉnh Ninh Bình; dòng địa chỉ cố ý dài để xác nhận nội dung xuống dòng an toàn trên mọi cỡ màn hình',
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
    expect(await page.getByRole('button', { name: 'Thêm hạng phòng' }).evaluate((element) => getComputedStyle(element).color)).toBe('rgb(255, 255, 255)');
    await page.setViewportSize({ width: 390, height: 844 });
    await page.waitForTimeout(250);
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(391);
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.getByRole('button', { name: 'Thêm hạng phòng' }).click();
    await expect(page).toHaveURL(/room=create/);
    await page.getByLabel('Mã hạng phòng *').fill('ROOM-B');
    await page.getByLabel('Tên hạng phòng *').fill('Hạng phòng liên hệ B');
    await page.getByLabel('Người lớn tối đa *').fill('2');
    await page.getByLabel('Trẻ em tối đa *').fill('0');
    await page.getByLabel('Số phòng thực tế').fill('1');
    await page.getByLabel('Giá ngày thường (VND)').fill('250000');
    await page.getByLabel('Trạng thái hạng phòng').selectOption('active');
    const album = page.locator('.album-editor');
    await album.getByRole('button', { name: 'Thêm ảnh' }).click();
    const dialog = page.locator('dialog[open]');
    await dialog.getByLabel('Tìm trong thư viện ảnh').fill(assets[3].originalFilename);
    await expect(dialog.locator('.media-library__card')).toHaveCount(1);
    await dialog.locator('.media-library__card').click();
    await page.getByRole('button', { name: 'Lưu hạng phòng' }).click();
    await expect(page.locator('.room-catalog__card')).toHaveCount(2);
    const updated = await browserApi(page, `/properties/${property.id}`);
    expect(updated.status).toBe(200);
    const current = updated.body as Property;
    expect(current.roomTypes.find((room) => room.name === 'Hạng phòng liên hệ B')?.gallery.map((item) => item.mediaId)).toEqual([assets[3].id]);

    await page.goto(`/admin/hang-phong?property=${mineral!.id}`);
    await expect(page.locator('.room-catalog__card')).toHaveCount(5);
    await expect(page.locator('.room-catalog__card', { hasText: 'Hạng phòng liên hệ B' })).toHaveCount(0);
    await page.goto(`/admin/hang-phong?property=${property.id}`);
    await expect(page.locator('.room-catalog__card')).toHaveCount(2);

    const roomCard = page.locator('.room-catalog__card', { hasText: 'Hạng phòng liên hệ B' });
    await roomCard.getByRole('button', { name: 'Sửa hạng phòng' }).click();
    await page.getByLabel('Số phòng thực tế').fill('2');
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
    const publicStay = await browserApi(page, `/public/stays/${property.slug}`);
    expect(publicStay.status).toBe(200);
    expect((publicStay.body as { gallery: Media[] }).gallery).toHaveLength(2);
    await publicPage.goto('/phong-nghi');
    const card = publicPage.locator('.lcard', { hasText: `ALBUM-QA ${stamp}` });
    await expect(card).toBeVisible();
    await expect(card).toContainText('Liên hệ để nhận giá');
    await expect(card.getByRole('link', { name: /Liên hệ/ })).toHaveAttribute('href', '/lien-he');
    await publicPage.goto(`/phong-nghi/${property.slug}`);
    await expect(publicPage.locator('.detail-head__title')).toHaveText(title);
    await expect(publicPage.locator('.rtype')).toHaveCount(2);
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
      if (process.env.DVB_STAY_DETAIL_VISUAL_ARTIFACTS === '1' && [390, 1440].includes(width)) {
        await publicPage.screenshot({ path: `artifacts/public-stay-detail-${width}.png`, fullPage: true });
      }
    }
    await expect(publicPage.locator('.gallery__thumb')).toHaveCount(1);
    await expect(publicPage.locator('.bcard--contact')).toContainText('Liên hệ để nhận giá');
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
    await publicPage.getByRole('button', { name: 'Chọn Hạng phòng liên hệ B' }).click();
    await expect(publicPage.locator('.bcard:not(.bcard--contact)')).toContainText('250.000đ');

    const mediaRoute = '**/media/**';
    await publicPage.route(mediaRoute, (route) => route.abort());
    await publicPage.reload();
    await expect(publicPage.locator('.gallery__main .gallery__image-fallback')).toBeVisible();
    await expect(publicPage.locator('.rtype__image-fallback').first()).toBeVisible();
    await publicPage.locator('.gallery__main').click();
    await expect(publicPage.locator('dialog[open] .gview__fallback')).toContainText('Không tải được ảnh');
    await publicPage.locator('dialog[open]').getByRole('button', { name: 'Đóng hộp thoại' }).click();
    await publicPage.unroute(mediaRoute);

    await page.goto(`/admin/hang-phong?property=${property.id}&room=create`);
    await page.getByLabel('Mã hạng phòng *').fill('ROOM-DRAFT');
    await page.getByLabel('Tên hạng phòng *').fill('Hạng phòng chờ xác minh');
    await page.getByLabel('Người lớn tối đa *').fill('2');
    await page.getByLabel('Trẻ em tối đa *').fill('0');
    await expect(page.getByLabel('Trạng thái hạng phòng')).toHaveValue('inactive');
    await page.getByLabel('Trạng thái hạng phòng').selectOption('active');
    await page.getByRole('button', { name: 'Lưu hạng phòng' }).click();
    await expect(page.locator('.property-form .settings-screen__message--error')).toContainText('số phòng thực tế và giá ngày thường');
    await page.getByLabel('Trạng thái hạng phòng').selectOption('inactive');
    await page.getByRole('button', { name: 'Lưu hạng phòng' }).click();
    await expect(page.locator('.room-catalog__card')).toHaveCount(3);
    const withDraft = await browserApi(page, `/properties/${property.id}`);
    expect(withDraft.status).toBe(200);
    const draftRoom = (withDraft.body as Property).roomTypes.find((room) => room.name === 'Hạng phòng chờ xác minh');
    expect(draftRoom).toMatchObject({ status: 'inactive', unitCount: 0, rate: null });
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
