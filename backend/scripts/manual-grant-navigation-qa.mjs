// Targeted real-PostgreSQL + browser acceptance. NEVER run against an existing DB.
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { chromium, expect } from '../../node_modules/@playwright/test/index.mjs';
import { PrismaService } from '../dist/prisma/prisma.service.js';
import { hashPassword } from '../dist/common/crypto.js';
import { seedPrimaryMenu, STANDARD_PRIMARY_MENU } from '../dist/navigation/seed-primary-menu.js';
import { publicBootstrapSettings } from '../dist/scripts/data/public-bootstrap.js';

if (process.env.DB_NAME !== 'dvb_manual_grant_qa' || process.env.DB_HOST !== '127.0.0.1' || process.env.DB_PORT !== '51524') throw new Error('Only disposable dvb_manual_grant_qa on loopback:51524 is allowed');
const password = process.env.DVB_GRANT_QA_PASSWORD;
if (!password || password.length < 20) throw new Error('Disposable QA password required');
const db = new PrismaService();
const origin = 'http://127.0.0.1:33000';
const marker = `manual-qa-${randomUUID().slice(0, 8)}`;
const users = [], contents = [];
const flagKeys = ['partnerPortal.enabled', 'inventoryCalendar.enabled', 'publicAvailability.enabled'];
let browser, fixtureStarted = false;
const privateFlags = async (value) => {
  for (const key of flagKeys) await db.setting.upsert({ where: { key }, create: { key, value, isPublic: false }, update: { value } });
};
async function login(page, email, admin = false) {
  await page.goto(`${origin}${admin ? '/admin/doi-tac' : '/doi-tac?mode=login'}`);
  await page.getByLabel('Email', { exact: true }).fill(email);
  await page.getByLabel('Mật khẩu', { exact: true }).fill(password);
  await page.getByRole('button', { name: 'Đăng nhập', exact: true }).last().click();
  if (admin) await expect(page.getByRole('heading', { name: 'Quản lý đối tác' })).toBeVisible();
  else await expect(page.locator('.partner-auth-wrap')).toHaveCount(0);
}
async function request(context, path, method = 'GET', body) {
  const csrf = (await context.cookies()).find(cookie => cookie.name === 'dvb_csrf')?.value;
  const response = await context.request.fetch(`${origin}/api/v1${path}`, { method, headers: { origin, 'idempotency-key': randomUUID(), ...(csrf ? { 'x-csrf-token': csrf } : {}) }, ...(body ? { data: body } : {}) });
  return { status: response.status(), body: await response.json().catch(() => null) };
}
async function chooseGrant(page, userEmail, property) {
  await page.goto(`${origin}/admin/doi-tac/cap-quyen`);
  await page.getByLabel('Tìm tài khoản', { exact: true }).fill(userEmail);
  await page.getByRole('button', { name: 'Tìm tài khoản', exact: true }).click();
  await page.getByRole('radio').check();
  await page.getByRole('button', { name: 'Tìm cơ sở', exact: true }).click();
  await page.getByLabel('Cơ sở / nơi lưu trú', { exact: true }).selectOption(property.id);
}
try {
  assert.equal(await db.user.count(), 0, 'QA database must start with no users');
  assert.equal(await db.property.count(), 0, 'QA database must start with no properties');
  assert.equal(await db.partnerOrganization.count(), 0, 'QA database must start with no organizations');
  assert.equal(await db.setting.count(), 0, 'QA database must start with no settings');
  const menu = await db.navigationMenu.findUniqueOrThrow({ where: { key: 'primary' }, include: { items: { orderBy: { position: 'asc' } } } });
  assert.deepEqual(menu.items.map(item => [item.label, item.externalUrl]), STANDARD_PRIMARY_MENU.map(item => [item.label, item.externalUrl]));
  const custom = menu.items[1];
  await db.navigationItem.update({ where: { id: custom.id }, data: { label: 'Lưu trú đã tùy chỉnh', position: 42, enabled: false } });
  execFileSync(process.execPath, ['dist/scripts/seed.js'], { cwd: new URL('..', import.meta.url), env: process.env, stdio: 'pipe' });
  assert.deepEqual(await db.navigationItem.findUnique({ where: { id: custom.id } }), { ...custom, label: 'Lưu trú đã tùy chỉnh', position: 42, enabled: false });
  assert.equal(await db.navigationItem.count({ where: { menuId: menu.id } }), 6);
  assert.equal(await seedPrimaryMenu(db), 0);
  const extra = await db.navigationItem.create({ data: { menuId: menu.id, label: 'QA Custom Link', externalUrl: '/qa-manual-menu', position: 13, enabled: false } });
  const availabilityMenuItem = menu.items.find(item => item.externalUrl === '/lich-phong');
  await db.navigationItem.delete({ where: { id: availabilityMenuItem.id } });
  assert.equal(await seedPrimaryMenu(db), 1);
  assert.deepEqual(await db.navigationItem.findUnique({ where: { id: extra.id } }), extra);
  const appended = await db.navigationItem.findFirstOrThrow({ where: { menuId: menu.id, externalUrl: '/lich-phong' } });
  assert.equal(appended.position, 43);
  await db.navigationItem.update({ where: { id: appended.id }, data: { position: availabilityMenuItem.position } });
  await db.navigationItem.delete({ where: { id: extra.id } });
  await db.navigationItem.update({ where: { id: custom.id }, data: { label: custom.label, position: custom.position, enabled: custom.enabled } });
  console.log('DEFAULT_MENU_SEED / CUSTOM_PRESERVED / IDEMPOTENT=PASS');
  fixtureStarted = true;
  const hash = await hashPassword(password);
  const ownerRole = await db.role.findUniqueOrThrow({ where: { code: 'owner' } });
  const admin = await db.user.create({ data: { email: `${marker}-admin@example.test`, fullName: 'QA Grant Admin', passwordHash: hash, roles: { create: { roleId: ownerRole.id } } } }); users.push(admin.id);
  const partner = await db.user.create({ data: { email: `${marker}@example.test`, fullName: 'QA Manual Partner', passwordHash: hash } }); users.push(partner.id);
  const disabled = await db.user.create({ data: { email: `${marker}-disabled@example.test`, fullName: 'QA Disabled', passwordHash: hash, disabledAt: new Date() } }); users.push(disabled.id);
  const property = await db.property.create({ data: { code: `${marker}-A`, kind: 'homestay', area: 'Isolated QA', address: 'Disposable fixture', content: { create: { kind: 'stay', title: 'QA Granted Property', publicationStatus: 'draft', noindex: true } }, roomTypes: { create: [
    { code: 'A', name: 'QA Allowed Room', status: 'active', maxAdults: 2, maxOccupancy: 2 }, { code: 'B', name: 'QA Forbidden Room', status: 'active', maxAdults: 2, maxOccupancy: 2 },
  ] } }, include: { roomTypes: { orderBy: { code: 'asc' } } } }); contents.push(property.contentId);
  const other = await db.property.create({ data: { code: `${marker}-B`, kind: 'homestay', area: 'Isolated QA', address: 'Disposable fixture', content: { create: { kind: 'stay', title: 'QA Other Property', publicationStatus: 'draft', noindex: true } }, roomTypes: { create: { code: 'OTHER', name: 'QA Other Room', maxAdults: 2, maxOccupancy: 2 } } }, include: { roomTypes: true } }); contents.push(other.contentId);
  await privateFlags(false);
  const presentation = publicBootstrapSettings({ hero: null, promo: null, staysHero: null, destinationsHero: null, combosHero: null, bookingHero: null });
  for (const key of ['brand.identity', 'site.header']) await db.setting.create({ data: { key, value: presentation[key], isPublic: true } });
  browser = await chromium.launch({ headless: true });
  const adminContext = await browser.newContext({ viewport: { width: 1440, height: 1000 }, reducedMotion: 'reduce' });
  const page = await adminContext.newPage();
  const errors = []; page.on('pageerror', error => errors.push(error.message));
  await login(page, admin.email, true);
  await page.getByRole('tab', { name: 'Quyền truy cập' }).click();
  await page.getByRole('link', { name: '+ Cấp quyền thủ công' }).click();
  await chooseGrant(page, partner.email, property);
  for (const name of ['Cập nhật tồn', 'Đề xuất giá', 'Đề xuất hồ sơ', 'Tải ảnh']) await expect(page.getByRole('checkbox', { name, exact: true })).not.toBeChecked();
  await page.getByRole('button', { name: 'Tạo hồ sơ đối tác cho user' }).click();
  await page.getByLabel('Tên tổ chức/cơ sở', { exact: true }).fill('QA Manually Verified Organization');
  await page.getByLabel('Số điện thoại', { exact: true }).fill('0900000000');
  await page.getByRole('checkbox', { name: 'Admin đã xác minh thủ công' }).check();
  await page.getByRole('button', { name: 'Tạo hồ sơ đối tác', exact: true }).click();
  await expect(page.locator('.admin-toast--success')).toContainText('Tạo hồ sơ đối tác thành công.');
  const organizationId = await page.getByLabel('Tổ chức đối tác', { exact: true }).inputValue();
  await page.getByRole('checkbox', { name: 'QA Allowed Room · A', exact: true }).check();
  await page.getByRole('checkbox', { name: 'Cập nhật tồn', exact: true }).check();
  await page.getByRole('button', { name: 'Cấp quyền', exact: true }).click();
  await page.waitForURL(url => url.pathname === '/admin/doi-tac' && url.searchParams.has('grant'));
  await expect(page.locator('.admin-toast--success').filter({ hasText: 'Cấp quyền thành công.' })).toBeVisible();
  const grantId = new URL(page.url()).searchParams.get('grant');
  const grant = await db.partnerPropertyGrant.findUniqueOrThrow({ where: { id: grantId } });
  assert.deepEqual(grant.roomTypeScope, [property.roomTypes[0].id]); assert.equal(grant.canWriteInventory, true);
  assert.equal(await db.userRole.count({ where: { userId: partner.id } }), 0);
  const org = await db.partnerOrganization.findUniqueOrThrow({ where: { id: organizationId } }); assert.equal(org.status, 'active'); assert.equal(org.verificationStatus, 'verified_by_admin');
  await chooseGrant(page, partner.email, property);
  await page.getByLabel('Tổ chức đối tác', { exact: true }).selectOption(organizationId);
  await page.getByRole('checkbox', { name: 'QA Allowed Room · A', exact: true }).check();
  const duplicateResponse = page.waitForResponse(response => response.url().endsWith('/admin/partner-grants') && response.request().method() === 'POST');
  await page.getByRole('button', { name: 'Cấp quyền', exact: true }).click();
  assert.equal((await duplicateResponse).status(), 409);
  await expect(page.locator('.admin-toast--warning')).toContainText('Quyền đã tồn tại.');
  await page.getByRole('link', { name: 'Mở quyền hiện có' }).click();
  await expect(page.locator(`#grant-${grantId}`)).toBeVisible();
  const createPayload = { userId: partner.id, organizationId, propertyId: property.id, roomTypeScope: [other.roomTypes[0].id] };
  assert.equal((await request(adminContext, '/admin/partner-grants', 'POST', createPayload)).status, 400);
  assert.equal((await request(adminContext, '/admin/partner-grants', 'POST', { ...createPayload, roomTypeScope: ['*'] })).status, 400);
  assert.equal((await request(adminContext, '/admin/partner-grants', 'POST', { ...createPayload, userId: disabled.id, roomTypeScope: [property.roomTypes[0].id] })).status, 400);
  const candidates = (await request(adminContext, `/admin/partner-user-candidates?search=${marker}`)).body.items;
  assert(candidates.length <= 20); assert.deepEqual(Object.keys(candidates[0]).sort(), ['disabled','email','fullName','id','partnerOrganizations']);
  assert.equal(await db.auditLog.count({ where: { action: 'partner.organization_manual_create', entityId: organizationId } }), 1);
  assert.equal(await db.auditLog.count({ where: { action: 'partner.manual_grant_create', entityId: grantId } }), 1);
  console.log('MANUAL_UI / TOAST / ORGANIZATION / SCOPE / DUPLICATE_409 / AUDIT=PASS');
  await privateFlags(true);
  const partnerContext = await browser.newContext(); const partnerPage = await partnerContext.newPage();
  await login(partnerPage, partner.email);
  await partnerPage.locator('.partner-property-list').getByRole('button', { name: /QA Granted Property/ }).click();
  await expect(partnerPage.locator('.partner-calendar')).toContainText('QA Allowed Room');
  await expect(partnerPage.locator('.partner-calendar')).not.toContainText('QA Forbidden Room');
  await expect(partnerPage.locator('.partner-property-list')).not.toContainText('QA Other Property');
  await expect(partnerPage.getByRole('link', { name: 'Đề xuất sửa hồ sơ', exact: true })).toHaveCount(0);
  await expect(partnerPage.getByRole('heading', { name: 'Media Library của tổ chức', exact: true })).toHaveCount(0);
  const own = await request(partnerContext, '/partners/properties'); assert.equal(own.status, 200); assert.equal(own.body.items.length, 1); assert.deepEqual(own.body.items[0].roomTypes.map(room => room.id), [property.roomTypes[0].id]);
  assert.deepEqual(own.body.items[0].capabilities, { canReadInventory: true, canWriteInventory: true, canEditRates: false, canEditProfile: false, canUploadMedia: false });
  assert.equal((await request(partnerContext, '/admin/partner-user-candidates?search=QA')).status, 403);
  assert.equal((await request(partnerContext, '/admin/partner-grants', 'POST', createPayload)).status, 403);
  assert.equal((await request(partnerContext, `/partners/inventory?organizationId=${organizationId}&propertyId=${other.id}&from=2026-10-10&toExclusive=2026-10-12`)).status, 403);
  const inventory = await request(partnerContext, `/partners/inventory?organizationId=${organizationId}&propertyId=${property.id}&from=2026-10-10&toExclusive=2026-10-12`);
  assert.equal(inventory.status, 200); assert(inventory.body.items.every(item => item.roomTypeId === property.roomTypes[0].id));
  for (const room of [property.roomTypes[1], other.roomTypes[0]]) assert.equal((await request(partnerContext, '/partners/inventory/available', 'POST', { organizationId, roomTypeId: room.id, stayDate: '2026-10-10', available: 1, expectedVersion: 1 })).status, 403);
  await page.locator(`#grant-${grantId}`).getByRole('button', { name: 'Chuẩn bị thu hồi' }).click();
  await page.locator(`#grant-${grantId}`).getByRole('button', { name: 'Lưu phạm vi và trạng thái' }).click();
  await expect(page.locator(`#grant-${grantId}`)).toContainText('Đã thu hồi');
  assert.equal((await request(partnerContext, '/partners/properties')).body.items.length, 0);
  assert.equal((await request(partnerContext, `/partners/inventory?organizationId=${organizationId}&propertyId=${property.id}&from=2026-10-10&toExclusive=2026-10-12`)).status, 403);
  await partnerPage.reload();
  await expect(partnerPage.locator('.partner-property-list')).not.toContainText('QA Granted Property');
  console.log('PARTNER_LOGIN / IDOR / CAPABILITIES / REVOKE=PASS');
  const publicContext = await browser.newContext({ reducedMotion: 'reduce' }); const publicPage = await publicContext.newPage();
  for (const enabled of [false, true]) {
    await privateFlags(enabled);
    const site = (await request(publicContext, '/public/site')).body; assert.deepEqual(site.features, { partnerPortal: enabled, publicAvailability: enabled });
    assert(!('partnerPortal.enabled' in site.settings)); assert(!('sheetsSync.enabled' in site.settings));
    const nav = (await request(publicContext, '/public/navigation/primary')).body;
    assert.equal(nav.some(item => item.href === '/lich-phong'), enabled);
    for (const width of [1440, 1024, 390]) {
      await publicPage.setViewportSize({ width, height: 1000 }); await publicPage.goto(origin, { waitUntil: 'networkidle' });
      assert.equal(await publicPage.locator('.header-partner').count(), enabled ? 1 : 0);
      assert.equal(await publicPage.locator('.drawer-partner').count(), enabled ? 1 : 0);
      assert(await publicPage.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), 'Header no overflow');
      if (width >= 1024 && enabled) {
        await publicPage.locator('.header-partner summary').click();
        await expect(publicPage.locator('.header-partner__links').getByRole('link', { name: 'Đăng nhập đối tác' })).toBeVisible();
        await expect(publicPage.locator('.header-partner__links').getByRole('link', { name: 'Đăng ký đối tác' })).toBeVisible();
        await publicPage.screenshot({ path: `.next/qa-manual-grant/header-${width}.png` });
      }
      if (width === 390) {
        await publicPage.getByRole('button', { name: 'Mở menu', exact: true }).click();
        if (enabled) for (const name of ['Đăng nhập đối tác', 'Đăng ký đối tác']) {
          const link = publicPage.locator('.drawer-partner').getByRole('link', { name }); await expect(link).toBeVisible(); assert((await link.boundingBox()).height >= 44);
        }
        if (enabled) await publicPage.screenshot({ path: '.next/qa-manual-grant/drawer-390.png' });
        await publicPage.locator('.drawer__panel').getByRole('button', { name: 'Đóng menu', exact: true }).click();
      }
      console.log('HEADER_FLAG', enabled, width, 'PASS');
    }
  }
  for (const mode of ['login','register','invalid']) {
    await publicPage.goto(`${origin}/doi-tac?mode=${mode}`);
    await expect(publicPage.locator('.partner-tabs .is-active')).toHaveText(mode === 'register' ? 'Đăng ký' : 'Đăng nhập');
    await expect(publicPage.locator('input[name="organizationName"]')).toHaveCount(mode === 'register' ? 1 : 0);
  }
  console.log('DEEP_LINKS / MENU_CAPABILITIES / HEADER_DESKTOP_MOBILE=PASS');
  assert.deepEqual(errors, []);
  console.log('TARGETED_REAL_API_BROWSER=PASS; PRODUCTION_WRITES=0');
} finally {
  await browser?.close();
  if (fixtureStarted) {
    await db.auditLog.deleteMany({ where: { actorId: { in: users } } });
    await db.partnerOrganization.deleteMany({ where: { createdById: { in: users } } });
    await db.contentNode.deleteMany({ where: { id: { in: contents } } });
    await db.user.deleteMany({ where: { id: { in: users } } });
    await db.setting.deleteMany({ where: { key: { in: [...flagKeys, 'brand.identity', 'site.header'] } } });
    assert.equal(await db.user.count(), 0); assert.equal(await db.property.count(), 0); assert.equal(await db.partnerOrganization.count(), 0);
    console.log('QA_FIXTURE_CLEANUP=PASS; FLAGS_OFF=YES');
  }
  await db.$disconnect();
}
