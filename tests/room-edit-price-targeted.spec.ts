import { expect, test } from '@playwright/test';
import { assertLocalPostgresCleanupAvailable, browserApi, signInAsOwner } from './admin/helpers';

type Room = {
  id: string;
  code: string;
  name: string;
  status: string;
  version: number;
  capacityVerified: boolean;
  unitCount: number;
  rate: { baseRateVnd: number; weekendRateVnd: number | null } | null;
};

type Property = {
  id: string;
  contentId: string;
  version: number;
  code: string;
  roomTypes: Room[];
};

test('targeted room code and formatted weekday/weekend price editing persists safely', async ({ page }) => {
  test.setTimeout(90_000);
  const baseURL = process.env.BASE_URL ?? '';
  expect(baseURL).toMatch(/^http:\/\/(127\.0\.0\.1|localhost):\d+$/);
  assertLocalPostgresCleanupAvailable();
  await signInAsOwner(page);

  let qaPropertyId: string | null = null;
  try {
    const properties = await browserApi(page, '/properties');
    expect(properties.status).toBe(200);
    const mineral = (properties.body as { items: Property[] }).items.find((item) => item.code === 'CP-MINERAL-RETREAT');
    expect(mineral).toBeTruthy();
    const mineralDetail = await browserApi(page, `/properties/${mineral!.id}`);
    const premiumVilla = (mineralDetail.body as Property).roomTypes.find((room) => room.name === 'Premium Villa');
    expect(premiumVilla).toBeTruthy();
    expect(premiumVilla).toMatchObject({ status: 'inactive', capacityVerified: false, unitCount: 0, rate: null });

    // Confirm the real imported room is editable, but discard all typed values.
    const mineralEditorUrl = `/admin/hang-phong?property=${mineral!.id}&room=${premiumVilla!.id}`;
    await page.goto(mineralEditorUrl);
    const premiumCode = page.getByLabel('Mã hạng phòng *');
    await expect(premiumCode).toBeEnabled();
    await expect(premiumCode).toHaveValue(premiumVilla!.code);
    await page.getByLabel('Giá ngày thường (VND)').fill('650.000');
    await page.getByLabel('Giá cuối tuần (VND)').fill('750,000');
    await page.getByLabel('Tên hạng phòng *').focus();
    await expect(page.getByLabel('Giá ngày thường (VND)')).toHaveValue('650.000');
    await expect(page.getByLabel('Giá cuối tuần (VND)')).toHaveValue('750.000');
    await expect(page.getByText(/Muốn bật “Đang hoạt động”/)).toBeVisible();
    await page.reload();
    await expect(page.getByLabel('Mã hạng phòng *')).toHaveValue(premiumVilla!.code);
    await expect(page.getByLabel('Giá ngày thường (VND)')).toHaveValue('');
    await expect(page.getByLabel('Giá cuối tuần (VND)')).toHaveValue('');
    const mineralAfterDiscard = await browserApi(page, `/properties/${mineral!.id}`);
    expect((mineralAfterDiscard.body as Property).roomTypes.find((room) => room.id === premiumVilla!.id))
      .toMatchObject({ code: premiumVilla!.code, version: premiumVilla!.version, status: 'inactive', rate: null });

    const stamp = Date.now();
    const createdProperty = await browserApi(page, '/properties', 'POST', {
      title: `ROOM-EDIT-QA ${stamp}`,
      code: `ROOM-EDIT-QA-${stamp}`,
      kind: 'lodge',
      area: 'Cúc Phương, Ninh Bình',
      address: 'Địa chỉ kiểm thử local; bản ghi sẽ được xoá sau khi hoàn tất.',
      description: 'Nơi lưu trú tổng hợp chỉ phục vụ kiểm thử local tính năng chỉnh sửa hạng phòng và nhập giá.',
    });
    if (createdProperty.body && typeof createdProperty.body === 'object' && 'id' in createdProperty.body) {
      qaPropertyId = String((createdProperty.body as { id: unknown }).id);
    }
    expect([200, 201]).toContain(createdProperty.status);
    expect(qaPropertyId).toBeTruthy();
    const qaProperty = createdProperty.body as Property;

    const createdRoom = await browserApi(page, `/properties/${qaProperty.id}/rooms`, 'POST', {
      code: 'PREMIUM-VILLA',
      name: 'Premium Villa kiểm thử',
      unitKind: 'villa',
      status: 'inactive',
    });
    expect([200, 201]).toContain(createdRoom.status);
    const createdRoomRecord = (createdRoom.body as Property).roomTypes.find((room) => room.code === 'PREMIUM-VILLA');
    expect(createdRoomRecord).toBeTruthy();
    expect(createdRoomRecord).toMatchObject({ status: 'inactive', capacityVerified: false, unitCount: 0, rate: null });

    const editorUrl = `/admin/hang-phong/${createdRoomRecord!.id}?property=${qaProperty.id}`;
    await page.goto(editorUrl);
    await expect(page.getByLabel('Mã hạng phòng *')).toBeEnabled();
    await page.getByLabel('Mã hạng phòng *').fill(' PREMIUM-VILLA-RENAMED ');
    await page.getByLabel('Giá ngày thường (VND)').fill('650.000');
    await page.getByLabel('Giá cuối tuần (VND)').fill('750,000');
    await page.getByLabel('Tên hạng phòng *').focus();
    await expect(page.getByLabel('Giá ngày thường (VND)')).toHaveValue('650.000');
    await expect(page.getByLabel('Giá cuối tuần (VND)')).toHaveValue('750.000');

    const firstSave = page.waitForResponse((response) =>
      response.url().endsWith(`/api/v1/properties/${qaProperty.id}/rooms/${createdRoomRecord!.id}`)
      && response.request().method() === 'PATCH',
    );
    await page.getByRole('button', { name: 'Lưu hạng phòng' }).click();
    expect((await firstSave).status()).toBe(200);
    await expect(page.locator('.admin-toast--success')).toContainText('Đã cập nhật hạng phòng.');

    let savedProperty = await browserApi(page, `/properties/${qaProperty.id}`);
    let savedRoom = (savedProperty.body as Property).roomTypes.find((room) => room.id === createdRoomRecord!.id);
    expect(savedRoom).toMatchObject({
      code: 'PREMIUM-VILLA-RENAMED',
      status: 'inactive',
      capacityVerified: false,
      unitCount: 0,
      rate: { baseRateVnd: 650000, weekendRateVnd: 750000 },
    });

    // Reload from the persisted API state and update the already-existing BAR plan.
    await page.goto(editorUrl);
    await expect(page.getByLabel('Mã hạng phòng *')).toHaveValue('PREMIUM-VILLA-RENAMED');
    await expect(page.getByLabel('Giá ngày thường (VND)')).toHaveValue('650.000');
    await expect(page.getByLabel('Giá cuối tuần (VND)')).toHaveValue('750.000');
    await page.getByLabel('Giá ngày thường (VND)').fill('700,000');
    await page.getByLabel('Giá cuối tuần (VND)').fill('820.000');
    await page.getByLabel('Tên hạng phòng *').focus();
    const secondSave = page.waitForResponse((response) =>
      response.url().endsWith(`/api/v1/properties/${qaProperty.id}/rooms/${createdRoomRecord!.id}`)
      && response.request().method() === 'PATCH',
    );
    await page.getByRole('button', { name: 'Lưu hạng phòng' }).click();
    expect((await secondSave).status()).toBe(200);
    await expect(page.locator('.admin-toast--success')).toContainText('Đã cập nhật hạng phòng.');
    savedProperty = await browserApi(page, `/properties/${qaProperty.id}`);
    savedRoom = (savedProperty.body as Property).roomTypes.find((room) => room.id === createdRoomRecord!.id);
    expect(savedRoom?.rate).toMatchObject({ baseRateVnd: 700000, weekendRateVnd: 820000 });

    await page.goto(editorUrl);
    await expect(page.getByLabel('Giá ngày thường (VND)')).toHaveValue('700.000');
    await expect(page.getByLabel('Giá cuối tuần (VND)')).toHaveValue('820.000');

    // Active remains blocked until the separate capacity and inventory facts exist.
    await page.goto(editorUrl);
    await page.getByLabel('Trạng thái hạng phòng').selectOption('active');
    await page.getByRole('button', { name: 'Lưu hạng phòng' }).click();
    await expect(page.locator('.property-form .settings-screen__message--error')).toContainText('xác minh sức chứa');
    const stillInactive = await browserApi(page, `/properties/${qaProperty.id}`);
    expect((stillInactive.body as Property).roomTypes.find((room) => room.id === createdRoomRecord!.id))
      .toMatchObject({ status: 'inactive', capacityVerified: false, unitCount: 0 });

    // A concurrent server-side update makes the already-open edit form stale.
    // The subsequent real UI mutation must show a useful global 409 toast.
    await page.goto(editorUrl);
    await expect(page.getByLabel('Mã hạng phòng *')).toHaveValue('PREMIUM-VILLA-RENAMED');
    const current = (await browserApi(page, `/properties/${qaProperty.id}`)).body as Property;
    const currentRoom = current.roomTypes.find((room) => room.id === createdRoomRecord!.id)!;
    const concurrentUpdate = await browserApi(page, `/properties/${qaProperty.id}/rooms/${currentRoom.id}`, 'PATCH', {
      code: currentRoom.code, name: `${currentRoom.name} external`, status: currentRoom.status,
      expectedVersion: currentRoom.version,
    });
    expect(concurrentUpdate.status).toBe(200);
    await page.getByLabel('Tên hạng phòng *').fill('Premium Villa stale QA');
    await page.getByRole('button', { name: 'Lưu hạng phòng' }).click();
    await expect(page.locator('.admin-toast--warning')).toBeVisible();
    await expect(page.locator('.admin-toast--warning')).not.toContainText(/API request failed|Conflict/i);
    await expect(page.locator('.property-form .settings-screen__message--error')).toBeVisible();
  } finally {
    if (qaPropertyId) {
      const current = await browserApi(page, `/properties/${qaPropertyId}`);
      if (current.status === 200) {
        const row = current.body as Property;
        const removed = await browserApi(page, `/properties/${qaPropertyId}?expectedVersion=${row.version}`, 'DELETE');
        expect(removed.status).toBe(204);
      }
    }
  }
});
