// Usage: node scripts/ui-demo/about-admin-e2e.mjs [baseUrl] [screenshot.png]
// Real-stack check of the "Trang Về mình" Admin form: edits the intro in the
// TipTap editor, picks a local-card image with the Media Library picker and
// reorders a value, saves, confirms /ve-minh shows the change, then undoes the
// same edits through the form and verifies the stored setting equals the
// original byte for byte. Also probes the backend validation with bad input.
import { readFileSync } from 'node:fs';
import { chromium } from '@playwright/test';

const [base = 'http://localhost:18473', shot = 'artifacts/ui-redesign-v2/about-admin-1440.png'] = process.argv.slice(2);
const password = readFileSync(new URL('../../.secrets/owner_password', import.meta.url), 'utf8').trim();
const marker = `E2E-${Date.now().toString(36)}`;
const result = { base, marker, steps: [] };
const stable = (value) => JSON.stringify(value, (_, x) => (x && typeof x === 'object' && !Array.isArray(x) ? Object.fromEntries(Object.entries(x).sort(([a], [b]) => a.localeCompare(b))) : x));
const step = (name, ok, detail) => { result.steps.push({ name, ok, ...(detail === undefined ? {} : { detail }) }); if (!ok) throw new Error(`${name} failed: ${JSON.stringify(detail)}`); };

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
const errors = [];
page.on('pageerror', (error) => errors.push(String(error)));
page.on('dialog', (dialog) => void dialog.accept());

const api = (path, init) => page.evaluate(async ({ path, init }) => {
  const csrf = document.cookie.split('; ').find((value) => value.startsWith('dvb_csrf='))?.slice('dvb_csrf='.length);
  const response = await fetch(`/api/v1${path}`, { ...init, credentials: 'include', headers: { 'content-type': 'application/json', ...(csrf ? { 'x-csrf-token': decodeURIComponent(csrf) } : {}) } });
  return { status: response.status, body: await response.json().catch(() => null) };
}, { path, init });
const aboutSetting = async () => (await api('/settings')).body.items.find((item) => item.key === 'about.page');
const card = page.locator('[data-setting-key="about.page"]');
const save = async () => {
  await card.getByRole('button', { name: 'Lưu thay đổi' }).click();
  await page.getByText('Đã lưu cài đặt “Trang Về mình”.').waitFor({ timeout: 30000 });
};
const valueTitles = () => card.locator('[data-about-list="values"] .about-form__item-title').allInnerTexts();
const openAdmin = async () => {
  await page.goto(`${base}/admin/cai-dat`, { waitUntil: 'networkidle' });
  const login = page.locator('#admin-login-title');
  await Promise.race([card.waitFor({ timeout: 60000 }), login.waitFor({ timeout: 60000 })]);
  if (await login.count()) {
    await page.fill('input[type="email"]', 'admin@dinhvan.local');
    await page.fill('input[type="password"]', password);
    await page.getByRole('button', { name: 'Đăng nhập' }).click();
  }
  await card.waitFor({ timeout: 60000 });
  await card.scrollIntoViewIfNeeded();
};
const publicPage = async () => {
  const view = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  const response = await view.goto(`${base}/ve-minh`, { waitUntil: 'load' });
  const info = await view.evaluate(() => ({
    lead: document.querySelector('.cp-page-hero__lead')?.textContent ?? '',
    firstAreaImg: !!document.querySelector('.ab-area .ab-area__img'),
    values: [...document.querySelectorAll('.ab-value h3')].map((node) => node.textContent),
  }));
  await view.close();
  return { status: response?.status(), ...info };
};

try {
  await openAdmin();
  const original = await aboutSetting();
  step('load original setting', !!original?.value?.title, { version: original.version });

  // Backend validation: bad link and a non-Media-Library image are refused, nothing is written.
  const badLink = await api('/settings/about.page', { method: 'PUT', body: JSON.stringify({ expectedVersion: original.version, value: { ...original.value, areas: [{ ...original.value.areas[0], linkTarget: 'https://evil.example' }] } }) });
  const badMedia = await api('/settings/about.page', { method: 'PUT', body: JSON.stringify({ expectedVersion: original.version, value: { ...original.value, portraitMediaId: 'https://example.com/me.jpg' } }) });
  const badRich = await api('/settings/about.page', { method: 'PUT', body: JSON.stringify({ expectedVersion: original.version, value: { ...original.value, story: { type: 'paragraph' } } }) });
  step('backend rejects invalid input', badLink.status === 400 && badMedia.status === 400 && badRich.status === 400, { badLink: badLink.body?.message, badMedia: badMedia.body?.message, badRich: badRich.body?.message });
  step('rejected writes changed nothing', (await aboutSetting()).version === original.version);

  // 1. TipTap: append the marker to the intro.
  const intro = card.locator('#about-form-hero .ProseMirror').first();
  await intro.click();
  await page.keyboard.press('Control+End');
  await page.keyboard.type(` ${marker}`);
  // 2. Media Library picker on the first local card.
  const firstArea = card.locator('[data-about-list="areas"] .about-form__item').first();
  await firstArea.getByRole('button', { name: 'Chọn từ thư viện ảnh' }).click();
  const dialog = page.locator('dialog.media-library-dialog[open]');
  await dialog.locator('.media-library__card').first().waitFor({ timeout: 30000 });
  await dialog.locator('.media-library__card').first().click();
  await dialog.waitFor({ state: 'hidden', timeout: 15000 });
  await firstArea.getByRole('button', { name: 'Gỡ ảnh' }).waitFor();
  // 3. Reorder: move value 1 down.
  const before = await valueTitles();
  await card.getByRole('button', { name: 'Chuyển giá trị 1 xuống' }).click();
  const after = await valueTitles();
  step('reorder in form', after[0] === before[1] && after[1] === before[0], { before: before.slice(0, 2), after: after.slice(0, 2) });

  // Jump with the form's own section nav (JS click, so Playwright does not scroll the locked outer page).
  await card.locator('.about-form__nav a').first().evaluate((link) => link.click());
  await page.waitForTimeout(900);
  await page.screenshot({ path: shot });
  await save();
  const saved = await aboutSetting();
  step('saved through Admin', saved.version === original.version + 1 && JSON.stringify(saved.value.intro).includes(marker) && typeof saved.value.areas[0].imageMediaId === 'string', { version: saved.version, imageMediaId: saved.value.areas[0].imageMediaId });

  const changed = await publicPage();
  step('/ve-minh shows the edit', changed.status === 200 && changed.lead.includes(marker) && changed.firstAreaImg && changed.values[0] === after[0], { status: changed.status, firstAreaImg: changed.firstAreaImg, firstValue: changed.values[0] });

  // Undo through the same form.
  await openAdmin();
  const introAgain = card.locator('#about-form-hero .ProseMirror').first();
  await introAgain.click();
  await page.keyboard.press('Control+End');
  for (let i = 0; i < marker.length + 1; i += 1) await page.keyboard.press('Backspace');
  await card.locator('[data-about-list="areas"] .about-form__item').first().getByRole('button', { name: 'Gỡ ảnh' }).click();
  await card.getByRole('button', { name: 'Chuyển giá trị 2 lên' }).click();
  await save();
  const restored = await aboutSetting();
  step('restored value equals original', stable(restored.value) === stable(original.value), { version: restored.version });

  const back = await publicPage();
  step('/ve-minh back to original', back.status === 200 && !back.lead.includes(marker) && !back.firstAreaImg && back.values[0] === before[0]);
  step('no page errors', errors.length === 0, errors);
  result.ok = true;
} catch (error) {
  result.ok = false;
  result.error = String(error);
} finally {
  console.log(JSON.stringify(result, null, 1));
  await browser.close();
  process.exitCode = result.ok ? 0 : 1;
}
