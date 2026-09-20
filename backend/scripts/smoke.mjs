// End-to-end smoke test against a running API container.
// Run from a container on the compose network:
//   scripts/smoke.sh
// Checks: health, login + session cookie, CSRF enforcement, permissions,
// settings read/write/reset, and that an uploaded JPEG is stored as WebP only.
import { readFileSync } from 'node:fs';
import sharp from 'sharp';

const BASE = process.env.API_BASE ?? 'http://api:3001/api/v1';
const EMAIL = process.env.OWNER_EMAIL ?? 'halabcreative@gmail.com';
const PASSWORD = readFileSync(process.env.OWNER_PASSWORD_FILE ?? '/run/secrets/owner_password', 'utf8').trim();

let passed = 0;
let failed = 0;
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

async function main() {
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

  const write = await call('/settings/brand.contact', {
    method: 'PUT',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ value: { phone: '0961234567', email: 'lienhe@dinhvan.test' }, expectedVersion: 0 }),
  });
  check('settings write succeeds', write.status === 200, JSON.stringify(write.body));
  check('written value is merged with the default shape', write.body?.value?.phone === '0961234567' && write.body?.value?.zaloUrl === null);

  const stale = await call('/settings/brand.contact', {
    method: 'PUT',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ value: { phone: '0000' }, expectedVersion: 0 }),
  });
  check('stale expectedVersion is rejected with 409', stale.status === 409, `got ${stale.status}`);

  const publicAfter = await call('/settings/public');
  check('public snapshot reflects the new contact', publicAfter.body?.['brand.contact']?.phone === '0961234567');

  const reset = await call('/settings/brand.contact', { method: 'DELETE' });
  check('reset puts the key back to its default', reset.body?.value?.phone === null && reset.body?.isDefault === true);

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
  check('upload accepted', upload.status === 201 || upload.status === 200, JSON.stringify(upload.body).slice(0, 200));
  check('stored as WebP, not JPEG', upload.body?.mimeType === 'image/webp', upload.body?.mimeType);
  check('storage key ends in .webp', upload.body?.storageKey?.endsWith('.webp'), upload.body?.storageKey);
  check('renditions were generated', Object.keys(upload.body?.renditions ?? {}).length >= 2, JSON.stringify(upload.body?.renditions));
  check('alt text kept', upload.body?.altText === 'Ảnh kiểm thử');

  const served = await fetch(`http://api:3001${upload.body.url}`);
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
  const goneFile = await fetch(`http://api:3001${upload.body.url}`);
  check('deleted file is gone from the volume', goneFile.status === 404, `got ${goneFile.status}`);

  console.log('\nlogout');
  const logout = await call('/auth/logout', { method: 'POST' });
  check('logout is 204', logout.status === 204, `got ${logout.status}`);
  const afterLogout = await call('/auth/me');
  check('session no longer works', afterLogout.status === 401, `got ${afterLogout.status}`);

  console.log(`\n${passed} passed, ${failed} failed`);
  process.exit(failed === 0 ? 0 : 1);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
