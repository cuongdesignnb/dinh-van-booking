import { expect, test } from '@playwright/test';
import { assertLocalPostgresCleanupAvailable, browserApi, signInAsOwner } from './helpers';

type Setting = { key: string; value: unknown; isDefault: boolean; version: number };

test('settings save and stale-version conflict show global toasts and restore the original value', async ({ page }) => {
  test.setTimeout(90_000);
  expect(process.env.BASE_URL ?? '').toMatch(/^http:\/\/(127\.0\.0\.1|localhost):\d+$/);
  assertLocalPostgresCleanupAvailable();
  await signInAsOwner(page);

  const key = 'brand.identity';
  const originalResponse = await browserApi(page, '/settings');
  expect(originalResponse.status).toBe(200);
  const original = (originalResponse.body as { items: Setting[] }).items.find((item) => item.key === key);
  expect(original && typeof original.value === 'object' && original.value !== null).toBeTruthy();
  const originalValue = original!.value as Record<string, unknown>;
  expect(typeof originalValue.shortName).toBe('string');
  const originalShortName = originalValue.shortName as string;
  const stamp = Date.now();
  const otherPage = await page.context().newPage();

  try {
    await Promise.all([page.goto('/admin/cai-dat'), otherPage.goto('/admin/cai-dat')]);
    const firstCard = page.locator(`.settings-item[data-setting-key="${key}"]`);
    const staleCard = otherPage.locator(`.settings-item[data-setting-key="${key}"]`);
    await expect(firstCard).toBeVisible();
    await expect(staleCard).toBeVisible();
    const firstInput = firstCard.getByLabel('Tên viết gọn');
    const staleInput = staleCard.getByLabel('Tên viết gọn');

    await firstInput.fill(`${originalShortName} QA-${stamp}`);
    const saveResponse = page.waitForResponse((response) =>
      response.url().includes(`/api/v1/settings/${encodeURIComponent(key)}`) && response.request().method() === 'PUT',
    );
    await firstCard.getByRole('button', { name: 'Lưu thay đổi' }).click();
    expect((await saveResponse).status()).toBe(200);
    await expect(page.locator('.admin-toast--success')).toContainText('Đã cập nhật cài đặt.');

    await staleInput.fill(`${originalShortName} STALE-${stamp}`);
    const conflictResponse = otherPage.waitForResponse((response) =>
      response.url().includes(`/api/v1/settings/${encodeURIComponent(key)}`) && response.request().method() === 'PUT',
    );
    await staleCard.getByRole('button', { name: 'Lưu thay đổi' }).click();
    expect((await conflictResponse).status()).toBe(409);
    await expect(otherPage.locator('.admin-toast--warning')).toBeVisible();
    await expect(otherPage.locator('.admin-toast--warning')).not.toContainText(/API request failed|Conflict/i);
  } finally {
    const latestResponse = await browserApi(page, '/settings');
    if (latestResponse.status === 200 && original) {
      const latest = (latestResponse.body as { items: Setting[] }).items.find((item) => item.key === key);
      if (latest && JSON.stringify(latest.value) !== JSON.stringify(original.value)) {
        const restored = original.isDefault
          ? await browserApi(page, `/settings/${encodeURIComponent(key)}?expectedVersion=${latest.version}`, 'DELETE')
          : await browserApi(page, `/settings/${encodeURIComponent(key)}`, 'PUT', { value: original.value, expectedVersion: latest.version });
        expect(restored.status).toBe(original.isDefault ? 204 : 200);
      }
      const finalResponse = await browserApi(page, '/settings');
      const finalSetting = (finalResponse.body as { items: Setting[] }).items.find((item) => item.key === key);
      expect(finalSetting?.value).toEqual(original.value);
      expect(finalSetting?.isDefault).toBe(original.isDefault);
    }
    await otherPage.close();
  }
});
