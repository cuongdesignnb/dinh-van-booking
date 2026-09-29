import { expect, test } from '@playwright/test';
import { assertLocalPostgresCleanupAvailable, browserApi, cleanupLocalTestInquiry, signInAsOwner } from './admin/helpers';

test('lost contact response survives reload without creating a second inquiry', async ({ browser, page }) => {
  test.setTimeout(90_000);
  assertLocalPostgresCleanupAvailable();
  const baseURL = String(test.info().project.use.baseURL ?? process.env.BASE_URL ?? '');
  expect(baseURL).toMatch(/^http:\/\/(127\.0\.0\.1|localhost):\d+$/);
  const adminContext = await browser.newContext({ baseURL });
  const adminPage = await adminContext.newPage();
  const stamp = Date.now();
  const name = 'Khách kiểm thử nội bộ';
  const phone = `09${String(stamp).slice(-8)}`;
  const marker = `ADMIN-RUN-TO-GOAL-${stamp}`;
  const keys: string[] = [];
  let inquiryId: string | null = null;

  try {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/lien-he');
    await page.locator('input[name="name"]').fill(name);
    await page.locator('input[name="phone"]').fill(phone);
    await page.locator('textarea[name="message"]').fill(marker);
    await page.route('**/api/v1/inquiries', async (route) => {
      const key = route.request().headers()['idempotency-key'];
      keys.push(key);
      if (keys.length === 1) {
        const response = await route.fetch();
        expect(response.status()).toBe(201);
        inquiryId = ((await response.json()) as { id: string }).id;
        await route.abort('failed');
      } else {
        await route.continue();
      }
    });

    await page.getByRole('button', { name: /^Gửi yêu cầu/ }).click();
    await expect(page.locator('.cform__adapter-err')).toContainText('Chưa nhận được xác nhận');
    expect(inquiryId).toBeTruthy();
    expect(keys[0]).toMatch(/^[0-9a-f-]{36}$/i);
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(391);
    const stored = await page.evaluate(() => sessionStorage.getItem('dvb:pending-inquiry'));
    expect(stored).toContain(keys[0]);
    expect(stored).not.toContain(name);
    expect(stored).not.toContain(phone);
    expect(stored).not.toContain(marker);

    await page.reload();
    await expect(page.getByText('Yêu cầu trước chưa có xác nhận trên trình duyệt.')).toBeVisible();
    await page.locator('input[name="name"]').fill(name);
    await page.locator('input[name="phone"]').fill(phone);
    await page.locator('textarea[name="message"]').fill(`${marker}-khac`);
    await page.getByRole('button', { name: /^Gửi yêu cầu/ }).click();
    await expect(page.locator('.cform__adapter-err')).toContainText('Để tránh gửi trùng');
    expect(keys).toHaveLength(1);
    await page.locator('textarea[name="message"]').fill(marker);

    const retried = page.waitForResponse((response) => response.url().endsWith('/api/v1/inquiries') && response.request().method() === 'POST');
    await page.getByRole('button', { name: /^Gửi yêu cầu/ }).click();
    const response = await retried;
    expect(response.status()).toBe(201);
    expect((await response.json() as { id: string }).id).toBe(inquiryId);
    expect(keys).toHaveLength(2);
    expect(keys[1]).toBe(keys[0]);
    await expect(page.getByRole('heading', { name: 'Đã nhận yêu cầu tư vấn' })).toBeVisible();
    expect(await page.evaluate(() => sessionStorage.getItem('dvb:pending-inquiry'))).toBeNull();

    await signInAsOwner(adminPage);
    const inbox = await browserApi(adminPage, `/inquiries?search=${encodeURIComponent(phone)}&page=1&pageSize=10`);
    expect(inbox.status).toBe(200);
    const matching = (inbox.body as { items: Array<{ id: string }> }).items.filter((item) => item.id === inquiryId);
    expect(matching).toHaveLength(1);

    const changedPayload = await page.evaluate(async ({ name, phone, marker, key }) => {
      const csrf = document.cookie.split('; ').find((part) => part.startsWith('dvb_csrf='));
      const response = await fetch('/api/v1/inquiries', {
        method: 'POST', credentials: 'include',
        headers: {
          'content-type': 'application/json',
          'idempotency-key': key,
          ...(csrf ? { 'x-csrf-token': decodeURIComponent(csrf.slice('dvb_csrf='.length)) } : {}),
        },
        body: JSON.stringify({ name, phone, message: `${marker}-changed` }),
      });
      return response.status;
    }, { name, phone, marker, key: keys[0] });
    expect(changedPayload).toBe(409);
    const afterConflict = await browserApi(adminPage, `/inquiries?search=${encodeURIComponent(phone)}&page=1&pageSize=10`);
    expect((afterConflict.body as { items: Array<{ id: string }> }).items.filter((item) => item.id === inquiryId)).toHaveLength(1);
  } finally {
    await adminContext.close();
    if (inquiryId) cleanupLocalTestInquiry({ id: inquiryId, name, phone, marker });
  }
});

test('contact retry after reload uses the original key when the first request never reached the API', async ({ browser, page }) => {
  test.setTimeout(90_000);
  assertLocalPostgresCleanupAvailable();
  const baseURL = String(test.info().project.use.baseURL ?? process.env.BASE_URL ?? '');
  expect(baseURL).toMatch(/^http:\/\/(127\.0\.0\.1|localhost):\d+$/);
  const adminContext = await browser.newContext({ baseURL });
  const adminPage = await adminContext.newPage();
  const stamp = Date.now();
  const name = 'Khách kiểm thử nội bộ';
  const phone = `09${String(stamp).slice(-8)}`;
  const marker = `ADMIN-RUN-TO-GOAL-${stamp}`;
  const keys: string[] = [];
  let inquiryId: string | null = null;

  try {
    await page.goto('/lien-he');
    await page.locator('input[name="name"]').fill(name);
    await page.locator('input[name="phone"]').fill(phone);
    await page.locator('textarea[name="message"]').fill(marker);
    await page.route('**/api/v1/inquiries', async (route) => {
      keys.push(route.request().headers()['idempotency-key']);
      if (keys.length === 1) {
        await route.abort('failed');
      } else {
        const response = await route.fetch();
        expect(response.status()).toBe(201);
        inquiryId = ((await response.json()) as { id: string }).id;
        await route.fulfill({ response });
      }
    });
    await page.getByRole('button', { name: /^Gửi yêu cầu/ }).click();
    await expect(page.locator('.cform__adapter-err')).toContainText('Chưa nhận được xác nhận');
    expect(inquiryId).toBeNull();
    await page.reload();
    await expect(page.getByText('Yêu cầu trước chưa có xác nhận trên trình duyệt.')).toBeVisible();
    await page.locator('input[name="name"]').fill(name);
    await page.locator('input[name="phone"]').fill(phone);
    await page.locator('textarea[name="message"]').fill(marker);
    await page.getByRole('button', { name: /^Gửi yêu cầu/ }).click();
    await expect(page.getByRole('heading', { name: 'Đã nhận yêu cầu tư vấn' })).toBeVisible();
    expect(keys).toHaveLength(2);
    expect(keys[1]).toBe(keys[0]);
    expect(inquiryId).toBeTruthy();

    await signInAsOwner(adminPage);
    const inbox = await browserApi(adminPage, `/inquiries?search=${encodeURIComponent(phone)}&page=1&pageSize=10`);
    expect(inbox.status).toBe(200);
    expect((inbox.body as { items: Array<{ id: string }> }).items.filter((item) => item.id === inquiryId)).toHaveLength(1);
  } finally {
    await adminContext.close();
    if (inquiryId) cleanupLocalTestInquiry({ id: inquiryId, name, phone, marker });
  }
});
