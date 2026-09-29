import { existsSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { expect, test } from '@playwright/test';
import { browserApi, signInAsOwner } from './helpers';

const ADMIN_ROUTES = [
  ['/admin', 'Tổng quan', 'dashboard'],
  ['/admin/dat-phong', 'Quản lý đặt phòng', 'bookings'],
  ['/admin/phong-nghi', 'Quản lý nơi lưu trú', 'properties'],
  ['/admin/hang-phong', 'Quản lý hạng phòng', 'room catalog'],
  ['/admin/ton-phong', 'Quỹ phòng', 'inventory'],
  ['/admin/combo-du-lich', 'Quản lý combo du lịch', 'combos'],
  ['/admin/diem-den', 'Quản lý điểm đến', 'destinations'],
  ['/admin/khach-hang', 'Khách hàng', 'customers'],
  ['/admin/yeu-cau-tu-van', 'Khách hàng & yêu cầu tư vấn', 'inquiries'],
  ['/admin/noi-dung', 'Nội dung website', 'content'],
  ['/admin/chuyen-trang', 'Chuyên trang', 'static pages'],
  ['/admin/menu', 'Quản lý menu website', 'navigation'],
  ['/admin/thu-vien-anh', 'Thư viện ảnh', 'media library'],
  ['/admin/khuyen-mai', 'Khuyến mãi', 'coupons'],
  ['/admin/thanh-toan', 'Thanh toán', 'payments'],
  ['/admin/bao-cao', 'Báo cáo', 'reports'],
  ['/admin/cai-dat', 'Cài đặt hệ thống', 'settings'],
] as const;

const misleadingCopy = /chưa nằm trong phạm vi|màn demo|số liệu mẫu|dữ liệu mẫu|bản demo|coming soon|chưa có api/i;

test('Admin crawler bao phủ mọi route page.tsx hiện hành', () => {
  const adminRoot = join(process.cwd(), 'src', 'app', 'admin');
  const routes = ['/admin', ...readdirSync(adminRoot, { withFileTypes: true })
    .filter((entry) => entry.isDirectory() && existsSync(join(adminRoot, entry.name, 'page.tsx')))
    .map((entry) => `/admin/${entry.name}`)];
  expect(ADMIN_ROUTES.map(([route]) => route).sort()).toEqual(routes.sort());
});

test('full Admin route crawler: mọi màn có dữ liệu/API thật và thao tác chính khả dụng', async ({ page }) => {
  await signInAsOwner(page);
  const pageErrors: string[] = [];
  page.on('pageerror', (error) => pageErrors.push(error.message));

  for (const [route, title, section] of ADMIN_ROUTES) {
    const response = await page.goto(route, { waitUntil: 'domcontentloaded' });
    expect(response?.status(), `${route} HTTP`).toBe(200);
    await expect(page.locator('.atop__title'), route).toContainText(title);
    await expect(page.locator('.asidebar [aria-current="page"]'), route).toBeVisible();
    const main = page.locator('main');
    await expect(main, route).toBeVisible();
    await expect(main, `${route} must not surface an API error`).not.toContainText(/Không tải được .* từ API|Không thực hiện được/);
    const visibleText = await main.innerText();
    expect(visibleText, `${route} must not present a demo/pending screen`).not.toMatch(misleadingCopy);
    const actions = main.locator('button:not([disabled]), a[href]');
    await expect(actions.first(), `${route} must expose an enabled action or navigation`).toBeVisible({ timeout: 20_000 });
    expect(await actions.count(), `${route} must expose an enabled action or navigation`).toBeGreaterThan(0);
    if (['dashboard', 'bookings', 'inventory', 'customers', 'coupons', 'payments', 'reports'].includes(section)) {
      await expect(main.locator(`[data-admin-section="${section}"]`), route).toBeVisible();
    }
  }

  await page.goto('/admin');
  for (const href of ['/admin/dat-phong', '/admin/yeu-cau-tu-van', '/admin/khach-hang', '/admin/thanh-toan']) {
    await expect(page.locator(`main a[href="${href}"]`).first(), `dashboard quick link ${href}`).toBeVisible();
  }
  expect(pageErrors).toEqual([]);
});

test('dashboard counts reconcile with PostgreSQL-backed list APIs', async ({ page }) => {
  await signInAsOwner(page);
  await page.goto('/admin');

  const dashboard = await browserApi(page, '/admin/dashboard/summary');
  expect(dashboard.status).toBe(200);
  const summary = dashboard.body as {
    bookings: { total: number; byStatus: Record<string, number> };
    newInquiries: number;
    customers: number;
    payments: Record<string, number>;
    refunds: Record<string, number>;
    recordedPaymentsVnd: string;
  };

  const [bookings, customers, newInquiries] = await Promise.all([
    browserApi(page, '/admin/bookings?page=1&pageSize=1'),
    browserApi(page, '/admin/customers?page=1&pageSize=1'),
    browserApi(page, '/inquiries?stage=new&page=1&pageSize=1'),
  ]);
  expect(bookings.status).toBe(200);
  expect(customers.status).toBe(200);
  expect(newInquiries.status).toBe(200);
  expect(summary.bookings.total).toBe((bookings.body as { total: number }).total);
  expect(summary.customers).toBe((customers.body as { total: number }).total);
  expect(summary.newInquiries).toBe((newInquiries.body as { total: number }).total);

  for (const [status, total] of Object.entries(summary.bookings.byStatus)) {
    const result = await browserApi(page, `/admin/bookings?status=${encodeURIComponent(status)}&page=1&pageSize=1`);
    expect(result.status, `booking status ${status}`).toBe(200);
    expect((result.body as { total: number }).total, `booking status ${status}`).toBe(total);
  }
  for (const [status, total] of Object.entries(summary.payments)) {
    const result = await browserApi(page, `/admin/payments?status=${encodeURIComponent(status)}&page=1&pageSize=1`);
    expect(result.status, `payment status ${status}`).toBe(200);
    expect((result.body as { total: number }).total, `payment status ${status}`).toBe(total);
  }
  for (const [status, total] of Object.entries(summary.refunds)) {
    const result = await browserApi(page, `/admin/refunds?status=${encodeURIComponent(status)}&page=1&pageSize=1`);
    expect(result.status, `refund status ${status}`).toBe(200);
    expect((result.body as { total: number }).total, `refund status ${status}`).toBe(total);
  }

  let pageNumber = 1;
  let lastPage = 1;
  let postedSum = BigInt(0);
  do {
    const payments = await browserApi(page, `/admin/payments?status=posted&page=${pageNumber}&pageSize=100`);
    expect(payments.status).toBe(200);
    const body = payments.body as { items: Array<{ amountVnd: string }>; pageSize: number; total: number };
    postedSum += body.items.reduce((sum, item) => sum + BigInt(item.amountVnd), BigInt(0));
    lastPage = Math.ceil(body.total / body.pageSize);
    pageNumber += 1;
  } while (pageNumber <= lastPage);
  expect(summary.recordedPaymentsVnd).toBe(postedSum.toString());
});

test('CSRF rejection prevents an unauthorized coupon write and leaves no record', async ({ page }) => {
  await signInAsOwner(page);
  const code = `CSRFQA${Date.now()}`;
  const result = await page.evaluate(async ({ code }) => {
    const response = await fetch('/api/v1/admin/coupons', {
      method: 'POST',
      credentials: 'include',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ code, name: 'CSRF rejection test', discountType: 'percent', percentBps: 1000 }),
    });
    return response.status;
  }, { code });
  expect(result).toBe(403);

  const lookup = await browserApi(page, `/admin/coupons?search=${encodeURIComponent(code)}&page=1&pageSize=1`);
  expect(lookup.status).toBe(200);
  expect((lookup.body as { total: number }).total).toBe(0);
});
