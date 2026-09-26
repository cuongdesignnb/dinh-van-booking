import { expect, test } from '@playwright/test';
import { browserApi, signInAsOwner } from './helpers';

type ContentRecord = {
  id: string;
  kind: string;
  title: string;
  slug: string;
  path: string;
  publicationStatus: string;
  version: number;
  details?: {
    destination?: { category: string; location: string | null };
    combo?: { code: string; inclusions: string[]; days: Array<{ title: string }> };
  };
};

type PropertyRecord = {
  id: string;
  contentId: string;
  code: string;
  title: string;
  slug: string;
  path: string;
  publicationStatus: string;
  version: number;
  roomTypes: Array<{ unitCount: number; rate: { baseRateVnd: number } | null }>;
};

async function findContent(page: Parameters<typeof browserApi>[0], kind: string, title: string) {
  const result = await browserApi(page, `/content?kind=${kind}&page=1&pageSize=100`);
  expect(result.status).toBe(200);
  return (result.body as { items: ContentRecord[] }).items.find((item) => item.title === title);
}

test('destination và combo được tạo, sửa, xoá qua editor/API và draft không lọt ra public', async ({ page }) => {
  test.setTimeout(120_000);
  await signInAsOwner(page);
  page.on('dialog', (dialog) => dialog.accept());

  const stamp = Date.now();
  const records: Array<{ route: string; kind: string; publicRoute: string; title: string; slug: string; id?: string }> = [
    {
      route: '/admin/diem-den', kind: 'destination', publicRoute: 'destinations',
      title: `ATG Điểm đến ${stamp}`, slug: `atg-destination-${stamp}`,
    },
    {
      route: '/admin/combo-du-lich', kind: 'combo', publicRoute: 'combos',
      title: `ATG Combo ${stamp}`, slug: `atg-combo-${stamp}`,
    },
  ];

  try {
    for (const record of records) {
      await page.goto(record.route);
      await page.getByRole('button', { name: 'Tạo mới' }).click();
      await page.getByLabel('Tiêu đề *').fill(record.title);
      await page.getByLabel('Slug đường dẫn').fill(record.slug);
      await page.getByLabel('Tóm tắt').fill(`Bản ghi kiểm thử ${record.kind} được tạo trên PostgreSQL.`);

      if (record.kind === 'destination') {
        await page.getByLabel('Nhóm điểm đến *').fill('Sinh thái kiểm thử');
        await page.getByLabel('Khu vực').fill('Cúc Phương, Ninh Bình');
      } else {
        await page.getByLabel('Mã combo *').fill(`ATG-COMBO-${stamp}`);
        await page.getByLabel('Khu vực').fill('Cúc Phương');
        await page.getByLabel('Lịch trình').fill('1|Ngày kiểm thử|Tham quan rừng; Nghỉ ngơi');
        await page.getByLabel('Bao gồm', { exact: true }).fill('Hướng dẫn viên địa phương');
        await page.getByLabel('Không bao gồm').fill('Chi phí cá nhân');
        await page.getByLabel('Điều khoản').fill('Lịch trình mẫu chỉ dùng kiểm thử local.');
      }

      await page.locator('.rte [contenteditable="true"]').fill(
        `Nội dung ${record.kind} kiểm thử được lưu trên PostgreSQL, có revision và chỉ được công khai khi chủ động xuất bản.`,
      );
      await page.getByLabel('Tiêu đề SEO *').fill(record.title);
      await page.getByLabel('Mô tả SEO *').fill(`Mô tả SEO kiểm thử cho ${record.kind}, không dùng dữ liệu khách hàng.`);
      await page.getByRole('button', { name: 'Lưu bản nháp' }).click();
      await expect(page.locator('.settings-screen__message--success')).toContainText('Đã tạo bản nháp thật');

      const stored = await findContent(page, record.kind, record.title);
      expect(stored).toBeTruthy();
      record.id = stored!.id;
      expect(stored!.publicationStatus).toBe('draft');
      expect((await browserApi(page, `/public/${record.publicRoute}/${record.slug}`)).status).toBe(404);

      const originalVersion = stored!.version;
      const card = page.locator('.content-manager__item', { hasText: record.title });
      await card.getByRole('button', { name: 'Sửa' }).click();
      const editedTitle = `${record.title} — đã sửa`;
      await page.getByLabel('Tiêu đề *').fill(editedTitle);
      if (record.kind === 'destination') {
        await page.getByLabel('Nhóm điểm đến *').fill('Thiên nhiên đã xác minh');
      }
      const updateResponsePromise = page.waitForResponse((response) =>
        response.url().includes(`/api/v1/content/${record.id}`) && response.request().method() === 'PUT',
        { timeout: 10_000 },
      );
      await page.getByRole('button', { name: 'Lưu thay đổi' }).click({ timeout: 10_000 });
      const updateResponse = await updateResponsePromise;
      const updateBody = await updateResponse.json().catch(() => null);
      expect(updateResponse.status(), JSON.stringify(updateBody)).toBe(200);
      await expect(page.locator('.content-manager__item', { hasText: editedTitle })).toBeVisible();

      const detail = await browserApi(page, `/content/${record.id}`);
      expect(detail.status).toBe(200);
      const edited = detail.body as ContentRecord;
      expect(edited.title).toBe(editedTitle);
      expect(edited.version).toBeGreaterThan(originalVersion);
      if (record.kind === 'destination') expect(edited.details?.destination?.category).toBe('Thiên nhiên đã xác minh');
      if (record.kind === 'combo') expect(edited.details?.combo?.inclusions).toContain('Hướng dẫn viên địa phương');

      const editedCard = page.locator('.content-manager__item', { hasText: editedTitle });
      await editedCard.getByRole('button', { name: 'Xoá' }).click();
      await expect(editedCard).toHaveCount(0);
      expect((await browserApi(page, `/content/${record.id}`)).status).toBe(404);
      expect((await browserApi(page, `/public/${record.publicRoute}/${record.slug}`)).status).toBe(404);
      record.id = undefined;
    }
  } finally {
    for (const record of records) {
      if (!record.id) continue;
      const current = await browserApi(page, `/content/${record.id}`);
      if (current.status !== 200) continue;
      const node = current.body as ContentRecord;
      if (node.publicationStatus === 'published') {
        const draft = await browserApi(page, `/content/${node.id}/status`, 'PATCH', {
          status: 'draft', expectedVersion: node.version,
        });
        if (draft.status === 200) node.version = (draft.body as ContentRecord).version;
      }
      const removed = await browserApi(page, `/content/${node.id}?expectedVersion=${node.version}`, 'DELETE');
      expect([204, 404]).toContain(removed.status);
    }
  }
});

test('nơi lưu trú tạo room, unit và rate thật; chỉnh sửa rồi xoá đúng bản nháp kiểm thử', async ({ page }) => {
  test.setTimeout(120_000);
  await signInAsOwner(page);
  page.on('dialog', (dialog) => dialog.accept());

  const stamp = Date.now();
  const code = `ATG-STAY-${stamp}`;
  const title = `ATG Nơi lưu trú ${stamp}`;
  let propertyId: string | null = null;

  try {
    await page.goto('/admin/phong-nghi');
    await page.getByRole('button', { name: 'Thêm phòng nghỉ' }).click();
    await expect(page).toHaveURL(/\/admin\/phong-nghi\?action=create/);
    await page.getByLabel('Tên nơi lưu trú *').fill(title);
    await page.getByLabel('Mã nơi lưu trú *').fill(code);
    await page.getByLabel('Khu vực *').fill('Cúc Phương, Ninh Bình');
    await page.getByLabel('Địa chỉ *').fill('Địa chỉ kiểm thử local, không phải cơ sở lưu trú thật.');
    await page.locator('.rte [contenteditable="true"]').fill(
      'Nội dung kiểm thử riêng trong database local, tạo room, đơn vị và rate để xác nhận form lưu cùng một giao dịch.',
    );
    await page.getByLabel('Mã loại phòng *').fill(`ATG-ROOM-${stamp}`);
    await page.getByLabel('Tên loại phòng *').fill('Phòng kiểm thử local');
    await page.getByLabel('Số đơn vị phòng *').fill('1');
    await page.getByLabel('Giá ngày thường (VND) *').fill('1000');
    await page.getByRole('button', { name: 'Lưu nơi lưu trú' }).click();
    await expect(page.locator('.settings-screen__message--success')).toContainText('Đã tạo nơi lưu trú');

    const list = await browserApi(page, '/properties');
    expect(list.status).toBe(200);
    let property = (list.body as { items: PropertyRecord[] }).items.find((item) => item.code === code);
    expect(property).toBeTruthy();
    propertyId = property!.id;
    expect(property!.publicationStatus).toBe('draft');
    expect(property!.roomTypes[0]?.unitCount).toBe(1);
    expect(property!.roomTypes[0]?.rate?.baseRateVnd).toBe(1000);
    const publicResponse = await page.request.get(property!.path);
    expect(publicResponse.status()).toBe(404);

    const card = page.locator('.property-card', { hasText: code });
    await card.getByRole('button', { name: 'Sửa' }).click();
    const editedTitle = `${title} — đã sửa`;
    await page.getByLabel('Tên nơi lưu trú *').fill(editedTitle);
    await page.getByLabel('Địa chỉ *').fill('Địa chỉ kiểm thử local đã chỉnh sửa.');
    await page.getByRole('button', { name: 'Lưu thay đổi' }).click();
    await expect(page.locator('.property-card', { hasText: editedTitle })).toBeVisible();

    const detail = await browserApi(page, `/properties/${propertyId}`);
    expect(detail.status).toBe(200);
    property = detail.body as PropertyRecord;
    expect(property.title).toBe(editedTitle);
    expect(property.version).toBeGreaterThan(1);
    expect(property.roomTypes[0]?.rate?.baseRateVnd).toBe(1000);

    const editedCard = page.locator('.property-card', { hasText: code });
    await editedCard.getByRole('button', { name: 'Xoá' }).click();
    await expect(editedCard).toHaveCount(0);
    expect((await browserApi(page, `/properties/${propertyId}`)).status).toBe(404);
    expect((await page.request.get(property.path)).status()).toBe(404);
    propertyId = null;
  } finally {
    if (propertyId) {
      const current = await browserApi(page, `/properties/${propertyId}`);
      if (current.status === 200) {
        const property = current.body as PropertyRecord;
        const removed = await browserApi(page, `/properties/${propertyId}?expectedVersion=${property.version}`, 'DELETE');
        expect([204, 404]).toContain(removed.status);
      }
    }
  }
});
