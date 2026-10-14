import { expect, test } from '@playwright/test';
import { assertLocalPostgresCleanupAvailable, browserApi, cleanupLocalTestChat, signInAsOwner } from './admin/helpers';

type SettingView = { key: string; value: Record<string, unknown>; version: number };

test('visitor chat reaches the admin inbox, staff takes over and hands back to the AI', async ({ browser, page }) => {
  test.setTimeout(150_000);
  assertLocalPostgresCleanupAvailable();
  const baseURL = String(test.info().project.use.baseURL ?? process.env.BASE_URL ?? '');
  expect(baseURL).toMatch(/^http:\/\/(127\.0\.0\.1|localhost):\d+$/);
  const stamp = Date.now();
  const marker = `LIVECHAT-QA-${stamp}`;
  const phone = `09${String(stamp).slice(-8)}`;
  const visual = process.env.DVB_CHAT_VISUAL_ARTIFACTS === '1';
  const adminContext = await browser.newContext({ baseURL, viewport: { width: 1440, height: 900 } });
  const admin = await adminContext.newPage();
  await signInAsOwner(admin);

  const original = await browserApi(admin, '/settings/chat.widget');
  expect(original.status).toBe(200);
  const widget = original.body as SettingView;
  const enable = await browserApi(admin, '/settings/chat.widget', 'PUT', {
    value: { ...widget.value, enabled: true, greeting: 'Xin chào từ trợ lý kiểm thử' },
    expectedVersion: widget.version,
  });
  expect(enable.status).toBe(200);

  try {
    // Visitor opens the bubble and writes.
    await page.setViewportSize({ width: 1280, height: 860 });
    await page.goto('/');
    await page.locator('.chatl').click();
    const panel = page.locator('#dvb-chat-panel');
    await expect(panel).toBeVisible();
    await expect(panel).toContainText('Xin chào từ trợ lý kiểm thử');
    await panel.getByRole('textbox', { name: 'Tin nhắn' }).fill(`Cho mình hỏi chỗ nghỉ gần rừng ${marker}`);
    await panel.getByRole('button', { name: 'Gửi tin nhắn' }).click();
    await expect(panel.locator('.chatm--visitor').last()).toContainText(marker);
    // Either the AI answers or, with no provider configured locally, the chat is handed to a person.
    await expect(panel.locator('.chatm--ai, .chatm--system').last()).toBeVisible({ timeout: 45_000 });

    // Visitor leaves a phone number: an inquiry is created for the team.
    const leavePhone = panel.getByRole('button', { name: /Để lại SĐT/ });
    if (await leavePhone.isVisible()) await leavePhone.click();
    await panel.getByRole('textbox', { name: 'Số điện thoại' }).fill(phone);
    await panel.getByRole('button', { name: 'Gửi số điện thoại' }).click();
    await expect(panel.locator('.chatm--system').last()).toContainText(/số điện thoại/);

    // Admin sees it, opens it and joins.
    await admin.goto('/admin/tin-nhan');
    await admin.getByRole('tab', { name: /Tất cả/ }).click();
    await admin.getByPlaceholder('Tìm theo tên, số điện thoại hoặc nội dung').fill(marker);
    const row = admin.locator('.chatrow').first();
    await expect(row).toBeVisible({ timeout: 15_000 });
    await expect(row).toContainText('SĐT');
    await row.click();
    await expect(admin.locator('.chatthread__messages')).toContainText(marker);
    await expect(admin.locator('.chatinfo')).toContainText(phone);
    await admin.getByRole('button', { name: 'Tham gia chat' }).click();
    await expect(admin.locator('.chatthread__who')).toContainText('Nhân viên đang chat');

    const reply = `Chào bạn, mình là nhân viên tư vấn ${marker}`;
    await admin.getByRole('textbox', { name: 'Trả lời khách' }).fill(reply);
    await admin.getByRole('button', { name: 'Gửi', exact: true }).click();
    // Delivered to the visitor live (SSE) or by the fallback poll.
    await expect(panel.locator('.chatm--staff').last()).toContainText(reply, { timeout: 20_000 });
    await expect(panel.locator('.chatp__status')).toContainText('đang trò chuyện với bạn');
    if (visual) {
      await page.screenshot({ path: 'artifacts/chat-visitor-1280.png' });
      await admin.screenshot({ path: 'artifacts/chat-admin-1440.png' });
    }

    // Hand back to the AI, then close.
    await admin.getByRole('button', { name: 'Trả lại cho AI' }).click();
    await expect(admin.locator('.chatthread__who')).toContainText('AI đang trả lời');
    await admin.locator('.chatthread__actions').getByRole('button', { name: 'Kết thúc' }).click();
    await admin.getByRole('dialog').getByRole('button', { name: 'Kết thúc cuộc trò chuyện' }).click();
    await expect(admin.locator('.chatthread__who')).toContainText('Đã đóng');
    await expect(panel.locator('.chatm--system').last()).toContainText('kết thúc', { timeout: 20_000 });

    // The inquiry carries the chat source.
    const inquiries = await browserApi(admin, `/inquiries?search=${phone}&page=1&pageSize=5`);
    expect(inquiries.status).toBe(200);
    expect((inquiries.body as { items: Array<{ source: string }> }).items.some((item) => item.source === 'chat')).toBe(true);

    // Mobile: nothing overflows horizontally with the chat open.
    await page.setViewportSize({ width: 390, height: 844 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(391);
    if (visual) await page.screenshot({ path: 'artifacts/chat-visitor-390.png' });
  } finally {
    const current = await browserApi(admin, '/settings/chat.widget');
    const version = (current.body as SettingView).version;
    // Put the setting back exactly as found: reset to the default when it had never been saved.
    if (widget.version === 0) await browserApi(admin, `/settings/chat.widget?expectedVersion=${version}`, 'DELETE');
    else await browserApi(admin, '/settings/chat.widget', 'PUT', { value: widget.value, expectedVersion: version });
    cleanupLocalTestChat({ marker, phone });
    await adminContext.close();
  }
});
