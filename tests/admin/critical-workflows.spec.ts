import { expect, test, type BrowserContext } from '@playwright/test';
import { browserApi, cleanupLocalTestInquiry, createUniqueTestPng, signInAsOwner } from './helpers';

type MediaAsset = {
  id: string;
  url: string;
  storageKey: string;
  mimeType: string;
  width: number | null;
  height: number | null;
  altText: string | null;
  caption: string | null;
};

type ContentRecord = {
  id: string;
  title: string;
  slug: string;
  path: string;
  publicationStatus: string;
  version: number;
  noindex: boolean;
  body: unknown;
  media: Array<{ mediaId: string; role: string; url: string }>;
};

async function mediaByAlt(page: Parameters<typeof browserApi>[0], alt: string): Promise<MediaAsset | undefined> {
  const result = await browserApi(page, `/media?search=${encodeURIComponent(alt)}`);
  expect(result.status).toBe(200);
  return (result.body as { items: MediaAsset[] }).items.find((item) => item.altText === alt);
}

test('Media Library upload WebP, sửa ALT/chú thích qua API, reload và xoá ảnh chưa dùng', async ({ page }) => {
  test.setTimeout(90_000);
  await signInAsOwner(page);
  page.on('dialog', (dialog) => dialog.accept());

  const stamp = Date.now();
  const filename = `atg-media-${stamp}.png`;
  const initialAlt = `ATG ảnh thư viện ${stamp}`;
  const finalAlt = `ATG ảnh đã sửa ${stamp}`;
  const finalCaption = `Chú thích thư viện ${stamp}`;
  let mediaId: string | null = null;

  try {
    await page.goto('/admin/thu-vien-anh');
    await page.getByLabel('Alt mặc định cho ảnh tải lên').fill(initialAlt);
    await page.getByLabel('Chú thích mặc định').fill('Chú thích trước khi sửa');
    const uploadResponse = page.waitForResponse((response) =>
      response.url().endsWith('/api/v1/media/upload') && response.request().method() === 'POST',
    );
    await page.locator('.media-library__upload input[type="file"]').setInputFiles({
      name: filename,
      mimeType: 'image/png',
      buffer: createUniqueTestPng(stamp),
    });
    expect([200, 201]).toContain((await uploadResponse).status());

    const uploaded = await mediaByAlt(page, initialAlt);
    expect(uploaded).toBeTruthy();
    mediaId = uploaded!.id;
    expect(uploaded!.mimeType).toBe('image/webp');
    expect(uploaded!.storageKey).toMatch(/\.webp$/);
    expect(uploaded!.width).toBeGreaterThan(0);
    expect(uploaded!.height).toBeGreaterThan(0);

    const fileResponse = await page.request.get(uploaded!.url);
    expect(fileResponse.status()).toBe(200);
    expect((await fileResponse.body()).subarray(8, 12).toString('ascii')).toBe('WEBP');

    const card = page.locator('.media-library__card').filter({ hasText: filename });
    await card.click();
    await page.getByLabel('Alt text').fill(finalAlt);
    await page.locator('.media-library__detail textarea').fill(finalCaption, { timeout: 10_000 });
    await expect(page.locator('.media-library__detail textarea')).toHaveValue(finalCaption);
    await page.getByRole('button', { name: 'Lưu mô tả' }).click();
    await expect(page.getByRole('status')).toContainText('Đã lưu mô tả ảnh');

    await page.reload();
    await page.locator('.media-library__card').filter({ hasText: filename }).click();
    await expect(page.getByLabel('Alt text', { exact: true })).toHaveValue(finalAlt);
    await expect(page.locator('.media-library__detail textarea')).toHaveValue(finalCaption);
    const persisted = await browserApi(page, `/media/${mediaId}`);
    expect(persisted.status).toBe(200);
    expect((persisted.body as MediaAsset).altText).toBe(finalAlt);
    expect((persisted.body as MediaAsset).caption).toBe(finalCaption);

    await page.getByRole('button', { name: 'Xoá ảnh' }).click();
    await expect(page.locator('.media-library__card').filter({ hasText: filename })).toHaveCount(0);
    expect((await browserApi(page, `/media/${mediaId}`)).status).toBe(404);
    mediaId = null;
  } finally {
    if (mediaId) {
      const removed = await browserApi(page, `/media/${mediaId}`, 'DELETE');
      expect([204, 404]).toContain(removed.status);
    }
  }
});

test('bài viết TipTap lưu rich body/media, giữ phiên bản, xuất bản cho khách và lưu trữ được', async ({ page }) => {
  test.setTimeout(120_000);
  await signInAsOwner(page);
  page.on('dialog', (dialog) => dialog.accept());

  const stamp = Date.now();
  const slug = `atg-article-${stamp}`;
  const title = `ADMIN-RUN-TO-GOAL-${stamp}`;
  const staleTitle = `${title} — bản chỉnh sửa cũ`;
  const currentTitle = `${title} — cập nhật mới nhất`;
  const coverAlt = `Ảnh bài viết ${stamp} — rừng Cúc Phương`;
  const filename = `atg-article-${stamp}.png`;
  let contentId: string | null = null;
  let mediaId: string | null = null;
  let guestContext: BrowserContext | null = null;

  try {
    await page.goto('/admin/noi-dung');
    await page.getByRole('button', { name: 'Tạo mới' }).click();
    await expect(page).toHaveURL(/\/admin\/noi-dung\?action=create/);
    await page.getByLabel('Tiêu đề *').fill(title);
    await page.getByLabel('Slug đường dẫn').fill(slug);
    await page.getByLabel('Tóm tắt').fill(`Bản tin kiểm thử ${stamp}, tạo qua editor và lưu trong PostgreSQL.`);

    const editor = page.locator('.rte [contenteditable="true"]');
    const headingText = `Tiêu đề bài viết ${stamp}`;
    const bodyText = `Nội dung kiểm thử lưu PostgreSQL với SEO, ảnh cover và ảnh inline. Marker ${stamp}.`;
    await editor.click();
    await editor.pressSequentially(headingText);
    await editor.press('Enter');
    await editor.pressSequentially(bodyText);
    for (const name of ['In đậm', 'In nghiêng', 'Gạch chân', 'Tiêu đề mục', 'Tiêu đề phụ', 'Tiêu đề nhỏ', 'Danh sách', 'Danh sách đánh số', 'Trích dẫn', 'Chèn liên kết', 'Chèn ảnh từ thư viện', 'Chèn bảng 3×3', 'Hoàn tác', 'Làm lại', 'Xem trước']) {
      await expect(page.getByRole('button', { name, exact: true })).toBeVisible();
    }
    await page.getByLabel('Tiêu đề SEO *').fill(title);
    await page.getByLabel('Mô tả SEO *').fill(`Mô tả SEO bài viết kiểm thử ${stamp}, không dùng thông tin khách hàng.`);
    const noindexToggle = page.locator('.content-editor__noindex');
    await noindexToggle.click();
    await expect(noindexToggle.locator('input[type="checkbox"]')).toBeChecked();

    await page.getByRole('button', { name: 'Chọn ảnh đại diện' }).click();
    const coverPicker = page.locator('dialog[open]');
    await expect(coverPicker).toBeVisible();
    await coverPicker.getByLabel('Alt mặc định cho ảnh tải lên').fill(coverAlt);
    const coverUploadResponse = page.waitForResponse((response) =>
      response.url().endsWith('/api/v1/media/upload') && response.request().method() === 'POST',
    );
    await coverPicker.locator('.media-library__upload input[type="file"]').setInputFiles({
      name: filename,
      mimeType: 'image/png',
      buffer: createUniqueTestPng(stamp),
    });
    expect([200, 201]).toContain((await coverUploadResponse).status());
    await expect(page.locator('dialog[open]')).toHaveCount(0);

    const uploaded = await mediaByAlt(page, coverAlt);
    expect(uploaded).toBeTruthy();
    mediaId = uploaded!.id;
    await editor.click();
    await editor.press('Control+End');
    await page.getByRole('button', { name: 'Chèn ảnh từ thư viện' }).click();
    const inlinePicker = page.locator('dialog[open]');
    await expect(inlinePicker).toBeVisible();
    await inlinePicker.getByLabel('Tìm trong thư viện ảnh').fill(coverAlt);
    await inlinePicker.locator('.media-library__card').filter({ hasText: filename }).click();
    await expect(page.locator('dialog[open]')).toHaveCount(0);
    await expect(page.locator(`.rte__body img[data-media-id="${mediaId}"]`)).toBeVisible();

    await editor.locator('p').filter({ hasText: headingText }).click();
    await page.getByRole('button', { name: 'Tiêu đề mục' }).click();
    await expect(editor.locator('h2')).toContainText(headingText);
    await expect(editor.locator('p').filter({ hasText: bodyText })).toBeVisible();
    await expect(page.locator('.rte__meta')).toContainText('từ');
    await page.getByRole('button', { name: 'Xem trước' }).click();
    await expect(page.locator('.rte__preview')).toContainText(headingText);
    await expect(page.locator('.rte__preview')).toContainText(bodyText);
    await page.getByRole('button', { name: 'Quay lại soạn thảo' }).click();
    await expect(editor.locator('h2')).toContainText(headingText);
    await expect(editor.locator('p').filter({ hasText: bodyText })).toBeVisible();

    await page.getByRole('button', { name: 'Lưu bản nháp' }).click();
    await expect(page.locator('.settings-screen__message--success')).toContainText('Đã tạo bản nháp thật');
    const list = await browserApi(page, `/content?kind=article&page=1&pageSize=100`);
    expect(list.status).toBe(200);
    const draft = (list.body as { items: ContentRecord[] }).items.find((item) => item.title === title);
    expect(draft).toBeTruthy();
    contentId = draft!.id;
    expect(draft!.publicationStatus).toBe('draft');
    expect(draft!.noindex).toBe(true);
    expect(draft!.media.filter((item) => item.mediaId === mediaId).map((item) => item.role).sort()).toEqual(['cover', 'inline']);
    expect(JSON.stringify(draft!.body)).toContain('"level":2');
    expect(JSON.stringify(draft!.body)).toContain(mediaId!);
    expect((await browserApi(page, `/public/articles/${slug}`)).status).toBe(404);

    await page.reload();
    const card = page.locator('.content-manager__item').filter({ hasText: title });
    await card.getByRole('button', { name: 'Sửa' }).click();
    await expect(editor).toContainText(headingText);
    await expect(page.locator(`.rte__body img[data-media-id="${mediaId}"]`)).toBeVisible();

    await page.getByLabel('Tiêu đề *').fill(staleTitle);
    const concurrent = await browserApi(page, `/content/${contentId}`, 'PUT', {
      title: currentTitle,
      expectedVersion: draft!.version,
    });
    expect(concurrent.status).toBe(200);
    await page.getByRole('button', { name: 'Lưu thay đổi' }).click();
    await expect(page.locator('.settings-screen__message--error')).toContainText('Tải lại rồi lưu lại');
    const notOverwritten = await browserApi(page, `/content/${contentId}`);
    expect((notOverwritten.body as ContentRecord).title).toBe(currentTitle);

    await page.reload();
    await expect(page.getByLabel('Tiêu đề *')).toHaveValue(currentTitle);
    await page.getByRole('button', { name: 'Quay lại danh sách' }).click();
    const currentCard = page.locator('.content-manager__item').filter({ hasText: currentTitle });
    await currentCard.getByRole('button', { name: 'Xuất bản' }).click();
    await expect(currentCard).toContainText('Đã xuất bản');

    const publicArticle = await browserApi(page, `/public/articles/${slug}`);
    expect(publicArticle.status).toBe(200);
    const publicRecord = publicArticle.body as { title: string; cover: { src: string; alt: string } | null };
    expect(publicRecord.title).toBe(currentTitle);
    const uploadedAsset = await browserApi(page, `/media/${mediaId}`);
    expect(uploadedAsset.status).toBe(200);
    const asset = uploadedAsset.body as MediaAsset;
    expect(publicRecord.cover?.src).toBe(`/media/${asset.storageKey}`);
    expect(publicRecord.cover?.alt).toBe(coverAlt);

    const browser = page.context().browser();
    expect(browser).toBeTruthy();
    guestContext = await browser!.newContext({ baseURL: process.env.BASE_URL ?? 'http://localhost:3100' });
    const guest = await guestContext.newPage();
    const guestResponse = await guest.goto(draft!.path);
    expect(guestResponse?.status()).toBe(200);
    await expect(guest.locator('h1')).toContainText(currentTitle);
    await expect(guest.locator('meta[name="robots"]')).toHaveAttribute('content', /noindex/);
    await expect(guest.locator(`img[alt="${coverAlt}"]`).first()).toBeVisible();
    await guestContext.close();
    guestContext = null;

    const blockedDelete = await browserApi(page, `/media/${mediaId}`, 'DELETE');
    expect(blockedDelete.status).toBe(409);

    await currentCard.getByRole('button', { name: 'Lưu trữ' }).click();
    await expect(currentCard.locator('.settings-item__meta')).toContainText('Lưu trữ');
    const archivedArticle = await browserApi(page, `/content/${contentId}`);
    expect((archivedArticle.body as ContentRecord).publicationStatus).toBe('archived');
    expect((await browserApi(page, `/public/articles/${slug}`)).status).toBe(404);
    await currentCard.getByRole('button', { name: 'Đưa về nháp' }).click();
    await expect(currentCard.locator('.settings-item__meta')).toContainText('Bản nháp');
    await currentCard.getByRole('button', { name: 'Xoá' }).click();
    await expect(currentCard).toHaveCount(0);
    expect((await browserApi(page, `/content/${contentId}`)).status).toBe(404);
    contentId = null;

    const removedMedia = await browserApi(page, `/media/${mediaId}`, 'DELETE');
    expect(removedMedia.status).toBe(204);
    mediaId = null;
  } finally {
    await guestContext?.close();
    if (contentId) {
      const current = await browserApi(page, `/content/${contentId}`);
      if (current.status === 200) {
        const node = current.body as ContentRecord;
        let version = node.version;
        if (node.publicationStatus !== 'draft') {
          const drafted = await browserApi(page, `/content/${contentId}/status`, 'PATCH', { status: 'draft', expectedVersion: version });
          if (drafted.status === 200) version = (drafted.body as ContentRecord).version;
        }
        const removed = await browserApi(page, `/content/${contentId}?expectedVersion=${version}`, 'DELETE');
        expect([204, 404]).toContain(removed.status);
      }
    }
    if (mediaId) {
      const removed = await browserApi(page, `/media/${mediaId}`, 'DELETE');
      expect([204, 404]).toContain(removed.status);
    }
  }
});

test('settings UI lưu PostgreSQL, công khai thay đổi và không ghi đè phiên bản xung đột', async ({ page }) => {
  await signInAsOwner(page);
  const settings = await browserApi(page, '/settings');
  expect(settings.status).toBe(200);
  const identity = (settings.body as { items: Array<{ key: string; value: unknown; version: number; isDefault: boolean }> }).items
    .find((item) => item.key === 'brand.identity');
  expect(identity).toBeTruthy();
  const originalValue = JSON.parse(JSON.stringify(identity!.value)) as Record<string, unknown>;
  const originalIsDefault = identity!.isDefault;
  const stamp = Date.now();
  const firstName = `Đinh Vân — kiểm thử ${stamp}`;
  const concurrentName = `Đinh Vân — cập nhật đồng thời ${stamp}`;
  try {
    await page.goto('/admin/cai-dat');
    await page.getByRole('tab', { name: 'Thương hiệu' }).click();
    const card = page.locator('.settings-item').filter({ has: page.getByRole('heading', { name: 'Thương hiệu', exact: true }) });
    const nameField = card.getByLabel('Tên thương hiệu');
    await nameField.fill(firstName);
    const firstSaveResponse = page.waitForResponse((response) =>
      response.url().endsWith('/api/v1/settings/brand.identity') && response.request().method() === 'PUT',
    );
    await card.getByRole('button', { name: 'Lưu thay đổi' }).click();
    expect((await firstSaveResponse).status()).toBe(200);
    await expect(page.getByRole('status')).toContainText('Đã lưu cài đặt');

    const publicAfterSave = await browserApi(page, '/settings/public');
    expect(publicAfterSave.status).toBe(200);
    expect(((publicAfterSave.body as Record<string, { name: string }>)['brand.identity']).name).toBe(firstName);
    await page.reload();
    await page.getByRole('tab', { name: 'Thương hiệu' }).click();
    const refreshedCard = page.locator('.settings-item').filter({ has: page.getByRole('heading', { name: 'Thương hiệu', exact: true }) });
    const refreshedName = refreshedCard.getByLabel('Tên thương hiệu');
    await expect(refreshedName).toHaveValue(firstName);

    await refreshedName.fill(`Bản nháp cũ ${stamp}`);
    const latest = await browserApi(page, '/settings/brand.identity');
    expect(latest.status).toBe(200);
    const latestSetting = latest.body as { value: Record<string, unknown>; version: number };
    const externalUpdate = await browserApi(page, '/settings/brand.identity', 'PUT', {
      value: { ...latestSetting.value, name: concurrentName },
      expectedVersion: latestSetting.version,
    });
    expect(externalUpdate.status).toBe(200);

    await refreshedCard.getByRole('button', { name: 'Lưu thay đổi' }).click();
    await expect(page.locator('.settings-screen__message--error')).toContainText(/thay đổi ở nơi khác/i);
    await expect(refreshedName).toHaveValue(concurrentName);
    const publicAfterConflict = await browserApi(page, '/settings/public');
    expect(((publicAfterConflict.body as Record<string, { name: string }>)['brand.identity']).name).toBe(concurrentName);
  } finally {
    const current = await browserApi(page, '/settings/brand.identity');
    if (current.status === 200) {
      const item = current.body as { value: Record<string, unknown>; version: number };
      if (JSON.stringify(item.value) !== JSON.stringify(originalValue)) {
        const restored = originalIsDefault
          ? await browserApi(page, `/settings/brand.identity?expectedVersion=${item.version}`, 'DELETE')
          : await browserApi(page, '/settings/brand.identity', 'PUT', { value: originalValue, expectedVersion: item.version });
        expect(restored.status).toBe(200);
      }
    }
  }

  const publicRestored = await browserApi(page, '/settings/public');
  expect((publicRestored.body as Record<string, unknown>)['brand.identity']).toEqual(originalValue);
});

test('form liên hệ tạo inquiry thật, admin nhận và cập nhật stage sau reload', async ({ page }) => {
  test.setTimeout(90_000);
  await signInAsOwner(page);

  const stamp = Date.now();
  const name = 'Khách kiểm thử nội bộ';
  const phone = `09${String(stamp).slice(-8)}`;
  const marker = `ADMIN-RUN-TO-GOAL-${stamp}`;
  let inquiryId: string | null = null;

  try {
    await page.goto('/lien-he');
    await page.locator('input[name="name"]').fill(name);
    await page.locator('input[name="phone"]').fill(phone);
    await page.locator('textarea[name="message"]').fill(marker);
    const createResponse = page.waitForResponse((response) =>
      response.url().endsWith('/api/v1/inquiries') && response.request().method() === 'POST',
    );
    await page.getByRole('button', { name: 'Gửi yêu cầu tư vấn ngay' }).click();
    const response = await createResponse;
    expect([200, 201]).toContain(response.status());
    const created = await response.json() as { id: string; status: string };
    inquiryId = created.id;
    expect(created.status).toBe('received');
    await expect(page.getByRole('heading', { name: 'Đã nhận yêu cầu tư vấn' })).toBeVisible();

    const inbox = await browserApi(page, `/inquiries?search=${encodeURIComponent(name)}&page=1&pageSize=10`);
    expect(inbox.status).toBe(200);
    const item = (inbox.body as { items: Array<{ id: string; stage: string; version: number; customer: { name: string } }> }).items
      .find((candidate) => candidate.id === inquiryId);
    expect(item).toBeTruthy();
    expect(item!.customer.name).toBe(name);
    expect(item!.stage).toBe('new');

    await page.goto('/admin/yeu-cau-tu-van');
    const card = page.locator('.settings-item').filter({ hasText: name }).filter({ hasText: phone });
    await expect(card).toBeVisible();
    await card.getByLabel('Trạng thái').selectOption('contacted');
    await expect(card.getByLabel('Trạng thái')).toHaveValue('contacted');
    const updated = await browserApi(page, `/inquiries?search=${encodeURIComponent(name)}&page=1&pageSize=10`);
    const updatedItem = (updated.body as { items: Array<{ id: string; stage: string; version: number }> }).items
      .find((candidate) => candidate.id === inquiryId);
    expect(updatedItem?.stage).toBe('contacted');
    expect(updatedItem?.version).toBeGreaterThan(item!.version);

    const staleStage = await browserApi(page, `/inquiries/${inquiryId}`, 'PATCH', {
      stage: 'lost',
      expectedVersion: item!.version,
    });
    expect(staleStage.status).toBe(409);
    const afterConflict = await browserApi(page, `/inquiries?search=${encodeURIComponent(name)}&page=1&pageSize=10`);
    const protectedItem = (afterConflict.body as { items: Array<{ id: string; stage: string; version: number }> }).items
      .find((candidate) => candidate.id === inquiryId);
    expect(protectedItem?.stage).toBe('contacted');
    expect(protectedItem?.version).toBe(updatedItem!.version);

    await page.reload();
    await expect(page.locator('.settings-item').filter({ hasText: name }).filter({ hasText: phone }).getByLabel('Trạng thái')).toHaveValue('contacted');
  } finally {
    if (inquiryId) cleanupLocalTestInquiry({ id: inquiryId, name, phone, marker });
  }
});
