import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { chromium } from '@playwright/test';

const origin = process.env.PARTNER_QA_BASE_URL ?? 'http://127.0.0.1:33000';
const originUrl = new URL(origin);
if (originUrl.protocol !== 'http:' || originUrl.hostname !== '127.0.0.1' || originUrl.port !== '33000') {
  throw new Error('Refusing browser QA outside the dedicated isolated loopback proxy at 127.0.0.1:33000.');
}
const email = process.env.PARTNER_QA_EMAIL;
const password = process.env.DVB_QA_PARTNER_PASSWORD;
const propertySlug = process.env.PARTNER_QA_PROPERTY_SLUG;
if (!email || !password || !propertySlug) throw new Error('Requires disposable partner QA credentials and property slug.');
const businessToday = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Ho_Chi_Minh', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
const tomorrow = new Date(`${businessToday}T00:00:00.000Z`);
tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);
const nextDay = tomorrow.toISOString().slice(0, 10);

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage();
const consoleErrors = [];
const pageErrors = [];
const serverErrors = [];
const failedResponses = [];
page.on('console', (message) => { if (message.type() === 'error') consoleErrors.push(message.text()); });
page.on('pageerror', (error) => pageErrors.push(error.message));
page.on('response', (response) => {
  if (response.status() >= 500) serverErrors.push(`${response.status()} ${response.url()}`);
  if (response.status() >= 400) failedResponses.push(`${response.status()} ${response.url()}`);
});
try {
  await page.goto(`${origin}/phong-nghi`, { waitUntil: 'networkidle' });
  const availabilityLink = page.getByRole('link', { name: 'Tra cứu tồn phòng theo từng đêm' });
  await availabilityLink.waitFor();
  await availabilityLink.click();
  await page.waitForURL('**/lich-phong');
  await page.getByRole('heading', { name: 'Tìm nơi nghỉ phù hợp' }).waitFor();
  await page.getByLabel('Khu vực').fill('Isolated UI QA');
  const publicAvailability = page.waitForResponse((response) => response.url().includes('/api/v1/public/availability?'));
  await page.getByRole('button', { name: 'Kiểm tra tình trạng phòng' }).click();
  const publicAvailabilityResponse = await publicAvailability;
  assert.equal(publicAvailabilityResponse.status(), 200, 'public date-range search uses the public API');
  const publicAvailabilityPayload = await publicAvailabilityResponse.json();
  assert.ok(publicAvailabilityPayload.items.some((item) => item.name.startsWith('QA partner property ')), 'public results include eligible published fixture');
  await page.getByRole('heading', { name: 'Kết quả tra cứu' }).waitFor();
  assert.ok(await page.getByText('QA partner property', { exact: false }).count() > 0, 'public search result is rendered');
  const publicCardTexts = await page.locator('.availability-result').allInnerTexts();
  assert.ok(publicCardTexts.length > 0);
  assert.equal(publicCardTexts.some((text) => /(?:còn|capacity|quantity|tồn nội bộ)\s*\d/i.test(text)), false, 'public UI does not expose internal room counts');

  await page.goto(`${origin}/doi-tac`, { waitUntil: 'networkidle' });
  await page.getByRole('heading', { name: 'Cổng dành cho đối tác' }).waitFor();
  await page.getByLabel('Email').fill(email);
  await page.getByLabel('Mật khẩu').fill(password);
  await page.locator('form').getByRole('button', { name: 'Đăng nhập' }).click();
  await page.getByRole('heading', { name: 'Xin chào, Isolated partner UI tester' }).waitFor();
  await page.getByRole('link', { name: 'Tạo bản nháp' }).click();
  await page.waitForURL('**/doi-tac/chinh-sua?mode=property-create');
  await page.getByRole('heading', { name: 'Tạo hồ sơ cơ sở nháp' }).waitFor();
  assert.ok(await page.getByRole('button', { name: 'Tạo bản nháp' }).count() === 1, 'new property form has its own route');
  await page.getByRole('link', { name: '← Quay lại cổng đối tác' }).click();
  await page.getByRole('button', { name: /QA partner property/ }).click();
  await page.getByRole('link', { name: 'Thêm hạng phòng' }).click();
  await page.waitForURL('**/doi-tac/chinh-sua?mode=room-create&property=*');
  await page.getByRole('heading', { name: 'Khai báo hạng phòng' }).waitFor();
  assert.equal(await page.getByLabel('Tên hạng phòng').count(), 1, 'new room form has its own route');
  await page.getByRole('link', { name: '← Quay lại cổng đối tác' }).click();
  await page.getByRole('heading', { name: 'Lịch quỹ phòng' }).waitFor();
  await page.getByRole('button', { name: /QA partner property/ }).click();
  await page.getByRole('link', { name: 'Đề xuất sửa hồ sơ' }).click();
  await page.waitForURL('**/doi-tac/chinh-sua?mode=profile&property=*');
  await page.getByRole('heading', { name: 'Đề xuất chỉnh sửa hồ sơ' }).waitFor();
  assert.equal(await page.locator('.partner-rich-editor .rte').count(), 1, 'partner profile uses the shared rich text editor');
  await page.getByRole('link', { name: '← Quay lại cổng đối tác' }).click();
  await page.getByRole('heading', { name: 'Lịch quỹ phòng' }).waitFor();

  await page.getByRole('heading', { name: 'Lịch quỹ phòng' }).waitFor();
  const calendarHeaders = page.locator('.partner-calendar thead th');
  const monthInventory = page.waitForResponse((response) => {
    if (!response.url().includes('/api/v1/partners/inventory?') || response.status() !== 200) return false;
    const query = new URL(response.url()).searchParams;
    const span = (new Date(query.get('toExclusive')).getTime() - new Date(query.get('from')).getTime()) / 86_400_000;
    return span >= 28;
  });
  await page.locator('.partner-calendar-toolbar select').selectOption('month');
  const monthRows = await (await monthInventory).json();
  assert.ok(monthRows.items.length >= 28, 'month view fetches the full month rather than only the first week');
  await page.waitForFunction(() => document.querySelectorAll('.partner-calendar thead th').length >= 29);
  await page.locator('.partner-calendar-toolbar select').selectOption('week');
  await page.getByRole('button', { name: 'Hôm nay' }).click();
  await page.locator('.partner-bulk-edit summary').click();
  const bulkForm = page.locator('.partner-bulk-edit form');
  await bulkForm.locator('[name="roomTypeId"]').selectOption({ label: 'Phòng kiểm thử · QA-ROOM' });
  await bulkForm.locator('[name="from"]').fill(businessToday);
  await bulkForm.locator('[name="toExclusive"]').fill(nextDay);
  await bulkForm.locator('[name="externalSoldCount"]').fill('1');
  await bulkForm.getByRole('button', { name: 'Xem trước lô' }).click();
  await page.getByText(/Xem trước · 1 đêm · cập nhật nguyên lô/).waitFor();
  await page.getByRole('button', { name: 'Xác nhận và lưu lô' }).click();
  await page.getByText('Đã lưu lô trên hệ thống; các bảng đồng bộ đang chờ xử lý.').waitFor();
  await page.getByRole('button', { name: 'Đã kiểm tra, không đổi' }).click();
  await page.getByText('Đã xác nhận khoảng ngày này, không thay đổi số phòng.').waitFor();
  assert.ok(await calendarHeaders.count() >= 8, 'calendar navigation supports both seven-day and month views');

  const original = (await (await page.request.get(`${origin}/api/v1/public/stays/${propertySlug}`)).json()).name;
  await page.getByRole('link', { name: 'Đề xuất sửa hồ sơ' }).click();
  await page.getByRole('heading', { name: 'Đề xuất chỉnh sửa hồ sơ' }).waitFor();
  const titleInput = page.locator('input[name="title"]');
  await titleInput.fill('QA revised title — pending only');
  await page.getByRole('button', { name: 'Gửi quản trị viên duyệt' }).click();
  await page.getByText(/Đã gửi đề xuất để quản trị viên xem xét/).waitFor();
  await page.getByRole('link', { name: '← Quay lại cổng đối tác' }).click();
  await page.getByText('Đề xuất #1', { exact: true }).waitFor();

  await page.getByRole('link', { name: 'Sửa hạng phòng' }).click();
  await page.getByRole('heading', { name: 'Đề xuất chỉnh sửa hạng phòng' }).waitFor();
  await page.getByLabel('Tên hạng phòng').fill('Phòng kiểm thử cập nhật');
  await page.getByRole('button', { name: 'Gửi đề xuất hạng phòng' }).click();
  await page.getByText(/Đã gửi đề xuất để quản trị viên xem xét/).waitFor();
  await page.getByRole('link', { name: '← Quay lại cổng đối tác' }).click();
  await page.getByText('Đề xuất #2', { exact: true }).waitFor();

  await page.getByRole('link', { name: 'Sửa giá · Giá kiểm thử' }).click();
  await page.getByRole('heading', { name: 'Đề xuất chỉnh sửa giá' }).waitFor();
  await page.getByLabel('Giá ngày thường (VND)').fill('160000');
  await page.getByRole('button', { name: 'Gửi đề xuất giá' }).click();
  await page.getByText(/Đã gửi đề xuất để quản trị viên xem xét/).waitFor();
  await page.getByRole('link', { name: '← Quay lại cổng đối tác' }).click();
  await page.getByText('Đề xuất #3', { exact: true }).waitFor();

  const stillPublic = await page.request.get(`${origin}/api/v1/public/stays/${propertySlug}`);
  assert.equal(stillPublic.status(), 200);
  assert.equal((await stillPublic.json()).name, original, 'pending partner revisions do not mutate public projection');

  await page.getByRole('button', { name: 'Đăng xuất' }).click();
  await page.getByRole('heading', { name: 'Cổng dành cho đối tác' }).waitFor();
  const applicantEmail = `partner-applicant-${randomUUID()}@example.test`;
  const applicantPassword = randomUUID() + randomUUID();
  const fillRegistration = async () => {
    const form = page.locator('.partner-auth-card form');
    await form.locator('[name="fullName"]').fill('QA applicant');
    await form.locator('[name="organizationName"]').fill('QA applicant organization');
    await form.locator('[name="phone"]').fill('+84912345678');
    await form.locator('[name="address"]').fill('Disposable QA only');
    await form.locator('[name="email"]').fill(applicantEmail);
    await form.locator('[name="password"]').fill(applicantPassword);
  };
  await page.getByRole('button', { name: 'Đăng ký', exact: true }).click();
  await fillRegistration();
  const firstRegistration = page.waitForResponse((response) => response.url().endsWith('/api/v1/partners/registrations'));
  await page.getByRole('button', { name: 'Gửi hồ sơ đăng ký' }).click();
  assert.equal((await firstRegistration).status(), 202);
  await page.getByText(/Đã nhận hồ sơ\. Tài khoản và quyền quản lý cơ sở sẽ chờ/).waitFor();

  await page.getByRole('button', { name: 'Đăng ký', exact: true }).click();
  await fillRegistration();
  const duplicateRegistration = page.waitForResponse((response) => response.url().endsWith('/api/v1/partners/registrations'));
  await page.getByRole('button', { name: 'Gửi hồ sơ đăng ký' }).click();
  assert.equal((await duplicateRegistration).status(), 202, 'duplicate registration does not reveal account existence');

  const authForm = page.locator('.partner-auth-card form');
  await authForm.locator('[name="email"]').fill(applicantEmail);
  await authForm.locator('[name="password"]').fill(randomUUID() + randomUUID());
  const rejectedLogin = page.waitForResponse((response) => response.url().endsWith('/api/v1/auth/login'));
  await authForm.getByRole('button', { name: 'Đăng nhập', exact: true }).click();
  assert.equal((await rejectedLogin).status(), 401, 'wrong password is rejected');
  await authForm.locator('[name="password"]').fill(applicantPassword);
  await authForm.getByRole('button', { name: 'Đăng nhập', exact: true }).click();
  await page.getByRole('heading', { name: 'Chưa có tổ chức được duyệt' }).waitFor();
  await page.getByText('Đang chờ quản trị viên xem xét').waitFor();

  assert.equal(pageErrors.length, 0, `unexpected page errors: ${pageErrors.join(' | ')}`);
  assert.equal(serverErrors.length, 0, `unexpected server errors: ${serverErrors.join(' | ')}`);
  assert.equal(consoleErrors.filter((text) => /hydration|#418|chunk/i.test(text)).length, 0, `hydration/chunk console errors: ${consoleErrors.join(' | ')}`);
  assert.equal(failedResponses.filter((value) => !/^401 http:\/\/127\.0\.0\.1:33000\/api\/v1\/auth\/(?:me|login)$/.test(value)).length, 0, `unexpected HTTP errors: ${failedResponses.join(' | ')}`);
  const anonymousAuth401 = failedResponses.filter((value) => value === '401 http://127.0.0.1:33000/api/v1/auth/me').length;
  const rejectedPassword401 = failedResponses.filter((value) => value === '401 http://127.0.0.1:33000/api/v1/auth/login').length;
  assert.equal(anonymousAuth401, 1, `expected one anonymous-session probe, got ${anonymousAuth401}`);
  assert.equal(rejectedPassword401, 1, `expected one wrong-password rejection, got ${rejectedPassword401}`);
  assert.equal(consoleErrors.filter((text) => !/401 \(Unauthorized\)/i.test(text)).length, 0, `unexpected console errors: ${consoleErrors.join(' | ')}`);
  console.log('PARTNER_PORTAL_BROWSER_E2E=PASS');
  console.log('PUBLIC_AVAILABILITY_BROWSER_E2E=PASS');
  console.log('PUBLIC_AVAILABILITY_DISCOVERABLE_FROM_STAY_LIST=PASS');
  console.log('PARTNER_UI_PROFILE_ROOM_RATE_SUBMISSIONS=3');
  console.log('PARTNER_UI_CALENDAR_WEEK_MONTH_BULK_CONFIRM=PASS');
  console.log('PARTNER_UI_REGISTRATION_DUPLICATE_PENDING_WRONG_PASSWORD=PASS');
  console.log('PENDING_PUBLIC_PROJECTION_UNCHANGED=YES');
  console.log(`BROWSER_CONSOLE_ERRORS=${consoleErrors.length}`);
  console.log(`BROWSER_HTTP_ERRORS=${failedResponses.length}`);
  console.log(`BROWSER_EXPECTED_ANONYMOUS_AUTH_PROBE_401=${anonymousAuth401}`);
  console.log(`BROWSER_EXPECTED_WRONG_PASSWORD_401=${rejectedPassword401}`);
  for (const message of consoleErrors) console.log(`BROWSER_CONSOLE_ERROR=${message}`);
  for (const response of failedResponses) console.log(`BROWSER_HTTP_ERROR=${response}`);
} finally {
  await browser.close();
}
