import { expect, test } from '@playwright/test';
import { browserApi, signInAsOwner } from './helpers';

type MenuItem = { id: string; label: string; contentId: string | null; externalUrl: string | null; enabled: boolean };
type Menu = { isDefault: boolean; items: MenuItem[] };

test('menu save/reset mutations show toasts and restore the original menu', async ({ page }) => {
  test.setTimeout(60_000);
  await signInAsOwner(page);
  page.on('dialog', (dialog) => dialog.accept());

  const originalResponse = await browserApi(page, '/navigation/primary');
  expect(originalResponse.status).toBe(200);
  const original = originalResponse.body as Menu;

  try {
    await page.goto('/admin/menu');
    const saveButton = page.getByRole('button', { name: 'Lưu Menu' });
    await expect(saveButton).toBeEnabled();
    await saveButton.click();
    await expect(page.locator('.admin-toast--success').filter({ hasText: 'Đã lưu Menu.' })).toBeVisible();

    await page.getByRole('button', { name: 'Khôi phục mặc định' }).click();
    await expect(page.locator('.admin-toast--success').filter({ hasText: 'Đã khôi phục Menu mặc định.' })).toBeVisible();
  } finally {
    const restored = original.isDefault
      ? await browserApi(page, '/navigation/primary', 'DELETE')
      : await browserApi(page, '/navigation/primary', 'PUT', {
          items: original.items.map((item) => ({
            ...(item.id.match(/^[0-9a-f]{8}-[0-9a-f-]{27}$/i) ? { id: item.id } : {}),
            label: item.label,
            contentId: item.contentId,
            externalUrl: item.externalUrl,
            enabled: item.enabled,
          })),
        });
    expect(restored.status).toBe(200);
    const finalMenu = await browserApi(page, '/navigation/primary');
    expect(finalMenu.status).toBe(200);
    expect((finalMenu.body as Menu).isDefault).toBe(original.isDefault);
    if (!original.isDefault) {
      expect((finalMenu.body as Menu).items.map((item) => item.label)).toEqual(original.items.map((item) => item.label));
    }
  }
});
