import { expect, test } from '@playwright/test';

test.use({ viewport: { width: 1448, height: 1086 } });

test.describe('màn A — Tổng quan', () => {
  test('KPI, donut and revenue table come from the same numbers', async ({ page }) => {
    await page.goto('/admin');
    await expect(page.locator('.kpi')).toHaveCount(6);

    const occupancy = (await page.locator('.kpi').nth(2).locator('strong').first().textContent())?.trim();
    await expect(page.locator('.donut__value')).toHaveText(occupancy ?? '');

    const donutTotal = Number((await page.locator('.ovw__donut-foot strong').textContent())?.replace(/\D/g, ''));
    const legend = await page.locator('.donut__count').allTextContents();
    const sum = legend.reduce((s, t) => s + Number(t.replace(/\D/g, '')), 0);
    expect(sum).toBe(donutTotal);

    const revenueKpi = (await page.locator('.kpi').nth(1).locator('strong').first().textContent())?.trim();
    await expect(page.locator('.revlist__total strong')).toHaveText(revenueKpi ?? '');
    const rows = await page.locator('.revlist li strong').allTextContents();
    const rowSum = rows.reduce((s, t) => s + Number(t.replace(/\D/g, '')), 0);
    expect(rowSum).toBe(Number(revenueKpi?.replace(/\D/g, '')));
  });

  test('chart tooltip, calendar and quick actions work', async ({ page }) => {
    await page.goto('/admin');
    await page.locator('.chart__svg rect[role="button"]').nth(14).hover();
    await expect(page.locator('.chart__tip')).toContainText('Ngày 15/11/2024');

    await page.getByRole('button', { name: 'Doanh thu (triệu đồng)' }).click();
    await expect(page.locator('.chart__bar:not(.chart__bar--expected)')).toHaveCount(0);
    await page.getByRole('button', { name: 'Doanh thu (triệu đồng)' }).click();

    await page.locator('.cal__day', { hasText: /^20$/ }).first().click();
    await expect(page.locator('.cal__note')).toContainText('20/11/2024');

    await page.getByRole('link', { name: 'Duyệt đặt phòng' }).click();
    await expect(page).toHaveURL(/status=pending_confirmation/);
    await expect(page.locator('.bk__table tbody tr').first()).toContainText('Chờ xác nhận');
  });

  test('confirming from the overview updates the pending list', async ({ page }) => {
    await page.goto('/admin');
    const firstCode = await page.locator('.confirm-list li').first().locator('.confirm-list__text span').first().textContent();
    await page.locator('.confirm-list li').first().getByRole('button', { name: 'Xác nhận' }).click();
    await expect(page.locator('dialog[open]')).toContainText('không gửi tin nhắn');
    await page.getByRole('button', { name: 'Xác nhận đơn' }).click();
    await expect(page.locator('.atoast')).toContainText('Đã cập nhật booking mẫu');
    await expect(page.locator('.confirm-list li').first().locator('.confirm-list__text span').first()).not.toHaveText(firstCode ?? '');
  });
});

test.describe('màn B — Đặt phòng', () => {
  test('filters, selection, pagination and URL state', async ({ page }) => {
    await page.goto('/admin/dat-phong');
    await expect(page.locator('.bk__table-card h2')).toContainText('(245 đơn)');
    await expect(page.locator('.bk__table tbody tr')).toHaveCount(15);

    await page.getByLabel('Trạng thái').selectOption('pending_confirmation');
    await expect(page).toHaveURL(/status=pending_confirmation/);
    await expect(page.locator('.bk__tile--warning strong')).toHaveText('28');
    const rows = await page.locator('.bk__table tbody tr').count();
    expect(rows).toBeLessThanOrEqual(15);
    for (const cell of await page.locator('.bk__table tbody tr td:nth-child(10)').allTextContents()) {
      expect(cell).toContain('Chờ xác nhận');
    }

    await page.getByLabel('Kênh đặt').selectOption('website');
    await expect(page.locator('.bk__table-card h2')).not.toContainText('(245 đơn)');
    await page.getByRole('button', { name: /Xóa bộ lọc/ }).click();
    await expect(page.locator('.bk__table-card h2')).toContainText('(245 đơn)');

    await page.getByLabel('Hiển thị').selectOption('30');
    await expect(page.locator('.bk__table tbody tr')).toHaveCount(30);
    await page.getByRole('button', { name: 'Trang 2' }).click();
    await expect(page).toHaveURL(/page=2/);

    // Selecting rows: header checkbox only covers the current page.
    await page.locator('.bk__table thead input[type="checkbox"]').check();
    await expect(page.locator('.bk__selected')).toContainText('Đã chọn 30 đơn');
    await page.locator('.bk__table tbody input[type="checkbox"]').first().uncheck();
    await expect(page.locator('.bk__table thead input[type="checkbox"]')).toHaveJSProperty('indeterminate', true);

    await page.reload();
    await expect(page).toHaveURL(/page=2/);
  });

  test('detail tabs, confirm and cancel keep payment status separate', async ({ page }) => {
    await page.goto('/admin/dat-phong?status=pending_confirmation');
    await page.locator('.bk__table tbody tr').first().click();
    const code = await page.locator('.bk__detail-code').textContent();
    await expect(page.locator('.bk__detail .abadge').first()).toHaveText('Chờ xác nhận');

    await page.getByRole('tab', { name: 'Thanh toán' }).click();
    await expect(page.locator('.bk__pay-list')).toContainText('Còn phải thu');
    await page.getByRole('tab', { name: 'Ghi chú' }).click();
    await page.locator('.bk__tabpanel textarea').fill('Khách nhờ chuẩn bị nôi cho em bé.');
    await page.getByRole('button', { name: 'Lưu ghi chú' }).click();
    await expect(page.locator('.bk__history')).toContainText('Khách nhờ chuẩn bị nôi');

    await page.getByRole('button', { name: 'Xác nhận', exact: true }).click();
    await page.getByRole('button', { name: 'Xác nhận đơn' }).click();
    await expect(page.locator('.bk__detail .abadge').first()).toHaveText('Đã xác nhận');

    await page.getByRole('tab', { name: 'Thông tin chung' }).click();
    const payment = await page.locator('.bk__total .abadge').textContent();
    await page.getByRole('button', { name: 'Hủy đơn' }).click();
    await page.getByRole('button', { name: 'Hủy đơn', exact: true }).nth(1).click();
    await expect(page.getByText('Vui lòng nhập lý do')).toBeVisible();
    await page.getByLabel('Lý do hủy (bắt buộc)').selectOption('Khách đổi lịch');
    await page.getByRole('button', { name: 'Hủy đơn', exact: true }).nth(1).click();
    await expect(page.locator('.bk__detail .abadge').first()).toHaveText('Đã hủy');
    // Cancelling never refunds by itself.
    await expect(page.locator('.bk__total .abadge')).toHaveText(payment ?? '');
    expect(code).toBeTruthy();
  });

  test('message composer only previews, export downloads a CSV', async ({ page }) => {
    await page.goto('/admin/dat-phong');
    await page.locator('.bk__table tbody tr').first().click();
    await page.getByRole('button', { name: 'Gửi tin nhắn' }).click();
    await expect(page.locator('dialog[open]')).toContainText('chỉ để xem trước');
    await expect(page.locator('dialog[open]')).not.toContainText(/đã gửi/i);
    await page.keyboard.press('Escape');

    const download = page.waitForEvent('download');
    await page.getByRole('button', { name: 'Xuất CSV' }).click();
    const file = await download;
    expect(file.suggestedFilename()).toMatch(/\.csv$/);
  });

  test('creating a booking validates inventory and guests', async ({ page }) => {
    await page.goto('/admin/dat-phong?action=create');
    const drawer = page.locator('dialog[open]');
    await expect(drawer).toContainText('Tạo đặt phòng mới');
    await drawer.getByRole('button', { name: /Tạo đơn/ }).click();
    await expect(drawer.getByText('Chọn khách có sẵn hoặc nhập tên khách mới.')).toBeVisible();

    await drawer.getByLabel('Khách hàng có sẵn').selectOption({ index: 1 });
    await drawer.getByLabel('Nơi lưu trú').selectOption('cuc-phuong-forest-homestay');
    await drawer.getByLabel('Loại phòng').selectOption({ index: 1 });
    await drawer.getByLabel('Người lớn').fill('9');
    await drawer.getByRole('button', { name: /Tạo đơn/ }).click();
    await expect(drawer.getByText(/vượt sức chứa/)).toBeVisible();

    await drawer.getByLabel('Người lớn').fill('2');
    await expect(drawer.locator('.bform__total strong')).not.toHaveText('0đ');
    await drawer.getByRole('button', { name: /Tạo đơn/ }).click();
    await expect(page.locator('.atoast')).toContainText('Đã tạo đơn đặt phòng trong bản demo');
    await expect(page.locator('.bk__detail .abadge').first()).toHaveText('Chờ xác nhận');
  });

  test('summary tiles filter and the occupancy calendar picks a day', async ({ page }) => {
    await page.goto('/admin/dat-phong');
    await page.getByRole('button', { name: /Đã hủy/ }).click();
    await expect(page).toHaveURL(/status=cancelled/);
    await expect(page.locator('.bk__table tbody tr td:nth-child(10)').first()).toContainText('Đã hủy');

    await page.locator('.cal__day', { hasText: /^20$/ }).first().click();
    await expect(page).toHaveURL(/from=2024-11-20&to=2024-11-20/);
  });
});
