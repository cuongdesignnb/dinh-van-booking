// Screenshots for the six admin screens.
// Usage: node scripts/shoot-admin.mjs [outDir]
import { mkdir } from 'node:fs/promises';
import { chromium } from '@playwright/test';

const BASE = process.env.BASE_URL ?? 'http://localhost:3100';
const OUT = process.argv[2] ?? 'artifacts/admin';

const SCREENS = [
  ['A', '/admin'],
  ['B', '/admin/dat-phong'],
  ['C', '/admin/phong-nghi'],
  ['D', '/admin/combo-du-lich'],
  ['E', '/admin/diem-den'],
  ['F', '/admin/khach-hang'],
];

const SIZES = [
  ['desktop', 1448, 1086],
  ['w1280', 1280, 900],
  ['w1024', 1024, 900],
  ['w768', 768, 1024],
  ['mobile', 390, 844],
];

const browser = await chromium.launch();
const context = await browser.newContext({
  viewport: { width: 1448, height: 1086 },
  deviceScaleFactor: 1,
  locale: 'vi-VN',
  timezoneId: 'Asia/Ho_Chi_Minh',
  reducedMotion: 'reduce',
});
const page = await context.newPage();
const errors = [];
page.on('pageerror', (e) => errors.push(String(e)));
page.on('console', (m) => m.type() === 'error' && !m.text().includes('Failed to load resource') && errors.push(m.text()));

const settle = async () => {
  await page.evaluate(() => document.fonts.ready);
  await page.evaluate(async () => {
    await Promise.all(
      [...document.images].filter((i) => !i.complete).map((i) => new Promise((r) => i.addEventListener('load', r, { once: true }))),
    );
  });
  await page.waitForTimeout(500);
};

for (const [key, route] of SCREENS) {
  const dir = `${OUT}/${key}`;
  await mkdir(dir, { recursive: true });
  for (const [name, width, height] of SIZES) {
    await page.setViewportSize({ width, height });
    await page.goto(BASE + route, { waitUntil: 'load' });
    await settle();
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    await page.screenshot({ path: `${dir}/${name}.png` });
    if (name === 'desktop' || name === 'mobile') await page.screenshot({ path: `${dir}/${name}-full.png`, fullPage: true });
    console.log(`${key} ${name} ${width}x${height} overflow=${overflow}`);
  }
}

// Extended states requested by the brief.
await page.setViewportSize({ width: 1448, height: 1086 });

const shot = async (file) => {
  await page.waitForTimeout(450);
  await page.screenshot({ path: `${OUT}/states/${file}.png` });
  console.log('state', file);
};
await mkdir(`${OUT}/states`, { recursive: true });

await page.goto(`${BASE}/admin/dat-phong?status=pending_confirmation`, { waitUntil: 'load' });
await settle();
await page.locator('.bk__table tbody tr').first().click();
await shot('B-selected-booking');
await page.getByRole('button', { name: 'Xác nhận', exact: true }).click();
await shot('B-confirm-dialog');
await page.keyboard.press('Escape');
await page.getByRole('button', { name: 'Hủy đơn' }).click();
await page.locator('dialog[open]').getByRole('button', { name: 'Hủy đơn', exact: true }).click();
await shot('B-cancel-validation');
await page.keyboard.press('Escape');
await page.goto(`${BASE}/admin/dat-phong?action=create`, { waitUntil: 'load' });
await settle();
await shot('B-create-drawer');

await page.goto(`${BASE}/admin/phong-nghi`, { waitUntil: 'load' });
await settle();
await page.locator('.pcard').first().getByRole('button', { name: 'Chỉnh sửa' }).click();
await shot('C-property-editor');
await page.keyboard.press('Escape');
await page.getByRole('button', { name: 'Thêm mùa' }).click();
await page.getByLabel('Tên mùa').fill('Mùa hè 2025');
await shot('C-season-modal');
await page.keyboard.press('Escape');
await page.locator('.pr__cell').first().click();
await shot('C-inventory-dialog');
await page.keyboard.press('Escape');

await page.goto(`${BASE}/admin/combo-du-lich`, { waitUntil: 'load' });
await settle();
await page.locator('.ccard').first().getByRole('button', { name: /Thao tác cho/ }).click();
await page.getByRole('menuitem', { name: 'Chỉnh sửa' }).click();
await shot('D-combo-editor');
await page.keyboard.press('Escape');

await page.goto(`${BASE}/admin/diem-den?tab=media`, { waitUntil: 'load' });
await settle();
await page.locator('.mgrid__item').first().click();
await shot('E-media-library');
await page.goto(`${BASE}/admin/diem-den`, { waitUntil: 'load' });
await settle();
await page.getByRole('tab', { name: 'SEO' }).click();
await shot('E-seo-tab');

await page.goto(`${BASE}/admin/khach-hang`, { waitUntil: 'load' });
await settle();
await page.locator('.crm__table tbody tr').first().click();
await page.getByRole('tab', { name: 'Lịch sử trao đổi' }).click();
await shot('F-customer-history');
await page.getByRole('button', { name: 'Chat Zalo' }).click();
await shot('F-contact-preview');

console.log(errors.length ? `console errors: ${errors.join(' | ')}` : 'no console errors');
await browser.close();
