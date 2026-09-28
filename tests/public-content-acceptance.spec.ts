import { expect, test, type Locator, type Page } from '@playwright/test';
import { browserApi, createUniqueTestPng, signInAsOwner } from './admin/helpers';

type SettingItem = { key: string; value: unknown; isDefault: boolean; version: number };
type SettingSnapshot = Pick<SettingItem, 'key' | 'value' | 'isDefault'>;

const MUTATED_KEYS = [
  'home.sections', 'home.hero', 'home.promo', 'home.contactPanel', 'home.faq',
  'site.header', 'site.footer', 'contact.page',
];
const SECTION_LABELS: Record<string, string> = {
  hero: 'Hero',
  promo: 'Giới thiệu trải nghiệm',
  faq: 'FAQ',
  contact: 'Tư vấn',
};

function settingsItems(payload: unknown): SettingItem[] {
  if (!payload || typeof payload !== 'object' || !Array.isArray((payload as { items?: unknown }).items)) {
    throw new Error('Không đọc được danh sách cài đặt để lưu baseline.');
  }
  return (payload as { items: SettingItem[] }).items;
}

async function readSettings(page: Page): Promise<SettingItem[]> {
  const response = await browserApi(page, '/settings');
  if (response.status !== 200) throw new Error('Không đọc được cài đặt quản trị: HTTP ' + response.status);
  return settingsItems(response.body);
}

async function restoreBaseline(page: Page, snapshots: SettingSnapshot[]): Promise<void> {
  for (const snapshot of snapshots) {
    const current = (await readSettings(page)).find((item) => item.key === snapshot.key);
    if (!current) throw new Error('Thiếu setting khi khôi phục baseline: ' + snapshot.key);
    if (snapshot.isDefault) {
      if (!current.isDefault) {
        const result = await browserApi(page, '/settings/' + encodeURIComponent(snapshot.key) + '?expectedVersion=' + current.version, 'DELETE');
        if (result.status !== 200) throw new Error('Không reset được setting ' + snapshot.key + ': HTTP ' + result.status);
      }
    } else if (JSON.stringify(current.value) !== JSON.stringify(snapshot.value)) {
      const result = await browserApi(page, '/settings/' + encodeURIComponent(snapshot.key), 'PUT', {
        value: snapshot.value,
        expectedVersion: current.version,
      });
      if (result.status !== 200) throw new Error('Không phục hồi được setting ' + snapshot.key + ': HTTP ' + result.status);
    }
  }
}

function card(page: Page, key: string): Locator {
  return page.locator('[data-setting-key="' + key + '"]');
}

async function setCheckbox(checkbox: Locator, checked: boolean): Promise<void> {
  if ((await checkbox.isChecked()) === checked) return;
  await checkbox.locator('xpath=..').click();
  if (checked) await expect(checkbox).toBeChecked();
  else await expect(checkbox).not.toBeChecked();
}

async function openMediaPicker(setting: Locator, mediaLabel: string): Promise<Locator> {
  const field = setting.locator('.settings-form__field').filter({ hasText: mediaLabel }).first();
  await field.getByRole('button', { name: /^(Chọn từ thư viện ảnh|Thay ảnh từ thư viện)$/ }).click();
  return setting.page().locator('.media-library-dialog:visible').last();
}

async function saveCard(page: Page, key: string, edit: (setting: Locator) => Promise<void>): Promise<void> {
  const setting = card(page, key);
  await expect(setting).toHaveCount(1);
  await edit(setting);
  const save = setting.getByRole('button', { name: 'Lưu thay đổi' });
  await expect(save).toBeEnabled();
  const responsePromise = page.waitForResponse((response) =>
    response.url().includes('/api/v1/settings/' + encodeURIComponent(key)) &&
    response.request().method() === 'PUT',
  );
  await save.click();
  const response = await responsePromise;
  if (!response.ok()) throw new Error('Settings save failed for ' + key + ': HTTP ' + response.status() + ' ' + await response.text());
}

async function selectExistingMedia(setting: Locator, buttonName: string, filename: string): Promise<void> {
  const dialog = await openMediaPicker(setting, buttonName);
  await expect(dialog).toBeVisible();
  await dialog.getByLabel('Tìm trong thư viện ảnh').fill(filename);
  const asset = dialog.locator('.media-library__card').filter({ hasText: filename }).first();
  await expect(asset).toBeVisible();
  await asset.click();
  await expect(dialog).toBeHidden();
}

test.describe('public content final acceptance', () => {
  test.describe.configure({ mode: 'serial' });

  test('Admin content updates are immediate across sessions; media/editor controls work and baseline is restored', async ({ browser, page }) => {
    test.setTimeout(240_000);
    page.setDefaultTimeout(12_000);
    page.setDefaultNavigationTimeout(30_000);
    await signInAsOwner(page);
    await page.goto('/admin/cai-dat');
    await expect(page.locator('[data-setting-key="home.hero"]')).toBeVisible();

    const initialItems = await readSettings(page);
    const snapshots = MUTATED_KEYS.map((key) => {
      const item = initialItems.find((candidate) => candidate.key === key);
      if (!item) throw new Error('Thiếu setting cần bảo vệ: ' + key);
      return { key, value: structuredClone(item.value), isDefault: item.isDefault };
    });

    const baseURL = String(test.info().project.use.baseURL ?? process.env.BASE_URL ?? 'http://localhost:3100');
    const publicContext = await browser.newContext({ baseURL });
    const publicPage = await publicContext.newPage();
    const marker = 'PUBLIC ACCEPTANCE ' + Date.now();
    const filename = 'dvb-public-acceptance-' + Date.now() + '.png';
    let uploadedMediaId: string | null = null;
    let uploadedMediaUrl: string | null = null;

    try {
      // Keep a distinct anonymous browser context open while Admin saves.
      await publicPage.goto('/');
      await expect(publicPage.locator('.home-content-order')).toHaveCount(1);

      const desiredVisible = new Set(['hero', 'promo', 'faq', 'contact']);
      await saveCard(page, 'home.sections', async (setting) => {
        const list = setting.locator('ol[aria-label="Thứ tự và trạng thái các khối trang chủ"]');
        await expect(list.locator('li')).toHaveCount(11);
        const labels: Record<string, string> = {
          hero: 'Hero', trust: 'Cam kết', search: 'Tìm kiếm', featured: 'Phòng nghỉ nổi bật',
          why: 'Vì sao chọn chúng tôi', combos: 'Combo', destinations: 'Điểm đến',
          reviews: 'Đánh giá', promo: 'Giới thiệu trải nghiệm', faq: 'FAQ', contact: 'Tư vấn',
        };
        for (const [sectionId, sectionLabel] of Object.entries(labels)) {
          const toggle = list.locator('[data-home-section="' + sectionId + '"]').getByRole('checkbox', { name: 'Hiện ' + sectionLabel });
          const shouldBeChecked = desiredVisible.has(sectionId);
          if ((await toggle.isChecked()) !== shouldBeChecked) {
            await toggle.locator('xpath=..').click();
            if (shouldBeChecked) await expect(toggle).toBeChecked();
            else await expect(toggle).not.toBeChecked();
          }
        }
        for (const [targetIndex, sectionId] of ['hero', 'promo', 'faq', 'contact'].entries()) {
          let ids = await list.locator('li').evaluateAll((items) => items.map((item) => item.getAttribute('data-home-section') ?? ''));
          let currentIndex = ids.indexOf(sectionId);
          while (currentIndex > targetIndex) {
            const currentRow = list.locator('li').nth(currentIndex);
            await currentRow.getByRole('button', { name: 'Chuyển ' + SECTION_LABELS[sectionId] + ' lên' }).click();
            currentIndex -= 1;
            await expect(list.locator('li').nth(currentIndex)).toHaveAttribute('data-home-section', sectionId);
            ids = await list.locator('li').evaluateAll((items) => items.map((item) => item.getAttribute('data-home-section') ?? ''));
          }
          expect(ids[targetIndex]).toBe(sectionId);
        }
      });

      await saveCard(page, 'home.hero', async (setting) => {
        await setCheckbox(setting.getByLabel('Hiển thị Hero'), true);
        await setting.getByLabel('Tiêu đề — dòng 1').fill(marker + ' HERO');
        const dialog = await openMediaPicker(setting, 'Ảnh Hero desktop');
        await expect(dialog).toBeVisible();
        const uploadResponsePromise = page.waitForResponse((response) =>
          response.url().includes('/api/v1/media/upload') && response.request().method() === 'POST',
        );
        await dialog.locator('input[type="file"]').setInputFiles({
          name: filename,
          mimeType: 'image/png',
          buffer: createUniqueTestPng(0x429ad1),
        });
        const uploadResponse = await uploadResponsePromise;
        expect(uploadResponse.status()).toBe(201);
        const uploaded = await uploadResponse.json() as { id: string; url: string; altText: string | null; width: number; height: number };
        uploadedMediaId = uploaded.id;
        uploadedMediaUrl = uploaded.url;
        expect(uploaded.width).toBe(1);
        expect(uploaded.height).toBe(1);
        expect(uploaded.altText?.trim()).toBeTruthy();
        await expect(dialog).toBeHidden();
        await expect(setting).toContainText('Khuyến nghị: 1920 × 900 px');
        await expect(setting).toContainText('1 × 1 px');
        await expect(setting).toContainText('Tỷ lệ ảnh hiện tại 1.00:1 khác tỷ lệ khuyến nghị 2.13:1');
      });

      // The separate, already-open public session sees the Admin write without build/restart.
      await publicPage.reload();
      await expect(publicPage.getByRole('heading', { level: 1 })).toContainText(marker + ' HERO');
      await expect(publicPage.locator('.hero__img')).toBeVisible();
      await expect(publicPage.locator('.hero__img')).toHaveAttribute('src', uploadedMediaUrl!);

      await saveCard(page, 'home.promo', async (setting) => {
        await setCheckbox(setting.getByLabel('Hiển thị khối trải nghiệm'), true);
        await setting.getByLabel('Tiêu đề — dòng 1').fill(marker + ' PROMO');
        await selectExistingMedia(setting, 'Ảnh giới thiệu trải nghiệm', filename);
      });
      await saveCard(page, 'home.contactPanel', async (setting) => {
        await setCheckbox(setting.getByLabel('Hiển thị khối tư vấn'), true);
        await setting.getByLabel('Tiêu đề khối tư vấn').fill(marker + ' ADVISOR');
        await setting.getByLabel('Tên tư vấn viên').fill(marker + ' advisor');
        await selectExistingMedia(setting, 'Ảnh khối tư vấn', filename);
      });
      await saveCard(page, 'contact.page', async (setting) => {
        await setCheckbox(setting.getByLabel('Đang bật'), true);
        await setting.getByLabel('Tiêu đề trang').fill(marker + ' contact');
        await setting.getByLabel('Tên tư vấn viên').fill(marker + ' contact advisor');
        await selectExistingMedia(setting, 'Ảnh tư vấn viên', filename);
      });

      await saveCard(page, 'home.faq', async (setting) => {
        await setCheckbox(setting.getByLabel('Hiển thị FAQ'), true);
        await setting.getByLabel('Tiêu đề FAQ').fill(marker + ' FAQ');
        await setting.getByRole('button', { name: 'Thêm mục' }).click();
        await setting.getByLabel('Câu hỏi').last().fill(marker + ' question?');
        const editor = setting.locator('.ProseMirror[contenteditable="true"]').last();
        await expect(editor).toBeVisible();
        await editor.fill(marker + ' rich FAQ answer');
      });
      await saveCard(page, 'site.header', async (setting) => {
        await setting.getByLabel('Khẩu hiệu — dòng 1').fill(marker + ' HEADER MOTTO');
        await setting.getByLabel('Nhãn nút chính').fill(marker + ' HEADER CTA');
        await setting.getByLabel('Đích nút chính').fill('/phong-nghi');
      });
      await saveCard(page, 'site.footer', async (setting) => {
        await setting.getByLabel('Trích dẫn chân trang').fill(marker + ' FOOTER QUOTE');
        await setting.getByLabel('Khẩu hiệu chân trang').fill(marker + ' FOOTER MOTTO');
      });

      const afterSave = await readSettings(page);
      const mediaIds = ['home.hero', 'home.promo', 'home.contactPanel', 'contact.page'].map((key) => {
        const item = afterSave.find((candidate) => candidate.key === key);
        const value = item?.value as Record<string, unknown> | undefined;
        const path = key === 'contact.page' ? 'advisorImageMediaId' : 'imageMediaId';
        return value?.[path];
      });
      expect(uploadedMediaId).toBeTruthy();
      expect(mediaIds).toEqual([uploadedMediaId, uploadedMediaId, uploadedMediaId, uploadedMediaId]);

      await publicPage.reload();
      await expect(publicPage.getByRole('heading', { level: 1 })).toContainText(marker + ' HERO');
      await expect(publicPage.locator('.home-promo')).toContainText(marker + ' PROMO');
      await expect(publicPage.locator('.home-faq')).toContainText(marker + ' FAQ');
      await expect(publicPage.locator('.home-faq')).toContainText(marker + ' rich FAQ answer');
      await expect(publicPage.locator('.contact')).toContainText(marker + ' ADVISOR');
      await expect(publicPage.locator('.site-header__motto')).toContainText(marker + ' HEADER MOTTO');
      await expect(publicPage.locator('.site-header__actions')).toContainText(marker + ' HEADER CTA');
      await expect(publicPage.locator('.footer__quote')).toContainText(marker + ' FOOTER QUOTE');
      await expect(publicPage.locator('.footer__motto')).toContainText(marker + ' FOOTER MOTTO');
      const orderedClasses = await publicPage.locator('.home-content-order > *').evaluateAll((items) => items.map((item) => item.className));
      expect(orderedClasses).toEqual(['hero', 'home-promo content-shell', 'home-faq content-shell', 'contact content-shell']);
      for (const selector of ['.hero__img', '.promo__img', '.contact__img']) {
        await expect(publicPage.locator(selector)).toBeVisible();
        await expect(publicPage.locator(selector)).toHaveAttribute('src', uploadedMediaUrl!);
      }

      await publicPage.goto('/lien-he');
      await expect(publicPage.locator('.contact-advisor__image')).toBeVisible();
      await expect(publicPage.locator('.contact-advisor')).toContainText(marker + ' contact advisor');
      await expect(publicPage.locator('.contact-advisor__image')).toHaveAttribute('src', uploadedMediaUrl!);

      await page.goto('/admin/thu-vien-anh');
      const libraryCard = page.locator('.media-library__card').filter({ hasText: filename });
      await expect(libraryCard).toHaveCount(1);
      await libraryCard.click();
      await expect(page.getByRole('button', { name: 'Xoá ảnh' })).toBeVisible();
      const deleteResponsePromise = page.waitForResponse((response) =>
        response.url().includes('/api/v1/media/' + uploadedMediaId) && response.request().method() === 'DELETE',
      );
      page.once('dialog', (dialog) => dialog.accept());
      await page.getByRole('button', { name: 'Xoá ảnh' }).click();
      const deleteResponse = await deleteResponsePromise;
      expect(deleteResponse.status()).toBe(409);
      await expect(page.locator('.settings-screen__message[role="alert"]')).toContainText('Ảnh đang được dùng');
      await expect(libraryCard).toHaveCount(1);
    } finally {
      try {
        await restoreBaseline(page, snapshots);
        if (uploadedMediaId) {
          const removed = await browserApi(page, '/media/' + encodeURIComponent(uploadedMediaId), 'DELETE');
          if (removed.status !== 204) throw new Error('Không cleanup được media E2E sau khi phục hồi setting: HTTP ' + removed.status);
        }
      } finally {
        await publicContext.close();
      }
    }

    const restored = await readSettings(page);
    for (const snapshot of snapshots) {
      const current = restored.find((item) => item.key === snapshot.key);
      expect(current?.isDefault).toBe(snapshot.isDefault);
      expect(JSON.stringify(current?.value)).toBe(JSON.stringify(snapshot.value));
    }
  });

  test('empty business settings and empty public catalog render no demo or hardcoded business content', async ({ page, request }) => {
    await signInAsOwner(page);
    const keys = [
      'brand.identity', 'brand.contact', 'site.header', 'site.footer', 'home.sections',
      'home.hero', 'home.trust', 'home.why', 'home.featured', 'home.combos',
      'home.destinations', 'home.testimonials', 'home.promo', 'home.contactPanel',
      'home.faq', 'contact.page', 'catalog.staysPage', 'catalog.destinationsPage',
      'catalog.combosPage', 'catalog.bookingPage', 'catalog.staticPages',
      'catalog.articlesPage', 'seo.defaults', 'seo.pages',
    ];
    const original = await readSettings(page);
    const snapshots = keys.map((key) => {
      const item = original.find((candidate) => candidate.key === key);
      if (!item) throw new Error('Thiếu setting cần bảo vệ: ' + key);
      return { key, value: structuredClone(item.value), isDefault: item.isDefault };
    });
    try {
      for (const key of keys) {
        const current = (await readSettings(page)).find((item) => item.key === key)!;
        if (!current.isDefault) {
          const result = await browserApi(page, '/settings/' + encodeURIComponent(key) + '?expectedVersion=' + current.version, 'DELETE');
          expect(result.status, key).toBe(200);
        }
      }
      const siteResponse = await request.get('/api/v1/public/site');
      expect(siteResponse.status()).toBe(200);
      const site = await siteResponse.json() as { settings: Record<string, unknown> };
      const settings = site.settings;
      for (const key of ['brand.identity', 'brand.contact', 'brand.social', 'brand.businessHours', 'site.header', 'site.footer']) {
        const value = settings[key];
        expect(value, key).toBeTruthy();
        expect(Object.values(value as Record<string, unknown>).every((entry) => entry === null)).toBe(true);
      }
      for (const key of ['home.hero', 'home.promo', 'home.contactPanel', 'home.faq']) {
        const value = settings[key] as Record<string, unknown>;
        expect(value.enabled, key + '.enabled').toBe(false);
      }
      expect((settings['home.sections'] as { order: unknown[] }).order).toEqual([]);
      for (const path of ['stays', 'combos', 'destinations', 'articles', 'pages']) {
        const response = await request.get('/api/v1/public/' + path);
        expect(response.status(), path).toBe(200);
        expect((await response.json()).items, path).toEqual([]);
      }
      await page.goto('/');
      await expect(page.locator('.home-content-order > *')).toHaveCount(0);
      const text = await page.locator('body').innerText();
      expect(text).not.toMatch(/Mộc Sơn Homestay|An Nhiên Retreat|Cẩm nang 48 giờ ở Cúc Phương|PUBLIC ACCEPTANCE/i);
      await page.goto('/phong-nghi');
      await expect(page.locator('.stay-card, .lcard')).toHaveCount(0);
      expect(await page.locator('body').innerText()).not.toMatch(/Mộc Sơn Homestay|An Nhiên Retreat|bản sao demo/i);
    } finally {
      await restoreBaseline(page, snapshots);
    }
  });
});
