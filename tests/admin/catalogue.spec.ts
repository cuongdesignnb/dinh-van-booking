import { expect, test } from '@playwright/test';
import { browserApi, createUniqueTestPng, signInAsOwner } from './helpers';

type MenuItem = { id: string; label: string; contentId: string | null; externalUrl: string | null; enabled: boolean };

test('chuyên trang dùng editor riêng, Media Library và toast; draft được dọn sau smoke', async ({ page }) => {
  test.setTimeout(60_000);
  await signInAsOwner(page);
  page.on('dialog', (dialog) => dialog.accept());

  const stamp = Date.now();
  const slug = `atg-policy-${stamp}`;
  const title = `ATG Chính sách kiểm thử ${stamp}`;
  const coverAlt = `ATG cover ${stamp}`;
  let contentId: string | null = null;
  let originalMenu = { isDefault: true, items: [] as MenuItem[] };
  let menuLoaded = false;
  const mediaIds = new Set<string>();

  try {
    const menu = await browserApi(page, '/navigation/primary');
    expect(menu.status).toBe(200);
    originalMenu = menu.body as { isDefault: boolean; items: MenuItem[] };
    menuLoaded = true;

    await page.goto('/admin/chuyen-trang');
    await page.getByRole('button', { name: 'Tạo mới' }).click();
    await expect(page).toHaveURL('/admin/chuyen-trang/them');
    await page.getByLabel('Tiêu đề *').fill(title);
    await page.getByLabel('Slug đường dẫn').fill(slug);
    await page.getByLabel('Tóm tắt').fill('Hướng dẫn kiểm thử các chính sách được quản lý trong CMS.');
    await page.locator('.rte [contenteditable="true"]').fill(
      'Đây là nội dung chính sách kiểm thử đủ độ dài để xác nhận trang được lưu trong cơ sở dữ liệu và chỉ xuất hiện công khai sau khi người quản trị chủ động xuất bản.',
    );
    await page.getByLabel('Tiêu đề SEO *').fill(title);
    await page.getByLabel('Mô tả SEO *').fill('Nội dung kiểm thử trang tĩnh có trạng thái xuất bản, đường dẫn và điều hướng menu.');

    await page.getByRole('button', { name: 'Chọn ảnh đại diện' }).click();
    const dialog = page.locator('dialog[open]');
    await expect(dialog).toBeVisible();
    await dialog.getByLabel('Alt mặc định cho ảnh tải lên').fill(coverAlt);
    await dialog.locator('.media-library__upload input[type="file"]').setInputFiles({
      name: 'atg-cover.webp',
      mimeType: 'image/png',
      buffer: createUniqueTestPng(stamp),
    });
    await expect(page.locator('dialog[open]')).toHaveCount(0);
    await expect(page.locator('.admin-toast--success')).toContainText('Đã tải ảnh lên thư viện.');

    const mediaList = await browserApi(page, `/media?search=${encodeURIComponent(coverAlt)}`);
    expect(mediaList.status).toBe(200);
    const media = (mediaList.body as { items: Array<{ id: string; url: string; storageKey: string; mimeType: string; altText: string }> }).items
      .find((item) => item.altText === coverAlt);
    expect(media).toBeTruthy();
    expect(media?.mimeType).toBe('image/webp');
    expect(media?.storageKey).toMatch(/\.webp$/);
    expect(media?.url).toMatch(/^\/media\//);
    mediaIds.add(media!.id);

    const storedImage = await page.request.get(media!.url);
    expect(storedImage.status()).toBe(200);
    expect((await storedImage.body()).subarray(8, 12).toString('ascii')).toBe('WEBP');

    await page.getByRole('button', { name: 'Lưu bản nháp' }).click();
    await expect(page).toHaveURL(/\/admin\/chuyen-trang\/[0-9a-f-]{36}$/i);
    contentId = page.url().match(/\/admin\/chuyen-trang\/([0-9a-f-]{36})$/i)?.[1] ?? null;
    expect(contentId).toBeTruthy();
    await expect(page).toHaveURL(`/admin/chuyen-trang/${contentId}`);
    await expect(page.locator('.admin-toast--success').filter({ hasText: 'Đã tạo nội dung.' })).toBeVisible();
    const draftResponse = await browserApi(page, `/content/${contentId}`);
    expect(draftResponse.status).toBe(200);
    const draft = draftResponse.body as { id: string; title: string; path: string; publicationStatus: string; version: number; media: Array<{ mediaId: string }> };
    expect(draft.title).toBe(title);
    expect(draft!.publicationStatus).toBe('draft');
    expect(draft!.media.some((item) => item.mediaId === media!.id)).toBeTruthy();
    expect((await browserApi(page, `/public/pages/${slug}`)).status).toBe(404);

    const draftRoute = await page.request.get(draft!.path);
    expect(draftRoute.status()).toBe(404);

    const editedTitle = `${title} — đã sửa`;
    await page.getByLabel('Tiêu đề *').fill(editedTitle);
    await page.locator('.rte [contenteditable="true"]').fill(
      'Bản nội dung đã sửa qua giao diện TipTap; API lưu revision mới và giữ nguyên ảnh từ Media Library.',
    );
    await page.getByRole('button', { name: 'Lưu thay đổi' }).click();
    await expect(page).toHaveURL(`/admin/chuyen-trang/${contentId}`);
    await expect(page.locator('.admin-toast--success').filter({ hasText: 'Đã lưu nội dung.' })).toBeVisible();

    const edited = await browserApi(page, `/content/${contentId}`);
    expect(edited.status).toBe(200);
    expect((edited.body as { title: string; version: number }).title).toBe(editedTitle);
    expect((edited.body as { version: number }).version).toBeGreaterThan(draft!.version);

    await page.goto('/admin/chuyen-trang');
    const editedCard = page.locator('.content-manager__item', { hasText: editedTitle });
    await editedCard.getByRole('button', { name: 'Xuất bản' }).click();
    await expect(editedCard).toContainText('Đã xuất bản');

    const publicPage = await browserApi(page, `/public/pages/${slug}`);
    expect(publicPage.status).toBe(200);
    expect((publicPage.body as { title: string }).title).toBe(editedTitle);
    const rendered = await page.goto(draft.path);
    expect(rendered?.status()).toBe(200);
    await expect(page.locator('h1')).toContainText(editedTitle);
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', /noindex/);

    await page.goto('/admin/menu');
    const pagePicker = page.getByLabel('Thêm chuyên trang vào menu');
    await pagePicker.selectOption(contentId!);
    await page.getByRole('button', { name: 'Thêm vào menu' }).click();
    await expect(page.locator('.menu-manager__item').last().getByLabel('Tên hiển thị')).toHaveValue(editedTitle);
    await page.getByRole('button', { name: 'Lưu Menu' }).click();
    await expect(page.locator('.admin-toast--success')).toContainText('Đã lưu Menu.');
    const publicMenu = await browserApi(page, '/public/navigation/primary');
    expect((publicMenu.body as Array<{ label: string; href: string }>).some((item) => item.label === editedTitle && item.href === draft.path)).toBeTruthy();

    await page.getByRole('button', { name: 'Khôi phục mặc định' }).click();
    await expect(page.locator('.admin-toast--success').filter({ hasText: 'Đã khôi phục Menu mặc định.' })).toBeVisible();
    const defaultMenu = await browserApi(page, '/navigation/primary');
    expect((defaultMenu.body as { isDefault: boolean }).isDefault).toBe(true);

    await page.goto('/admin/chuyen-trang');
    const inUseMediaResponse = await browserApi(page, `/media?search=${encodeURIComponent(coverAlt)}`);
    const inUseAsset = (inUseMediaResponse.body as { items: Array<{ id: string; usage?: { inUse: boolean; count: number } }> }).items[0];
    expect(inUseAsset?.usage).toMatchObject({ inUse: true, count: expect.any(Number) });
    await page.goto('/admin/thu-vien-anh');
    await page.locator('.media-library__card').filter({ hasText: 'atg-cover.webp' }).click();
    await expect(page.getByRole('button', { name: 'Xoá ảnh' })).toBeDisabled();
    await expect(page.getByText(/Ảnh đang được sử dụng/)).toBeVisible();
    expect((await browserApi(page, `/media/${inUseAsset.id}`, 'DELETE')).status).toBe(409);

  } finally {
    if (menuLoaded) {
      const restoredMenu = originalMenu.isDefault
        ? await browserApi(page, '/navigation/primary', 'DELETE')
        : await browserApi(page, '/navigation/primary', 'PUT', {
            items: originalMenu.items.map((item) => ({
              ...(item.id.match(/^[0-9a-f]{8}-[0-9a-f-]{27}$/i) ? { id: item.id } : {}),
              label: item.label,
              contentId: item.contentId,
              externalUrl: item.externalUrl,
              enabled: item.enabled,
            })),
          });
      expect(restoredMenu.status).toBe(200);
      if (originalMenu.isDefault) expect((restoredMenu.body as { isDefault: boolean }).isDefault).toBe(true);
    }
    if (!contentId) {
      const drafts = await browserApi(page, '/content?kind=page&page=1&pageSize=100');
      contentId = (drafts.body as { items: Array<{ id: string; title: string }> }).items.find((item) => item.title === title)?.id ?? null;
    }
    if (contentId) {
      const current = await browserApi(page, `/content/${contentId}`);
      if (current.status === 200) {
        const node = current.body as {
          publicationStatus: string; version: number; title: string; slug: string; excerpt: string | null;
          body: unknown; metaTitle: string | null; metaDescription: string | null; featured: boolean;
          noindex: boolean; details: unknown; media: Array<{ mediaId: string }>;
        };
        for (const item of node.media ?? []) mediaIds.add(item.mediaId);
        let version = node.version;
        if (node.publicationStatus === 'published') {
          const draftStatus = await browserApi(page, `/content/${contentId}/status`, 'PATCH', { status: 'draft', expectedVersion: version });
          expect(draftStatus.status).toBe(200);
          version = (draftStatus.body as { version: number }).version;
        }
        const detached = await browserApi(page, `/content/${contentId}`, 'PUT', {
          title: node.title, slug: node.slug, excerpt: node.excerpt, body: node.body,
          metaTitle: node.metaTitle, metaDescription: node.metaDescription,
          featured: node.featured, noindex: node.noindex, details: node.details, media: [], expectedVersion: version,
        });
        expect(detached.status).toBe(200);
        version = (detached.body as { version: number }).version;
        const removed = await browserApi(page, `/content/${contentId}?expectedVersion=${version}`, 'DELETE');
        expect(removed.status).toBe(204);
      }
    }

    const remainingMedia = await browserApi(page, `/media?search=${encodeURIComponent(coverAlt)}`);
    if (remainingMedia.status === 200) {
      for (const item of (remainingMedia.body as { items: Array<{ id: string; altText: string | null }> }).items) {
        if (item.altText === coverAlt) mediaIds.add(item.id);
      }
    }
    for (const id of mediaIds) {
      const removed = await browserApi(page, `/media/${id}`, 'DELETE');
      expect([204, 404]).toContain(removed.status);
    }
  }

  expect((await browserApi(page, `/public/pages/${slug}`)).status).toBe(404);
});
