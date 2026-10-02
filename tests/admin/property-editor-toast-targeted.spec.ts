import { expect, test } from '@playwright/test';
import { assertLocalPostgresCleanupAvailable, browserApi, signInAsOwner } from './helpers';

type Property = { id: string; version: number; code: string; title: string };

test('property create redirects to its editor and both saves show global toasts', async ({ page }) => {
  test.setTimeout(90_000);
  expect(process.env.BASE_URL ?? '').toMatch(/^http:\/\/(127\.0\.0\.1|localhost):\d+$/);
  assertLocalPostgresCleanupAvailable();
  await signInAsOwner(page);

  const stamp = Date.now();
  const code = `ADMIN-EDITOR-QA-${stamp}`;
  const title = `Cơ sở kiểm thử editor ${stamp}`;
  let propertyId: string | null = null;

  try {
    await page.goto('/admin/phong-nghi/them');
    await expect(page.getByRole('heading', { name: 'Tạo nơi lưu trú mới' })).toBeVisible();
    await page.getByLabel('Tên nơi lưu trú *').fill(title);
    await page.getByLabel('Mã nơi lưu trú *').fill(code);
    await page.getByLabel('Địa chỉ *').fill('Địa chỉ chỉ dùng trong kiểm thử local.');
    await page.locator('.rte [contenteditable="true"]').fill(
      'Mô tả nơi lưu trú kiểm thử đủ độ dài, được tạo tạm để xác minh trang tạo mới chuyển sang trang chỉnh sửa riêng.',
    );
    await page.getByRole('button', { name: 'Lưu cơ sở và thêm hạng phòng' }).click();

    await expect(page).toHaveURL(/\/admin\/phong-nghi\/[0-9a-f-]{36}$/i);
    propertyId = page.url().match(/\/admin\/phong-nghi\/([0-9a-f-]{36})$/i)?.[1] ?? null;
    expect(propertyId).toBeTruthy();
    await expect(page.locator('.admin-toast--success').filter({ hasText: 'Đã tạo nơi lưu trú.' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Chỉnh sửa nơi lưu trú' })).toBeVisible();

    const editedTitle = `${title} — đã sửa`;
    await page.getByLabel('Tên nơi lưu trú *').fill(editedTitle);
    await page.getByRole('button', { name: 'Lưu thay đổi' }).click();
    await expect(page).toHaveURL(`/admin/phong-nghi/${propertyId}`);
    await expect(page.locator('.admin-toast--success').filter({ hasText: 'Đã cập nhật nơi lưu trú.' })).toBeVisible();

    const current = await browserApi(page, `/properties/${propertyId}`);
    expect(current.status).toBe(200);
    expect((current.body as Property).title).toBe(editedTitle);
  } finally {
    if (!propertyId) {
      const list = await browserApi(page, '/properties');
      propertyId = (list.body as { items: Property[] }).items.find((item) => item.code === code)?.id ?? null;
    }
    if (propertyId) {
      const current = await browserApi(page, `/properties/${propertyId}`);
      if (current.status === 200) {
        const deleted = await browserApi(page, `/properties/${propertyId}?expectedVersion=${(current.body as Property).version}`, 'DELETE');
        expect(deleted.status).toBe(204);
      }
    }
  }
});
