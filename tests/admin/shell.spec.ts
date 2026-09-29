import { expect, test } from '@playwright/test';
import { browserApi, signInAsOwner } from './helpers';

const ROUTES = [
  ['/admin', 'Tổng quan', 'Tổng quan'],
  ['/admin/dat-phong', 'Quản lý đặt phòng', 'Đặt phòng'],
  ['/admin/phong-nghi', 'Quản lý phòng nghỉ', 'Phòng nghỉ'],
  ['/admin/hang-phong', 'Quản lý hạng phòng', 'Hạng phòng'],
  ['/admin/ton-phong', 'Quỹ phòng', 'Quỹ phòng'],
  ['/admin/combo-du-lich', 'Quản lý combo du lịch', 'Combo du lịch'],
  ['/admin/diem-den', 'Quản lý điểm đến', 'Điểm đến'],
  ['/admin/khach-hang', 'Khách hàng', 'Khách hàng'],
  ['/admin/yeu-cau-tu-van', 'Khách hàng & yêu cầu tư vấn', 'Yêu cầu tư vấn'],
  ['/admin/noi-dung', 'Nội dung website', 'Nội dung website'],
  ['/admin/chuyen-trang', 'Chuyên trang', 'Chuyên trang'],
  ['/admin/menu', 'Quản lý menu website', 'Quản lý menu'],
  ['/admin/thu-vien-anh', 'Thư viện ảnh', 'Thư viện ảnh'],
  ['/admin/khuyen-mai', 'Khuyến mãi', 'Khuyến mãi'],
  ['/admin/thanh-toan', 'Thanh toán', 'Thanh toán'],
  ['/admin/bao-cao', 'Báo cáo', 'Báo cáo'],
  ['/admin/cai-dat', 'Cài đặt hệ thống', 'Cài đặt'],
] as const;

test('đăng nhập hiển thị đúng danh tính API và không còn control dữ liệu giả', async ({ page }) => {
  await signInAsOwner(page);
  const me = await browserApi(page, '/auth/me');
  expect(me.status).toBe(200);
  const user = me.body as { fullName: string; email: string; roles: string[] };

  await expect(page.locator('.atop__user')).toContainText(user.fullName);
  await expect(page.locator('.atop__user')).toContainText(/Quản trị viên|Điều hành|Biên tập viên|Kế toán|Chỉ xem/);
  await expect(page.locator('.atop__search, .atop__bell, .atop__range')).toHaveCount(0);
  await page.locator('.atop__user').click();
  await expect(page.locator('#admin-user')).toContainText(user.email);
  await expect(page.locator('#admin-user')).toContainText('backend kiểm tra');

  await page.reload();
  await expect(page.locator('.atop__user')).toBeVisible();
  const afterReload = await browserApi(page, '/auth/me');
  expect(afterReload.status).toBe(200);
  await expect(page.locator('.atop__user')).toContainText(user.fullName);

  const anonymous = await page.evaluate(async () => {
    const response = await fetch('/api/v1/settings', { credentials: 'omit' });
    return response.status;
  });
  expect(anonymous).toBe(401);
});

test('mật khẩu sai không tạo phiên đăng nhập', async ({ page }) => {
  await page.goto('/admin');
  await page.getByLabel('Email').fill('halabcreative@gmail.com');
  await page.getByLabel('Mật khẩu').fill('wrong-password-value');
  await page.getByRole('button', { name: 'Đăng nhập', exact: true }).click();
  await expect(page.getByRole('alert')).toBeVisible();
  await expect(page.locator('.atop__user')).toHaveCount(0);
});

test('mọi route admin có tiêu đề, menu hiện hành và module vận hành thật', async ({ page }) => {
  await signInAsOwner(page);
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));

  for (const [route, title, active] of ROUTES) {
    const response = await page.goto(route, { waitUntil: 'domcontentloaded' });
    expect(response?.status(), route).toBe(200);
    await expect(page.locator('.atop__title'), route).toContainText(title);
    await expect(page.locator('.asidebar [aria-current="page"]'), route).toContainText(active);
    await expect(page.locator('.atop__search, .atop__bell, .atop__range'), route).toHaveCount(0);
  }

  for (const [route, section] of [
    ['/admin', 'dashboard'],
    ['/admin/dat-phong', 'bookings'],
    ['/admin/ton-phong', 'inventory'],
    ['/admin/khach-hang', 'customers'],
    ['/admin/khuyen-mai', 'coupons'],
    ['/admin/thanh-toan', 'payments'],
    ['/admin/bao-cao', 'reports'],
  ]) {
    await page.goto(route);
    await expect(page.locator(`[data-admin-section="${section}"]`)).toBeVisible();
    await expect(page.locator(`[data-admin-section="${section}"] h1`)).toBeVisible();
    await expect(page.locator('main')).not.toContainText(/đã lưu thành công|dữ liệu demo/i);
  }

  expect(errors).toEqual([]);
});

test('route API-backed hiển thị bản ghi PostgreSQL và các empty state thật', async ({ page }) => {
  await signInAsOwner(page);

  await page.goto('/admin/phong-nghi');
  await expect(page.locator('.property-card')).toHaveCount(11);
  await expect(page.locator('.property-card').filter({ hasText: 'CP-AN-GARDEN' })).toContainText('Bản nháp');

  await page.goto('/admin/combo-du-lich');
  await expect(page.getByRole('heading', { name: 'Chưa có combo du lịch' })).toBeVisible();
  await page.goto('/admin/diem-den');
  await expect(page.getByRole('heading', { name: 'Chưa có điểm đến' })).toBeVisible();
  await page.goto('/admin/noi-dung');
  await expect(page.getByRole('heading', { name: 'Chưa có bài viết' })).toBeVisible();
  await page.goto('/admin/chuyen-trang');
  await expect(page.getByRole('heading', { name: 'Chưa có chuyên trang' })).toBeVisible();
  await page.goto('/admin/yeu-cau-tu-van');
  await expect(page.getByText('Chưa có yêu cầu tư vấn.')).toBeVisible();
  await page.goto('/admin/menu');
  await expect(page.locator('.menu-manager__item')).toHaveCount(5);
  await page.goto('/admin/thu-vien-anh');
  const mediaList = await browserApi(page, '/media');
  expect(mediaList.status).toBe(200);
  await expect(page.locator('.media-library__hint')).toContainText(`${(mediaList.body as { total: number }).total} ảnh`);
  await page.goto('/admin/cai-dat');
  await expect(page.locator('.settings-item').first()).toBeVisible();
  await expect(page.locator('.settings-screen')).not.toContainText(/\{\s*"/);
  const localAdminState = await page.evaluate(() => Object.keys(localStorage).filter((key) => /dvb:admin|admin.*(booking|content|customer|property)/i.test(key)));
  expect(localAdminState).toEqual([]);
});

test('API lỗi hiển thị retry state thay vì giả rằng danh sách rỗng', async ({ page }) => {
  await signInAsOwner(page);
  const contentRequest = /\/api\/v1\/content\?kind=article/;
  await page.route(contentRequest, (route) => route.abort());
  await page.goto('/admin/noi-dung');
  await expect(page.locator('.settings-screen__message--error')).toBeVisible();
  await expect(page.locator('.content-manager__error-state')).toContainText('Không tải được nội dung từ API');
  await expect(page.locator('.content-manager__empty')).toHaveCount(0);

  await page.unroute(contentRequest);
  await page.getByRole('button', { name: 'Tải lại' }).click();
  await expect(page.locator('.content-manager__empty')).toContainText('Chưa có bài viết');
});

test('hạng phòng không hiện số 0 giả khi API lỗi và hồi phục sau Tải lại', async ({ page }) => {
  await signInAsOwner(page);
  const propertyRequest = /\/api\/v1\/properties(?:\?|$)/;
  await page.route(propertyRequest, (route) => route.abort());
  await page.goto('/admin/hang-phong');
  await expect(page.locator('.room-catalog__error-state')).toContainText('Không tải được danh sách hạng phòng từ API');
  await expect(page.locator('.room-catalog__summary')).toHaveCount(0);
  await expect(page.locator('.room-catalog__card')).toHaveCount(0);
  await expect(page.getByText('Chưa có hạng phòng cho nơi lưu trú này.')).toHaveCount(0);

  await page.unroute(propertyRequest);
  await page.getByRole('button', { name: 'Tải lại danh sách' }).click();
  const properties = await browserApi(page, '/properties');
  expect(properties.status).toBe(200);
  const items = (properties.body as { items: Array<{ roomTypes: unknown[] }> }).items;
  await expect(page.locator('.room-catalog__error-state')).toHaveCount(0);
  await expect(page.locator('.room-catalog__summary')).toBeVisible();
  await expect(page.locator('.room-catalog__card')).toHaveCount(items.reduce((sum, item) => sum + item.roomTypes.length, 0));
});

test('từ quỹ phòng mở được hạng phòng, xem danh sách thật và sửa album riêng', async ({ page }) => {
  await signInAsOwner(page);
  await page.goto('/admin/ton-phong');
  await page.getByRole('link', { name: 'Quản lý hạng phòng' }).click();
  await expect(page).toHaveURL(/\/admin\/hang-phong$/);

  const response = await browserApi(page, '/properties');
  expect(response.status).toBe(200);
  const properties = (response.body as { items: Array<{ roomTypes: Array<{ name: string }> }> }).items;
  const roomCount = properties.reduce((total, property) => total + property.roomTypes.length, 0);
  expect(roomCount).toBeGreaterThan(0);
  await expect(page.locator('.room-catalog__card')).toHaveCount(roomCount);
  await expect(page.locator('.room-catalog__missing li')).toHaveCount(properties.filter((property) => property.roomTypes.length === 0).length);

  const firstRoom = page.locator('.room-catalog__card').first();
  const name = await firstRoom.locator('h3').textContent();
  await firstRoom.getByRole('button', { name: 'Sửa hạng phòng' }).click();
  await expect(page.getByRole('heading', { name: `Sửa hạng phòng: ${name?.trim()}` })).toBeVisible();
  await expect(page.getByText('Album hạng phòng:', { exact: false })).toBeVisible();
  await page.getByRole('button', { name: 'Quay lại danh sách hạng phòng' }).first().click();
  await expect(page.locator('.room-catalog__card')).toHaveCount(roomCount);
});

test('phòng nghỉ và nội dung mở form ở route riêng, có nút quay lại danh sách', async ({ page }) => {
  await signInAsOwner(page);

  await page.goto('/admin/phong-nghi');
  await page.getByRole('button', { name: 'Thêm phòng nghỉ' }).click();
  await expect(page).toHaveURL(/\/admin\/phong-nghi\?action=create/);
  await expect(page.getByRole('heading', { name: 'Thêm nơi lưu trú' })).toBeVisible();
  await page.getByRole('button', { name: 'Quay lại danh sách' }).click();
  await expect(page).toHaveURL(/\/admin\/phong-nghi$/);

  const firstProperty = page.locator('.property-card').first();
  const propertyTitle = await firstProperty.locator('h3').textContent();
  await firstProperty.getByRole('button', { name: 'Sửa' }).click();
  await expect(page).toHaveURL(/\/admin\/phong-nghi\?edit=/);
  await expect(page.getByRole('heading', { name: 'Chỉnh sửa nơi lưu trú', level: 2 })).toBeVisible();
  await expect(page.getByLabel('Tên nơi lưu trú *')).toHaveValue(propertyTitle?.trim() ?? '');
  await page.getByRole('button', { name: 'Quay lại danh sách' }).click();

  await page.goto('/admin/noi-dung');
  await page.getByRole('button', { name: 'Tạo mới' }).click();
  await expect(page).toHaveURL(/\/admin\/noi-dung\?action=create/);
  await expect(page.getByRole('button', { name: 'Quay lại danh sách' })).toBeVisible();
});

for (const [width, height] of [[1440, 900], [1024, 900], [768, 1024], [390, 844]] as const) {
  test(`responsive admin ${width}px: mọi menu không tràn ngang`, async ({ page }) => {
    await signInAsOwner(page);
    await page.setViewportSize({ width, height });
    for (const [route] of ROUTES) {
      await page.goto(route, { waitUntil: 'domcontentloaded' });
      await expect(page.locator('.atop__title')).toBeVisible();
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
      expect(overflow, `${route} @ ${width}px`).toBeLessThanOrEqual(0);
    }
  });
}

test('mobile sidebar mở như drawer và logout kết thúc phiên qua API', async ({ page }) => {
  await signInAsOwner(page);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/admin');
  await expect(page.locator('.asidebar')).not.toBeInViewport();
  await page.getByRole('button', { name: 'Mở menu quản trị' }).click();
  await expect(page.locator('.asidebar')).toBeInViewport();
  await page.locator('.asidebar').getByRole('link', { name: 'Phòng nghỉ', exact: true }).click();
  await expect(page).toHaveURL(/\/admin\/phong-nghi/);

  await page.locator('.atop__user').click();
  await page.locator('#admin-user').getByRole('button', { name: 'Đăng xuất' }).click();
  await expect(page.getByRole('heading', { name: 'Đăng nhập quản trị' })).toBeVisible();
  const afterLogout = await page.evaluate(async () => {
    const response = await fetch('/api/v1/auth/me', { credentials: 'include' });
    return response.status;
  });
  expect(afterLogout).toBe(401);
});
