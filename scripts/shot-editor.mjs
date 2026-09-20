import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';

const OUT = 'artifacts/editor';
mkdirSync(OUT, { recursive: true });

const browser = await chromium.launch();
for (const [name, width, height] of [['desktop', 1440, 1000], ['mobile', 390, 844]]) {
  const page = await browser.newPage({ viewport: { width, height }, deviceScaleFactor: 2 });
  await page.goto('http://localhost:3100/admin/noi-dung', { waitUntil: 'networkidle' });
  await page.getByRole('button', { name: 'Bài viết', exact: true }).click();
  await page.getByText('Cẩm nang 48 giờ ở Cúc Phương').first().click();
  await page.waitForSelector('.rte .tiptap');

  // Exercise the toolbar so the screenshot shows real formatting, not an empty state.
  const body = page.locator('.rte .tiptap');
  await body.click();
  await page.keyboard.press('Control+End');
  await page.keyboard.press('Enter');
  await page.getByRole('button', { name: 'Tiêu đề mục' }).click();
  await page.keyboard.type('Gợi ý cho chuyến đi hai ngày');
  await page.keyboard.press('Enter');
  await page.getByRole('button', { name: 'Danh sách', exact: true }).click();
  await page.keyboard.type('Đặt phòng trước ít nhất một tuần vào cuối tuần');
  await page.keyboard.press('Enter');
  await page.keyboard.type('Mang giày đi rừng và áo mưa mỏng');

  const editor = page.locator('.rte');
  await editor.scrollIntoViewIfNeeded();
  await page.waitForTimeout(250);
  await editor.screenshot({ path: `${OUT}/editor-${name}.png` });
  console.log(`${name}: ${await page.locator('.rte__meta').innerText()}`);

  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  console.log(`${name} horizontal overflow: ${overflow}px`);
  await page.close();
}
await browser.close();
