import { expect, test, type Page } from '@playwright/test';

const PAGES = [
  ['/phong-nghi', 'Phòng nghỉ Cúc Phương', 'Phòng nghỉ'],
  ['/phong-nghi/cuc-phuong-forest-homestay', 'Cúc Phương Forest Homestay', 'Phòng nghỉ'],
  ['/combo-du-lich', 'Combo du lịch Cúc Phương – Ninh Bình', 'Combo du lịch'],
  ['/diem-den', 'Cúc Phương - Ninh Bình', 'Điểm đến'],
  ['/lien-he', 'Rất vui được lắng nghe', 'Liên hệ'],
] as const;

/** A fixed future stay (relative to today) so tests never depend on the calendar date. */
const future = (days: number) => {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};
const IN = future(40);
const OUT = future(42);
const CHECKOUT = `/dat-phong?stay=cuc-phuong-forest-homestay&room=standard-garden&checkIn=${IN}&checkOut=${OUT}&adults=2&children=0&rooms=1`;

const collectErrors = (page: Page) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  page.on('console', (m) => {
    if (m.type() === 'error' && !m.text().includes('Failed to load resource')) errors.push(m.text());
  });
  return errors;
};

test.describe('desktop pages', () => {
  test.use({ viewport: { width: 1448, height: 1086 } });

  for (const [path, h1, active] of PAGES) {
    test(`${path}: one h1, active menu, fonts, no errors`, async ({ page }) => {
      const errors = collectErrors(page);
      await page.goto(path);
      await expect(page.locator('h1')).toHaveCount(1);
      await expect(page.locator('h1')).toContainText(h1);
      await expect(page.locator('.nav [aria-current="page"]')).toHaveText(active);
      const text = await page.evaluate(() => document.body.innerText);
      expect(text).not.toMatch(/Ä‘|Æ°|áº|á»|�|Đinh Văn|undefined/);
      const bad = await page.evaluate(() =>
        [...document.querySelectorAll('button[aria-label]:not(.dot-btn), a[aria-label]')]
          .filter((b) => b.getClientRects().length && !b.textContent?.trim() && !b.querySelector('img'))
          .filter((b) => {
            const r = b.querySelector('svg')?.getBoundingClientRect();
            return !r || !r.width || !r.height;
          })
          .map((b) => b.getAttribute('aria-label')),
      );
      expect(bad).toEqual([]);
      expect(await page.locator('a[href="#"]').count()).toBe(0);
      expect(errors).toEqual([]);
    });
  }

  test('listing: filters, counts, URL, reset, view, empty, back/forward', async ({ page }) => {
    await page.goto('/phong-nghi');
    await expect(page.locator('#stays-count')).toHaveText('Có 8 kết quả phù hợp');
    await expect(page.locator('.stays-results > li')).toHaveCount(8);

    await page.locator('.filters').getByText('Eco Lodge', { exact: true }).click();
    await expect(page).toHaveURL(/types=eco-lodge/);
    await expect(page.locator('#stays-count')).toHaveText('Có 1 kết quả phù hợp');
    // OR within a group
    await page.locator('.filters').getByText('Nhà sàn', { exact: true }).click();
    await expect(page.locator('#stays-count')).toHaveText('Có 2 kết quả phù hợp');
    // AND between groups: pool only exists on the Eco Lodge
    await page.getByRole('button', { name: /Tiện ích/ }).first().click();
    await page.locator('.popover').getByText('Có bếp').click();
    await page.locator('.popover').getByRole('button', { name: 'Áp dụng' }).click();
    await expect(page.locator('.state-box')).toContainText('Chưa có chỗ nghỉ phù hợp với bộ lọc này');

    await page.goBack();
    await expect(page.locator('#stays-count')).toHaveText('Có 2 kết quả phù hợp');
    await page.getByRole('button', { name: /Đặt lại/ }).first().click();
    await expect(page.locator('#stays-count')).toHaveText('Có 8 kết quả phù hợp');

    // price slider via keyboard
    await page.getByRole('slider', { name: 'Giá tối đa' }).focus();
    for (let i = 0; i < 26; i++) await page.keyboard.press('ArrowLeft');
    await expect(page).toHaveURL(/max=700000/);
    await expect(page.locator('#stays-count')).toHaveText('Có 4 kết quả phù hợp');

    await page.getByRole('button', { name: 'Dạng danh sách' }).click();
    await expect(page.locator('.stays-results--list')).toBeVisible();
    await expect(page.locator('#stays-count')).toHaveText('Có 4 kết quả phù hợp');

    // sort by price ascending
    await page.goto('/phong-nghi?sort=price-asc');
    await expect(page.locator('.lcard__name').first()).toHaveText('Green Valley Homestay');
  });

  test('listing: loading, error, extended pagination', async ({ page }) => {
    await page.goto('/phong-nghi?demo=loading');
    await expect(page.locator('.lcard--skeleton')).toHaveCount(8);
    await page.goto('/phong-nghi?demo=error');
    await expect(page.locator('.state-box')).toContainText('Chưa tải được');
    await page.getByRole('button', { name: 'Thử lại' }).click();
    await expect(page.locator('.stays-results > li')).toHaveCount(8);
    await page.goto('/phong-nghi?fixture=extended');
    await expect(page.locator('#stays-count')).toHaveText('Có 16 kết quả phù hợp');
    await page.locator('.stays-bottom__pager').getByRole('button', { name: 'Trang 2' }).click();
    await expect(page).toHaveURL(/page=2/);
    await expect(page.locator('.stays-results > li')).toHaveCount(8);
    await expect(page.locator('.lcard__name').filter({ hasText: 'bản sao demo' })).not.toHaveCount(0);
  });

  test('listing → detail → checkout keeps the selection; heart does not navigate', async ({ page }) => {
    await page.goto(`/phong-nghi?checkIn=${IN}&checkOut=${OUT}&adults=2&children=0&rooms=1`);
    await page.getByRole('button', { name: 'Lưu Cúc Phương Eco Lodge' }).click();
    await expect(page).toHaveURL(/\/phong-nghi\?/);
    await page.getByRole('link', { name: 'Xem chi tiết Cúc Phương Forest Homestay' }).click();
    await expect(page).toHaveURL(new RegExp(`/phong-nghi/cuc-phuong-forest-homestay\\?checkIn=${IN}`));

    // CTA without room scrolls to room types
    await page.getByRole('button', { name: /Đặt phòng ngay/ }).click();
    await expect(page.locator('.rooms__hint')).toBeVisible();
    await expect(page.locator('.bcard__error')).toContainText('chọn loại phòng');

    await page.getByRole('button', { name: 'Chọn Bungalow Family' }).click();
    await expect(page.locator('.bcard__price strong')).toHaveText('1.200.000đ');
    await page.getByRole('button', { name: 'Chọn Phòng Standard Garden' }).click();
    await expect(page.locator('.bcard__price strong')).toHaveText('650.000đ');

    await page.getByRole('button', { name: /Đặt phòng ngay/ }).click();
    await expect(page).toHaveURL(/\/dat-phong\?/);
    const url = new URL(page.url());
    expect(url.searchParams.get('room')).toBe('standard-garden');
    expect(url.searchParams.get('checkIn')).toBe(IN);
    expect([...url.searchParams.keys()].some((k) => /price|total/i.test(k))).toBe(false);
    await expect(page.locator('.co-summary__room')).toContainText('Phòng Standard Garden');

    // favourite synced back on the homepage (same id)
    await page.goto('/');
    await expect(page.getByRole('button', { name: 'Bỏ lưu Cúc Phương Eco Lodge' })).toBeVisible();
  });

  test('detail: capacity, gallery dialog, host, not-found', async ({ page }) => {
    await page.goto(`/phong-nghi/cuc-phuong-forest-homestay?checkIn=${IN}&checkOut=${OUT}&adults=3&children=0&rooms=1`);
    await page.getByRole('button', { name: 'Chọn Phòng Standard Garden' }).click();
    await page.getByRole('button', { name: /Đặt phòng ngay/ }).click();
    await expect(page.locator('.bcard__error')).toContainText('tối đa 2 khách');
    await expect(page).toHaveURL(/phong-nghi\/cuc-phuong/);

    await page.getByRole('button', { name: /Xem tất cả \d+ ảnh/ }).click();
    const dlg = page.locator('dialog[open]');
    await expect(dlg.locator('.gview__cap')).toContainText('1 / 6');
    await page.keyboard.press('ArrowRight');
    await expect(dlg.locator('.gview__cap')).toContainText('2 / 6');
    await page.keyboard.press('Escape');
    await expect(dlg).toHaveCount(0);

    await page.getByRole('button', { name: 'Xem hồ sơ chủ nhà' }).click();
    await expect(page.locator('dialog[open]')).toContainText('khác với người tư vấn Đinh Vân');
    await page.keyboard.press('Escape');

    const res = await page.goto('/phong-nghi/khong-ton-tai');
    expect(res?.status()).toBe(404);
    await expect(page.locator('h1')).toHaveText('Không tìm thấy chỗ nghỉ này');
  });

  test('combos: chips, sort, dialog per combo, CTA carries context', async ({ page }) => {
    await page.goto('/combo-du-lich');
    await expect(page.locator('.ccard:not(.ccard--skeleton)')).toHaveCount(6);
    await page.getByRole('button', { name: '3N2D' }).click();
    await expect(page.locator('.ccard')).toHaveCount(2);
    await page.getByRole('button', { name: 'Tất cả combo' }).click();
    await expect(page.locator('.ccard')).toHaveCount(6);
    await page.getByLabel('Sắp xếp theo').selectOption('price-asc');
    await expect(page.locator('.ccard__title').first()).toHaveText('Tràng An – Bái Đính');

    await page.getByRole('button', { name: 'Xem chi tiết Ninh Bình trọn vẹn' }).click();
    await expect(page.locator('dialog[open] h2').first()).toHaveText('Ninh Bình trọn vẹn');
    await page.keyboard.press('Escape');
    await expect(page.locator('dialog[open]')).toHaveCount(0);
    await page.getByRole('button', { name: 'Xem chi tiết Team building Ninh Bình' }).click();
    await expect(page.locator('dialog[open] h2').first()).toHaveText('Team building Ninh Bình');
    await page.locator('dialog[open] textarea').fill('Nhóm 12 người, muốn lịch trình nhẹ.');
    await page.getByRole('button', { name: 'Nhờ Đinh Vân tư vấn combo này' }).click();
    await expect(page).toHaveURL(/\/lien-he\?intent=combo&item=team-building-ninh-binh/);
    expect(page.url()).not.toContain('Nh%C3%B3m');
    await expect(page.locator('.cform__context')).toContainText('Team building Ninh Bình');
    await expect(page.locator('textarea[name="message"]')).toHaveValue('Nhóm 12 người, muốn lịch trình nhẹ.');
  });

  test('destinations: filters, dialog, tabs, seasons, map', async ({ page }) => {
    await page.goto('/diem-den');
    await expect(page.locator('.dcard')).toHaveCount(6);
    await page.getByRole('button', { name: 'Ẩm thực', exact: true }).click();
    await expect(page.locator('.dcard')).toHaveCount(1);
    await page.getByRole('button', { name: 'Gia đình', exact: true }).click();
    await expect(page.locator('.dcard')).not.toHaveCount(0);
    await page.getByRole('button', { name: 'Tất cả', exact: true }).click();

    await page.getByRole('button', { name: 'Xem chi tiết Hang Múa' }).click();
    await expect(page.locator('dialog[open] h2')).toHaveText('Hang Múa');
    await expect(page.locator('dialog[open]')).toContainText('Liên hệ để được tư vấn thông tin phù hợp thời điểm đi');
    await page.keyboard.press('Escape');

    const tabs = page.getByRole('tab');
    await tabs.first().focus();
    await page.keyboard.press('ArrowRight');
    await expect(page.getByRole('tab', { name: /2 ngày 1 đêm/ })).toHaveAttribute('aria-selected', 'true');
    await expect(page.getByRole('tabpanel')).toContainText('Ngày 1 — Rừng Cúc Phương');
    await expect(page.getByRole('tab', { name: /2 ngày 1 đêm/ })).toBeFocused();
    await page.keyboard.press('End');
    await expect(page.getByRole('tabpanel')).toContainText('Ngày 3');

    await page.getByRole('button', { name: /Mùa thu/ }).click();
    await expect(page.locator('dialog[open]')).toContainText('không phải dự báo thời tiết');
    await page.keyboard.press('Escape');

    await page.getByRole('button', { name: 'Hồ Yên Quang — xem chi tiết' }).click();
    await expect(page.locator('dialog[open] h2')).toHaveText('Hồ Yên Quang');
  });

  test('contact form: validation, preview only, no PII in URL/storage', async ({ page }) => {
    await page.goto('/lien-he?intent=destination&item=hang-mua');
    await expect(page.locator('.cform__context')).toContainText('Hang Múa');
    await page.getByRole('button', { name: 'Bỏ ngữ cảnh Hang Múa' }).click();
    await expect(page.locator('.cform__context')).toHaveCount(0);

    const submit = page.getByRole('button', { name: 'Gửi yêu cầu tư vấn ngay' });
    await submit.click();
    await expect(page.getByText('Vui lòng nhập họ và tên')).toBeVisible();
    await expect(page.getByText('Vui lòng nhập số điện thoại')).toBeVisible();
    await expect(page.locator('input[name="name"]')).toBeFocused();

    await page.locator('input[name="name"]').fill('Nguyễn Thị Ánh Tuyết');
    await page.locator('input[name="phone"]').fill('abc');
    await submit.click();
    await expect(page.getByText('Vui lòng kiểm tra số điện thoại')).toBeVisible();
    await page.locator('input[name="phone"]').fill('+84 912 345 678');
    await page.locator('textarea[name="message"]').fill('x'.repeat(501));
    await submit.click();
    await expect(page.getByText('Lời nhắn tối đa 500 ký tự')).toBeVisible();
    await page.locator('textarea[name="message"]').fill('x'.repeat(500));
    await submit.click();

    const dlg = page.locator('dialog[open]');
    await expect(dlg).toContainText('yêu cầu chưa được gửi đến Đinh Vân');
    await expect(dlg).not.toContainText(/thành công/i);
    await dlg.getByRole('button', { name: 'Quay lại chỉnh sửa' }).click();
    await expect(page.locator('input[name="name"]')).toHaveValue('Nguyễn Thị Ánh Tuyết');

    expect(page.url()).not.toMatch(/Nguy|912|phone|name=/);
    const stored = await page.evaluate(() => JSON.stringify({ ...localStorage }) + JSON.stringify({ ...sessionStorage }));
    expect(stored).not.toContain('912');

    await page.goto('/lien-he?demo=adapter-error');
    await page.locator('input[name="name"]').fill('An');
    await page.locator('input[name="phone"]').fill('0912345678');
    await page.getByRole('button', { name: 'Gửi yêu cầu tư vấn ngay' }).click();
    await expect(page.locator('.cform__adapter-err')).toContainText('Dữ liệu bạn nhập vẫn được giữ nguyên');
  });

  test('checkout: baseline totals, add-ons, coupon, plans, review, never "success"', async ({ page }) => {
    await page.goto(`${CHECKOUT}&scenario=baseline`);
    const total = page.locator('.co-total strong');
    const due = page.locator('.co-due p').first().locator('strong');
    await expect(total).toHaveText('2.520.000đ');
    await expect(due).toHaveText('756.000đ');
    await expect(page.locator('.co-due__rest')).toContainText('1.764.000đ');

    await page.getByText('Tour khám phá Cúc Phương', { exact: true }).click();
    await expect(total).toHaveText('1.710.000đ');
    await expect(due).toHaveText('513.000đ');
    await page.getByText('Tour khám phá Cúc Phương', { exact: true }).click();

    await page.getByRole('button', { name: 'Xóa mã' }).click();
    await expect(total).toHaveText('2.800.000đ');
    await page.locator('.co-coupon input').fill('sai-ma');
    await page.getByRole('button', { name: 'Áp dụng' }).click();
    await expect(page.locator('.co-err')).toContainText('không hợp lệ');
    await expect(page.locator('.co-lines__discount')).toHaveCount(0);
    await page.locator('.co-coupon input').fill(' dvan10 ');
    await page.getByRole('button', { name: 'Áp dụng' }).click();
    await page.getByRole('button', { name: 'Áp dụng' }).click();
    await expect(total).toHaveText('2.520.000đ');

    await page.getByText('Xe đón tiễn sân bay', { exact: true }).click();
    await expect(total).toHaveText('2.790.000đ');
    await expect(due).toHaveText('837.000đ');
    await page.getByText('Xe đón tiễn sân bay', { exact: true }).click();

    await page.getByText('Thanh toán toàn bộ', { exact: true }).click();
    await expect(due).toHaveText('2.520.000đ');
    await expect(page.locator('.co-due__rest')).toContainText('Không còn khoản thanh toán');
    // method is independent of plan
    await page.getByRole('button', { name: /Chuyển khoản ngân hàng/ }).click();
    await expect(page.getByText('Thanh toán toàn bộ', { exact: true })).toBeVisible();
    await expect(page.locator('.co-method-panel')).toContainText('đang được cập nhật');

    const cta = page.locator('.co-cta');
    await cta.click();
    await expect(page.locator('input[autocomplete="name"]')).toBeFocused();
    await page.locator('input[autocomplete="name"]').fill('Trần Minh Quân');
    await page.locator('input[autocomplete="tel"]').fill('0912 345 678');
    await page.locator('input[autocomplete="email"]').fill('khong-hop-le');
    await cta.click();
    await expect(page.getByText('Vui lòng kiểm tra địa chỉ email')).toBeVisible();
    await page.locator('input[autocomplete="email"]').fill('quan@example.com');
    await cta.click();

    await expect(page.getByRole('heading', { name: 'Kiểm tra thông tin đặt phòng' })).toBeVisible();
    await expect(page.locator('[aria-current="step"]')).toContainText('Xác nhận');
    await page.getByRole('button', { name: 'Xem trước yêu cầu' }).click();
    await expect(page.getByText('Vui lòng xác nhận bạn đã kiểm tra thông tin.')).toBeVisible();
    await page.getByLabel('Tôi đã kiểm tra các thông tin trên.').check();
    await page.getByRole('button', { name: 'Xem trước yêu cầu' }).click();
    const dlg = page.locator('dialog[open]');
    await expect(dlg).toContainText('chưa được gửi, chưa có phòng nào được giữ');
    const body = await page.evaluate(() => document.body.innerText);
    expect(body).not.toMatch(/đặt phòng thành công|đã thanh toán|mã đặt phòng/i);
    expect(page.url()).not.toMatch(/Qu%C3%A2n|quan%40|0912/);
  });

  test('checkout without selection shows an empty state', async ({ page }) => {
    await page.goto('/dat-phong');
    await expect(page.getByRole('heading', { name: 'Bạn chưa chọn phòng nghỉ' })).toBeVisible();
    await page.goto('/dat-phong?stay=cuc-phuong-forest-homestay&room=standard-garden&checkIn=2020-01-01&checkOut=2020-01-03&price=1');
    await expect(page.getByRole('heading', { name: 'Ngày lưu trú chưa hợp lệ' })).toBeVisible();
  });

  test('header search opens the search dialog on pages without a search form', async ({ page }) => {
    await page.goto('/combo-du-lich');
    await page.getByRole('button', { name: 'Tìm phòng', exact: true }).first().click();
    await expect(page.locator('dialog[open] h2')).toHaveText('Tìm phòng nghỉ');
  });
});

for (const [width, height] of [
  [1024, 900],
  [768, 1024],
  [390, 844],
] as const) {
  test(`responsive ${width}px: all pages without horizontal overflow`, async ({ page }) => {
    await page.setViewportSize({ width, height });
    for (const path of [...PAGES.map((p) => p[0]), `${CHECKOUT}&scenario=baseline`]) {
      await page.goto(path);
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
      expect(overflow, path).toBeLessThanOrEqual(0);
    }
  });
}

test('mobile listing filter drawer applies with a result count', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/phong-nghi');
  await page.getByRole('button', { name: /^Lọc/ }).click();
  const drawer = page.locator('dialog[open]');
  await drawer.getByText('Bungalow', { exact: true }).click();
  await expect(drawer.getByRole('button', { name: /Áp dụng \(1 kết quả\)/ })).toBeVisible();
  await drawer.getByRole('button', { name: /Áp dụng/ }).click();
  await expect(page.locator('#stays-count')).toHaveText('Có 1 kết quả phù hợp');
});
