import { execFileSync } from 'node:child_process';
import { expect, test } from '@playwright/test';
import {
  assertLocalPostgresCleanupAvailable,
  browserApi,
  cleanupLocalTestInquiry,
  createUniqueTestPng,
  signInAsOwner,
} from './helpers';

const restartEnabled = process.env.DVB_ADMIN_RESTART_STACK === '1';
test.skip(!restartEnabled, 'Opt-in local-only check: set DVB_ADMIN_RESTART_STACK=1 to recreate api/web/worker.');

type Content = { id: string; version: number; publicationStatus: string; path: string; title: string };
type Property = { id: string; version: number; publicationStatus: string; contentVersion: number; title: string };
type MenuItem = { id?: string; label: string; contentId: string | null; externalUrl: string | null; enabled: boolean };
type SettingBaseline = { value: Record<string, unknown>; version: number; isDefault: boolean };
type MenuBaseline = { isDefault: boolean; items: MenuItem[] };

test('PostgreSQL và media volume giữ CMS, ảnh, settings, inquiry, catalog và menu sau restart', async ({ page }) => {
  test.setTimeout(180_000);
  assertLocalPostgresCleanupAvailable();
  await signInAsOwner(page);

  const stamp = Date.now();
  const articleTitle = `ADMIN-RUN-TO-GOAL-RESTART-${stamp}`;
  const articleSlug = `atg-restart-${stamp}`;
  const propertyCode = `ATG-RST-${stamp}`;
  const propertySlug = `atg-property-restart-${stamp}`;
  const inquiryName = 'Khách kiểm thử nội bộ';
  const inquiryPhone = `09${String(stamp).slice(-8)}`;
  const inquiryMarker = `ADMIN-RUN-TO-GOAL-${stamp}`;
  const mediaAlt = `Ảnh kiểm thử sau restart ${stamp}`;
  const menuLabel = `Trang chủ ATG ${stamp}`;

  let contentId: string | null = null;
  let mediaId: string | null = null;
  let propertyId: string | null = null;
  let inquiryId: string | null = null;
  let settingBaseline: SettingBaseline | null = null;
  let menuBaseline: MenuBaseline | null = null;
  let menuChanged = false;

  try {
    const settingResult = await browserApi(page, '/settings/brand.identity');
    expect(settingResult.status).toBe(200);
    settingBaseline = settingResult.body as SettingBaseline;
    const changedIdentity = {
      ...settingBaseline!.value,
      name: `Đinh Vân — kiểm tra restart ${stamp}`,
    };
    const settingWrite = await browserApi(page, '/settings/brand.identity', 'PUT', {
      value: changedIdentity,
      expectedVersion: settingBaseline!.version,
    });
    expect(settingWrite.status).toBe(200);

    const menuResult = await browserApi(page, '/navigation/primary');
    expect(menuResult.status).toBe(200);
    menuBaseline = menuResult.body as MenuBaseline;
    const menuItems = menuBaseline!.items.length
      ? menuBaseline!.items.map((item, index) => ({
          ...(item.id && /^[0-9a-f]{8}-[0-9a-f-]{27}$/i.test(item.id) ? { id: item.id } : {}),
          label: index === 0 ? menuLabel : item.label,
          contentId: item.contentId,
          externalUrl: item.externalUrl,
          enabled: item.enabled,
        }))
      : [{ label: menuLabel, contentId: null, externalUrl: '/', enabled: true }];
    const menuWrite = await browserApi(page, '/navigation/primary', 'PUT', { items: menuItems });
    expect(menuWrite.status).toBe(200);
    menuChanged = true;

    await page.goto('/admin/thu-vien-anh');
    await page.getByLabel('Alt mặc định cho ảnh tải lên').fill(mediaAlt);
    const uploadResponse = page.waitForResponse((response) =>
      response.url().endsWith('/api/v1/media/upload') && response.request().method() === 'POST',
    );
    await page.locator('.media-library__upload input[type="file"]').setInputFiles({
      name: `atg-restart-${stamp}.png`,
      mimeType: 'image/png',
      buffer: createUniqueTestPng(stamp),
    });
    const uploaded = await uploadResponse;
    expect([200, 201]).toContain(uploaded.status());
    const media = await uploaded.json() as { id: string; url: string; storageKey: string; altText: string; mimeType: string };
    mediaId = media.id;
    expect(media.mimeType).toBe('image/webp');
    expect(media.altText).toBe(mediaAlt);

    const createdContent = await browserApi(page, '/content', 'POST', {
      kind: 'article',
      title: articleTitle,
      slug: articleSlug,
      excerpt: `Persistence check ${stamp}`,
      body: {
        type: 'doc',
        content: [{ type: 'paragraph', content: [{ type: 'text', text: `Database restart persistence marker ${stamp}.` }] }],
      },
      metaTitle: articleTitle,
      metaDescription: `Local restart test ${stamp}`,
      noindex: true,
    });
    expect(createdContent.status).toBe(201);
    contentId = (createdContent.body as Content).id;

    const attached = await browserApi(page, `/content/${contentId}`, 'PUT', {
      expectedVersion: (createdContent.body as Content).version,
      media: [{ mediaId, role: 'cover', position: 0 }],
    });
    expect(attached.status).toBe(200);
    const published = await browserApi(page, `/content/${contentId}/status`, 'PATCH', {
      status: 'published',
      expectedVersion: (attached.body as Content).version,
    });
    expect(published.status).toBe(200);
    expect((published.body as Content).publicationStatus).toBe('published');

    const propertyResult = await browserApi(page, '/properties', 'POST', {
      title: `ATG property restart ${stamp}`,
      code: propertyCode,
      kind: 'Homestay',
      area: 'Cúc Phương, Ninh Bình (kiểm thử local)',
      address: 'Bản ghi tự động kiểm thử, không phải nơi lưu trú bán thật.',
      slug: propertySlug,
      description: `Property persistence marker ${stamp}.`,
      roomCode: `ROOM-${stamp}`,
      roomName: 'Phòng kiểm thử restart',
      maxAdults: 2,
      unitCount: 1,
      rateVnd: 1000,
    });
    expect(propertyResult.status).toBe(201);
    propertyId = (propertyResult.body as Property).id;

    await page.goto('/lien-he');
    await page.locator('input[name="name"]').fill(inquiryName);
    await page.locator('input[name="phone"]').fill(inquiryPhone);
    await page.locator('textarea[name="message"]').fill(inquiryMarker);
    const inquiryRequest = page.waitForResponse((response) =>
      response.url().endsWith('/api/v1/inquiries') && response.request().method() === 'POST',
    );
    await page.getByRole('button', { name: /^Gửi yêu cầu/ }).click();
    const inquiryResponse = await inquiryRequest;
    expect([200, 201]).toContain(inquiryResponse.status());
    inquiryId = ((await inquiryResponse.json()) as { id: string }).id;

    execFileSync(
      'docker',
      [
        'compose', '--env-file', '.env.docker', '--env-file', '.env.ports',
        'up', '-d', '--force-recreate', '--no-deps', 'api', 'web', 'worker',
      ],
      { cwd: process.cwd(), encoding: 'utf8', timeout: 90_000 },
    );

    const baseUrl = process.env.BASE_URL ?? 'http://127.0.0.1:18473';
    let healthy = false;
    for (let attempt = 0; attempt < 45; attempt += 1) {
      try {
        const [apiResponse, webResponse] = await Promise.all([
          page.request.get(`${baseUrl}/api/v1/health`, { timeout: 3_000 }),
          page.request.get(baseUrl, { timeout: 3_000 }),
        ]);
        if (apiResponse.ok() && webResponse.ok()) { healthy = true; break; }
      } catch {
        // Wait for both API and web upstreams behind the gateway to come back.
      }
      await page.waitForTimeout(1_000);
    }
    expect(healthy, 'API health after restarting app containers').toBe(true);

    await page.goto('/admin/noi-dung');
    await expect(page.locator('.atop__user')).toBeVisible();
    await expect(page.locator('.content-manager__item').filter({ hasText: articleTitle })).toBeVisible();

    const contentAfter = await browserApi(page, `/content/${contentId}`);
    expect(contentAfter.status).toBe(200);
    expect((contentAfter.body as Content).title).toBe(articleTitle);
    expect((contentAfter.body as Content).publicationStatus).toBe('published');

    const mediaAfter = await browserApi(page, `/media/${mediaId}`);
    expect(mediaAfter.status).toBe(200);
    expect((mediaAfter.body as { altText: string }).altText).toBe(mediaAlt);
    const imageAfter = await page.request.get(`${baseUrl}/media/${media.storageKey}`);
    expect(imageAfter.status()).toBe(200);
    expect((await imageAfter.body()).subarray(8, 12).toString('ascii')).toBe('WEBP');

    const publicArticle = await browserApi(page, `/public/articles/${articleSlug}`);
    expect(publicArticle.status).toBe(200);
    expect((publicArticle.body as { title: string }).title).toBe(articleTitle);
    const publicPage = await page.goto((publicArticle.body as { path: string }).path);
    expect(publicPage?.status()).toBe(200);
    await expect(page.locator('h1')).toContainText(articleTitle);

    const settingAfter = await browserApi(page, '/settings/brand.identity');
    expect(settingAfter.status).toBe(200);
    expect((settingAfter.body as { value: { name: string } }).value.name).toBe(changedIdentity.name);
    const publicSettings = await browserApi(page, '/settings/public');
    expect((publicSettings.body as Record<string, { name: string }>)['brand.identity'].name).toBe(changedIdentity.name);

    const propertyAfter = await browserApi(page, `/properties/${propertyId}`);
    expect(propertyAfter.status).toBe(200);
    expect((propertyAfter.body as Property).title).toBe(`ATG property restart ${stamp}`);

    const inquiryAfter = await browserApi(page, `/inquiries?search=${encodeURIComponent(inquiryName)}&page=1&pageSize=20`);
    expect(inquiryAfter.status).toBe(200);
    expect((inquiryAfter.body as { items: Array<{ id: string; message: string }> }).items
      .some((item) => item.id === inquiryId && item.message.includes(inquiryMarker))).toBe(true);

    // Admin is the persistence source of truth; the public menu intentionally
    // hides links whose target page is still a draft.
    const persistedMenu = await browserApi(page, '/navigation/primary');
    expect(persistedMenu.status).toBe(200);
    expect((persistedMenu.body as MenuBaseline).items.some((item) => item.label === menuLabel)).toBe(true);
  } finally {
    if (contentId) {
      const current = await browserApi(page, `/content/${contentId}`);
      if (current.status === 200) {
        let content = current.body as Content;
        if (content.publicationStatus === 'published') {
          const drafted = await browserApi(page, `/content/${contentId}/status`, 'PATCH', {
            status: 'draft', expectedVersion: content.version,
          });
          expect(drafted.status).toBe(200);
          content = drafted.body as Content;
        }
        const removed = await browserApi(page, `/content/${contentId}?expectedVersion=${content.version}`, 'DELETE');
        expect(removed.status).toBe(204);
      }
    }
    if (propertyId) {
      const current = await browserApi(page, `/properties/${propertyId}`);
      if (current.status === 200) {
        const removed = await browserApi(page, `/properties/${propertyId}?expectedVersion=${(current.body as Property).version}`, 'DELETE');
        expect(removed.status).toBe(204);
      }
    }
    if (mediaId) {
      const removed = await browserApi(page, `/media/${mediaId}`, 'DELETE');
      expect([204, 404]).toContain(removed.status);
    }
    if (settingBaseline) {
      const current = await browserApi(page, '/settings/brand.identity');
      if (current.status === 200 && JSON.stringify((current.body as SettingBaseline).value) !== JSON.stringify(settingBaseline.value)) {
        const latest = current.body as SettingBaseline;
        const restored = settingBaseline.isDefault
          ? await browserApi(page, `/settings/brand.identity?expectedVersion=${latest.version}`, 'DELETE')
          : await browserApi(page, '/settings/brand.identity', 'PUT', { value: settingBaseline.value, expectedVersion: latest.version });
        expect(restored.status).toBe(200);
      }
    }
    if (menuChanged && menuBaseline) {
      const restored = menuBaseline.isDefault
        ? await browserApi(page, '/navigation/primary', 'DELETE')
        : await browserApi(page, '/navigation/primary', 'PUT', {
            items: menuBaseline.items.map((item) => ({
              ...(item.id && /^[0-9a-f]{8}-[0-9a-f-]{27}$/i.test(item.id) ? { id: item.id } : {}),
              label: item.label,
              contentId: item.contentId,
              externalUrl: item.externalUrl,
              enabled: item.enabled,
            })),
          });
      expect(restored.status).toBe(200);
    }
    if (inquiryId) cleanupLocalTestInquiry({ id: inquiryId, name: inquiryName, phone: inquiryPhone, marker: inquiryMarker });
  }
});
