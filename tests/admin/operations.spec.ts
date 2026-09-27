import { execFileSync } from 'node:child_process';
import { expect, test, type BrowserContext, type Page } from '@playwright/test';
import { createUniqueTestPng, signInAsOwner } from './helpers';

type ApiResult<T> = { status: number; body: T };
type TestProperty = { id: string; contentId: string; contentVersion: number; version: number; slug: string; roomTypes: Array<{ id: string }> };
type TestBooking = { id: string; publicCode: string; bookingStatus: string; version: number; totalVnd: string; customer: { id: string; fullName: string; phone: string } };
type Coupon = { id: string; code: string; name: string; discountType: string; percentBps: number | null; amountVnd: string | null; version: number; active: boolean };

async function opsApi<T>(page: Page, path: string, method = 'GET', body?: unknown, extraHeaders: Record<string, string> = {}): Promise<ApiResult<T>> {
  return page.evaluate(async ({ path, method, body, extraHeaders }) => {
    const headers: Record<string, string> = { ...extraHeaders };
    if (body !== undefined) headers['content-type'] = 'application/json';
    if (!['GET', 'HEAD', 'OPTIONS'].includes(method.toUpperCase())) {
      const csrfCookie = document.cookie.split('; ').find((part) => part.startsWith('dvb_csrf='));
      if (csrfCookie) headers['x-csrf-token'] = decodeURIComponent(csrfCookie.slice('dvb_csrf='.length));
    }
    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), 20_000);
    let response: Response;
    try {
      response = await fetch(`/api/v1${path}`, {
        method, headers, credentials: 'include', body: body === undefined ? undefined : JSON.stringify(body), signal: controller.signal,
      });
    } catch (error) {
      const detail = error instanceof Error ? error.message : String(error);
      throw new Error(`${method} /api/v1${path} did not complete within 20 seconds: ${detail}`);
    } finally {
      window.clearTimeout(timeout);
    }
    const text = await response.text();
    let parsed: unknown = null;
    try { parsed = text ? JSON.parse(text) : null; } catch { parsed = text; }
    return { status: response.status, body: parsed };
  }, { path, method, body, extraHeaders }) as Promise<ApiResult<T>>;
}

const todayKey = () => new Intl.DateTimeFormat('en-CA', {
  timeZone: 'Asia/Ho_Chi_Minh', year: 'numeric', month: '2-digit', day: '2-digit',
}).format(new Date());
const addDays = (day: string, count: number) => {
  const date = new Date(`${day}T00:00:00.000Z`);
  date.setUTCDate(date.getUTCDate() + count);
  return date.toISOString().slice(0, 10);
};
const validUuid = (value: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
const uuidArray = (items: string[]) => items.length ? `ARRAY[${items.map((id) => `'${id}'::uuid`).join(',')}]::uuid[]` : 'ARRAY[]::uuid[]';

function cleanupTestRows(input: {
  propertyId: string; contentId: string; roomTypeId: string; mediaId: string; couponId: string | null; couponCode: string;
  bookings: string[]; quotes: string[]; customers: Array<{ id: string; phone: string }>;
  idempotencyKeys: string[];
}) {
  for (const id of [input.propertyId, input.contentId, input.roomTypeId, input.mediaId, input.couponId ?? '', ...input.bookings, ...input.quotes, ...input.customers.map((item) => item.id)]) {
    if (id && !validUuid(id)) throw new Error('Refusing operations-test cleanup: invalid UUID marker.');
  }
  if (!/^ATGOPS\d+$/.test(input.couponCode) || input.customers.some((item) => !/^09\d{8}$/.test(item.phone)) || input.idempotencyKeys.some((key) => !/^atgops-\d+-[a-z0-9-]+$/i.test(key) && !validUuid(key))) {
    throw new Error('Refusing operations-test cleanup: marker does not match the test namespace.');
  }
  const phoneArray = input.customers.length ? `ARRAY[${input.customers.map((item) => `'${item.phone}'`).join(',')}]::text[]` : 'ARRAY[]::text[]';
  const keyArray = input.idempotencyKeys.length ? `ARRAY[${input.idempotencyKeys.map((key) => `'${key}'`).join(',')}]::text[]` : 'ARRAY[]::text[]';
  const sql = `
DO $cleanup$
DECLARE
  target_property uuid := '${input.propertyId}'::uuid;
  target_content uuid := '${input.contentId}'::uuid;
  target_room uuid := '${input.roomTypeId}'::uuid;
  target_coupon uuid := ${input.couponId ? `'${input.couponId}'::uuid` : 'NULL'};
  target_coupon_code text := '${input.couponCode}';
  target_booking_ids uuid[] := ${uuidArray(input.bookings)};
  target_quote_ids uuid[] := ${uuidArray(input.quotes)};
  target_customer_ids uuid[] := ${uuidArray(input.customers.map((item) => item.id))};
  target_phones text[] := ${phoneArray};
  removed integer;
BEGIN
  IF EXISTS (
    SELECT 1 FROM public.bookings b
    WHERE b.customer_id = ANY(target_customer_ids) AND NOT (b.id = ANY(target_booking_ids))
  ) THEN RAISE EXCEPTION 'Refusing cleanup: synthetic customer has an unrelated booking'; END IF;
  IF EXISTS (
    SELECT 1 FROM public.bookings b JOIN public.booking_lines bl ON bl.booking_id = b.id
    JOIN public.room_types rt ON rt.id = bl.room_type_id
    WHERE b.id = ANY(target_booking_ids) AND rt.property_id <> target_property
  ) THEN RAISE EXCEPTION 'Refusing cleanup: test booking references another property'; END IF;
  IF EXISTS (
    SELECT 1 FROM public.inventory_reservations r JOIN public.booking_lines bl ON bl.id = r.booking_line_id
    WHERE bl.booking_id = ANY(target_booking_ids) AND r.status IN ('held', 'confirmed')
  ) THEN RAISE EXCEPTION 'Refusing cleanup: release test reservations through the booking API first'; END IF;
  IF (SELECT COUNT(*) FROM public.bookings WHERE id = ANY(target_booking_ids)) <> cardinality(target_booking_ids)
    AND cardinality(target_booking_ids) > 0 THEN RAISE EXCEPTION 'Refusing cleanup: one or more exact test bookings are missing'; END IF;
  IF (SELECT COUNT(*) FROM public.booking_quotes WHERE id = ANY(target_quote_ids)) <> cardinality(target_quote_ids)
    AND cardinality(target_quote_ids) > 0 THEN RAISE EXCEPTION 'Refusing cleanup: one or more exact test quotes are missing'; END IF;
  IF EXISTS (SELECT 1 FROM public.booking_quotes WHERE customer_id = ANY(target_customer_ids) AND NOT (id = ANY(target_quote_ids)))
    THEN RAISE EXCEPTION 'Refusing cleanup: synthetic customer has an unrelated quote'; END IF;

  DELETE FROM public.audit_logs WHERE entity_id = ANY(target_booking_ids)
    OR entity_id = ANY(target_customer_ids) OR entity_id IN (target_property, target_content, target_room, target_coupon)
    OR entity_id IN (SELECT id FROM public.coupons WHERE code = target_coupon_code AND name LIKE 'Coupon QA%');
  DELETE FROM public.bookings WHERE id = ANY(target_booking_ids);
  DELETE FROM public.booking_quotes WHERE id = ANY(target_quote_ids);
  DELETE FROM public.inquiries WHERE customer_id = ANY(target_customer_ids) AND source = 'admin_crm'
    AND message = 'Yêu cầu nội bộ tạo để ghi nhận chăm sóc khách hàng.';
  DELETE FROM public.customers c WHERE c.id = ANY(target_customer_ids) AND c.phone_normalized = ANY(target_phones)
    AND NOT EXISTS (SELECT 1 FROM public.bookings b WHERE b.customer_id = c.id)
    AND NOT EXISTS (SELECT 1 FROM public.booking_quotes q WHERE q.customer_id = c.id)
    AND NOT EXISTS (SELECT 1 FROM public.inquiries i WHERE i.customer_id = c.id)
    AND NOT EXISTS (SELECT 1 FROM public.customer_tags t WHERE t.customer_id = c.id)
    AND NOT EXISTS (SELECT 1 FROM public.reviews r WHERE r.customer_id = c.id);
  IF EXISTS (SELECT 1 FROM public.coupons c WHERE c.code = target_coupon_code AND c.name LIKE 'Coupon QA%'
      AND EXISTS (SELECT 1 FROM public.coupon_redemptions r WHERE r.coupon_id = c.id))
    THEN RAISE EXCEPTION 'Refusing cleanup: test coupon unexpectedly has redemptions'; END IF;
  DELETE FROM public.coupons c WHERE c.code = target_coupon_code AND c.name LIKE 'Coupon QA%'
    AND NOT EXISTS (SELECT 1 FROM public.coupon_redemptions r WHERE r.coupon_id = c.id);
  DELETE FROM public.idempotency_keys WHERE key = ANY(target_key_array);
END
$cleanup$;
`;
  const withKeys = sql.replace('target_phones text[] :=', `target_key_array text[] := ${keyArray};\n  target_phones text[] :=`);
  execFileSync('docker', [
    'compose', '--env-file', '.env.docker', '--env-file', '.env.ports', 'exec', '-T', 'postgres', 'sh', '-lc',
    'psql -X -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "$POSTGRES_DB"',
  ], { cwd: process.cwd(), input: withKeys, encoding: 'utf8', stdio: ['pipe', 'ignore', 'pipe'] });
}

function setHoldExpired(bookingId: string) {
  if (!validUuid(bookingId)) throw new Error('Refusing to expire a booking without a validated UUID.');
  const sql = `
UPDATE public.bookings SET expires_at = now() - interval '1 minute'
WHERE id = '${bookingId}'::uuid AND is_demo = false AND booking_status = 'pending_confirmation'
  AND EXISTS (SELECT 1 FROM public.booking_lines bl JOIN public.inventory_reservations r ON r.booking_line_id = bl.id WHERE bl.booking_id = public.bookings.id AND r.status = 'held');
UPDATE public.inventory_reservations r SET expires_at = now() - interval '1 minute'
FROM public.booking_lines bl WHERE r.booking_line_id = bl.id AND bl.booking_id = '${bookingId}'::uuid AND r.status = 'held';
`;
  execFileSync('docker', [
    'compose', '--env-file', '.env.docker', '--env-file', '.env.ports', 'exec', '-T', 'postgres', 'sh', '-lc',
    'psql -X -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "$POSTGRES_DB"',
  ], { cwd: process.cwd(), input: sql, encoding: 'utf8', stdio: ['pipe', 'ignore', 'pipe'] });
}

test('booking, inventory concurrency, CRM, coupons, offline finance and reports reconcile against PostgreSQL', async ({ page }) => {
  test.setTimeout(240_000);
  await signInAsOwner(page);
  const stamp = Date.now();
  const testName = `ATG Ops ${stamp}`;
  const phone = `09${String(stamp).slice(-8)}`;
  const racePhoneA = `09${String(stamp + 1).slice(-8)}`;
  const racePhoneB = `09${String(stamp + 2).slice(-8)}`;
  const publicPhone = `09${String(stamp + 3).slice(-8)}`;
  const propertyCode = `ATG-OPS-${stamp}`;
  const propertySlug = `atg-operations-${stamp}`;
  const couponCode = `ATGOPS${stamp}`;
  const mediaAlt = `ATG ảnh vận hành ${stamp}`;
  const idempotencyKeys = [
    `atgops-${stamp}-race-a`, `atgops-${stamp}-race-b`, `atgops-${stamp}-payment`,
    `atgops-${stamp}-refund`,
  ];
  const quoteIds: string[] = [];
  const bookingIds: string[] = [];
  const customerIds: Array<{ id: string; phone: string }> = [];
  let mediaId = '';
  let property: TestProperty | null = null;
  let coupon: Coupon | null = null;
  let paymentId = '';
  let refundId = '';
  let guestContext: BrowserContext | null = null;
  let otherGuestContext: BrowserContext | null = null;
  const customerFromBooking = (booking: TestBooking, contactPhone: string) => {
    if (!customerIds.some((item) => item.id === booking.customer.id)) customerIds.push({ id: booking.customer.id, phone: contactPhone });
  };

  try {
    await page.goto('/admin/thu-vien-anh');
    await page.getByLabel('Alt mặc định cho ảnh tải lên').fill(mediaAlt);
    const uploadResponsePromise = page.waitForResponse((response) => response.url().endsWith('/api/v1/media/upload') && response.request().method() === 'POST');
    await page.locator('.media-library__upload input[type="file"]').setInputFiles({ name: `atg-ops-${stamp}.png`, mimeType: 'image/png', buffer: createUniqueTestPng(stamp) });
    const uploadResponse = await uploadResponsePromise;
    expect([200, 201]).toContain(uploadResponse.status());
    const uploaded = await opsApi<{ id: string; mimeType: string }> (page, `/media?search=${encodeURIComponent(mediaAlt)}`);
    expect(uploaded.status).toBe(200);
    const media = (uploaded.body as unknown as { items: Array<{ id: string; mimeType: string }> }).items[0];
    expect(media?.mimeType).toBe('image/webp');
    mediaId = media.id;

    const createdProperty = await opsApi<TestProperty>(page, '/properties', 'POST', {
      title: testName, code: propertyCode, kind: 'Homestay', area: 'Cúc Phương, Ninh Bình (chỉ kiểm thử local)',
      address: 'Bản ghi kiểm thử vận hành, không phải cơ sở bán thật.', slug: propertySlug,
      description: `Dữ liệu kiểm thử local ${stamp}; đủ nội dung để kiểm chứng phát hành có điều kiện và luồng vận hành thật.`,
      metaTitle: testName, metaDescription: `Nội dung QA local ${stamp}, không dùng thông tin kinh doanh thật.`,
      coverMediaId: mediaId, roomCode: `OPS-${stamp}`, roomName: 'Phòng kiểm thử', maxAdults: 2,
      unitCount: 1, rateVnd: 10_000,
    });
    expect(createdProperty.status).toBe(201);
    property = createdProperty.body;
    const published = await opsApi<{ version: number; publicationStatus: string }>(page, `/content/${property.contentId}/status`, 'PATCH', { status: 'published', expectedVersion: property.contentVersion });
    expect(published.status).toBe(200);
    expect(published.body.publicationStatus).toBe('published');

    await page.goto('/admin/ton-phong');
    await page.getByLabel('Hạng phòng').selectOption(property.roomTypes[0].id);
    await page.getByLabel('Sức chứa mỗi đêm').fill('1');
    await page.getByLabel('Khoá mỗi đêm').fill('0');
    await page.getByRole('button', { name: 'Cập nhật khoảng ngày' }).click();
    await expect(page.locator('.admin-operations__notice')).toContainText('Đã cập nhật quỹ phòng');

    const checkIn = addDays(todayKey(), 5);
    const checkOut = addDays(checkIn, 2);

    await page.goto('/admin/khuyen-mai');
    await page.getByLabel('Mã', { exact: true }).fill(couponCode);
    await page.getByLabel('Tên hiển thị').fill(`Coupon QA ${stamp}`);
    await page.getByRole('button', { name: 'Tạo mã', exact: true }).click();
    await expect(page.locator('.admin-operations__notice')).toContainText('Đã tạo mã');
    const couponList = await opsApi<{ items: Coupon[] }>(page, `/admin/coupons?search=${couponCode}`);
    coupon = couponList.body.items.find((item) => item.code === couponCode) ?? null;
    expect(coupon).toBeTruthy();
    expect(coupon!.active).toBe(true);
    expect(coupon!.percentBps).toBe(1000);
    const validCouponQuote = await opsApi<{ id: string; subtotalVnd: string; discountVnd: string; totalVnd: string }>(page, '/quotes', 'POST', {
      roomTypeId: property.roomTypes[0].id, checkIn, checkOut, quantity: 1, adults: 2, children: 0, couponCode,
    });
    expect(validCouponQuote.status, JSON.stringify(validCouponQuote.body)).toBe(201);
    quoteIds.push(validCouponQuote.body.id);
    expect(validCouponQuote.body).toMatchObject({ subtotalVnd: '20000', discountVnd: '2000', totalVnd: '18000' });
    const invalidCouponQuote = await opsApi(page, '/quotes', 'POST', {
      roomTypeId: property.roomTypes[0].id, checkIn, checkOut, quantity: 1, adults: 2, children: 0, couponCode: `${couponCode}INVALID`,
    });
    expect(invalidCouponQuote.status).toBe(400);
    const couponRow = page.locator('tr').filter({ hasText: couponCode });
    await couponRow.getByRole('button', { name: 'Sửa' }).click();
    await page.getByLabel('Tên hiển thị').fill(`Coupon QA đã sửa ${stamp}`);
    const saveCouponResponsePromise = page.waitForResponse((response) => response.url().endsWith(`/api/v1/admin/coupons/${coupon!.id}`) && response.request().method() === 'PATCH');
    await page.getByRole('button', { name: 'Lưu thay đổi' }).click();
    const saveCouponResponse = await saveCouponResponsePromise;
    expect(saveCouponResponse.status()).toBe(200);
    const savedCoupon = (await opsApi<{ items: Coupon[] }>(page, `/admin/coupons?search=${couponCode}`)).body.items[0];
    expect(savedCoupon.name).toBe(`Coupon QA đã sửa ${stamp}`);
    const staleCoupon = await opsApi(page, `/admin/coupons/${savedCoupon.id}`, 'PATCH', { code: couponCode, name: 'Không được ghi đè', discountType: 'percent', percentBps: 1000, expectedVersion: coupon!.version });
    expect(staleCoupon.status).toBe(409);
    const expireCoupon = await opsApi(page, `/admin/coupons/${savedCoupon.id}`, 'PATCH', {
      code: couponCode, name: savedCoupon.name, discountType: 'percent', percentBps: 1000,
      endsAt: new Date(Date.now() - 60_000).toISOString(), expectedVersion: savedCoupon.version,
    });
    expect(expireCoupon.status).toBe(200);
    const expiredCouponQuote = await opsApi(page, '/quotes', 'POST', {
      roomTypeId: property.roomTypes[0].id, checkIn, checkOut, quantity: 1, adults: 2, children: 0, couponCode,
    });
    expect(expiredCouponQuote.status).toBe(400);
    await page.reload();
    const disableCouponResponsePromise = page.waitForResponse((response) => response.url().endsWith(`/api/v1/admin/coupons/${coupon!.id}`) && response.request().method() === 'PATCH');
    await page.locator('tr').filter({ hasText: couponCode }).getByRole('button', { name: 'Tắt mã' }).click();
    expect((await disableCouponResponsePromise).status()).toBe(200);
    expect((await opsApi<{ items: Coupon[] }>(page, `/admin/coupons?search=${couponCode}`)).body.items[0].active).toBe(false);

    // Exercise the actual anonymous website flow against the same published test property.
    // A separate browser context proves that quote IDs alone do not grant access.
    const browser = page.context().browser();
    if (!browser) throw new Error('Playwright browser context is unavailable for the public checkout test.');
    guestContext = await browser.newContext();
    const guestPage = await guestContext.newPage();
    await guestPage.goto(`/dat-phong?stay=${property.slug}&room=${property.roomTypes[0].id}&checkIn=${checkIn}&checkOut=${checkOut}&adults=2&children=0&rooms=1`, { waitUntil: 'domcontentloaded', timeout: 20_000 });
    await guestPage.waitForLoadState('load', { timeout: 20_000 });
    const publicName = guestPage.getByLabel('Họ và tên');
    const publicPhoneField = guestPage.getByLabel('Số điện thoại');
    const publicEmail = guestPage.getByLabel('Email');
    await expect(publicName).toBeVisible({ timeout: 10_000 });
    await expect(publicPhoneField).toBeVisible({ timeout: 10_000 });
    await expect(publicEmail).toBeVisible({ timeout: 10_000 });
    await publicName.focus({ timeout: 5_000 });
    await publicName.press('Tab', { timeout: 5_000 });
    await expect(publicName).toHaveAttribute('aria-invalid', 'true', { timeout: 10_000 });
    await publicName.fill('Khách kiểm thử public', { timeout: 5_000 });
    await expect(publicName).toHaveAttribute('aria-invalid', 'false');
    await publicPhoneField.fill(publicPhone, { timeout: 5_000 });
    await publicEmail.fill(`atg-public-${stamp}@example.test`, { timeout: 5_000 });
    const publicQuoteResponsePromise = guestPage.waitForResponse((response) => response.url().endsWith('/api/v1/quotes') && response.request().method() === 'POST', { timeout: 20_000 });
    await guestPage.getByRole('button', { name: 'Xem giá & xác nhận' }).first().click({ timeout: 10_000 });
    const publicQuoteResponse = await publicQuoteResponsePromise;
    expect(publicQuoteResponse.status()).toBe(201);
    const publicQuote = await publicQuoteResponse.json() as { id: string; totalVnd: string; snapshot: { nights: Array<{ amountVnd: string }> } };
    quoteIds.push(publicQuote.id);
    expect(publicQuote.totalVnd).toBe('20000');
    await expect(guestPage.getByRole('heading', { name: 'Kiểm tra thông tin đặt phòng' })).toBeVisible();
    await expect(guestPage.getByText('Giá được tính từ bảng giá đang hoạt động.')).toBeVisible();

    const ownQuote = await guestPage.evaluate(async (id) => {
      const response = await fetch(`/api/v1/quotes/${id}`, { credentials: 'include' });
      return { status: response.status, body: await response.json() };
    }, publicQuote.id);
    expect(ownQuote.status).toBe(200);

    otherGuestContext = await browser.newContext();
    const otherGuestPage = await otherGuestContext.newPage();
    await otherGuestPage.goto('/', { waitUntil: 'domcontentloaded', timeout: 20_000 });
    await otherGuestPage.evaluate(() => fetch('/api/v1/auth/csrf', { credentials: 'include' }));
    const inaccessibleQuote = await otherGuestPage.evaluate(async (id) => {
      const response = await fetch(`/api/v1/quotes/${id}`, { credentials: 'include' });
      return response.status;
    }, publicQuote.id);
    expect(inaccessibleQuote).toBe(404);
    const inaccessibleHold = await otherGuestPage.evaluate(async ({ id, key }) => {
      const csrf = document.cookie.split('; ').find((part) => part.startsWith('dvb_csrf='))?.slice('dvb_csrf='.length) ?? '';
      const response = await fetch(`/api/v1/quotes/${id}/hold`, {
        method: 'POST', credentials: 'include', headers: { 'content-type': 'application/json', 'x-csrf-token': decodeURIComponent(csrf), 'idempotency-key': key },
        body: JSON.stringify({ fullName: 'Không được phép', phone: '0912345678' }),
      });
      return response.status;
    }, { id: publicQuote.id, key: `atgops-${stamp}-other-guest` });
    expect(inaccessibleHold).toBe(404);

    await guestPage.getByLabel('Tôi đã kiểm tra các thông tin trên.').check();
    const publicHoldResponsePromise = guestPage.waitForResponse((response) => response.url().endsWith(`/api/v1/quotes/${publicQuote.id}/hold`) && response.request().method() === 'POST', { timeout: 20_000 });
    const publicHoldRequestPromise = guestPage.waitForRequest((request) => request.url().endsWith(`/api/v1/quotes/${publicQuote.id}/hold`) && request.method() === 'POST', { timeout: 20_000 });
    await guestPage.getByRole('button', { name: 'Giữ phòng & gửi yêu cầu' }).click({ timeout: 10_000 });
    const publicHoldRequest = await publicHoldRequestPromise;
    const publicIdempotencyKey = publicHoldRequest.headers()['idempotency-key'];
    if (!publicIdempotencyKey || !validUuid(publicIdempotencyKey)) throw new Error('Public checkout did not send a valid random idempotency key.');
    idempotencyKeys.push(publicIdempotencyKey);
    const publicHoldResponse = await publicHoldResponsePromise;
    expect(publicHoldResponse.status()).toBe(201);
    const publicReceipt = await publicHoldResponse.json() as Record<string, unknown> & { id: string; publicCode: string; bookingStatus: string };
    expect(publicReceipt).toMatchObject({ bookingStatus: 'pending_confirmation' });
    expect(Object.keys(publicReceipt).sort()).toEqual(['adults', 'bookingStatus', 'checkIn', 'checkOut', 'children', 'discountVnd', 'dueNowVnd', 'expiresAt', 'id', 'publicCode', 'subtotalVnd', 'totalVnd'].sort());
    expect(publicReceipt).not.toHaveProperty('customer');
    expect(publicReceipt).not.toHaveProperty('notes');
    expect(publicReceipt).not.toHaveProperty('payments');
    bookingIds.push(publicReceipt.id);
    const publicBooking = await opsApi<TestBooking>(page, `/admin/bookings/${publicReceipt.id}`);
    expect(publicBooking.status).toBe(200);
    customerFromBooking(publicBooking.body, publicPhone);
    const publicCancelled = await opsApi(page, `/admin/bookings/${publicReceipt.id}/cancel`, 'POST', {
      status: 'cancelled', expectedVersion: publicBooking.body.version, reason: `Dọn public checkout QA ${stamp}`,
    });
    expect(publicCancelled.status).toBe(201);
    await guestContext.close();
    guestContext = null;
    await otherGuestContext.close();
    otherGuestContext = null;

    await page.goto('/admin/dat-phong');
    await page.getByRole('button', { name: 'Tạo yêu cầu' }).click();
    await page.getByLabel('Hạng phòng').selectOption(property.roomTypes[0].id);
    await page.getByLabel('Nhận phòng', { exact: true }).fill(checkIn);
    await page.getByLabel('Trả phòng', { exact: true }).fill(checkOut);
    await page.getByLabel('Tên khách').fill(testName);
    await page.getByLabel('Điện thoại').fill(phone);
    const quoteResponsePromise = page.waitForResponse((response) => response.url().endsWith('/api/v1/quotes') && response.request().method() === 'POST');
    await page.getByRole('button', { name: 'Kiểm tra giá & tồn' }).click();
    const quoteResponse = await quoteResponsePromise;
    expect(quoteResponse.status()).toBe(201);
    const userQuote = await quoteResponse.json() as { id: string };
    quoteIds.push(userQuote.id);
    await expect(page.locator('.admin-operations__quote')).toBeVisible();
    const bookingResponsePromise = page.waitForResponse((response) => response.url().endsWith('/api/v1/admin/bookings') && response.request().method() === 'POST');
    await page.getByRole('button', { name: 'Xác nhận tạo yêu cầu & giữ chỗ' }).click();
    const bookingResponse = await bookingResponsePromise;
    expect(bookingResponse.status()).toBe(201);
    let booking = await bookingResponse.json() as TestBooking;
    bookingIds.push(booking.id);
    customerFromBooking(booking, phone);
    expect(booking.bookingStatus).toBe('pending_confirmation');
    expect(booking.totalVnd).toBe('20000');

    const staleTransition = await opsApi(page, `/admin/bookings/${booking.id}/status`, 'PATCH', { status: 'confirmed', expectedVersion: booking.version + 500 });
    expect(staleTransition.status).toBe(409);
    const afterStale = await opsApi<TestBooking>(page, `/admin/bookings/${booking.id}`);
    expect(afterStale.body.bookingStatus).toBe('pending_confirmation');
    await page.getByLabel('Ghi chú booking').fill(`Ghi chú nghiệp vụ ${stamp}`);
    const noteResponsePromise = page.waitForResponse((response) => response.url().endsWith(`/api/v1/admin/bookings/${booking.id}/notes`) && response.request().method() === 'POST');
    await page.getByRole('button', { name: 'Thêm ghi chú' }).click();
    const noteResponse = await noteResponsePromise;
    expect(noteResponse.status()).toBe(201);
    const withNote = await opsApi<{ notes: Array<{ body: string }> }>(page, `/admin/bookings/${booking.id}`);
    expect(withNote.body.notes.some((item) => item.body === `Ghi chú nghiệp vụ ${stamp}`)).toBe(true);
    const confirmResponsePromise = page.waitForResponse((response) => response.url().endsWith(`/api/v1/admin/bookings/${booking.id}/status`) && response.request().method() === 'PATCH');
    await page.getByRole('button', { name: 'Xác nhận đơn' }).click();
    const confirmResponse = await confirmResponsePromise;
    expect(confirmResponse.status()).toBe(200);
    booking = (await opsApi<TestBooking>(page, `/admin/bookings/${booking.id}`)).body;
    expect(booking.bookingStatus).toBe('confirmed');
    let inventory = await opsApi<{ items: Array<{ heldCount: number; reservedCount: number; available: number }> }>(page, `/admin/inventory?roomTypeId=${property.roomTypes[0].id}&from=${checkIn}&to=${checkOut}`);
    expect(inventory.body.items.every((item) => item.heldCount === 0 && item.reservedCount === 1 && item.available === 0)).toBe(true);

    const paymentKey = `atgops-${stamp}-payment`;
    const paymentInput = { bookingId: booking.id, amountVnd: '10000', method: 'bank_transfer', externalReference: `ATGOPS-${stamp}`, note: 'Giao dịch kiểm thử offline' };
    const payment = await opsApi<{ id: string; provider: string | null }>(page, '/admin/payments', 'POST', paymentInput, { 'idempotency-key': paymentKey });
    expect(payment.status).toBe(201);
    expect(payment.body.provider).toBeNull();
    paymentId = payment.body.id;
    const paymentReplay = await opsApi<{ id: string }>(page, '/admin/payments', 'POST', paymentInput, { 'idempotency-key': paymentKey });
    expect(paymentReplay.body.id).toBe(paymentId);
    const mismatchedReplay = await opsApi(page, '/admin/payments', 'POST', { ...paymentInput, amountVnd: '9000' }, { 'idempotency-key': paymentKey });
    expect(mismatchedReplay.status).toBe(409);

    const refundKey = `atgops-${stamp}-refund`;
    const refund = await opsApi<{ id: string; status: string }>(page, '/admin/refunds', 'POST', { paymentId, amountVnd: '2500', reason: `Kiểm thử đối soát ${stamp}` }, { 'idempotency-key': refundKey });
    expect(refund.status).toBe(201);
    refundId = refund.body.id;
    const refundReplay = await opsApi<{ id: string }>(page, '/admin/refunds', 'POST', { paymentId, amountVnd: '2500', reason: `Kiểm thử đối soát ${stamp}` }, { 'idempotency-key': refundKey });
    expect(refundReplay.status).toBe(201);
    await opsApi(page, `/admin/refunds/${refundId}/status`, 'PATCH', { status: 'approved' });
    await opsApi(page, `/admin/refunds/${refundId}/status`, 'PATCH', { status: 'settled', externalReference: `ATG-REFUND-${stamp}` });

    await page.goto('/admin/khach-hang');
    await page.getByLabel('Tìm khách hàng').fill(phone);
    const customerRow = page.locator('tr').filter({ hasText: phone });
    await expect(customerRow).toBeVisible();
    await customerRow.getByRole('button', { name: 'Hồ sơ' }).click();
    await page.getByLabel('Khu vực').fill('Nho Quan — dữ liệu QA');
    await page.getByRole('button', { name: 'Lưu hồ sơ' }).click();
    await page.getByPlaceholder('Ghi nhận cuộc gọi / trao đổi…').fill(`Đã gọi kiểm thử ${stamp}`);
    const interactionResponsePromise = page.waitForResponse((response) => response.url().endsWith(`/api/v1/admin/customers/${booking.customer.id}/interactions`) && response.request().method() === 'POST', { timeout: 10_000 });
    await page.getByRole('button', { name: 'Lưu trao đổi' }).click();
    expect((await interactionResponsePromise).status()).toBe(201);
    await page.getByPlaceholder('Mục đích nhắc việc').fill(`Nhắc kiểm thử ${stamp}`);
    const followUpResponsePromise = page.waitForResponse((response) => response.url().endsWith(`/api/v1/admin/customers/${booking.customer.id}/follow-ups`) && response.request().method() === 'POST', { timeout: 10_000 });
    await page.getByRole('button', { name: 'Tạo nhắc việc' }).click();
    expect((await followUpResponsePromise).status()).toBe(201);
    const followUps = await opsApi<{ items: Array<{ purpose: string }> }>(page, `/admin/customers/${booking.customer.id}/follow-ups`);
    expect(followUps.body.items.some((item) => item.purpose === `Nhắc kiểm thử ${stamp}`)).toBe(true);
    const customer = await opsApi<{ city: string | null; inquiries: Array<{ interactions: Array<{ body: string }>; followUps: Array<{ purpose: string }> }> }>(page, `/admin/customers/${booking.customer.id}`);
    expect(customer.body.city).toBe('Nho Quan — dữ liệu QA');
    expect(customer.body.inquiries.flatMap((item) => item.interactions).some((item) => item.body === `Đã gọi kiểm thử ${stamp}`)).toBe(true);
    expect(customer.body.inquiries.flatMap((item) => item.followUps).some((item) => item.purpose === `Nhắc kiểm thử ${stamp}`)).toBe(true);

    const report = await opsApi<{
      bookingSummary: { total: number };
      revenueSummary: { postedPaymentsVnd: string; settledRefundsVnd: string; netCashVnd: string; paymentCount: number; refundCount: number };
      inventory: { listedRoomNights: string; capacity: string; available: string };
      scope: { bookingsPaymentsRefundsInventory: { propertyId: string | null; roomTypeId: string | null } };
    }>(page, `/admin/reports/summary?from=${todayKey()}&to=${todayKey()}&propertyId=${property.id}&roomTypeId=${property.roomTypes[0].id}&status=confirmed`);
    expect(report.status).toBe(200);
    expect(report.body.bookingSummary.total).toBe(1);
    expect(report.body.revenueSummary).toMatchObject({ postedPaymentsVnd: '10000', settledRefundsVnd: '2500', netCashVnd: '7500', paymentCount: 1, refundCount: 1 });
    expect(report.body.inventory).toMatchObject({ listedRoomNights: '1', capacity: '1', available: '1' });
    expect(report.body.scope.bookingsPaymentsRefundsInventory).toEqual({ propertyId: property.id, roomTypeId: property.roomTypes[0].id });

    await page.goto('/admin/bao-cao');
    await expect(page.locator('[data-admin-section="reports"]')).toContainText('chưa gắn với từng nơi lưu trú');
    const dashboard = await opsApi<{
      bookings: { total: number; byStatus: Record<string, number> };
      newInquiries: number;
      customers: number;
      published: { stays: number; combos: number; destinations: number };
      content: { draft: number; review: number; published: number };
      payments: Record<string, number>;
      refunds: Record<string, number>;
      recordedPaymentsVnd: string;
    }>(page, '/admin/dashboard/summary');
    const [bookingTotals, customerTotals, inquiryTotals, propertyCatalog, publishedCombos, publishedDestinations] = await Promise.all([
      opsApi<{ total: number }>(page, '/admin/bookings?page=1&pageSize=1'),
      opsApi<{ total: number }>(page, '/admin/customers?page=1&pageSize=1'),
      opsApi<{ total: number }>(page, '/inquiries?stage=new&page=1&pageSize=1'),
      opsApi<{ items: Array<{ operatingStatus: string; publicationStatus: string }> }>(page, '/properties'),
      opsApi<{ total: number }>(page, '/content?kind=combo&status=published&page=1&pageSize=1'),
      opsApi<{ total: number }>(page, '/content?kind=destination&status=published&page=1&pageSize=1'),
    ]);
    expect(dashboard.body.bookings.total).toBe(bookingTotals.body.total);
    for (const [status, count] of Object.entries(dashboard.body.bookings.byStatus)) {
      const statusTotals = await opsApi<{ total: number }>(page, `/admin/bookings?status=${encodeURIComponent(status)}&page=1&pageSize=1`);
      expect(statusTotals.body.total, `dashboard booking status ${status}`).toBe(count);
    }
    expect(dashboard.body.customers).toBe(customerTotals.body.total);
    expect(dashboard.body.newInquiries).toBe(inquiryTotals.body.total);
    expect(dashboard.body.published.stays).toBe(propertyCatalog.body.items.filter((item) => item.operatingStatus === 'active' && item.publicationStatus === 'published').length);
    expect(dashboard.body.published.combos).toBe(publishedCombos.body.total);
    expect(dashboard.body.published.destinations).toBe(publishedDestinations.body.total);
    for (const status of ['draft', 'review', 'published'] as const) {
      const contentTotals = await opsApi<{ total: number }>(page, `/content?status=${status}&page=1&pageSize=1`);
      expect(dashboard.body.content[status], `dashboard content status ${status}`).toBe(contentTotals.body.total);
    }
    for (const [status, count] of Object.entries(dashboard.body.payments)) {
      const statusTotals = await opsApi<{ total: number }>(page, `/admin/payments?status=${encodeURIComponent(status)}&page=1&pageSize=1`);
      expect(statusTotals.body.total, `dashboard payment status ${status}`).toBe(count);
    }
    for (const [status, count] of Object.entries(dashboard.body.refunds)) {
      const statusTotals = await opsApi<{ total: number }>(page, `/admin/refunds?status=${encodeURIComponent(status)}&page=1&pageSize=1`);
      expect(statusTotals.body.total, `dashboard refund status ${status}`).toBe(count);
    }
    let pageNumber = 1;
    let postedSum = BigInt(0);
    let paymentPages = 1;
    do {
      const result = await opsApi<{ items: Array<{ amountVnd: string }>; total: number; pageSize: number }>(page, `/admin/payments?status=posted&page=${pageNumber}&pageSize=100`);
      postedSum += result.body.items.reduce((sum, item) => sum + BigInt(item.amountVnd), BigInt(0));
      paymentPages = Math.ceil(result.body.total / result.body.pageSize);
      pageNumber += 1;
    } while (pageNumber <= paymentPages);
    expect(dashboard.body.recordedPaymentsVnd).toBe(postedSum.toString());

    await page.goto('/admin/dat-phong');
    await page.getByLabel('Tìm booking').fill(booking.publicCode);
    const bookingRow = page.locator('tr').filter({ hasText: booking.publicCode });
    await expect(bookingRow).toBeVisible();
    await bookingRow.getByRole('button', { name: 'Chi tiết' }).click();
    page.once('dialog', (dialog) => dialog.accept(`Huỷ kiểm thử ${stamp}`));
    const cancelResponsePromise = page.waitForResponse((response) => response.url().endsWith(`/api/v1/admin/bookings/${booking.id}/cancel`) && response.request().method() === 'POST');
    await page.getByRole('button', { name: 'Huỷ đơn' }).click();
    expect((await cancelResponsePromise).status()).toBe(201);
    const finalBooking = (await opsApi<TestBooking>(page, `/admin/bookings/${booking.id}`)).body;
    expect(finalBooking.bookingStatus).toBe('cancelled');

    const quoteInput = { roomTypeId: property.roomTypes[0].id, checkIn, checkOut, quantity: 1, adults: 2, children: 0 };
    const [raceQuoteA, raceQuoteB] = await Promise.all([
      opsApi<{ id: string }>(page, '/quotes', 'POST', quoteInput),
      opsApi<{ id: string }>(page, '/quotes', 'POST', quoteInput),
    ]);
    expect(raceQuoteA.status).toBe(201);
    expect(raceQuoteB.status).toBe(201);
    quoteIds.push(raceQuoteA.body.id, raceQuoteB.body.id);
    const raceBodyA = { fullName: `ATG Race A ${stamp}`, phone: racePhoneA };
    const raceBodyB = { fullName: `ATG Race B ${stamp}`, phone: racePhoneB };
    const [holdA, holdB] = await Promise.all([
      opsApi<TestBooking>(page, `/quotes/${raceQuoteA.body.id}/hold`, 'POST', raceBodyA, { 'idempotency-key': idempotencyKeys[0] }),
      opsApi<TestBooking>(page, `/quotes/${raceQuoteB.body.id}/hold`, 'POST', raceBodyB, { 'idempotency-key': idempotencyKeys[1] }),
    ]);
    const successfulHolds = [holdA, holdB].filter((result) => result.status === 201 || result.status === 200);
    const rejectedHolds = [holdA, holdB].filter((result) => result.status === 409);
    expect(successfulHolds).toHaveLength(1);
    expect(rejectedHolds, `Expected one competing hold to return 409; responses: ${JSON.stringify([holdA, holdB])}`).toHaveLength(1);
    const raceBooking = successfulHolds[0].body;
    bookingIds.push(raceBooking.id);
    const raceBookingDetails = await opsApi<TestBooking>(page, `/admin/bookings/${raceBooking.id}`);
    customerFromBooking(raceBookingDetails.body, raceBookingDetails.body.customer.phone);
    const successfulQuoteId = holdA.status === 201 || holdA.status === 200 ? raceQuoteA.body.id : raceQuoteB.body.id;
    const successfulKey = holdA.status === 201 || holdA.status === 200 ? idempotencyKeys[0] : idempotencyKeys[1];
    const successfulContact = holdA.status === 201 || holdA.status === 200 ? raceBodyA : raceBodyB;
    const replay = await opsApi<TestBooking>(page, `/quotes/${successfulQuoteId}/hold`, 'POST', successfulContact, { 'idempotency-key': successfulKey });
    expect(replay.status).toBe(201);
    expect(replay.body.id).toBe(raceBooking.id);
    const replayMismatch = await opsApi(page, `/quotes/${successfulQuoteId}/hold`, 'POST', { ...successfulContact, note: 'different payload' }, { 'idempotency-key': successfulKey });
    expect(replayMismatch.status).toBe(409);
    inventory = await opsApi(page, `/admin/inventory?roomTypeId=${property.roomTypes[0].id}&from=${checkIn}&to=${checkOut}`);
    expect((inventory.body as { items: Array<{ heldCount: number; reservedCount: number }> }).items.every((item) => item.heldCount === 1 && item.reservedCount === 0)).toBe(true);

    setHoldExpired(raceBooking.id);
    let expired = false;
    for (let attempt = 0; attempt < 40; attempt += 1) {
      await page.waitForTimeout(1_000);
      const current = await opsApi<TestBooking>(page, `/admin/bookings/${raceBooking.id}`);
      if (current.body.bookingStatus === 'expired') { expired = true; break; }
    }
    expect(expired, 'worker expires a backdated local test hold').toBe(true);
    inventory = await opsApi(page, `/admin/inventory?roomTypeId=${property.roomTypes[0].id}&from=${checkIn}&to=${checkOut}`);
    expect((inventory.body as { items: Array<{ heldCount: number; reservedCount: number }> }).items.every((item) => item.heldCount === 0 && item.reservedCount === 0)).toBe(true);
    expect((await opsApi<{ redemptions: unknown[] }>(page, `/admin/payments/${paymentId}`)).status).toBe(200);
  } finally {
    await guestContext?.close().catch(() => undefined);
    await otherGuestContext?.close().catch(() => undefined);
    for (const bookingId of bookingIds) {
      try {
        const current = await opsApi<TestBooking>(page, `/admin/bookings/${bookingId}`);
        if (current.status === 200 && ['pending_confirmation', 'confirmed'].includes(current.body.bookingStatus)) {
          await opsApi(page, `/admin/bookings/${bookingId}/cancel`, 'POST', { status: 'cancelled', expectedVersion: current.body.version, reason: `Dọn dữ liệu QA ${stamp}` });
        }
      } catch { /* continue exact, guarded cleanup below */ }
    }
    if (property) {
      cleanupTestRows({
        propertyId: property.id, contentId: property.contentId, roomTypeId: property.roomTypes[0].id,
        mediaId, couponId: coupon?.id ?? null, couponCode, bookings: bookingIds, quotes: quoteIds, customers: customerIds,
        idempotencyKeys,
      });
      const currentProperty = await opsApi<TestProperty & { contentVersion: number; publicationStatus: string }>(page, `/properties/${property.id}`);
      if (currentProperty.status === 200) {
        const node = await opsApi<{ publicationStatus: string; version: number }>(page, `/content/${property.contentId}`);
        if (node.status === 200 && node.body.publicationStatus === 'published') {
          await opsApi(page, `/content/${property.contentId}/status`, 'PATCH', { status: 'draft', expectedVersion: node.body.version });
        }
        await opsApi(page, `/properties/${property.id}?expectedVersion=${currentProperty.body.version}`, 'DELETE');
      }
    }
    if (mediaId) {
      const removed = await opsApi(page, `/media/${mediaId}`, 'DELETE');
      expect([204, 404]).toContain(removed.status);
    }
  }
});
