import { expect, test } from '@playwright/test';

test.use({ viewport: { width: 1448, height: 1086 } });

test.describe('màn C — Phòng nghỉ', () => {
  test('filters, grid/list toggle and the property editor', async ({ page }) => {
    await page.goto('/admin/phong-nghi');
    await expect(page.locator('.pcard')).toHaveCount(8);

    await page.getByLabel('Loại lưu trú').selectOption('lodge');
    await expect(page.locator('.pcard')).toHaveCount(1);
    await page.getByRole('button', { name: 'Xóa lọc' }).click();
    await expect(page.locator('.pcard')).toHaveCount(8);

    await page.getByRole('button', { name: 'Dạng danh sách' }).click();
    await expect(page.locator('.pcards--list')).toBeVisible();
    await page.getByRole('button', { name: 'Dạng lưới' }).click();

    await page.locator('.pcard').first().getByRole('button', { name: 'Chỉnh sửa' }).click();
    const drawer = page.locator('dialog[open]');
    await expect(drawer).toContainText('Chỉnh sửa Cúc Phương Forest Homestay');
    await drawer.getByLabel('Tên nơi lưu trú *').fill('');
    await drawer.getByRole('button', { name: 'Lưu thay đổi' }).click();
    await expect(drawer.getByText('Nhập tên nơi lưu trú.')).toBeVisible();
    await drawer.getByLabel('Tên nơi lưu trú *').fill('Cúc Phương Forest Homestay');
    await drawer.getByRole('tab', { name: 'Chính sách' }).click();
    await drawer.getByLabel('Số khách tối đa / phòng').fill('5');
    await drawer.getByRole('button', { name: 'Lưu thay đổi' }).click();
    await expect(page.locator('.atoast')).toContainText('Đã lưu nơi lưu trú trong bản demo');
  });

  test('hiding a property is reversible and never cancels bookings', async ({ page }) => {
    await page.goto('/admin/phong-nghi');
    const bookings = await page.request.get('/admin/dat-phong');
    expect(bookings.status()).toBe(200);
    await page.locator('.pcard').first().getByRole('button', { name: 'Tạm ẩn' }).click();
    await expect(page.locator('dialog[open]')).toContainText('không xóa nơi lưu trú và không hủy các đơn đã đặt');
    await page.locator('dialog[open]').getByRole('button', { name: 'Tạm ẩn', exact: true }).click();
    await expect(page.locator('.atoast')).toContainText('Đã cập nhật trạng thái hiển thị');
    await expect(page.locator('.pcard').first().getByRole('button', { name: 'Hiện lại' })).toBeVisible();
  });

  test('room types, season preview and inventory conflicts', async ({ page }) => {
    await page.goto('/admin/phong-nghi');
    await expect(page.locator('.pr__rooms tbody tr')).toHaveCount(3);

    await page.locator('.pr__rooms').getByRole('button', { name: /Thao tác cho/ }).first().click();
    await page.getByRole('menuitem', { name: 'Sửa loại phòng' }).click();
    const modal = page.locator('dialog[open]');
    await modal.getByLabel('Giá ngày thường (VND/đêm)').fill('0');
    await modal.getByRole('button', { name: /Lưu/ }).click();
    await expect(modal.getByText('Giá phải lớn hơn 0.')).toBeVisible();
    await modal.getByLabel('Giá ngày thường (VND/đêm)').fill('690000');
    await modal.getByRole('button', { name: /Lưu/ }).click();
    await expect(page.locator('.pr__rooms tbody tr').first()).toContainText('690.000đ');

    await page.getByRole('button', { name: 'Thêm mùa' }).click();
    const season = page.locator('dialog[open]');
    await season.getByLabel('Tên mùa').fill('Mùa thử nghiệm');
    await season.getByLabel('Giá trị').fill('20');
    await expect(season.locator('.pr__preview li').first()).toContainText('đ');
    await season.getByRole('button', { name: /Lưu mùa/ }).click();
    await expect(page.locator('.pr__seasons')).toContainText('Mùa thử nghiệm');

    // Inventory: a full day cannot be blocked further.
    const cells = page.locator('.pr__cell');
    await cells.first().click();
    const inv = page.locator('dialog[open]');
    await expect(inv).toContainText('Tổng số phòng');
    const free = Number((await inv.locator('.pr__inv-detail li').last().locator('strong').textContent()) ?? '0');
    if (free > 0) {
      await inv.getByRole('button', { name: /Khóa 1 phòng/ }).click();
      await page.locator('dialog[open]').getByRole('button', { name: 'Khóa phòng' }).click();
      await expect(page.getByText('Vui lòng nhập lý do')).toBeVisible();
      await page.getByLabel('Lý do khóa (bắt buộc)').fill('Sửa vòi sen');
      await page.locator('dialog[open]').getByRole('button', { name: 'Khóa phòng' }).click();
      await expect(page.locator('.atoast').last()).toContainText('Đã khóa 1 phòng trong bản demo');
    } else {
      await expect(inv.getByRole('button', { name: /Khóa 1 phòng/ })).toBeDisabled();
    }
  });
});

test.describe('màn D — Combo', () => {
  test('filters, selection and the five detail tabs', async ({ page }) => {
    await page.goto('/admin/combo-du-lich');
    await expect(page.locator('.ccard')).toHaveCount(6);
    await page.getByLabel('Thời lượng').selectOption('3');
    await expect(page.locator('.ccard')).toHaveCount(2);
    await page.getByLabel('Thời lượng').selectOption('all');

    await page.locator('.ccard__main').nth(1).click();
    await expect(page.locator('.cb__detail h2')).toContainText('Tràng An');
    const gallery = await page.getByRole('button', { name: /Xem thêm ảnh/ }).textContent();
    const count = Number(gallery?.replace(/\D/g, ''));
    await page.getByRole('button', { name: /Xem thêm ảnh/ }).click();
    await expect(page.locator('dialog[open] .cb__gallery li')).toHaveCount(count);
    await page.keyboard.press('Escape');

    for (const tab of ['Thông tin chung', 'Hình ảnh', 'Giá & lịch khởi hành', 'Đánh giá', 'Lịch trình']) {
      await page.getByRole('tab', { name: tab }).click();
      await expect(page.locator('.cb__tabpanel')).toBeVisible();
    }
    await expect(page.locator('.cb__itinerary ol > li')).toHaveCount(2);
  });

  test('editing keeps itinerary and duration consistent; duplicate makes a draft', async ({ page }) => {
    await page.goto('/admin/combo-du-lich');
    await page.locator('.ccard').first().getByRole('button', { name: /Thao tác cho/ }).click();
    await page.getByRole('menuitem', { name: 'Chỉnh sửa' }).click();
    const drawer = page.locator('dialog[open]');
    await drawer.getByLabel('Số ngày').fill('3');
    await drawer.getByRole('button', { name: /Lưu combo/ }).click();
    await expect(drawer.getByText(/lịch trình đang có 2 ngày/)).toBeVisible();
    await drawer.getByRole('button', { name: 'Thêm ngày' }).click();
    await drawer.getByRole('button', { name: /Lưu combo/ }).click();
    await expect(page.locator('.atoast')).toContainText('Đã lưu combo trong bản demo');

    await page.locator('.ccard').first().getByRole('button', { name: /Thao tác cho/ }).click();
    await page.getByRole('menuitem', { name: 'Nhân bản (bản nháp)' }).click();
    await expect(page.locator('.ccard').first()).toContainText('bản sao');
    await expect(page.locator('.ccard').first()).toContainText('Bản nháp');
  });

  test('combo bookings open the booking list filtered by combo', async ({ page }) => {
    await page.goto('/admin/combo-du-lich');
    await page.getByRole('tab', { name: 'Giá & lịch khởi hành' }).click();
    await page.getByRole('link', { name: 'Xem booking dùng combo này' }).click();
    await expect(page).toHaveURL(/\/admin\/dat-phong\?combo=/);
    await expect(page.locator('.bk__context')).toContainText('Đang lọc theo combo');
  });
});

test.describe('màn E — Nội dung', () => {
  test('destination editor: slug rules, tags, checklist and preview', async ({ page }) => {
    await page.goto('/admin/diem-den');
    await expect(page.locator('.ct__table tbody tr')).toHaveCount(7);
    await page.locator('.ct__table tbody tr').first().click();
    await expect(page.locator('.ct__editor')).toContainText('Chỉnh sửa điểm đến');

    // A published record keeps its slug when the title changes.
    const slug = await page.getByLabel('Slug (đường dẫn) *').inputValue();
    await page.getByLabel('Tiêu đề *').fill('Vườn quốc gia Cúc Phương (cập nhật)');
    await expect(page.getByLabel('Slug (đường dẫn) *')).toHaveValue(slug);
    await expect(page.locator('.ct__serp-title')).toContainText('Cúc Phương');

    await page.getByRole('button', { name: 'Mobile' }).click();
    await expect(page.locator('.ct__serp--mobile')).toBeVisible();

    await page.locator('.ct__tag-add input').fill('thử nghiệm');
    await page.keyboard.press('Enter');
    await expect(page.locator('.ct__tags')).toContainText('thử nghiệm');

    await page.getByRole('tab', { name: 'Nội dung chi tiết' }).click();
    await page.getByRole('button', { name: 'In đậm' }).click();
    await page.getByRole('button', { name: 'Lưu thay đổi' }).click();
    await expect(page.locator('.atoast')).toContainText('Đã lưu thay đổi trong bản demo');

    await page.getByRole('button', { name: 'Xem trước' }).click();
    await expect(page.locator('dialog[open]')).toContainText('chưa xuất bản lên website thật');
  });

  test('SEO tab lists real gaps and opens the editor', async ({ page }) => {
    await page.goto('/admin/diem-den?tab=seo');
    const rows = page.locator('.acard tbody tr');
    await expect(rows.first()).toContainText(/meta description|ảnh chia sẻ|mô tả ngắn/);
    await rows.first().getByRole('button', { name: 'Mở trình soạn thảo' }).click();
    await expect(page).toHaveURL(/tab=(destinations|articles)/);
  });

  test('media library blocks bad files and protects assets in use', async ({ page }) => {
    await page.goto('/admin/diem-den?tab=media');
    await page.locator('.mgrid__item').first().click();
    await expect(page.locator('.mdetail')).toContainText('Đang dùng ở');
    await page.getByRole('button', { name: 'Xóa ảnh' }).click();
    await page.locator('dialog[open]').getByRole('button', { name: 'Xóa ảnh', exact: true }).click();
    await expect(page.locator('.atoast--error')).toContainText('đang được dùng');
  });

  test('/admin/noi-dung opens the articles tab', async ({ page }) => {
    await page.goto('/admin/noi-dung');
    await expect(page.locator('.ct__tabs .is-active')).toHaveText('Bài viết');
    await page.locator('.acard tbody tr').first().click();
    await page.getByLabel('Tiêu đề').fill('Cẩm nang 48 giờ ở Cúc Phương (bản cập nhật)');
    await page.getByRole('button', { name: 'Lưu thay đổi' }).click();
    await expect(page.locator('.atoast')).toContainText('Đã lưu bài viết trong bản demo');
  });
});

test.describe('màn F — Khách hàng', () => {
  test('table, profile tabs, notes and follow-up', async ({ page }) => {
    await page.goto('/admin/khach-hang');
    await expect(page.locator('.crm__left .acard h2').nth(1)).toContainText('256 khách hàng');
    await page.locator('.crm__table tbody tr').first().click();
    await expect(page.locator('.crm__profile')).toContainText('Nguyễn Thị Mai');

    await page.getByRole('tab', { name: 'Lịch sử trao đổi' }).click();
    await page.locator('.crm__history textarea').fill('Khách muốn thêm bữa tối.');
    await page.getByRole('button', { name: 'Lưu ghi chú' }).click();
    await expect(page.locator('.crm__history')).toContainText('Ghi chú nội bộ');

    await page.getByRole('tab', { name: 'Lịch sử đặt phòng' }).click();
    await expect(page.locator('.crm__bookings')).toContainText('booking hợp lệ');

    await page.locator('.crm__follow-form input[type="date"]').fill('2024-11-20');
    await page.locator('.crm__follow-form input:not([type="date"]):not([type="time"])').fill('Gọi xác nhận lịch');
    await page.getByRole('button', { name: 'Thêm hẹn' }).click();
    await expect(page.locator('.crm__follow')).toContainText('Gọi xác nhận lịch');
  });

  test('contact actions never call or send', async ({ page }) => {
    await page.goto('/admin/khach-hang');
    await page.getByRole('button', { name: 'Gọi lại' }).click();
    await expect(page.locator('dialog[open]')).toContainText('không tự gọi hay gửi tin');
    await page.keyboard.press('Escape');
    await page.getByRole('button', { name: 'Chat Zalo' }).click();
    await expect(page.locator('dialog[open]')).toContainText('số điện thoại mẫu');
  });

  test('pipeline stage rules: won needs a booking, handled is different', async ({ page }) => {
    await page.goto('/admin/khach-hang');
    const newCol = page.locator('.pipe__col--new');
    const card = newCol.locator('.pipe__card').first();
    const name = await card.locator('strong').textContent();
    await card.getByRole('button', { name: /Chuyển trạng thái/ }).click();
    await page.getByRole('menuitem', { name: 'Chuyển sang Đã chốt' }).click();
    // The rule only lets an inquiry close when that customer really has a booking.
    const blocked = await page.locator('.atoast--error').count();
    if (blocked) await expect(page.locator('.atoast--error')).toContainText('khách đã có booking hợp lệ');
    else await expect(page.locator('.pipe__col--won')).toContainText(name ?? '');

    const again = page.locator('.pipe__card', { hasText: name ?? '' }).first();
    await again.getByRole('button', { name: /Chuyển trạng thái/ }).click();
    await page.getByRole('menuitem', { name: 'Chuyển sang Đang tư vấn' }).click();
    await expect(page.locator('.pipe__col--consulting')).toContainText(name ?? '');

    await page.locator('.crm__table tbody tr').first().click();
    await page.getByRole('button', { name: 'Đánh dấu đã xử lý' }).click();
    await expect(page.locator('.atoast').last()).toContainText('không đổi thành Đã chốt');
  });

  test('creating a customer warns about duplicate phone numbers', async ({ page }) => {
    await page.goto('/admin/khach-hang');
    const phone = await page.locator('.crm__table tbody tr').first().locator('td').nth(1).textContent();
    await page.getByRole('button', { name: 'Thêm khách hàng' }).click();
    const modal = page.locator('dialog[open]');
    await modal.getByLabel('Họ tên *').fill('Khách thử nghiệm');
    await modal.getByLabel('Số điện thoại *').fill(phone ?? '');
    await modal.getByRole('button', { name: 'Lưu khách hàng' }).click();
    await expect(modal.getByText(/đã có trong hồ sơ/)).toBeVisible();
    await modal.getByLabel('Số điện thoại *').fill('0900 999 999');
    await modal.getByRole('button', { name: 'Lưu khách hàng' }).click();
    await expect(page.locator('.atoast')).toContainText('Đã thêm khách hàng vào bản demo');
  });

  test('/admin/yeu-cau-tu-van opens the inquiry tab', async ({ page }) => {
    await page.goto('/admin/yeu-cau-tu-van');
    await expect(page.locator('.ct__tabs .is-active')).toContainText('Yêu cầu tư vấn');
    await expect(page.locator('.crm__left .acard h2').nth(1)).toContainText('Yêu cầu tư vấn (32)');
  });
});
