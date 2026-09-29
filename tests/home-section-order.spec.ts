import { expect, test, type Page } from '@playwright/test';
import { browserApi, signInAsOwner } from './admin/helpers';

type Setting = { key: string; value: Record<string, unknown>; version: number; isDefault: boolean };
const keys = ['home.sections', 'home.why', 'home.contactPanel', 'home.faq', 'home.promo'];
const allSections = ['hero', 'search', 'trust', 'featured', 'combos', 'why', 'destinations', 'reviews', 'promo', 'faq', 'contact'];

async function settings(page: Page): Promise<Setting[]> {
  const response = await browserApi(page, '/settings');
  expect(response.status).toBe(200);
  return (response.body as { items: Setting[] }).items;
}

async function put(page: Page, key: string, value: Record<string, unknown>): Promise<void> {
  const current = (await settings(page)).find((item) => item.key === key);
  if (!current) throw new Error(`Missing setting ${key}`);
  const response = await browserApi(page, `/settings/${encodeURIComponent(key)}`, 'PUT', { value, expectedVersion: current.version });
  expect(response.status, `Save ${key}: ${JSON.stringify(response.body)}`).toBe(200);
}

async function restore(page: Page, baseline: Setting[]): Promise<void> {
  for (const saved of baseline) {
    const current = (await settings(page)).find((item) => item.key === saved.key);
    if (!current) throw new Error(`Missing setting ${saved.key} during restore`);
    if (saved.isDefault) {
      if (!current.isDefault) {
        const response = await browserApi(page, `/settings/${encodeURIComponent(saved.key)}?expectedVersion=${current.version}`, 'DELETE');
        expect(response.status).toBe(200);
      }
    } else if (JSON.stringify(current.value) !== JSON.stringify(saved.value)) {
      const response = await browserApi(page, `/settings/${encodeURIComponent(saved.key)}`, 'PUT', { value: saved.value, expectedVersion: current.version });
      expect(response.status).toBe(200);
    }
  }
}

test('homepage follows the exact Admin section order, including lower modules, on mobile and desktop', async ({ browser, page }) => {
  test.setTimeout(120_000);
  await signInAsOwner(page);
  const baseline = (await settings(page)).filter((item) => keys.includes(item.key)).map((item) => structuredClone(item));
  expect(baseline).toHaveLength(keys.length);
  const marker = `HOME-ORDER-QA-${Date.now()}`;
  const publicContext = await browser.newContext({ baseURL: String(test.info().project.use.baseURL ?? process.env.BASE_URL ?? 'http://localhost:3100'), reducedMotion: 'reduce' });
  const publicPage = await publicContext.newPage();

  try {
    await put(page, 'home.why', { enabled: true, title: marker + ' WHY', reasons: [{ id: marker, icon: 'user', title: 'Tư vấn thực tế', description: '', enabled: true }] });
    await put(page, 'home.contactPanel', { enabled: true, title: marker + ' CONTACT' });
    await put(page, 'home.faq', { enabled: true, title: marker + ' FAQ', items: [{ id: marker, question: 'Một câu hỏi?', answer: 'Câu trả lời kiểm thử.', enabled: true }] });
    await put(page, 'home.promo', { enabled: true, titleLine1: marker + ' PROMO' });
    await put(page, 'home.sections', { order: ['contact', 'why', 'faq', 'promo', ...allSections.filter((id) => !['contact', 'why', 'faq', 'promo'].includes(id))], hidden: allSections.filter((id) => !['contact', 'why', 'faq', 'promo'].includes(id)) });

    for (const width of [390, 1440]) {
      await publicPage.setViewportSize({ width, height: 900 });
      await publicPage.goto('/');
      const ordered = await publicPage.locator('.home-content-order > [data-home-sections]').evaluateAll((items) =>
        items.flatMap((item) => (item.getAttribute('data-home-sections') ?? '').split(',').filter(Boolean)));
      expect(ordered).toEqual(['contact', 'why', 'faq', 'promo']);
      for (const part of ['CONTACT', 'WHY', 'FAQ', 'PROMO']) await expect(publicPage.getByText(marker + ' ' + part)).toBeVisible();
      expect(await publicPage.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(width + 1);
    }

    await put(page, 'home.sections', { order: ['promo', 'why', 'contact', 'faq', ...allSections.filter((id) => !['promo', 'why', 'contact', 'faq'].includes(id))], hidden: allSections.filter((id) => !['promo', 'why', 'contact', 'faq'].includes(id)) });
    await publicPage.reload();
    const reordered = await publicPage.locator('.home-content-order > [data-home-sections]').evaluateAll((items) =>
      items.flatMap((item) => (item.getAttribute('data-home-sections') ?? '').split(',').filter(Boolean)));
    expect(reordered).toEqual(['promo', 'why', 'contact', 'faq']);
  } finally {
    try { await restore(page, baseline); } finally { await publicContext.close(); }
  }

  const after = await settings(page);
  for (const saved of baseline) {
    const current = after.find((item) => item.key === saved.key);
    expect(current?.isDefault).toBe(saved.isDefault);
    expect(current?.value).toEqual(saved.value);
  }
});
