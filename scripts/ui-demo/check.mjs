// Quick headless check that admin / partner / public screens render with the fictional demo data.
//   export LD_LIBRARY_PATH=/tmp/shot/root/usr/lib/x86_64-linux-gnu   (only on this WSL box)
//   DEMO_BASE_URL=http://127.0.0.1:3199 node scripts/ui-demo/check.mjs [--shots]
import { mkdirSync } from 'node:fs';
import { chromium } from '@playwright/test';
import { installDemoRoutes } from './route.mjs';

const base = process.env.DEMO_BASE_URL || 'http://127.0.0.1:3199';
const shots = process.argv.includes('--shots');
const shotDir = '/tmp/ui-demo-shots';
if (shots) mkdirSync(shotDir, { recursive: true });

const CASES = [
  ['admin', '/admin', ['DV-DEMO-1001', 'Booking theo trạng thái']],
  ['admin', '/admin/dat-phong', ['DV-DEMO-1001', 'Khách Demo']],
  ['admin', '/admin/dat-phong/demo-booking-1', ['Chi tiết DV-DEMO-1001']],
  ['admin', '/admin/phong-nghi', ['Demo · Nhà Rừng Cúc Phương']],
  ['admin', '/admin/hang-phong', ['Phòng Gỗ Hướng Vườn']],
  ['admin', '/admin/ton-phong', ['Demo · Nhà Rừng Cúc Phương', 'Còn phòng']],
  ['admin', '/admin/combo-du-lich', ['Demo · Khám Phá Rừng']],
  ['admin', '/admin/diem-den', ['Demo · Hang Múa']],
  ['admin', '/admin/noi-dung', ['Demo · Cúc Phương mùa nào đẹp nhất?']],
  ['admin', '/admin/chuyen-trang', ['Demo · Chính sách huỷ phòng']],
  ['admin', '/admin/thu-vien-anh', []],
  ['admin', '/admin/khach-hang', ['Khách Demo Nguyễn An']],
  ['admin', '/admin/yeu-cau-tu-van', ['Khách Demo']],
  ['admin', '/admin/doi-tac', ['Demo · Hợp tác xã Thung Nham']],
  ['admin', '/admin/doi-tac?tab=grants', ['Demo · Bungalow Hồ Đồng Chương']],
  ['admin', '/admin/doi-tac/cap-quyen', []],
  ['admin', '/admin/menu', ['/phong-nghi']],
  ['admin', '/admin/cai-dat', ['Thương hiệu']],
  ['admin', '/admin/khuyen-mai', ['DEMOXANH10']],
  ['admin', '/admin/thanh-toan', ['CK-DEMO']],
  ['admin', '/admin/bao-cao', ['Booking tạo trong kỳ']],
  ['partner', '/doi-tac?property=demo-prop-rung', ['Demo · Nhà Rừng Cúc Phương', 'Còn phòng']],
  ['partner', '/doi-tac?property=demo-prop-dong-chuong', ['Demo · Bungalow Hồ Đồng Chương']],
  ['anon', '/doi-tac', ['Đăng nhập']],
  ['anon', '/', ['Demo · Nhà Rừng Cúc Phương']],
  ['anon', '/phong-nghi', ['Demo · Homestay Thung Nham', 'Hết phòng']],
  ['anon', '/lich-phong', ['Demo · Nhà Rừng Cúc Phương']],
];
const ERROR_TEXT = ['Không thực hiện được', 'Không kết nối được', 'Không tải được', 'Application error', 'Đăng nhập quản trị', 'Chưa có cơ sở trong hệ thống'];

const browser = await chromium.launch({ headless: true });
let failures = 0;
for (const [persona, path, expected] of CASES) {
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 }, locale: 'vi-VN', timezoneId: 'Asia/Ho_Chi_Minh' });
  const page = await context.newPage();
  const pageErrors = [], consoleErrors = [];
  page.on('pageerror', (error) => pageErrors.push(error.message));
  page.on('console', (message) => { if (message.type() === 'error') consoleErrors.push(message.text().slice(0, 200)); });
  const log = await installDemoRoutes(page, persona);
  let status = 0;
  try {
    const response = await page.goto(`${base}${path}`, { waitUntil: 'networkidle', timeout: 30_000 });
    status = response?.status() ?? 0;
    if (path === '/lich-phong') {
      await page.getByRole('button', { name: 'Kiểm tra tình trạng phòng' }).click();
      await page.waitForSelector('.availability-result', { timeout: 10_000 }).catch(() => {});
    }
    await page.waitForTimeout(600);
  } catch (error) { pageErrors.push(`navigation: ${error.message}`); }
  const text = await page.evaluate(() => document.body.innerText).catch(() => '');
  const missing = expected.filter((value) => !text.includes(value));
  const errorText = ERROR_TEXT.filter((value) => text.includes(value) && !(persona === 'anon' && value === 'Đăng nhập quản trị'));
  // 404s from the demo route are recorded in log.unhandled; ignore console noise for those.
  const realConsole = consoleErrors.filter((m) => !/Failed to load resource: the server responded with a status of 40[134]/.test(m));
  const okCase = status === 200 && !pageErrors.length && !log.unhandled.length && !log.errors.length && !missing.length && !errorText.length;
  if (!okCase) failures++;
  console.log(`${okCase ? 'OK  ' : 'FAIL'} [${persona}] ${path} status=${status}`
    + (missing.length ? ` missing=${JSON.stringify(missing)}` : '')
    + (errorText.length ? ` errorText=${JSON.stringify(errorText)}` : '')
    + (pageErrors.length ? ` pageErrors=${JSON.stringify(pageErrors)}` : '')
    + (log.unhandled.length ? ` unhandled=${JSON.stringify(log.unhandled)}` : '')
    + (realConsole.length ? ` console=${JSON.stringify(realConsole.slice(0, 3))}` : ''));
  if (shots) await page.screenshot({ path: `${shotDir}/${persona}${path.replace(/[/?=&]+/g, '_') || '_home'}.png`, fullPage: true }).catch(() => {});
  await context.close();
}
await browser.close();
console.log(failures ? `${failures} case(s) failed` : 'All cases passed');
process.exitCode = failures ? 1 : 0;
