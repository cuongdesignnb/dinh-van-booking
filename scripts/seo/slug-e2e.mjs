#!/usr/bin/env node
/**
 * Real-stack E2E for the Generate-only slug lifecycle (spec §59, §70, §71).
 *
 *   export LD_LIBRARY_PATH=$HOME/.cache/pw-libs/root/usr/lib/x86_64-linux-gnu
 *   SEO_E2E_BASE=http://localhost:18473 node scripts/seo/slug-e2e.mjs
 *
 * Uses ONLY clearly marked QA content ("[QA-SEO] …", slugs starting with "qa-seo-") and
 * deletes it in `finally`. Business content, settings and indexing values are not touched.
 * Steps:
 *  A. Admin UI (create): typing a title leaves the slug "Chưa tạo"; Generate fills /bai-viet/<slug>;
 *     Save Draft stores exactly that slug.
 *  B. Admin UI (edit): editing title/body/SEO and saving keeps the slug; "Generate lại slug" asks for
 *     confirmation, applies, and the route history lists the old URL as 308.
 *  C. API: generic PUT with `slug` → 400; stale expectedVersion → 409; collision with another
 *     item's current/historical slug → 409 with a -2 suggestion; reserved → 400.
 *  D. Public: publish, change the published URL (confirmation required) → old URL 308 → new URL 200
 *     (one hop), private noindex, sitemap stays empty while indexing is closed; archive → 404.
 *  E. Cleanup: unpublish/delete every QA item; verify none remain.
 */
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { chromium } from '@playwright/test';

const base = (process.env.SEO_E2E_BASE || 'http://localhost:18473').replace(/\/$/, '');
const out = process.env.SEO_QA_OUT || 'artifacts/seo/2026-10-06';
const password = readFileSync(new URL('../../.secrets/owner_password', import.meta.url), 'utf8').trim();
mkdirSync(out, { recursive: true });

const result = { base, startedAt: new Date().toISOString(), steps: [], cleanup: [] };
const step = (name, ok, detail) => {
  result.steps.push({ name, ok: !!ok, ...(detail === undefined ? {} : { detail }) });
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${ok || detail === undefined ? '' : `  — ${JSON.stringify(detail).slice(0, 300)}`}`);
};

const browser = await chromium.launch();
const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
const page = await context.newPage();
const pageErrors = [];
page.on('pageerror', (error) => pageErrors.push(String(error)));
page.on('dialog', (dialog) => void dialog.accept());

const api = (path, init = {}) => page.evaluate(async ({ path, init }) => {
  const csrf = document.cookie.split('; ').find((value) => value.startsWith('dvb_csrf='))?.slice('dvb_csrf='.length);
  // No JSON content-type without a body: Fastify rejects an empty JSON body (e.g. DELETE) with 400.
  const response = await fetch(`/api/v1${path}`, { ...init, credentials: 'include', headers: { ...(init.body ? { 'content-type': 'application/json' } : {}), ...(csrf ? { 'x-csrf-token': decodeURIComponent(csrf) } : {}) } });
  return { status: response.status, body: await response.json().catch(() => null) };
}, { path, init });
const raw = async (path) => {
  const response = await fetch(`${base}${path}`, { redirect: 'manual' });
  return { status: response.status, location: response.headers.get('location'), xRobots: response.headers.get('x-robots-tag'), body: response.status === 200 ? await response.text() : '' };
};
const doc = (text) => ({ type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'text', text }] }] });
const LONG = '[QA-SEO] Nội dung kiểm thử tự động cho vòng đời đường dẫn. Bài này chỉ tồn tại trong vài phút trên môi trường local và sẽ bị xoá ngay sau khi kiểm tra chuyển hướng 308, sitemap và noindex.';
const created = [];

async function login() {
  await page.goto(`${base}/admin/noi-dung`, { waitUntil: 'networkidle' });
  if (await page.locator('#admin-login-title').count()) {
    await page.fill('input[type="email"]', 'admin@dinhvan.local');
    await page.fill('input[type="password"]', password);
    await page.getByRole('button', { name: 'Đăng nhập' }).click();
  }
  await page.getByRole('button', { name: 'Tạo mới' }).waitFor({ timeout: 60000 });
}

async function cleanup(ids = created) {
  for (const id of ids) {
    const current = await api(`/content/${id}`);
    if (current.status === 404) { result.cleanup.push({ id, deleted: 'already' }); continue; }
    let version = current.body.version;
    if (current.body.publicationStatus === 'published') {
      const draft = await api(`/content/${id}/status`, { method: 'PATCH', body: JSON.stringify({ status: 'draft', expectedVersion: version }) });
      version = draft.body?.version ?? version;
    }
    const removed = await api(`/content/${id}?expectedVersion=${version}`, { method: 'DELETE' });
    result.cleanup.push({ id, status: removed.status });
  }
  const left = await api('/content?kind=article&search=%5BQA-SEO%5D&pageSize=100');
  result.cleanup.push({ remainingQaItems: left.body?.total ?? null });
  return left.body?.total === 0;
}

try {
  await login();
  // Leftovers from an interrupted earlier run would occupy the QA slugs: remove them first.
  const leftovers = await api('/content?kind=article&search=%5BQA-SEO%5D&pageSize=100');
  if (leftovers.body?.items?.length) {
    await cleanup(leftovers.body.items.map((item) => item.id));
    result.precleaned = leftovers.body.items.map((item) => item.id);
  }

  // ---------- A. Admin UI create ----------
  await page.goto(`${base}/admin/noi-dung/them`, { waitUntil: 'networkidle' });
  const slugField = page.getByTestId('slug-field');
  await page.getByPlaceholder('Tiêu đề hiển thị trên website').fill('[QA-SEO] Nhà Sàn Forest Home');
  await page.waitForTimeout(300);
  step('A1 typing the title does not create a slug ("Chưa tạo")', (await slugField.getByTestId('slug-current').innerText()).includes('Chưa tạo'));
  await slugField.getByTestId('slug-generate').click();
  await slugField.getByTestId('slug-current').filter({ hasText: '/bai-viet/' }).waitFor({ timeout: 15000 });
  const generatedPath = await slugField.getByTestId('slug-current').innerText();
  step('A2 Generate → /bai-viet/qa-seo-nha-san-forest-home', generatedPath === '/bai-viet/qa-seo-nha-san-forest-home', generatedPath);
  await page.getByPlaceholder('Tiêu đề hiển thị trên website').fill('[QA-SEO] Nhà Sàn Forest Home (đổi tên trước khi lưu)');
  step('A3 editing the title after Generate keeps the generated slug', (await slugField.getByTestId('slug-current').innerText()) === generatedPath);
  await page.screenshot({ path: `${out}/admin-slug-create-1440.png`, fullPage: false });
  await page.getByRole('button', { name: 'Lưu bản nháp' }).click();
  await page.waitForURL(/\/admin\/noi-dung\/[0-9a-f-]{36}$/, { timeout: 30000 });
  const idA = page.url().split('/').pop();
  created.push(idA);
  const savedA = await api(`/content/${idA}`);
  step('A4 Save Draft stores exactly the generated slug (no hidden regenerate)', savedA.body.slug === 'qa-seo-nha-san-forest-home' && savedA.body.path === '/bai-viet/qa-seo-nha-san-forest-home', { slug: savedA.body.slug, path: savedA.body.path });

  // ---------- B. Admin UI edit ----------
  await page.getByPlaceholder('Tiêu đề hiển thị trên website').fill('[QA-SEO] Nhà Sàn Forest Home Cúc Phương');
  await page.getByPlaceholder('Tối đa khoảng 60 ký tự').fill('Nhà Sàn Forest Home Cúc Phương');
  await page.getByPlaceholder('Mô tả khoảng 120–160 ký tự').fill('Mô tả kiểm thử SEO cho nội dung QA, sẽ bị xoá ngay sau khi kiểm tra đường dẫn và chuyển hướng.');
  await Promise.all([
    page.waitForResponse((response) => response.url().includes(`/api/v1/content/${idA}`) && response.request().method() === 'PUT', { timeout: 30000 }),
    page.getByRole('button', { name: 'Lưu thay đổi' }).click(),
  ]);
  await page.waitForTimeout(500);
  const afterTitle = await api(`/content/${idA}`);
  step('B1 editing title + SEO and saving keeps the slug', afterTitle.body.slug === 'qa-seo-nha-san-forest-home' && afterTitle.body.title.includes('Cúc Phương'), { slug: afterTitle.body.slug, title: afterTitle.body.title });
  await page.getByTestId('seo-panel').scrollIntoViewIfNeeded();
  await page.screenshot({ path: `${out}/admin-seo-panel-1440.png`, fullPage: false });
  await slugField.scrollIntoViewIfNeeded();
  await slugField.getByTestId('slug-generate').click();
  await page.getByTestId('slug-confirm').waitFor({ timeout: 15000 });
  const confirmText = await page.getByTestId('slug-confirm').innerText();
  step('B2 "Generate lại slug" asks for confirmation with old/new URL', confirmText.includes('/bai-viet/qa-seo-nha-san-forest-home') && confirmText.includes('/bai-viet/qa-seo-nha-san-forest-home-cuc-phuong'), confirmText);
  await page.screenshot({ path: `${out}/admin-slug-confirm-1440.png`, fullPage: false });
  await page.getByTestId('slug-apply').click();
  await slugField.getByTestId('slug-current').filter({ hasText: 'cuc-phuong' }).waitFor({ timeout: 15000 });
  await page.getByTestId('slug-history').waitFor({ timeout: 15000 });
  await page.getByTestId('slug-history').locator('summary').click();
  const historyText = await page.getByTestId('slug-history').innerText();
  step('B3 route history shows the old URL as 308 with actor', historyText.includes('/bai-viet/qa-seo-nha-san-forest-home') && historyText.includes('308'), historyText);
  await page.screenshot({ path: `${out}/admin-slug-history-1440.png`, fullPage: false });
  // The form must still save after Generate (version refreshed) and must not move the URL.
  await page.getByPlaceholder('Tối đa khoảng 60 ký tự').fill('Nhà Sàn Forest Home Cúc Phương | QA');
  await Promise.all([
    page.waitForResponse((response) => response.url().includes(`/api/v1/content/${idA}`) && response.request().method() === 'PUT', { timeout: 30000 }),
    page.getByRole('button', { name: 'Lưu thay đổi' }).click(),
  ]);
  await page.waitForTimeout(500);
  const afterGenerateSave = await api(`/content/${idA}`);
  step('B4 saving after Generate works and keeps the new slug', afterGenerateSave.body.slug === 'qa-seo-nha-san-forest-home-cuc-phuong', afterGenerateSave.body.slug);

  // ---------- C. API guards ----------
  const putSlug = await api(`/content/${idA}`, { method: 'PUT', body: JSON.stringify({ slug: 'qa-seo-khac', expectedVersion: afterGenerateSave.body.version }) });
  step('C1 generic update with slug → 400 (Save ≠ change slug)', putSlug.status === 400, putSlug);
  const stale = await api(`/content/${idA}/slug/generate`, { method: 'POST', body: JSON.stringify({ source: 'qa seo stale', expectedVersion: afterGenerateSave.body.version - 1 }) });
  step('C2 stale expectedVersion → 409 version_conflict', stale.status === 409 && stale.body?.code === 'version_conflict', stale.body);
  const createB = await api('/content', { method: 'POST', body: JSON.stringify({ kind: 'article', title: '[QA-SEO] Bài B không có slug', body: doc(LONG) }) });
  created.push(createB.body.id);
  step('C3 create without Generate → slug null, no route (no hidden autoslug)', createB.status === 201 && createB.body.slug === null && createB.body.path === null, { status: createB.status, slug: createB.body?.slug, path: createB.body?.path });
  const titleSlugCreate = await api('/content', { method: 'POST', body: JSON.stringify({ kind: 'article', title: '[QA-SEO] x', slug: 'QA SEO Có Dấu' }) });
  step('C4 create with a non-normalised slug → 400 (must come from Generate)', titleSlugCreate.status === 400, titleSlugCreate.body);
  const conflictCurrent = await api(`/content/${createB.body.id}/slug/generate`, { method: 'POST', body: JSON.stringify({ source: 'qa-seo-nha-san-forest-home-cuc-phuong', expectedVersion: createB.body.version }) });
  step('C5 Generate onto another item\'s current slug → 409 slug_conflict + suggestion', conflictCurrent.status === 409 && conflictCurrent.body?.code === 'slug_conflict' && conflictCurrent.body?.suggestion === 'qa-seo-nha-san-forest-home-cuc-phuong-2', conflictCurrent.body);
  const conflictHistory = await api(`/content/${createB.body.id}/slug/generate`, { method: 'POST', body: JSON.stringify({ source: 'qa-seo-nha-san-forest-home', expectedVersion: createB.body.version }) });
  step('C6 historical slug of another item stays reserved → 409', conflictHistory.status === 409 && conflictHistory.body?.code === 'slug_conflict', conflictHistory.body);
  const reserved = await api(`/content/${createB.body.id}/slug/generate`, { method: 'POST', body: JSON.stringify({ source: 'Phòng nghỉ', expectedVersion: createB.body.version }) });
  const reservedPage = await api('/content/slug/preview', { method: 'POST', body: JSON.stringify({ kind: 'page', source: 'Đối tác' }) });
  step('C7 reserved slug → 400 slug_reserved; preview flags reserved root path', reserved.status === 400 && reserved.body?.code === 'slug_reserved' && reservedPage.body?.reserved === true, { reserved: reserved.body, preview: reservedPage.body });
  const previewCollision = await api('/content/slug/preview', { method: 'POST', body: JSON.stringify({ kind: 'article', source: '[QA-SEO] Nhà Sàn Forest Home Cúc Phương' }) });
  step('C8 create preview on a taken slug → visible -2 suggestion', previewCollision.body?.conflict === true && previewCollision.body?.suggestion === 'qa-seo-nha-san-forest-home-cuc-phuong-2', previewCollision.body);
  const propertyPreview = await api('/properties/slug/preview', { method: 'POST', body: JSON.stringify({ source: 'Nhà Sàn Đinh Vân' }) });
  step('C9 stay create preview (catalog endpoint) → /phong-nghi/nha-san-dinh-van', propertyPreview.body?.path === '/phong-nghi/nha-san-dinh-van', propertyPreview.body);

  // ---------- D. Publish + public URL change ----------
  const media = await api('/media?pageSize=100');
  // The Media Library lists ready assets; the publish checklist re-checks public/ready/non-demo.
  const cover = media.body?.items?.find((item) => item.mimeType?.startsWith('image/'));
  step('D0 a Media Library image exists for the QA cover', !!cover, cover?.id);
  let current = await api(`/content/${idA}`);
  const prepared = await api(`/content/${idA}`, { method: 'PUT', body: JSON.stringify({
    body: doc(LONG), metaTitle: 'QA SEO bài kiểm thử', metaDescription: 'Mô tả kiểm thử QA SEO, sẽ bị xoá ngay sau khi kiểm tra.',
    media: [{ mediaId: cover.id, role: 'cover', position: 0 }], details: { article: { authorName: 'QA SEO', readMinutes: 1 } }, expectedVersion: current.body.version,
  }) });
  const published = await api(`/content/${idA}/status`, { method: 'PATCH', body: JSON.stringify({ status: 'published', expectedVersion: prepared.body.version }) });
  step('D1 QA article published (local only)', published.status === 200 && published.body.publicationStatus === 'published', published.body?.problems ?? published.status);
  const oldPath = published.body.path;
  const before = await raw(oldPath);
  step('D2 published URL answers 200 with noindex while indexing is closed', before.status === 200 && /noindex/.test(before.xRobots ?? '') && /<meta name="robots" content="noindex/.test(before.body), { status: before.status, xRobots: before.xRobots });
  const unconfirmed = await api(`/content/${idA}/slug/generate`, { method: 'POST', body: JSON.stringify({ source: 'QA SEO Forest Home Ninh Bình', expectedVersion: published.body.version }) });
  step('D3 changing a published URL without confirmation → 400', unconfirmed.status === 400 && unconfirmed.body?.code === 'public_url_change_unconfirmed', unconfirmed.body);
  const moved = await api(`/content/${idA}/slug/generate`, { method: 'POST', body: JSON.stringify({ source: 'QA SEO Forest Home Ninh Bình', expectedVersion: published.body.version, confirmPublicChange: true }) });
  step('D4 confirmed Generate → new path, redirectCreated', moved.status === 200 && moved.body.redirectCreated === true && moved.body.path === '/bai-viet/qa-seo-forest-home-ninh-binh' && moved.body.previousPath === oldPath, moved.body);
  for (const path of [oldPath, '/bai-viet/qa-seo-nha-san-forest-home']) {
    const hop = await raw(path);
    step(`D5 old URL ${path} → 308 straight to the current URL`, hop.status === 308 && new URL(hop.location, base).pathname === moved.body.path, { status: hop.status, location: hop.location });
  }
  const target = await raw(moved.body.path);
  step('D6 redirect target answers 200 (one hop, no loop)', target.status === 200, target.status);
  const routes = await api(`/content/${idA}/routes`);
  step('D7 route history: 1 current + 2 old URLs, each 308 to current', routes.body.current?.path === moved.body.path && routes.body.history.length === 2 && routes.body.history.every((entry) => entry.redirectStatus === 308), routes.body);
  const sitemap = await raw('/sitemap.xml');
  step('D8 sitemap stays empty while indexing is closed (no QA/old URLs)', sitemap.status === 200 && !sitemap.body.includes('<loc>'), sitemap.body.slice(0, 200));
  const audit = await api(`/content/${idA}/routes`);
  step('D9 audit-backed history has actor names', audit.body.history.every((entry) => !!entry.actor && !!entry.replacedAt), audit.body.history);
  const archived = await api(`/content/${idA}/status`, { method: 'PATCH', body: JSON.stringify({ status: 'archived', expectedVersion: moved.body.version }) });
  const afterArchiveNew = await raw(moved.body.path);
  const afterArchiveOld = await raw(oldPath);
  step('D10 archive → current and old URLs 404 (no redirect to home)', archived.status === 200 && afterArchiveNew.status === 404 && afterArchiveOld.status === 404, { archived: archived.status, current: afterArchiveNew.status, old: afterArchiveOld.status, oldLocation: afterArchiveOld.location });
  step('D11 no page errors in Admin during the UI steps', pageErrors.length === 0, pageErrors);
} catch (error) {
  step('unexpected error', false, String(error?.stack ?? error));
  await page.screenshot({ path: `${out}/slug-e2e-error.png` }).catch(() => undefined);
} finally {
  const clean = await cleanup().catch((error) => { result.cleanup.push({ error: String(error) }); return false; });
  step('E1 cleanup: every QA item deleted, none remain', clean, result.cleanup);
  const gone = await raw('/bai-viet/qa-seo-forest-home-ninh-binh');
  step('E2 deleted QA URL → 404', gone.status === 404, gone.status);
  await browser.close();
  result.finishedAt = new Date().toISOString();
  result.passed = result.steps.filter((item) => item.ok).length;
  result.failed = result.steps.filter((item) => !item.ok).length;
  writeFileSync(`${out}/slug-e2e.json`, JSON.stringify(result, null, 2));
  console.log(`\nSLUG_E2E=${result.failed ? 'FAIL' : 'PASS'} (${result.passed}/${result.steps.length})`);
  if (result.failed) process.exitCode = 1;
}
