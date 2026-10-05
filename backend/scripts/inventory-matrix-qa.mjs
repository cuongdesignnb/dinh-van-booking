// Isolated, targeted PostgreSQL/API/browser acceptance; never a project/production DB.
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';
import { chromium, expect } from '../../node_modules/@playwright/test/index.mjs';
import { PrismaService } from '../dist/prisma/prisma.service.js';
import { hashPassword } from '../dist/common/crypto.js';
import { publicBootstrapSettings } from '../dist/scripts/data/public-bootstrap.js';
if (process.env.DB_NAME !== 'dvb_inventory_matrix_qa' || process.env.DB_HOST !== '127.0.0.1' || process.env.DB_PORT !== '51534') throw new Error('Only disposable inventory matrix QA DB on loopback:51534 allowed');
const password = process.env.DVB_MATRIX_QA_PASSWORD;
if (!password || password.length < 20) throw new Error('Disposable QA password required');
const db = new PrismaService(), origin = 'http://127.0.0.1:33100';
const qaOutput = fileURLToPath(new URL('../../.next/qa-inventory-matrix/', import.meta.url));
const marker = `matrix-qa-${randomUUID().slice(0, 8)}`, users = [], contents = [], rooms = [], media = [], settings = [];
const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Ho_Chi_Minh', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
const shift = (date, n) => new Date(Date.parse(date) + n * 86400000).toISOString().slice(0, 10), date = (key) => new Date(`${key}T00:00:00Z`);
let browser, started = false;
async function api(context, path, method = 'GET', body, key = randomUUID()) {
  const csrf = (await context.cookies()).find((c) => c.name === 'dvb_csrf')?.value;
  const response = await context.request.fetch(`${origin}/api/v1${path}`, { method, headers: { origin, 'idempotency-key': key, ...(csrf ? { 'x-csrf-token': csrf } : {}) }, ...(body ? { data: body } : {}) });
  return { status: response.status(), body: await response.json(), headers: response.headers() };
}
async function login(page, email, admin) {
  await page.goto(`${origin}${admin ? '/admin/ton-phong' : '/doi-tac?mode=login'}`);
  await page.getByLabel('Email', { exact: true }).fill(email); await page.getByLabel('Mật khẩu', { exact: true }).fill(password);
  await page.getByRole('button', { name: 'Đăng nhập', exact: true }).last().click();
  await expect(page.getByRole('heading', { name: admin ? 'Quỹ phòng theo hạng phòng' : 'Xin chào, QA Matrix Partner', exact: true })).toBeVisible();
}
async function setCell(page, room, day, value) {
  await page.locator('.inventory-matrix__cell').filter({ hasText: /phòng/ }).first().waitFor();
  await page.getByRole('button', { name: new RegExp(`${room.name} · ${room.code} · ${day}:`) }).click();
  const dialog = page.getByRole('dialog'); await expect(dialog).toContainText(`${room.name} · ${room.code}`);
  await dialog.getByLabel('Số phòng còn bán', { exact: true }).fill(String(value)); await dialog.getByRole('button', { name: 'Lưu', exact: true }).click();
  await expect(dialog).toHaveCount(0);
}
try {
  for (const model of ['user','property','partnerOrganization','setting']) assert.equal(await db[model].count(), 0, 'DB must be empty before fixture ownership');
  started = true;
  const hash = await hashPassword(password), role = await db.role.findUniqueOrThrow({ where: { code: 'owner' } });
  const admin = await db.user.create({ data: { email: `${marker}-admin@example.test`, fullName: 'QA Matrix Admin', passwordHash: hash, roles: { create: { roleId: role.id } } } }); users.push(admin.id);
  const partner = await db.user.create({ data: { email: `${marker}-partner@example.test`, fullName: 'QA Matrix Partner', passwordHash: hash } }); users.push(partner.id);
  const org = await db.partnerOrganization.create({ data: { name: 'QA Matrix Organization', contactName: partner.fullName, email: partner.email, phone: '0900000000', createdById: admin.id, status: 'active', verificationStatus: 'verified_by_admin' } });
  await db.partnerMembership.create({ data: { organizationId: org.id, userId: partner.id, role: 'owner', status: 'active' } });
  const presentation = publicBootstrapSettings({ hero: null, promo: null, staysHero: null, destinationsHero: null, combosHero: null, bookingHero: null });
  for (const [key, value] of Object.entries(presentation)) { await db.setting.create({ data: { key, value, isPublic: true } }); settings.push(key); }
  for (const key of ['partnerPortal.enabled', 'inventoryCalendar.enabled', 'publicAvailability.enabled']) { await db.setting.upsert({ where: { key }, create: { key, value: true, isPublic: false }, update: { value: true, isPublic: false } }); settings.push(key); }
  browser = await chromium.launch({ headless: true });
  const adminContext = await browser.newContext({ viewport: { width: 1440, height: 1000 }, reducedMotion: 'reduce' }), adminPage = await adminContext.newPage();
  const errors = []; adminPage.on('pageerror', (e) => errors.push(e.message));
  await login(adminPage, admin.email, true);
  const csrf = (await adminContext.cookies()).find((c) => c.name === 'dvb_csrf').value;
  const png = await sharp({ create: { width: 800, height: 600, channels: 3, background: '#719270' } }).png().toBuffer();
  const upload = await adminContext.request.post(`${origin}/api/v1/media/upload`, { headers: { origin, 'x-csrf-token': csrf }, multipart: { file: { name: `${marker}.png`, mimeType: 'image/png', buffer: png }, altText: 'Isolated inventory matrix test image' } });
  assert(upload.ok(), `QA media upload ${upload.status()}`); const asset = await upload.json(); media.push(asset.id);
  async function property(label, state, family = false) {
    const p = await db.property.create({ data: { code: `${marker}-${label}`, kind: 'homestay', area: 'Cúc Phương', address: 'Isolated QA fixture only', operatingStatus: 'active',
      content: { create: { kind: 'stay', title: `QA Matrix ${label}`, slugSource: `${marker}-${label.toLowerCase()}`, publicationStatus: 'published', featured: true, noindex: true, excerpt: 'Disposable QA fixture', bodyDocument: { type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Owned isolated QA content, not business data.' }] }] }, routes: { create: { path: `/phong-nghi/${marker}-${label.toLowerCase()}` } }, media: { create: { mediaId: asset.id, role: 'cover', position: 0 } } } },
      roomTypes: { create: [{ code: 'STANDARD', name: 'QA Standard', status: 'active', capacityVerified: true, maxAdults: 2, maxOccupancy: 2, approvedPoolLimit: 5 }, ...(family ? [{ code: 'FAMILY', name: 'QA Family', status: 'active', capacityVerified: true, maxAdults: 4, maxOccupancy: 4, approvedPoolLimit: 5 }] : [])] } }, include: { roomTypes: { orderBy: { code: 'desc' } } } });
    contents.push(p.contentId); rooms.push(...p.roomTypes.map((r) => r.id));
    for (const room of p.roomTypes) {
      await db.roomUnit.create({ data: { roomTypeId: room.id, code: 'QA-1', label: 'Owned QA unit' } });
      await db.ratePlan.create({ data: { roomTypeId: room.id, code: 'QA', name: 'Owned QA rate', baseRateVnd: 100000n } });
      if (state !== 'missing') await db.inventoryDay.createMany({ data: Array.from({ length: 7 }, (_, i) => ({ roomTypeId: room.id, stayDate: date(shift(today, i)), capacity: state === 'sold_out' ? 0 : room.code === 'STANDARD' && family ? 5 : 2, heldCount: family && room.code === 'STANDARD' ? 1 : 0, reservedCount: family && room.code === 'STANDARD' ? 1 : 0, lastConfirmedAt: state === 'stale' ? new Date(Date.now() - 20 * 86400000) : new Date(), lastConfirmedSource: 'admin' })) });
    }
    return p;
  }
  const shared = await property('A', 'available', true), sold = await property('B', 'sold_out'), missing = await property('C', 'missing'), stale = await property('D', 'stale');
  const standard = shared.roomTypes.find((r) => r.code === 'STANDARD'), family = shared.roomTypes.find((r) => r.code === 'FAMILY');
  await db.partnerPropertyGrant.create({ data: { organizationId: org.id, propertyId: shared.id, roomTypeScope: [standard.id], canReadInventory: true, canWriteInventory: true, approvedById: admin.id, approvedAt: new Date() } });
  await db.auditLog.create({ data: { actorId: admin.id, action: 'qa.inventory_matrix_fixture', entityType: 'qa_run', entityId: randomUUID(), diff: { marker, contents, rooms, users, origin } } });
  await adminPage.reload();
  await adminPage.getByRole('combobox', { name: /Cơ sở/ }).selectOption(shared.id);
  await expect(adminPage.locator('.inventory-matrix')).toContainText('QA Standard'); await expect(adminPage.locator('.inventory-matrix')).toContainText('QA Family');
  assert.equal((await api(adminContext, '/admin/inventory/properties')).body.items.length, 4);
  await setCell(adminPage, standard, today, 2);
  let row = await db.inventoryDay.findUniqueOrThrow({ where: { roomTypeId_stayDate: { roomTypeId: standard.id, stayDate: date(today) } } });
  assert.equal(row.capacity - row.blockedCount - row.heldCount - row.reservedCount, 2); assert.equal(row.heldCount, 1); assert.equal(row.reservedCount, 1);
  const adminCommand = await db.inventoryChange.findFirstOrThrow({ where: { actorId: admin.id, roomTypeId: standard.id, command: 'quick_set_available' } });
  const adminReplay = { roomTypeId: standard.id, stayDate: today, available: 2, expectedVersion: 1, reopen: false };
  assert.equal((await api(adminContext, '/admin/inventory/available', 'POST', adminReplay, adminCommand.idempotencyKey)).body.replayed, true);
  assert.equal((await api(adminContext, '/admin/inventory/available', 'POST', { ...adminReplay, available: 1 }, adminCommand.idempotencyKey)).status, 409);
  assert.equal((await api(adminContext, '/admin/inventory/available', 'POST', { ...adminReplay, roomTypeId: family.id }, adminCommand.idempotencyKey)).status, 409);
  const partnerContext = await browser.newContext({ viewport: { width: 1440, height: 1000 }, reducedMotion: 'reduce' }), partnerPage = await partnerContext.newPage(); partnerPage.on('pageerror', (e) => errors.push(e.message));
  await login(partnerPage, partner.email, false); await partnerPage.locator('.partner-property-list').getByRole('button', { name: /QA Matrix A/ }).click();
  await expect(partnerPage.locator('.inventory-matrix')).toContainText('QA Standard'); await expect(partnerPage.locator('.inventory-matrix')).not.toContainText('QA Family');
  await expect(partnerPage.getByRole('button', { name: new RegExp(`QA Standard · STANDARD · ${today}: 2 phòng`) })).toBeVisible();
  const partnerScope = (await api(partnerContext, `/partners/inventory?organizationId=${org.id}&propertyId=${shared.id}&from=${today}&toExclusive=${shift(today, 7)}`)).body.items;
  assert(partnerScope.every((item) => item.roomTypeId === standard.id));
  assert.equal((await api(partnerContext, '/partners/inventory/available', 'POST', { organizationId: org.id, roomTypeId: family.id, stayDate: today, available: 0, expectedVersion: 1 })).status, 403);
  assert.equal((await api(partnerContext, `/partners/inventory?organizationId=${org.id}&propertyId=${sold.id}&from=${today}&toExclusive=${shift(today, 1)}`)).status, 403);
  assert.equal((await api(partnerContext, '/admin/inventory/properties')).status, 403);
  for (const page of [adminPage, partnerPage]) {
    await page.locator('.inventory-matrix__toolbar select').selectOption('month');
    await expect(page.locator('.inventory-matrix thead th')).toHaveCount(32);
    await page.locator('.inventory-matrix__toolbar select').selectOption('week');
    await expect(page.getByRole('button', { name: new RegExp(`QA Standard · STANDARD · ${today}: 2 phòng`) })).toBeEnabled();
  }
  await partnerPage.getByLabel('Bắt đầu lịch').fill(shift(today, 7));
  await partnerPage.getByRole('button', { name: new RegExp(`QA Standard · STANDARD · ${shift(today,7)}: Chưa mở`) }).click();
  await expect(partnerPage.getByRole('dialog')).toContainText('Liên hệ quản trị viên');
  await expect(partnerPage.getByRole('dialog').getByLabel('Số phòng còn bán', { exact: true })).toHaveCount(0);
  assert.equal((await api(partnerContext, '/partners/inventory/available', 'POST', { organizationId: org.id, roomTypeId: standard.id, stayDate: shift(today,7), available: 0, expectedVersion: 1 })).status, 409);
  await partnerPage.keyboard.press('Escape'); await partnerPage.getByLabel('Bắt đầu lịch').fill(today);
  await expect(partnerPage.getByRole('button', { name: new RegExp(`QA Standard · STANDARD · ${today}: 2 phòng`) })).toBeEnabled();
  await adminPage.getByRole('button', { name: new RegExp(`QA Standard · STANDARD · ${today}:`) }).click();
  await adminPage.getByRole('dialog').getByLabel('Số phòng còn bán', { exact: true }).fill('1');
  await adminPage.screenshot({ path: `${qaOutput}admin-cell-dialog.png` });
  await setCell(partnerPage, standard, today, 1);
  await adminPage.getByRole('dialog').getByRole('button', { name: 'Lưu', exact: true }).click();
  await expect(adminPage.getByRole('dialog').getByRole('alert')).toContainText('đổi');
  await expect(adminPage.getByRole('dialog').getByLabel('Số phòng còn bán', { exact: true })).toHaveValue('1');
  await adminPage.keyboard.press('Escape'); await adminPage.getByRole('button', { name: 'Tải lại lịch', exact: true }).click();
  await expect(adminPage.getByRole('button', { name: new RegExp(`QA Standard · STANDARD · ${today}: 1 phòng`) })).toBeVisible();
  row = await db.inventoryDay.findUniqueOrThrow({ where: { roomTypeId_stayDate: { roomTypeId: standard.id, stayDate: date(today) } } });
  const change = { roomTypeId: standard.id, stayDate: today, available: 0, expectedVersion: row.version, reopen: false }, key = randomUUID();
  assert.equal((await api(partnerContext, '/partners/inventory/available', 'POST', { ...change, organizationId: org.id }, key)).status, 201);
  const beforeReplay = await db.inventoryDay.findUniqueOrThrow({ where: { roomTypeId_stayDate: { roomTypeId: standard.id, stayDate: date(today) } } });
  assert.equal((await api(partnerContext, '/partners/inventory/available', 'POST', { ...change, organizationId: org.id }, key)).body.replayed, true);
  assert.equal((await db.inventoryDay.findUniqueOrThrow({ where: { roomTypeId_stayDate: { roomTypeId: standard.id, stayDate: date(today) } } })).version, beforeReplay.version);
  assert.equal((await api(adminContext, '/admin/inventory/available', 'POST', { ...change, expectedVersion: row.version })).status, 409);
  const familyBefore = await db.inventoryDay.findUniqueOrThrow({ where: { roomTypeId_stayDate: { roomTypeId: family.id, stayDate: date(today) } } }); assert.equal(familyBefore.version, 1); assert.equal(familyBefore.blockedCount, 0);
  const summary = async () => (await api(adminContext, '/public/stay-availability')).body.items;
  let states = await summary(); assert.equal(states.find((s) => s.id === shared.contentId).availabilityStatus, 'available');
  for (const [p, status] of [[sold,'sold_out'],[missing,'unknown'],[stale,'unknown']]) assert.equal(states.find((s) => s.id === p.contentId).availabilityStatus, status);
  assert.equal((await api(adminContext, '/admin/inventory/available', 'POST', { roomTypeId: family.id, stayDate: today, available: 0, expectedVersion: familyBefore.version })).status, 201);
  assert.equal((await summary()).find((s) => s.id === shared.contentId).availabilityStatus, 'sold_out');
  await adminPage.getByRole('combobox', { name: /Cơ sở/ }).selectOption(missing.id); await adminPage.getByRole('button', { name: new RegExp(`QA Standard · STANDARD · ${today}: Chưa mở`) }).click();
  await adminPage.getByRole('dialog').getByLabel('Tổng số phòng/sức chứa đã xác minh').fill('2'); await adminPage.getByRole('dialog').getByRole('checkbox').check(); await adminPage.getByRole('dialog').getByRole('button', { name: 'Lưu', exact: true }).click(); await expect(adminPage.getByRole('dialog')).toHaveCount(0);
  assert.equal((await summary()).find((s) => s.id === missing.contentId).availabilityStatus, 'available');
  await adminPage.getByRole('combobox', { name: /Cơ sở/ }).selectOption(shared.id); await adminPage.getByRole('button', { name: 'Tải lại lịch', exact: true }).click();
  await adminPage.locator('.inventory-matrix__bulk summary').click(); const bulkForm = adminPage.locator('.inventory-matrix__bulk form');
  await bulkForm.getByRole('combobox').selectOption(family.id); await bulkForm.getByLabel('Từ ngày', { exact: true }).fill(shift(today, 1)); await bulkForm.getByLabel('Đến ngày (gồm đêm này)', { exact: true }).fill(shift(today, 2)); await bulkForm.getByLabel('Số phòng còn bán', { exact: true }).fill('1');
  await bulkForm.getByRole('button', { name: 'Xem trước', exact: true }).click(); await expect(adminPage.locator('.inventory-matrix__preview')).toContainText('QA Family · FAMILY'); await adminPage.getByRole('button', { name: 'Xác nhận và lưu toàn bộ lô' }).click(); await expect(adminPage.locator('.inventory-matrix__preview')).toHaveCount(0);
  const bulkDays = [1, 2].map((i) => ({ roomTypeId: family.id, stayDate: shift(today, i), available: 0, expectedVersion: i === 1 ? 2 : 1 }));
  assert.equal((await api(adminContext, '/admin/inventory/available/bulk', 'POST', bulkDays.length ? { changes: bulkDays } : {})).status, 409);
  assert.equal((await db.inventoryDay.findUniqueOrThrow({ where: { roomTypeId_stayDate: { roomTypeId: family.id, stayDate: date(shift(today, 1)) } } })).version, 2);
  const protectedDay = await db.inventoryDay.findUniqueOrThrow({ where: { roomTypeId_stayDate: { roomTypeId: standard.id, stayDate: date(today) } } });
  assert.equal(protectedDay.capacity, 5); assert.equal(protectedDay.heldCount, 1); assert.equal(protectedDay.reservedCount, 1);
  assert(await db.auditLog.count({ where: { actorId: admin.id, action: 'inventory.admin_quick_set' } }) >= 4); assert(await db.outboxEvent.count({ where: { aggregateId: { in: rooms }, eventType: 'inventory.changed' } }) >= 5);
  console.log('ADMIN_PARTNER_EXACT_SCOPE / VERSION_409 / IDEMPOTENCY / BULK_ATOMIC / COMMITMENTS / AUDIT_OUTBOX=PASS');
  const publicContext = await browser.newContext({ reducedMotion: 'reduce' }), publicPage = await publicContext.newPage(); publicPage.on('pageerror', (e) => errors.push(e.message));
  for (const width of [1440,1024,390]) {
    for (const p of [adminPage, partnerPage, publicPage]) await p.setViewportSize({ width, height: 1000 });
    await partnerPage.reload(); await partnerPage.locator('.partner-property-list').getByRole('button', { name: /QA Matrix A/ }).click();
    for (const p of [adminPage, partnerPage]) { await expect(p.locator('.inventory-matrix')).toBeVisible(); assert(await p.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)); }
    if (width === 390) for (const p of [adminPage, partnerPage]) await expect(p.locator('.inventory-matrix thead th')).toHaveCount(8);
    await publicPage.goto(origin); await expect(publicPage.locator('.stay-grid .availability-badge')).toHaveCount(4);
    await expect(publicPage.getByLabel('Tình trạng phòng: Hết phòng', { exact: true })).toHaveCount(2); await expect(publicPage.getByLabel('Tình trạng phòng: Đang cập nhật', { exact: true })).toHaveCount(1);
    await publicPage.goto(`${origin}/phong-nghi?checkIn=${today}&checkOut=${shift(today,1)}`); await expect(publicPage.locator('.lcard--grid .availability-badge')).toHaveCount(4);
    await publicPage.getByRole('button', { name: 'Dạng danh sách', exact: true }).click(); await expect(publicPage.locator('.lcard--list .availability-badge')).toHaveCount(4);
    assert(await publicPage.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1));
    await publicPage.screenshot({ path: `${qaOutput}public-list-${width}.png` }); await adminPage.screenshot({ path: `${qaOutput}admin-${width}.png` }); await partnerPage.screenshot({ path: `${qaOutput}partner-${width}.png` });
    console.log(`MATRIX / HOME_GRID_LIST_BADGES / NO_PAGE_OVERFLOW ${width}=PASS`);
  }
  const payload = (await api(publicContext, '/public/stays')).body; assert(!/heldCount|reservedCount|blockedCount|"version"/.test(JSON.stringify(payload)));
  assert.match((await api(publicContext, '/public/stay-availability')).headers['cache-control'], /no-store/);
  assert.equal((await api(adminContext, '/admin/inventory/available', 'POST', { roomTypeId: family.id, stayDate: today, available: 1, expectedVersion: 2 })).status, 201);
  await publicPage.reload(); await expect(publicPage.locator('.lcard').filter({ hasText: 'QA Matrix A' }).getByLabel('Tình trạng phòng: Còn phòng', { exact: true })).toBeVisible();
  await publicPage.goto(origin); await expect(publicPage.locator('.stay').filter({ hasText: 'QA Matrix A' }).getByLabel('Tình trạng phòng: Còn phòng', { exact: true })).toBeVisible();
  const future = `${origin}/phong-nghi?checkIn=${shift(today,20)}&checkOut=${shift(today,22)}`; await publicPage.goto(future); await expect(publicPage.locator('.lcard .availability-badge--unknown')).toHaveCount(4);
  // Same mounted listing, native URL update -> ONE batch for new range, not one/card.
  const batchRequests = []; publicPage.on('request', (r) => { if (r.url().includes('/public/stay-availability') && new URL(r.url()).searchParams.get('checkIn') === today) batchRequests.push(r.url()); });
  await publicPage.evaluate(({ today, out }) => history.pushState(null, '', `/phong-nghi?checkIn=${today}&checkOut=${out}`), { today, out: shift(today,1) });
  await expect(publicPage.locator('.lcard').filter({ hasText: 'QA Matrix A' }).getByLabel('Tình trạng phòng: Còn phòng', { exact: true })).toBeVisible(); assert.equal(batchRequests.length, 1);
  await db.setting.update({ where: { key: 'publicAvailability.enabled' }, data: { value: false } });
  assert((await summary()).every((item) => item.availabilityStatus === 'unknown'));
  await db.setting.update({ where: { key: 'publicAvailability.enabled' }, data: { value: true } });
  assert.deepEqual(errors, []); console.log('PUBLIC_REFRESH / QUERY_RANGE_BATCH / INTERNAL_COUNTERS_PRIVATE / PAGE_ERRORS_ZERO=PASS');
} catch (error) {
  console.error('TARGETED_QA_FAILURE:', error.message); throw error;
} finally {
  await browser?.close();
  if (started) {
    await db.auditLog.deleteMany({ where: { actorId: { in: users } } }); await db.outboxEvent.deleteMany({ where: { aggregateId: { in: rooms } } });
    await db.inventoryChange.deleteMany({ where: { roomTypeId: { in: rooms } } }); await db.inventoryBlock.deleteMany({ where: { createdBy: { in: users } } });
    await db.partnerOrganization.deleteMany({ where: { createdById: { in: users } } }); await db.contentNode.deleteMany({ where: { id: { in: contents } } }); await db.mediaAsset.deleteMany({ where: { id: { in: media } } });
    await db.user.deleteMany({ where: { id: { in: users } } }); await db.setting.deleteMany({ where: { key: { in: settings } } });
    for (const model of ['user','property','partnerOrganization','setting','inventoryDay','inventoryChange','inventoryBlock','inventoryBlockNight','auditLog','outboxEvent','mediaAsset']) assert.equal(await db[model].count(), 0);
    console.log('QA_FIXTURE_CLEANUP=PASS; PRODUCTION_WRITES=0; DURABLE_FLAGS_CHANGED=0');
  }
  await db.$disconnect();
}
