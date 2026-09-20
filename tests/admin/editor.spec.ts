import { expect, test, type Page } from '@playwright/test';

/** Opens the article editor on the content screen. */
async function openArticleEditor(page: Page) {
  await page.goto('/admin/noi-dung');
  await page.getByRole('button', { name: 'Bài viết', exact: true }).click();
  await page.getByText('Cẩm nang 48 giờ ở Cúc Phương').first().click();
  await expect(page.locator('.rte .tiptap')).toBeVisible();
}

test.describe('Trình soạn thảo nội dung', () => {
  test('hiển thị thanh công cụ tiếng Việt và vùng soạn thảo', async ({ page }) => {
    await openArticleEditor(page);

    const toolbar = page.getByRole('toolbar', { name: 'Định dạng văn bản' });
    await expect(toolbar).toBeVisible();
    for (const label of ['In đậm', 'In nghiêng', 'Gạch chân', 'Tiêu đề mục', 'Danh sách', 'Trích dẫn', 'Chèn liên kết']) {
      await expect(toolbar.getByRole('button', { name: label, exact: true })).toBeVisible();
    }

    // Loaded from the fixture text, so the editor is never empty on open.
    await expect(page.locator('.rte .tiptap')).toContainText('Nội dung chi tiết');
  });

  test('áp dụng in đậm và tiêu đề, nút phản ánh trạng thái', async ({ page }) => {
    await openArticleEditor(page);
    const body = page.locator('.rte .tiptap');
    const bold = page.getByRole('button', { name: 'In đậm', exact: true });

    await body.click();
    await page.keyboard.press('Control+End');
    await page.keyboard.press('Enter');
    await bold.click();
    await expect(bold).toHaveAttribute('aria-pressed', 'true');
    await page.keyboard.type('Chú ý quan trọng');
    await expect(body.locator('strong')).toHaveText('Chú ý quan trọng');

    await page.keyboard.press('Enter');
    await page.getByRole('button', { name: 'Tiêu đề mục', exact: true }).click();
    await page.keyboard.type('Lịch trình gợi ý');
    await expect(body.locator('h2')).toHaveText('Lịch trình gợi ý');
  });

  test('danh sách hiển thị dấu đầu dòng dù site reset list-style', async ({ page }) => {
    await openArticleEditor(page);
    const body = page.locator('.rte .tiptap');

    await body.click();
    await page.keyboard.press('Control+End');
    await page.keyboard.press('Enter');
    await page.getByRole('button', { name: 'Danh sách', exact: true }).click();
    await page.keyboard.type('Mang theo áo mưa');

    const list = body.locator('ul').last();
    await expect(list).toHaveCSS('list-style-type', 'disc');
    await expect(list.locator('li')).toHaveText(['Mang theo áo mưa']);
  });

  test('từ chối liên kết javascript: và giữ liên kết an toàn', async ({ page }) => {
    await openArticleEditor(page);
    const body = page.locator('.rte .tiptap');

    await body.click();
    await page.keyboard.press('Control+End');
    await page.keyboard.press('Enter');
    await page.keyboard.type('Xem bản đồ');
    await page.keyboard.press('Shift+Home');

    await page.getByRole('button', { name: 'Chèn liên kết', exact: true }).click();
    const field = page.getByLabel('Địa chỉ liên kết');
    await field.fill('javascript:alert(1)');
    await page.getByRole('button', { name: 'Áp dụng' }).click();
    await expect(page.locator('.rte__link-error')).toContainText('Chỉ nhận http(s)');
    await expect(body.locator('a')).toHaveCount(0);

    await field.fill('https://cucphuongtourism.com.vn');
    await page.getByRole('button', { name: 'Áp dụng' }).click();
    await expect(body.locator('a')).toHaveAttribute('href', 'https://cucphuongtourism.com.vn');
  });

  test('lưu được và giữ nội dung sau khi mở lại', async ({ page }) => {
    await openArticleEditor(page);
    const body = page.locator('.rte .tiptap');

    await body.click();
    await page.keyboard.press('Control+End');
    await page.keyboard.press('Enter');
    await page.keyboard.type('Đoạn kiểm thử soạn thảo.');

    await page.getByRole('button', { name: 'Lưu thay đổi' }).click();
    await expect(page.locator('.atoast').last()).toContainText('Đã lưu bài viết');

    await page.reload();
    await page.getByRole('button', { name: 'Bài viết', exact: true }).click();
    await page.getByText('Cẩm nang 48 giờ ở Cúc Phương').first().click();
    await expect(page.locator('.rte .tiptap')).toContainText('Đoạn kiểm thử soạn thảo.');
  });

  test('đếm từ và không tràn ngang ở các bề ngang', async ({ page }) => {
    for (const width of [1440, 1024, 768, 390]) {
      await page.setViewportSize({ width, height: 900 });
      await openArticleEditor(page);
      await expect(page.locator('.rte__meta')).toContainText('từ');
      const overflow = await page.evaluate(
        () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
      );
      expect(overflow, `tràn ngang ở ${width}px`).toBeLessThanOrEqual(0);
    }
  });
});
