// Targeted UI acceptance against disposable PostgreSQL only; no business DB.
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { chromium, expect } from '@playwright/test';
import { PrismaService } from '../backend/dist/prisma/prisma.service.js';
import { hashPassword } from '../backend/dist/common/crypto.js';

if (process.env.DB_NAME !== 'dvb_inventory_matrix_qa' || process.env.DB_HOST !== '127.0.0.1' || process.env.DB_PORT !== '51534') throw new Error('Only empty, disposable QA DB on loopback:51534 allowed');
const password = process.env.DVB_MATRIX_QA_PASSWORD;
if (!password || password.length < 20) throw new Error('Ephemeral QA password required');
const db = new PrismaService(), origin = 'http://127.0.0.1:33100';
const output = fileURLToPath(new URL('../.next/qa-inventory-ui-screens/', import.meta.url));
const marker = `matrix-ui-qa-${randomUUID().slice(0, 8)}`, users = [], contents = [], rooms = [], settings = [];
const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Ho_Chi_Minh', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
const shift = (n) => new Date(Date.parse(today) + n * 86400000).toISOString().slice(0, 10);
const date = (key) => new Date(`${key}T00:00:00Z`);
const fullDate = (key) => `${key.slice(8, 10)}/${key.slice(5, 7)}/${key.slice(0, 4)}`;
let browser, started = false;
const errors = [];
const cell = (page, room, key) => page.getByRole('button', { name: new RegExp(`^${room.name}, ngày ${fullDate(key)},`) });
const dialog = (page) => page.getByRole('dialog');
async function api(context, path, method = 'GET', body) {
  const csrf = (await context.cookies()).find((c) => c.name === 'dvb_csrf')?.value;
  const response = await context.request.fetch(`${origin}/api/v1${path}`, { method, headers: { origin, 'idempotency-key': randomUUID(), ...(csrf ? { 'x-csrf-token': csrf } : {}) }, ...(body ? { data: body } : {}) });
  return { status: response.status(), body: await response.json() };
}
async function login(page, email, admin) {
  await page.goto(`${origin}${admin ? '/admin/ton-phong' : '/doi-tac?mode=login'}`);
  await page.getByLabel('Email', { exact: true }).fill(email);
  await page.getByLabel('Mật khẩu', { exact: true }).fill(password);
  await page.getByRole('button', { name: 'Đăng nhập', exact: true }).last().click();
  await expect(page.getByRole('heading', { name: admin ? 'Quỹ phòng' : 'Xin chào, QA Matrix Partner', exact: true })).toBeVisible({ timeout: 60000 });
}
async function row(room, day) {
  return db.inventoryDay.findUniqueOrThrow({ where: { roomTypeId_stayDate: { roomTypeId: room.id, stayDate: date(day) } } });
}
async function saveCell(page, room, day, value) {
  await cell(page, room, day).click();
  await dialog(page).getByLabel('Số phòng còn bán', { exact: true }).fill(String(value));
  await dialog(page).getByRole('button', { name: 'Lưu thay đổi', exact: true }).click();
  try { await expect(dialog(page)).toHaveCount(0); }
  catch (error) { if (await dialog(page).getByRole('alert').count()) console.error('CELL_SAVE_ERROR:', await dialog(page).getByRole('alert').textContent()); throw error; }
}
async function refresh(page) {
  await page.locator('.inventory-matrix__heading').getByRole('button', { name: 'Cập nhật dữ liệu', exact: true }).click();
  await expect(page.locator('.inventory-matrix__loading')).toHaveCount(0);
}
try {
  for (const model of ['user', 'property', 'partnerOrganization', 'setting']) assert.equal(await db[model].count(), 0, 'Disposable DB must be empty');
  started = true;
  const hash = await hashPassword(password), role = await db.role.findUniqueOrThrow({ where: { code: 'owner' } });
  const admin = await db.user.create({ data: { email: `${marker}-admin@example.test`, fullName: 'QA Matrix Admin', passwordHash: hash, roles: { create: { roleId: role.id } } } }); users.push(admin.id);
  const partner = await db.user.create({ data: { email: `${marker}-partner@example.test`, fullName: 'QA Matrix Partner', passwordHash: hash } }); users.push(partner.id);
  const org = await db.partnerOrganization.create({ data: { name: 'QA Matrix Organization', contactName: partner.fullName, email: partner.email, phone: '0900000000', createdById: admin.id, status: 'active', verificationStatus: 'verified_by_admin' } });
  await db.partnerMembership.create({ data: { organizationId: org.id, userId: partner.id, role: 'owner', status: 'active' } });
  for (const key of ['partnerPortal.enabled', 'inventoryCalendar.enabled']) { await db.setting.create({ data: { key, value: true, isPublic: false } }); settings.push(key); }
  async function property(label, family) {
    const p = await db.property.create({ data: { code: `${marker}-${label}`, kind: 'homestay', area: 'QA', address: 'Isolated QA fixture', operatingStatus: 'active',
      content: { create: { kind: 'stay', title: `QA Matrix ${label}`, slugSource: `${marker}-${label}`, publicationStatus: 'draft', noindex: true } },
      roomTypes: { create: [{ code: 'STANDARD', name: 'Phòng tiêu chuẩn', status: 'active', capacityVerified: true, maxAdults: 2, maxOccupancy: 2, approvedPoolLimit: 5 }, ...(family ? [{ code: 'FAMILY', name: 'Phòng gia đình', status: 'active', capacityVerified: true, maxAdults: 4, maxOccupancy: 4, approvedPoolLimit: 5 }] : [])] } }, include: { roomTypes: true } });
    contents.push(p.contentId); rooms.push(...p.roomTypes.map((r) => r.id));
    for (const room of p.roomTypes) await db.inventoryDay.createMany({ data: Array.from({ length: 7 }, (_, i) => ({ roomTypeId: room.id, stayDate: date(shift(i)), capacity: 4, heldCount: 1, reservedCount: 0, lastConfirmedAt: new Date(), lastConfirmedSource: 'admin' })) });
    return p;
  }
  const shared = await property('A', true), single = await property('B', false);
  const standard = shared.roomTypes.find((r) => r.code === 'STANDARD'), family = shared.roomTypes.find((r) => r.code === 'FAMILY');
  await db.inventoryDay.update({ where: { roomTypeId_stayDate: { roomTypeId: standard.id, stayDate: date(shift(1)) } }, data: { capacity: 1 } });
  await db.inventoryDay.delete({ where: { roomTypeId_stayDate: { roomTypeId: standard.id, stayDate: date(shift(2)) } } });
  await db.inventoryDay.update({ where: { roomTypeId_stayDate: { roomTypeId: standard.id, stayDate: date(shift(3)) } }, data: { lastConfirmedAt: new Date(Date.now() - 20 * 86400000) } });
  await db.inventoryIntegrityIncident.create({ data: { roomTypeId: standard.id, stayDate: date(shift(4)), kind: 'qa_fixture', recordedBlockedCount: 0, ledgerBlockedCount: 1, detail: marker } });
  const grant = await db.partnerPropertyGrant.create({ data: { organizationId: org.id, propertyId: shared.id, roomTypeScope: [standard.id], canReadInventory: true, canWriteInventory: true, approvedById: admin.id, approvedAt: new Date() } });
  await db.auditLog.create({ data: { actorId: admin.id, action: 'qa.inventory_matrix_ui_fixture', entityType: 'qa_run', entityId: randomUUID(), diff: { marker, contents, rooms, users, origin } } });
  browser = await chromium.launch({ headless: true });
  const adminContext = await browser.newContext({ viewport: { width: 1440, height: 1000 }, reducedMotion: 'reduce' }), a = await adminContext.newPage();
  const partnerContext = await browser.newContext({ viewport: { width: 1440, height: 1000 }, reducedMotion: 'reduce' }), p = await partnerContext.newPage();
  for (const page of [a, p]) page.on('pageerror', (e) => errors.push(e.message));
  await login(a, admin.email, true);
  await a.getByRole('combobox', { name: 'Cơ sở', exact: true }).selectOption(shared.id);
  await expect(cell(a, standard, today)).toHaveAccessibleName(`${standard.name}, ngày ${fullDate(today)}, còn 3 phòng`);
  await expect(cell(a, standard, shift(1))).toContainText('Hết phòng');
  await expect(cell(a, standard, shift(2))).toContainText('Chưa mở');
  await expect(cell(a, standard, shift(2))).toBeEnabled();
  await expect(cell(a, standard, shift(4))).toContainText('Cần rà soát');
  await expect(a.locator('.inventory-matrix__room-name')).toHaveCount(4); // desktop + hidden mobile projection
  assert((await a.locator('.admin-inventory__property select').boundingBox()).width <= 480);
  await a.getByRole('button', { name: 'Tháng', exact: true }).click();
  await expect(a.locator('.inventory-matrix thead th')).toHaveCount(new Date(Date.UTC(Number(today.slice(0, 4)), Number(today.slice(5, 7)), 0)).getUTCDate() + 1);
  await a.getByRole('button', { name: 'Tuần', exact: true }).click();
  await expect(cell(a, standard, today)).toBeEnabled();
  await cell(a, standard, today).focus(); await a.keyboard.press('ArrowRight');
  await expect(cell(a, standard, shift(1))).toBeFocused();
  const standardIndex = Number(await cell(a, standard, today).getAttribute('data-cell-row'));
  const familyIndex = Number(await cell(a, family, today).getAttribute('data-cell-row'));
  await a.keyboard.press(familyIndex > standardIndex ? 'ArrowDown' : 'ArrowUp'); await expect(cell(a, family, shift(1))).toBeFocused();
  await a.keyboard.press('Home'); await expect(cell(a, family, today)).toBeFocused();
  await a.keyboard.press('Enter'); await expect(dialog(a).getByLabel('Số phòng còn bán', { exact: true })).toBeFocused();
  await a.keyboard.press('Escape'); await expect(cell(a, family, today)).toBeFocused();
  await login(p, partner.email, false);
  await p.locator('.partner-property-list').getByRole('button', { name: /QA Matrix A/ }).click();
  await expect(cell(p, standard, today)).toContainText('Còn phòng');
  await expect(p.locator('.inventory-matrix')).not.toContainText('Phòng gia đình');
  await expect(cell(p, standard, shift(3))).toContainText('Cần xác nhận');
  await expect(p.getByRole('button', { name: 'Cập nhật nhiều ngày', exact: true })).toHaveCount(0);
  assert.equal((await api(partnerContext, '/admin/inventory/properties')).status, 403);
  assert.equal((await api(partnerContext, '/partners/inventory/available', 'POST', { organizationId: org.id, roomTypeId: family.id, stayDate: today, available: 0, expectedVersion: 1 })).status, 403);
  await cell(p, standard, shift(2)).click(); await expect(dialog(p)).toContainText('Liên hệ quản trị viên');
  await expect(dialog(p).getByLabel('Số phòng còn bán', { exact: true })).toHaveCount(0); await p.keyboard.press('Escape');
  await cell(p, standard, today).click(); await dialog(p).locator('summary').click();
  await expect(dialog(p)).not.toContainText('Version'); await expect(dialog(p)).not.toContainText('partner_portal'); await p.keyboard.press('Escape');
  await cell(a, standard, today).click();
  await dialog(a).getByRole('button', { name: 'Đánh dấu hết phòng', exact: true }).click(); await expect(dialog(a).getByLabel('Số phòng còn bán', { exact: true })).toHaveValue('0');
  await dialog(a).getByLabel('Số phòng còn bán', { exact: true }).fill('2'); await dialog(a).locator('summary').click(); await expect(dialog(a)).toContainText('Version');
  await a.screenshot({ path: `${output}admin-cell-dialog.png` });
  await saveCell(p, standard, today, 1);
  await dialog(a).getByRole('button', { name: 'Lưu thay đổi', exact: true }).click();
  await expect(dialog(a).getByRole('alert')).toContainText('đổi'); await expect(dialog(a).getByLabel('Số phòng còn bán', { exact: true })).toHaveValue('2');
  await a.keyboard.press('Escape'); await refresh(a); await expect(cell(a, standard, today)).toContainText('1');
  // Admin must not overwrite the partner-owned withheld ledger to increase availability.
  await saveCell(a, standard, today, 1); const changed = await row(standard, today); assert.equal(changed.heldCount, 1); assert.equal(changed.reservedCount, 0); assert.equal(changed.capacity - changed.blockedCount - changed.heldCount, 1);
  // Preview is non-mutating, preserves draft on back, and retains captured versions on conflict.
  await a.getByRole('button', { name: 'Cập nhật nhiều ngày', exact: true }).click();
  await expect(dialog(a)).toBeVisible();
  await dialog(a).getByRole('combobox', { name: 'Hạng phòng', exact: true }).selectOption(family.id);
  await dialog(a).getByLabel('Từ ngày', { exact: true }).fill(today); await dialog(a).getByLabel('Đến ngày', { exact: true }).fill(shift(2));
  await dialog(a).getByLabel('Số phòng còn bán', { exact: true }).fill('1');
  await dialog(a).getByRole('button', { name: 'Xem trước', exact: true }).click(); await expect(dialog(a)).toContainText('3 đêm sẽ được cập nhật'); assert.equal((await row(family, today)).version, 1);
  await a.screenshot({ path: `${output}admin-bulk-preview.png` });
  await dialog(a).getByRole('button', { name: 'Quay lại', exact: true }).click(); await expect(dialog(a).getByLabel('Số phòng còn bán', { exact: true })).toHaveValue('1');
  await dialog(a).getByRole('button', { name: 'Xem trước', exact: true }).click();
  assert.equal((await api(adminContext, '/admin/inventory/available', 'POST', { roomTypeId: family.id, stayDate: today, available: 2, expectedVersion: 1 })).status, 201);
  await dialog(a).getByRole('button', { name: 'Xác nhận cập nhật', exact: true }).click(); await expect(dialog(a).getByRole('alert')).toContainText('đổi'); await expect(dialog(a)).toContainText('3 đêm sẽ được cập nhật'); assert.equal((await row(family, shift(1))).version, 1);
  await a.keyboard.press('Escape');
  await refresh(a); await a.getByRole('button', { name: 'Cập nhật nhiều ngày', exact: true }).click();
  await dialog(a).getByRole('combobox', { name: 'Hạng phòng', exact: true }).selectOption(family.id); await dialog(a).getByLabel('Đến ngày', { exact: true }).fill(shift(2)); await dialog(a).getByLabel('Số phòng còn bán', { exact: true }).fill('1');
  await dialog(a).getByRole('button', { name: 'Xem trước', exact: true }).click(); await dialog(a).getByRole('button', { name: 'Xác nhận cập nhật', exact: true }).click(); await expect(dialog(a)).toHaveCount(0);
  for (let i = 0; i < 3; i++) { const r = await row(family, shift(i)); assert.equal(r.capacity - r.blockedCount - r.heldCount - r.reservedCount, 1); assert.equal(r.heldCount, 1); }
  console.log('CELL_EDIT / DRAFT_CONFLICT / BULK_PANEL_PREVIEW / BULK_ATOMIC / COMMITMENTS / SCOPE / KEYBOARD_DESKTOP=PASS');
  for (const width of [1440, 1024, 390]) {
    for (const [page, roleName] of [[a, 'admin'], [p, 'partner']]) {
      await page.setViewportSize({ width, height: 1000 }); await refresh(page);
      await expect(page.locator('.inventory-matrix')).toBeVisible();
      assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), `${roleName} page overflow ${width}`);
      await expect(page.locator(width === 390 ? '.inventory-matrix__mobile' : '.inventory-matrix__scroll')).toBeVisible();
      if (width === 1440) assert(await page.locator('.inventory-matrix__scroll').evaluate((el) => el.scrollWidth <= el.clientWidth + 1), `${roleName} full week must fit desktop`);
      if (width === 390) {
        await expect(page.locator('.inventory-matrix__scroll')).toBeHidden(); assert((await cell(page, standard, today).boundingBox()).height >= 44);
        await cell(page, standard, today).focus(); await page.keyboard.press('ArrowDown'); await expect(cell(page, standard, shift(1))).toBeFocused();
        await cell(page, standard, today).click(); assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)); await page.screenshot({ path: `${output}${roleName}-mobile-dialog.png` }); await page.keyboard.press('Escape');
      }
      await page.evaluate(() => window.scrollTo(0, 0));
      await page.screenshot({ path: `${output}${roleName}-${width}.png`, fullPage: true });
    }
    console.log(`ADMIN_PARTNER_VISUAL / NO_PAGE_OVERFLOW ${width}=PASS`);
  }
  await a.setViewportSize({ width: 1440, height: 1000 });
  await cell(a, standard, shift(2)).click(); await dialog(a).getByLabel('Tổng số phòng/sức chứa đã xác minh').fill('2'); await dialog(a).getByRole('checkbox').check(); await dialog(a).getByRole('button', { name: 'Lưu thay đổi', exact: true }).click(); await expect(dialog(a)).toHaveCount(0); assert.equal((await row(standard, shift(2))).capacity, 2);
  await a.setViewportSize({ width: 1440, height: 1000 }); await a.getByRole('combobox', { name: 'Cơ sở', exact: true }).selectOption(single.id);
  await expect(a.locator('.inventory-matrix tbody tr')).toHaveCount(1); await expect(cell(a, single.roomTypes[0], today)).toBeEnabled(); assert((await a.locator('.inventory-matrix__scroll').boundingBox()).height < 200, 'Single room calendar must not leave a tall blank area');
  await a.screenshot({ path: `${output}admin-single-room.png` });
  await db.partnerPropertyGrant.update({ where: { id: grant.id }, data: { canWriteInventory: false } }); await p.reload(); await p.locator('.partner-property-list').getByRole('button', { name: /QA Matrix A/ }).click();
  await cell(p, standard, today).click(); await expect(dialog(p).getByLabel('Số phòng còn bán', { exact: true })).toBeDisabled(); await expect(dialog(p).getByRole('button', { name: 'Lưu thay đổi', exact: true })).toHaveCount(0);
  assert.equal((await api(partnerContext, '/partners/inventory/available', 'POST', { organizationId: org.id, roomTypeId: standard.id, stayDate: today, available: 0, expectedVersion: changed.version })).status, 403);
  assert.deepEqual(errors, []); console.log('READ_ONLY_PARTNER / SINGLE_ROOM_COMPACT / MOBILE_KEYBOARD / PAGE_ERRORS_ZERO=PASS');
} catch (error) { console.error('TARGETED_UI_QA_FAILURE:', error.message); throw error; }
finally {
  await browser?.close();
  if (started) {
    await db.auditLog.deleteMany({ where: { actorId: { in: users } } }); await db.outboxEvent.deleteMany({ where: { aggregateId: { in: rooms } } });
    await db.inventoryIntegrityIncident.deleteMany({ where: { roomTypeId: { in: rooms } } }); await db.inventoryChange.deleteMany({ where: { roomTypeId: { in: rooms } } }); await db.inventoryBlock.deleteMany({ where: { createdBy: { in: users } } });
    await db.partnerOrganization.deleteMany({ where: { createdById: { in: users } } }); await db.contentNode.deleteMany({ where: { id: { in: contents } } }); await db.user.deleteMany({ where: { id: { in: users } } }); await db.setting.deleteMany({ where: { key: { in: settings } } });
    for (const model of ['user', 'property', 'partnerOrganization', 'setting', 'inventoryDay', 'inventoryChange', 'inventoryIntegrityIncident', 'inventoryBlock', 'inventoryBlockNight', 'auditLog', 'outboxEvent']) assert.equal(await db[model].count(), 0);
    console.log('QA_FIXTURE_CLEANUP=PASS; BUSINESS_DATA_CHANGES=0; PRODUCTION_WRITES=0');
  }
  await db.$disconnect();
}
