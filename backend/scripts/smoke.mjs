// End-to-end smoke test against a running API container.
// Run from a container on the compose network:
//   scripts/smoke.sh
// Checks: health, login + session cookie, CSRF enforcement, permissions,
// settings, catalog property CRUD/versioning, navigation save/restore, media
// WebP processing, and the content publication/route lifecycle.
import { readFileSync } from 'node:fs';
import sharp from 'sharp';

const BASE = process.env.API_BASE ?? 'http://api:3001/api/v1';
// Where /media/** is served from — the same host as the API, minus the prefix.
const MEDIA_BASE = process.env.MEDIA_BASE ?? BASE.replace(/\/api\/v1\/?$/, '');
const EMAIL = process.env.OWNER_EMAIL ?? 'halabcreative@gmail.com';
const PASSWORD = readFileSync(process.env.OWNER_PASSWORD_FILE ?? '/run/secrets/owner_password', 'utf8').trim();

let passed = 0;
let failed = 0;
let testContentId = null;
let testPropertyId = null;
let testContactBaseline = null;
let testContactVersion = null;
let testNavigationBaseline = null;
const testMediaIds = new Set();
const check = (label, ok, detail = '') => {
  if (ok) {
    passed += 1;
    console.log(`  ok   ${label}`);
  } else {
    failed += 1;
    console.log(`  FAIL ${label}${detail ? ` — ${detail}` : ''}`);
  }
};

let cookie = '';
let csrf = '';

async function call(path, init = {}) {
  const headers = { ...(init.headers ?? {}) };
  if (cookie) headers.cookie = cookie;
  if (csrf && init.method && init.method !== 'GET') headers['x-csrf-token'] = csrf;
  const response = await fetch(`${BASE}${path}`, { ...init, headers });
  const setCookie = response.headers.getSetCookie?.() ?? [];
  if (setCookie.length) {
    const jar = new Map(cookie ? cookie.split('; ').map((c) => c.split('=').slice(0, 2)) : []);
    for (const raw of setCookie) {
      const [pair] = raw.split(';');
      const [name, value] = pair.split('=');
      if (value === '') jar.delete(name);
      else jar.set(name, value);
    }
    cookie = [...jar].map(([k, v]) => `${k}=${v}`).join('; ');
  }
  const text = await response.text();
  let body;
  try {
    body = text ? JSON.parse(text) : null;
  } catch {
    body = text;
  }
  return { status: response.status, body };
}

async function cleanup() {
  if (testContentId) {
    const current = await call(`/content/${testContentId}`);
    if (current.status === 200) {
      let node = current.body;
      if (node.publicationStatus === 'published') {
        const draft = await call(`/content/${testContentId}/status`, {
          method: 'PATCH',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ status: 'draft', expectedVersion: node.version }),
        });
        if (draft.status === 200) node = draft.body;
      }
      const removed = await call(`/content/${testContentId}?expectedVersion=${node.version}`, { method: 'DELETE' });
      check('test content is cleaned up', removed.status === 204, `got ${removed.status}`);
    } else {
      check('test content is already absent', current.status === 404, `got ${current.status}`);
    }
    testContentId = null;
  }

  if (testPropertyId) {
    const current = await call(`/properties/${testPropertyId}`);
    if (current.status === 200) {
      const removed = await call(`/properties/${testPropertyId}?expectedVersion=${current.body.version}`, { method: 'DELETE' });
      check('test property and room/catalog rows are cleaned up', removed.status === 204, `got ${removed.status}`);
    } else {
      check('test property is already absent', current.status === 404, `got ${current.status}`);
    }
    testPropertyId = null;
  }

  if (testContactBaseline && testContactVersion !== null) {
    const restored = testContactBaseline.body.isDefault
      ? await call(`/settings/brand.contact?expectedVersion=${testContactVersion}`, { method: 'DELETE' })
      : await call('/settings/brand.contact', {
          method: 'PUT',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ value: testContactBaseline.body.value, expectedVersion: testContactVersion }),
        });
    const baselineRestored = testContactBaseline.body.isDefault
      ? restored.body?.isDefault === true
      : JSON.stringify(restored.body?.value) === JSON.stringify(testContactBaseline.body.value);
    check('test setting restored to its original value', restored.status === 200 && baselineRestored, `got ${restored.status}`);
    testContactVersion = null;
  }

  if (testNavigationBaseline) {
    const baseline = testNavigationBaseline;
    const restored = baseline.isDefault
      ? await call('/navigation/primary', { method: 'DELETE' })
      : await call('/navigation/primary', {
          method: 'PUT',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({
            items: baseline.items.map((item) => ({
              ...(item.id && /^[0-9a-f]{8}-[0-9a-f-]{27}$/i.test(item.id) ? { id: item.id } : {}),
              label: item.label,
              contentId: item.contentId,
              externalUrl: item.externalUrl,
              enabled: item.enabled,
            })),
          }),
        });
    check('test navigation menu restored to its original links', restored.status === 200);
    testNavigationBaseline = null;
  }

  for (const id of testMediaIds) {
    const removed = await call(`/media/${id}`, { method: 'DELETE' });
    check('test media is cleaned up', removed.status === 204 || removed.status === 404, `got ${removed.status}`);
  }
  testMediaIds.clear();
}

async function main() {
  try {
  console.log('health');
  const health = await call('/health');
  check('GET /health is 200 and database up', health.status === 200 && health.body?.database === 'up', JSON.stringify(health.body));

  console.log('\nauth');
  const anonymous = await call('/settings');
  check('GET /settings without session is 401', anonymous.status === 401, `got ${anonymous.status}`);

  const badLogin = await call('/auth/login', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ email: EMAIL, password: 'wrong-password-value' }),
  });
  check('login with wrong password is 401', badLogin.status === 401, `got ${badLogin.status}`);

  const login = await call('/auth/login', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ email: EMAIL, password: PASSWORD }),
  });
  check('login succeeds', login.status === 200, JSON.stringify(login.body));
  csrf = login.body?.csrfToken ?? '';
  check('session cookie is HttpOnly and CSRF token issued', cookie.includes('dvb_session') && !!csrf);
  check('owner has all 21 permissions', login.body?.user?.permissions?.length === 21, `got ${login.body?.user?.permissions?.length}`);

  const me = await call('/auth/me');
  check('GET /auth/me returns the owner', me.body?.email === EMAIL, JSON.stringify(me.body));

  const savedCsrf = csrf;
  csrf = 'not-the-real-token';
  const csrfFail = await call('/settings/brand.identity', {
    method: 'PUT',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ value: {} }),
  });
  check('write without a valid CSRF token is 403', csrfFail.status === 403, `got ${csrfFail.status}`);
  csrf = savedCsrf;

  console.log('\nsettings');
  const list = await call('/settings');
  check('settings list returns every registry key', list.body?.items?.length >= 17, `got ${list.body?.items?.length}`);
  check('defaults are served before anything is stored', list.body?.items?.every((i) => typeof i.version === 'number'));

  const publicBefore = await call('/settings/public');
  check('public snapshot hides private keys', !('media.processing' in (publicBefore.body ?? {})));
  check('public snapshot exposes brand keys', 'brand.identity' in (publicBefore.body ?? {}));

  testContactBaseline = await call('/settings/brand.contact');
  const write = await call('/settings/brand.contact', {
    method: 'PUT',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ value: { phone: '0961234567', email: 'lienhe@dinhvan.test' }, expectedVersion: testContactBaseline.body?.version ?? 0 }),
  });
  if (write.status === 200) testContactVersion = write.body.version;
  check('settings write succeeds', write.status === 200, JSON.stringify(write.body));
  check('written value is merged with the default shape', write.body?.value?.phone === '0961234567' && write.body?.value?.zaloUrl === null);

  const stale = await call('/settings/brand.contact', {
    method: 'PUT',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ value: { phone: '0000' }, expectedVersion: testContactBaseline.body?.version ?? 0 }),
  });
  check('stale expectedVersion is rejected with 409', stale.status === 409, `got ${stale.status}`);

  const publicAfter = await call('/settings/public');
  check('public snapshot reflects the new contact', publicAfter.body?.['brand.contact']?.phone === '0961234567');

  const reset = testContactBaseline.body.isDefault
    ? await call(`/settings/brand.contact?expectedVersion=${write.body.version}`, { method: 'DELETE' })
    : await call('/settings/brand.contact', {
        method: 'PUT',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ value: testContactBaseline.body.value, expectedVersion: write.body.version }),
      });
  const resetMatchesBaseline = testContactBaseline.body.isDefault
    ? reset.body?.isDefault === true
    : JSON.stringify(reset.body?.value) === JSON.stringify(testContactBaseline.body.value);
  check('settings baseline restored after the versioned write', reset.status === 200 && resetMatchesBaseline, `got ${reset.status}`);
  testContactVersion = null;

  console.log('\nmedia');
  const jpeg = await sharp({
    create: { width: 1200, height: 800, channels: 3, background: { r: 46, g: 92, b: 62 } },
  })
    .jpeg({ quality: 90 })
    .toBuffer();

  const form = new FormData();
  form.append('altText', 'Ảnh kiểm thử');
  form.append('file', new Blob([jpeg], { type: 'image/jpeg' }), 'anh-goc.jpg');
  const upload = await call('/media/upload', { method: 'POST', body: form });
  if (upload.body?.id) testMediaIds.add(upload.body.id);
  check('upload accepted', upload.status === 201 || upload.status === 200, JSON.stringify(upload.body).slice(0, 200));
  check('stored as WebP, not JPEG', upload.body?.mimeType === 'image/webp', upload.body?.mimeType);
  check('storage key ends in .webp', upload.body?.storageKey?.endsWith('.webp'), upload.body?.storageKey);
  check('renditions were generated', Object.keys(upload.body?.renditions ?? {}).length >= 2, JSON.stringify(upload.body?.renditions));
  check('alt text kept', upload.body?.altText === 'Ảnh kiểm thử');

  const served = await fetch(`${MEDIA_BASE}${upload.body.url}`);
  const servedBytes = Buffer.from(await served.arrayBuffer());
  check('file is served back over /media', served.status === 200, `got ${served.status}`);
  check('served bytes are a real WebP', servedBytes.subarray(8, 12).toString('ascii') === 'WEBP');

  const png = await sharp({ create: { width: 40, height: 40, channels: 4, background: { r: 1, g: 2, b: 3, alpha: 1 } } })
    .png()
    .toBuffer();
  const badForm = new FormData();
  badForm.append('file', new Blob([Buffer.concat([Buffer.from('not an image'), png])], { type: 'application/pdf' }), 'x.pdf');
  const rejected = await call('/media/upload', { method: 'POST', body: badForm });
  check('disallowed mime type is rejected', rejected.status === 400, `got ${rejected.status}`);

  const library = await call('/media');
  check('library lists the upload', library.body?.total >= 1, JSON.stringify(library.body?.total));

  const removed = await call(`/media/${upload.body.id}`, { method: 'DELETE' });
  check('unused asset can be deleted', removed.status === 204, `got ${removed.status}`);
  if (removed.status === 204) testMediaIds.delete(upload.body.id);
  const goneFile = await fetch(`${MEDIA_BASE}${upload.body.url}`);
  check('deleted file is gone from the volume', goneFile.status === 404, `got ${goneFile.status}`);

  console.log('\nproperty/catalog');
  const propertyStamp = Date.now();
  const propertySlug = `atg-smoke-${propertyStamp}`;
  const propertyCreated = await call('/properties', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      title: `ATG smoke property ${propertyStamp}`,
      code: `ATG-SMOKE-${propertyStamp}`,
      kind: 'Homestay',
      area: 'Cúc Phương, Ninh Bình (kiểm thử local)',
      address: 'Bản ghi tự động kiểm thử; không phải nơi lưu trú bán thật.',
      slug: propertySlug,
      description: `Catalog API smoke marker ${propertyStamp}.`,
      roomCode: `ROOM-${propertyStamp}`,
      roomName: 'Phòng kiểm thử API',
      maxAdults: 2,
      unitCount: 1,
      rateVnd: 1000,
    }),
  });
  if (propertyCreated.body?.id) testPropertyId = propertyCreated.body.id;
  check('catalog property, room type, unit and rate are created',
    propertyCreated.status === 201 && propertyCreated.body?.roomTypes?.[0]?.unitCount === 1 && propertyCreated.body?.roomTypes?.[0]?.rate?.baseRateVnd === 1000,
    JSON.stringify(propertyCreated.body).slice(0, 300));

  if (testPropertyId) {
    const propertyList = await call('/properties');
    check('catalog list reads the inserted PostgreSQL property', propertyList.status === 200 && propertyList.body?.items?.some((item) => item.id === testPropertyId));
    const initialProperty = propertyCreated.body;
    const propertyUpdate = await call(`/properties/${testPropertyId}`, {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        title: `${initialProperty.title} updated`,
        expectedVersion: initialProperty.version,
        expectedContentVersion: initialProperty.contentVersion,
      }),
    });
    check('catalog property update persists with optimistic version', propertyUpdate.status === 200 && propertyUpdate.body?.version > initialProperty.version);
    const staleProperty = await call(`/properties/${testPropertyId}`, {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        title: 'Stale property overwrite must fail',
        expectedVersion: initialProperty.version,
        expectedContentVersion: initialProperty.contentVersion,
      }),
    });
    check('stale catalog version is rejected with 409', staleProperty.status === 409, `got ${staleProperty.status}`);
    const publicDraft = await call(`/public/stays/${propertySlug}`);
    check('draft property stays hidden from public catalogue', publicDraft.status === 404, `got ${publicDraft.status}`);
    const deleted = await call(`/properties/${testPropertyId}?expectedVersion=${propertyUpdate.body?.version}`, { method: 'DELETE' });
    check('catalog test property and dependants can be removed', deleted.status === 204, `got ${deleted.status}`);
    if (deleted.status === 204) testPropertyId = null;
  }

  console.log('\nnavigation');
  const navigationBaseline = await call('/navigation/primary');
  if (navigationBaseline.status === 200) testNavigationBaseline = navigationBaseline.body;
  check('admin navigation reads the persisted menu', navigationBaseline.status === 200 && Array.isArray(navigationBaseline.body?.items));
  if (testNavigationBaseline?.items?.length) {
    const navigationStamp = Date.now();
    const changedLabel = `Trang chủ ATG ${navigationStamp}`;
    const updateItems = testNavigationBaseline.items.map((item, index) => ({
      ...(item.id && /^[0-9a-f]{8}-[0-9a-f-]{27}$/i.test(item.id) ? { id: item.id } : {}),
      label: index === 0 ? changedLabel : item.label,
      contentId: item.contentId,
      externalUrl: item.externalUrl,
      enabled: item.enabled,
    }));
    const menuUpdate = await call('/navigation/primary', {
      method: 'PUT',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ items: updateItems }),
    });
    check('navigation mutation is accepted by the API', menuUpdate.status === 200, `got ${menuUpdate.status}`);
    const publicMenu = await call('/public/navigation/primary');
    check('public navigation reflects the saved menu', publicMenu.status === 200 && publicMenu.body?.some((item) => item.label === changedLabel));
    await cleanup();
    const restoredMenu = await call('/public/navigation/primary');
    check('public navigation returns to baseline after cleanup', restoredMenu.status === 200 && !restoredMenu.body?.some((item) => item.label === changedLabel));
  } else {
    check('navigation baseline has an editable menu item', false, 'no menu items returned');
  }

  console.log('\ncontent');
  const hostile = {
    type: 'doc',
    content: [
      { type: 'heading', attrs: { level: 9 }, content: [{ type: 'text', text: 'Giới thiệu Cúc Phương' }] },
      {
        type: 'paragraph',
        content: [
          { type: 'text', text: 'Rừng quốc gia lâu đời nhất Việt Nam, cách Hà Nội chừng 120 km.', marks: [{ type: 'bold' }] },
          { type: 'text', text: ' Xem thêm', marks: [{ type: 'link', attrs: { href: 'javascript:alert(1)' } }] },
          { type: 'text', text: ' hoặc trang chủ', marks: [{ type: 'link', attrs: { href: 'https://vietnam.test/a' } }] },
        ],
      },
      { type: 'script', content: [{ type: 'text', text: 'alert(1)' }] },
      { type: 'paragraph', attrs: { onclick: 'steal()' }, content: [{ type: 'text', text: 'Đoạn cuối.' }] },
    ],
  };

  const created = await call('/content', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      kind: 'article',
      title: 'Giới thiệu Vườn quốc gia Cúc Phương',
      body: hostile,
      metaTitle: 'Vườn quốc gia Cúc Phương',
      metaDescription: 'Giới thiệu rừng quốc gia lâu đời nhất Việt Nam.',
    }),
  });
  if (created.body?.id) testContentId = created.body.id;
  check('content created', created.status === 201 || created.status === 200, JSON.stringify(created.body).slice(0, 200));
  check('slug is Vietnamese-aware', created.body?.slug === 'gioi-thieu-vuon-quoc-gia-cuc-phuong', created.body?.slug);
  check('public route was reserved', created.body?.path === '/bai-viet/gioi-thieu-vuon-quoc-gia-cuc-phuong', created.body?.path);

  const serialized = JSON.stringify(created.body?.body ?? {});
  check('script node dropped', !serialized.includes('script'));
  check('javascript: link dropped', !serialized.includes('javascript:'));
  check('event-handler attribute dropped', !serialized.includes('onclick'));
  check('heading level clamped to 2-4', created.body?.body?.content?.[0]?.attrs?.level === 4, JSON.stringify(created.body?.body?.content?.[0]?.attrs));
  check('safe external link kept with rel', serialized.includes('noopener noreferrer'));
  check('excerpt derived from the body', (created.body?.excerpt ?? '').includes('Cúc Phương'));

  const publishTooEarly = await call(`/content/${created.body.id}/status`, {
    method: 'PATCH',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ status: 'published', expectedVersion: created.body.version }),
  });
  check('publish blocked while the checklist fails', publishTooEarly.status === 400, `got ${publishTooEarly.status}`);
  check('checklist names the missing cover image', JSON.stringify(publishTooEarly.body).toLowerCase().includes('ảnh đại diện'));

  const cover = new FormData();
  cover.append('altText', 'Rừng Cúc Phương');
  cover.append('file', new Blob([jpeg], { type: 'image/jpeg' }), 'bia.jpg');
  const coverAsset = await call('/media/upload', { method: 'POST', body: cover });
  if (coverAsset.body?.id) testMediaIds.add(coverAsset.body.id);

  const withCover = await call(`/content/${created.body.id}`, {
    method: 'PUT',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      media: [{ mediaId: coverAsset.body.id, role: 'cover', position: 0 }],
      expectedVersion: created.body.version,
    }),
  });
  check('cover image attached', withCover.body?.media?.length === 1, JSON.stringify(withCover.body?.media));

  const published = await call(`/content/${created.body.id}/status`, {
    method: 'PATCH',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ status: 'published', expectedVersion: withCover.body.version }),
  });
  check('publish succeeds once the checklist passes', published.body?.publicationStatus === 'published', JSON.stringify(published.body).slice(0, 160));
  const publicArticle = await call(`/public/articles/${created.body.slug}`);
  check('published article is returned by the public API', publicArticle.status === 200 && publicArticle.body?.title === created.body.title, `got ${publicArticle.status}`);

  const renamed = await call(`/content/${created.body.id}`, {
    method: 'PUT',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ slug: 'rung-cuc-phuong', expectedVersion: published.body.version }),
  });
  check('slug change moves the public path', renamed.body?.path === '/bai-viet/rung-cuc-phuong', renamed.body?.path);
  const oldRoute = await call(`/public/routes/resolve?path=${encodeURIComponent(created.body.path)}`);
  const newRoute = await call(`/public/routes/resolve?path=${encodeURIComponent(renamed.body.path)}`);
  check('old public route resolves as a redirect', oldRoute.body?.kind === 'redirect' && oldRoute.body?.path === renamed.body.path, JSON.stringify(oldRoute.body));
  check('new public route resolves as current', newRoute.body?.kind === 'current', JSON.stringify(newRoute.body));

  const revisions = await call(`/content/${created.body.id}/revisions`);
  check('revisions are recorded', Array.isArray(revisions.body) && revisions.body.length >= 1, String(revisions.body?.length));

  const staleContent = await call(`/content/${created.body.id}`, {
    method: 'PUT',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ title: 'Đổi tên', expectedVersion: 1 }),
  });
  check('stale content version is rejected', staleContent.status === 409, `got ${staleContent.status}`);

  const inUse = await call(`/media/${coverAsset.body.id}`, { method: 'DELETE' });
  check('image in use cannot be deleted', inUse.status === 409, `got ${inUse.status}`);

  const publishedDelete = await call(`/content/${created.body.id}?expectedVersion=${renamed.body.version}`, { method: 'DELETE' });
  check('published content cannot be deleted outright', publishedDelete.status === 409, `got ${publishedDelete.status}`);

  await cleanup();
  const hiddenAfterCleanup = await call('/public/articles/rung-cuc-phuong');
  check('unpublished test article is absent from public API', hiddenAfterCleanup.status === 404, `got ${hiddenAfterCleanup.status}`);

  console.log('\nlogout');
  const logout = await call('/auth/logout', { method: 'POST' });
  check('logout is 204', logout.status === 204, `got ${logout.status}`);
  const afterLogout = await call('/auth/me');
  check('session no longer works', afterLogout.status === 401, `got ${afterLogout.status}`);
  } finally {
    await cleanup();
  }
  console.log(`\n${passed} passed, ${failed} failed`);
  process.exitCode = failed === 0 ? 0 : 1;
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
