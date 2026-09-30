import { execFileSync } from 'node:child_process';
import { expect, test, type Page } from '@playwright/test';
import { browserApi, OWNER_EMAIL, signInAsOwner } from './admin/helpers';

type Setting = { key: string; value: Record<string, unknown>; version: number; isDefault: boolean };
const BOOTSTRAP_KEYS = [
  'brand.identity', 'brand.contact', 'site.header', 'site.footer', 'home.sections',
  'home.hero', 'home.trust', 'home.why', 'home.featured', 'home.combos',
  'home.destinations', 'home.testimonials', 'home.promo', 'home.contactPanel',
  'home.faq', 'contact.page', 'catalog.staysPage', 'catalog.destinationsPage',
  'catalog.combosPage', 'catalog.bookingPage', 'catalog.staticPages',
  'catalog.articlesPage', 'seo.defaults', 'seo.pages',
];

async function settings(page: Page): Promise<Map<string, Setting>> {
  const response = await browserApi(page, '/settings');
  expect(response.status).toBe(200);
  return new Map(((response.body as { items: Setting[] }).items).map((item) => [item.key, item]));
}

function runBootstrap(...flags: string[]): string {
  const bash = process.env.DVB_BOOTSTRAP_BASH ?? (process.platform === 'win32' ? 'C:\\Program Files\\Git\\bin\\bash.exe' : 'bash');
  return execFileSync(bash, ['scripts/backend.sh', 'seed:public-bootstrap', '--', ...flags, '--actor-email', OWNER_EMAIL], {
    cwd: process.cwd(), encoding: 'utf8', timeout: 180_000, windowsHide: true,
  });
}

test('bootstrapped local public site has presentation without fake catalog or male advisor', async ({ page, request }) => {
  test.skip(process.env.DVB_BOOTSTRAP_E2E !== '1', 'Requires a separately bootstrapped local Docker database.');
  const response = await request.get('/api/v1/public/site');
  expect(response.status()).toBe(200);
  const body = await response.json() as { settings: Record<string, Record<string, unknown>>; assets: Record<string, { src: string; alt: string }> };
  expect(body.settings['brand.identity'].name).toBe('Đinh Vân Booking');
  expect(body.settings['brand.contact'].phone).toBe('0974045828');
  expect(body.settings['brand.contact'].zaloUrl).toBeNull();
  expect(body.settings['seo.defaults'].robotsIndex).toBe(false);
  expect(body.settings['home.contactPanel'].imageMediaId).toBeNull();
  expect(body.settings['contact.page'].advisorImageMediaId).toBeNull();
  const mediaKeys = [
    body.settings['home.hero'].imageMediaId, body.settings['home.promo'].imageMediaId,
    body.settings['catalog.staysPage'].heroImageMediaId,
    body.settings['catalog.destinationsPage'].heroImageMediaId,
    body.settings['catalog.combosPage'].heroImageMediaId,
    body.settings['catalog.bookingPage'].heroImageMediaId,
  ] as string[];
  expect(new Set(mediaKeys).size).toBe(6);
  for (const id of mediaKeys) {
    const asset = body.assets[id];
    expect(asset?.src).toMatch(/^\/media\//);
    expect(asset?.alt?.trim()).toBeTruthy();
    const image = await request.get(asset.src);
    expect(image.status()).toBe(200);
    expect(image.headers()['content-type']).toContain('image/webp');
  }
  await page.goto('/');
  await expect(page.getByRole('heading', { level: 1 })).toContainText('Đặt phòng Cúc Phương');
  await expect(page.locator('.trust__item')).toHaveCount(4);
  await expect(page.locator('.why__item')).toHaveCount(4);
  await expect(page.locator('.home-promo .promo')).toContainText('Không chỉ là');
  await expect(page.locator('.home-faq')).toContainText('Câu hỏi thường gặp');
  await expect(page.locator('.contact')).toContainText('Bạn cần tư vấn riêng?');
  await expect(page.locator('.contact a[href="tel:0974045828"]')).toHaveCount(1);
  await expect(page.locator('.contact__img')).toHaveCount(0);
  await expect(page.locator('.stay-card, .lcard, .review-card')).toHaveCount(0);
  const text = await page.locator('body').innerText();
  expect(text).not.toMatch(/Anh Đinh Vân|anh Vân|người đàn ông|Mộc Sơn Homestay|An Nhiên Retreat|4\.9|650\.000/i);
  const menuResponse = await request.get('/api/v1/public/navigation/primary');
  expect(menuResponse.status()).toBe(200);
  expect(await menuResponse.json() as unknown[]).toHaveLength(5);
  await signInAsOwner(page);
  const adminSettings = await settings(page);
  expect(BOOTSTRAP_KEYS.every((key) => !adminSettings.get(key)?.isDefault)).toBe(true);
});

test('normal apply preserves Admin edit; explicit replace only restores bootstrap keys', async ({ page }) => {
  test.skip(process.env.DVB_BOOTSTRAP_MUTATION_QA !== '1', 'Opt-in local Docker mutation QA only.');
  const baseURL = String(test.info().project.use.baseURL ?? '');
  expect(baseURL).toMatch(/^http:\/\/(127\.0\.0\.1|localhost):\d+$/);
  test.setTimeout(240_000);
  await signInAsOwner(page);
  const baseline = await settings(page);
  const marker = 'ABCXYZ BOOTSTRAP QA ' + Date.now();
  const original = baseline.get('home.hero');
  if (!original || original.value.titleLine1 !== 'Đặt phòng Cúc Phương') throw new Error('Test requires known local bootstrap baseline.');
  const unrelated = baseline.get('booking.rules');
  try {
    const edit = await browserApi(page, '/settings/home.hero', 'PUT', {
      value: { ...original.value, titleLine1: marker }, expectedVersion: original.version,
    });
    expect(edit.status).toBe(200);
    const ordinary = runBootstrap('--apply');
    expect(ordinary).toContain('SETTING_REPLACED=0');
    expect(ordinary).toContain('MEDIA_IMPORTED=0');
    expect((await settings(page)).get('home.hero')?.value.titleLine1).toBe(marker);
    await page.goto('/');
    await expect(page.getByRole('heading', { level: 1 })).toContainText(marker);

    const replacement = runBootstrap('--apply', '--replace-existing');
    expect(replacement).toContain('DVB_PUBLIC_BOOTSTRAP_APPLY=PASS');
    expect(replacement).toContain('REPLACE home.hero BEFORE=');
    const after = await settings(page);
    expect(after.get('home.hero')?.value.titleLine1).toBe('Đặt phòng Cúc Phương');
    expect(JSON.stringify(after.get('booking.rules')?.value)).toBe(JSON.stringify(unrelated?.value));
    await page.reload();
    await expect(page.getByRole('heading', { level: 1 })).toContainText('Đặt phòng Cúc Phương');
  } finally {
    const live = await settings(page);
    for (const key of BOOTSTRAP_KEYS) {
      const before = baseline.get(key)!;
      const current = live.get(key)!;
      if (JSON.stringify(before.value) === JSON.stringify(current.value)) continue;
      const result = await browserApi(page, `/settings/${encodeURIComponent(key)}`, 'PUT', {
        value: before.value, expectedVersion: current.version,
      });
      if (result.status !== 200) throw new Error(`Could not restore ${key}: HTTP ${result.status}`);
    }
  }
});
