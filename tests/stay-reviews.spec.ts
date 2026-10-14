import { expect, test, type Browser, type Page } from '@playwright/test';
import { assertLocalPostgresCleanupAvailable, browserApi, createUniqueTestPng, resetLocalRateLimits, signInAsOwner } from './admin/helpers';

type Property = { id: string; contentId: string; code: string; title: string; slug: string; path: string; version: number; contentVersion: number; publicationStatus: string };
type AdminReview = { id: string; authorName: string; status: string; source: string; photos: Array<{ id: string; src: string; visibility: string }> };

async function property(page: Page, id: string): Promise<Property> {
  const result = await browserApi(page, '/properties/' + id);
  expect(result.status).toBe(200);
  return result.body as Property;
}

async function uploadCover(page: Page, seed: number): Promise<string> {
  const base64 = createUniqueTestPng(seed).toString('base64');
  const result = await page.evaluate(async ({ base64 }) => {
    const bytes = Uint8Array.from(atob(base64), (char) => char.charCodeAt(0));
    const form = new FormData();
    form.append('altText', 'Ảnh kiểm thử đánh giá');
    form.append('file', new Blob([bytes], { type: 'image/png' }), 'review-qa-cover.png');
    const csrf = document.cookie.split('; ').find((part) => part.startsWith('dvb_csrf='));
    const response = await fetch('/api/v1/media/upload', {
      method: 'POST', credentials: 'include',
      headers: csrf ? { 'x-csrf-token': decodeURIComponent(csrf.slice('dvb_csrf='.length)) } : {},
      body: form,
    });
    return { status: response.status, body: await response.json() as { id: string } };
  }, { base64 });
  expect([200, 201]).toContain(result.status);
  return result.body.id;
}

async function pendingFor(admin: Page, contentId: string, status = 'pending'): Promise<AdminReview[]> {
  const result = await browserApi(admin, `/admin/reviews?status=${status}&stay=${contentId}`);
  expect(result.status).toBe(200);
  return (result.body as { items: AdminReview[] }).items;
}

/** Fills and sends the guest form in a fresh visitor context (own guest session). */
async function submitReview(browser: Browser, baseURL: string, url: string, input: { name: string; phone: string; rating: number; body: string; photos?: number }) {
  const context = await browser.newContext({ baseURL });
  const page = await context.newPage();
  await page.goto(url);
  const section = page.locator('#danh-gia');
  if (!(await page.locator('dialog[open] .rform').count())) await section.getByRole('button', { name: 'Viết đánh giá' }).click();
  const form = page.locator('dialog[open] .rform');
  await expect(form).toBeVisible();
  await form.locator('.rform__star').nth(input.rating - 1).click();
  await form.getByRole('textbox', { name: /^Họ và tên/ }).fill(input.name);
  await form.getByRole('textbox', { name: /^Số điện thoại/ }).fill(input.phone);
  await form.getByRole('textbox', { name: /^Trải nghiệm của bạn/ }).fill(input.body);
  if (input.photos) {
    await form.locator('input[type="file"]').setInputFiles(Array.from({ length: input.photos }, (_, index) => ({
      name: `anh-${index + 1}.png`, mimeType: 'image/png', buffer: createUniqueTestPng(Date.now() + index * 7919),
    })));
    await expect(form.locator('.rform__photos li img')).toHaveCount(input.photos);
  }
  await form.locator('.rform__consent input').check();
  await form.getByRole('button', { name: 'Gửi đánh giá' }).click();
  return { page, context };
}

test('guest reviews with photos are moderated, then shown with the average on the stay page and cards', async ({ browser, page: admin }) => {
  test.setTimeout(240_000);
  assertLocalPostgresCleanupAvailable();
  const baseURL = String(test.info().project.use.baseURL ?? process.env.BASE_URL ?? '');
  expect(baseURL).toMatch(/^http:\/\/(127\.0\.0\.1|localhost):\d+$/);
  resetLocalRateLimits(['review-submit', 'review-submit-ip']);
  const stamp = Date.now();
  const marker = `REVIEW-QA-${stamp}`;
  await signInAsOwner(admin);

  const coverId = await uploadCover(admin, stamp);
  const created = await browserApi(admin, '/properties', 'POST', {
    title: `${marker} — Nhà sàn kiểm thử đánh giá`, code: marker, kind: 'homestay', area: 'Cúc Phương, Ninh Bình',
    address: 'Địa chỉ kiểm thử local, không phải cơ sở kinh doanh thật.',
    description: 'Bản ghi kiểm thử đánh giá; sẽ được xoá sau khi chạy.',
    descriptionDocument: { type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Bản ghi kiểm thử đánh giá; sẽ được xoá sau khi chạy.' }] }] },
    roomCode: `${marker}-R`, roomName: 'Phòng kiểm thử', maxAdults: 2, maxChildren: 0, unitCount: 1, rateVnd: 500000, coverMediaId: coverId,
  });
  expect([200, 201]).toContain(created.status);
  const stayId = (created.body as Property).id;

  try {
    const fresh = await property(admin, stayId);
    const slug = await browserApi(admin, `/properties/${stayId}/slug/generate`, 'POST', { source: `review qa ${stamp}`, expectedVersion: fresh.contentVersion });
    expect([200, 201], JSON.stringify(slug.body)).toContain(slug.status);
    const draft = await property(admin, stayId);
    const published = await browserApi(admin, `/content/${draft.contentId}/status`, 'PATCH', { status: 'published', expectedVersion: draft.contentVersion });
    expect(published.status, JSON.stringify(published.body)).toBe(200);
    const stay = await property(admin, stayId);
    const url = stay.path;

    // 1. Empty state, then a 5-star review with two photos stays hidden until approved.
    const first = await submitReview(browser, baseURL, url, { name: `Lan ${marker}`, phone: `09${String(stamp).slice(-8)}`, rating: 5, body: 'Phòng sạch sẽ, chủ nhà nhiệt tình, view rừng buổi sáng rất đẹp.', photos: 2 });
    await expect(first.page.locator('dialog[open]')).toContainText('Cảm ơn bạn đã đánh giá');
    await first.page.locator('dialog[open]').getByRole('button', { name: 'Đóng', exact: true }).click();
    await first.page.reload();
    await expect(first.page.locator('#danh-gia')).toContainText('Chưa có đánh giá nào');

    let pending = await pendingFor(admin, stay.contentId);
    expect(pending).toHaveLength(1);
    expect(pending[0].photos).toHaveLength(2);
    const privatePhoto = await first.page.request.get(new URL(pending[0].photos[0].src, baseURL).toString());
    expect(privatePhoto.status(), 'pending photos must not be public').toBe(404);

    // 2. Same phone cannot review the same stay twice.
    const duplicate = await submitReview(browser, baseURL, url, { name: 'Lan lần hai', phone: `09${String(stamp).slice(-8)}`, rating: 4, body: 'Gửi lại lần nữa để thử chặn trùng số điện thoại.' });
    await expect(duplicate.page.locator('.rform__hint--error')).toContainText('đang chờ duyệt');
    await duplicate.context.close();

    // 3. Admin removes one photo, approves, replies.
    await admin.goto('/admin/danh-gia');
    await admin.getByPlaceholder('Tìm theo tên, số điện thoại hoặc nội dung').fill(marker);
    const card = admin.locator('.arev-card', { hasText: `Lan ${marker}` });
    await expect(card).toBeVisible({ timeout: 15_000 });
    await expect(card.locator('.arev-card__photos img')).toHaveCount(2);
    await card.getByRole('button', { name: 'Gỡ ảnh 2' }).click();
    await expect(card.locator('.arev-card__photos img')).toHaveCount(1);
    await card.getByRole('button', { name: 'Duyệt' }).click();
    // Approved reviews leave the "Chờ duyệt" tab; follow them to "Đã duyệt".
    await expect(card).toHaveCount(0);
    await admin.getByRole('tab', { name: /Đã duyệt/ }).click();
    await expect(card).toContainText('Đã duyệt');
    await card.getByRole('button', { name: 'Trả lời' }).click();
    await card.getByLabel('Phản hồi của chủ nhà').fill(`Cảm ơn Lan đã ghé ${marker}!`);
    await card.getByRole('button', { name: 'Đăng phản hồi' }).click();
    await expect(card).toContainText('Phản hồi đã đăng');

    // 4. Public page: review, one photo (now public), owner reply, average and tab.
    await first.page.reload();
    const section = first.page.locator('#danh-gia');
    await expect(section.locator('.srev-card')).toHaveCount(1);
    await expect(section.locator('.srev-card__photos img')).toHaveCount(1);
    await expect(section).toContainText(`Cảm ơn Lan đã ghé ${marker}!`);
    await expect(section.locator('.srev__score strong')).toHaveText('5.0');
    await expect(first.page.locator('.stp-head__rating')).toContainText('(1 đánh giá)');
    await expect(first.page.locator('.stp-tabs')).toContainText('Đánh giá (1)');
    const photoSrc = await section.locator('.srev-card__photos img').first().getAttribute('src');
    expect((await first.page.request.get(new URL(photoSrc!, baseURL).toString())).status()).toBe(200);
    const approved = await pendingFor(admin, stay.contentId, 'approved');
    expect(approved[0].photos).toHaveLength(1);

    // 5. Listing card shows the average.
    await first.page.goto('/phong-nghi');
    await expect(first.page.locator('.sc', { hasText: marker }).locator('.sc__rating')).toContainText('5.0');

    // 6. A rejected 1-star review does not change the average.
    const second = await submitReview(browser, baseURL, url, { name: `Spam ${marker}`, phone: `08${String(stamp).slice(-8)}`, rating: 1, body: 'Nội dung quảng cáo không liên quan đến nơi lưu trú này.' });
    await expect(second.page.locator('dialog[open]')).toContainText('Cảm ơn bạn đã đánh giá');
    await second.context.close();
    pending = await pendingFor(admin, stay.contentId);
    const rejected = await browserApi(admin, `/admin/reviews/${pending[0].id}/reject`, 'POST', { reason: 'spam' });
    expect(rejected.status).toBe(200);
    expect((await property(admin, stayId)) as unknown as { ratingAverage?: unknown }).toBeTruthy();
    await first.page.goto(url);
    await expect(first.page.locator('#danh-gia .srev__score strong')).toHaveText('5.0');
    await expect(first.page.locator('#danh-gia .srev-card')).toHaveCount(1);

    // 7. Invite link opens the form and tags the source.
    const invited = await submitReview(browser, baseURL, `${url}?danh-gia=1&nguon=loi-moi`, { name: `Minh ${marker}`, phone: `07${String(stamp).slice(-8)}`, rating: 4, body: 'Không gian yên tĩnh, đồ ăn ngon, đường vào hơi khó tìm.' });
    await expect(invited.page.locator('dialog[open]')).toContainText('Cảm ơn bạn đã đánh giá');
    await invited.context.close();
    pending = await pendingFor(admin, stay.contentId);
    expect(pending[0].source).toBe('invite');

    // 8. Mobile: no horizontal overflow on the reviews section.
    await first.page.setViewportSize({ width: 390, height: 844 });
    await first.page.goto(url);
    await first.page.locator('#danh-gia').scrollIntoViewIfNeeded();
    expect(await first.page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(391);
    if (process.env.DVB_REVIEW_VISUAL_ARTIFACTS === '1') {
      await first.page.locator('#danh-gia').screenshot({ path: 'test-results/reviews-390.png' });
      await first.page.setViewportSize({ width: 1440, height: 900 });
      await first.page.locator('#danh-gia').screenshot({ path: 'test-results/reviews-1440.png' });
      await admin.screenshot({ path: 'test-results/reviews-admin.png', fullPage: false });
    }
    await first.context.close();
  } finally {
    const current = await property(admin, stayId).catch(() => null);
    if (current) {
      for (const status of ['pending', 'approved', 'rejected']) {
        for (const review of await pendingFor(admin, current.contentId, status)) {
          const removed = await browserApi(admin, `/admin/reviews/${review.id}`, 'DELETE');
          expect([200, 404]).toContain(removed.status);
        }
      }
      if (!current.code.startsWith('REVIEW-QA-')) throw new Error('Refusing to delete non-test property');
      if (current.publicationStatus === 'published') {
        await browserApi(admin, `/content/${current.contentId}/status`, 'PATCH', { status: 'draft', expectedVersion: current.contentVersion });
      }
      const fresh = await property(admin, stayId);
      const removed = await browserApi(admin, `/properties/${stayId}?expectedVersion=${fresh.version}`, 'DELETE');
      expect([204, 404]).toContain(removed.status);
    }
    await browserApi(admin, '/media/' + coverId, 'DELETE');
    resetLocalRateLimits(['review-submit', 'review-submit-ip']);
  }
});
