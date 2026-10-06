#!/usr/bin/env node
/**
 * Targeted technical-SEO QA against a running site (spec §70).
 *
 *   SEO_QA_BASE=http://127.0.0.1:3199 SEO_QA_MODE=approved node scripts/seo/seo-qa.mjs
 *   SEO_QA_BASE=http://localhost:18473 SEO_QA_MODE=gated SEO_QA_OLD_PATH=/bai-viet/a SEO_QA_NEW_PATH=/bai-viet/b node scripts/seo/seo-qa.mjs
 *
 * approved = demo API with DEMO_SEO_INDEX=1 + SEO_INDEXING_ALLOWED=true + SEO_APPROVED_CANONICAL_ORIGIN
 *            (canonical/OG/Twitter/JSON-LD/sitemap must be present and correct);
 * gated    = real stack with indexing closed (everything noindex, no canonical/JSON-LD, empty sitemap).
 * Initial HTML is fetched without JS (SSR check); a headless Chromium pass collects console,
 * page and hydration errors. Writes `${SEO_QA_OUT}/seo-qa-<mode>.json` and prints PASS/FAIL lines.
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { chromium } from '@playwright/test';

const BASE = (process.env.SEO_QA_BASE || 'http://127.0.0.1:3199').replace(/\/$/, '');
const MODE = process.env.SEO_QA_MODE || 'approved';
const ORIGIN = process.env.SEO_QA_ORIGIN || 'https://cucphuongtravel.example.com';
const OUT = process.env.SEO_QA_OUT || 'artifacts/seo/2026-10-06';
const BROWSER = process.env.SEO_QA_BROWSER !== '0';
mkdirSync(OUT, { recursive: true });

const DEMO = {
  stay: '/phong-nghi/demo-nha-rung-cuc-phuong',
  combo: '/combo-du-lich/demo-eco-retreat-cuc-phuong-2n1d',
  destination: '/diem-den/demo-rung-quoc-gia-cuc-phuong',
  article: '/bai-viet/demo-cuc-phuong-mua-nao-dep',
};
const PUBLIC_INDEXABLE = MODE === 'approved'
  ? [
    { path: '/', schema: ['Organization', 'WebSite', 'WebPage'] },
    { path: '/phong-nghi', schema: ['CollectionPage', 'BreadcrumbList', 'ItemList'] },
    { path: DEMO.stay, schema: ['WebPage', 'BreadcrumbList', 'LodgingBusiness'], entityId: '#lodging' },
    { path: '/combo-du-lich', schema: ['CollectionPage', 'BreadcrumbList', 'ItemList'] },
    { path: DEMO.combo, schema: ['WebPage', 'BreadcrumbList', 'TouristTrip'], entityId: '#trip' },
    { path: '/diem-den', schema: ['CollectionPage', 'BreadcrumbList', 'ItemList'] },
    { path: DEMO.destination, schema: ['WebPage', 'BreadcrumbList', 'TouristDestination'], entityId: '#destination' },
    { path: '/bai-viet', schema: ['CollectionPage', 'BreadcrumbList', 'ItemList'] },
    { path: DEMO.article, schema: ['WebPage', 'BreadcrumbList', 'BlogPosting'], entityId: '#article' },
    { path: '/lien-he', schema: ['ContactPage', 'BreadcrumbList', 'Organization'] },
    { path: '/ve-minh', schema: ['AboutPage', 'BreadcrumbList', 'Person'] },
  ]
  : ['/', '/phong-nghi', '/combo-du-lich', '/diem-den', '/bai-viet', '/lien-he', '/ve-minh'].map((path) => ({ path }));
const PRIVATE = ['/dat-phong', '/lich-phong', '/doi-tac', '/admin'];
const FORBIDDEN_SCHEMA_KEYS = ['aggregateRating', 'review', 'geo', 'offers', 'priceRange', 'heldUnits', 'reservedUnits'];

const results = [];
const check = (name, ok, detail = '') => { results.push({ name, ok: !!ok, detail }); };

async function get(path, init = {}) {
  const response = await fetch(`${BASE}${path}`, { redirect: 'manual', headers: { 'user-agent': 'dvb-seo-qa' }, ...init });
  const body = response.status >= 300 && response.status < 400 ? '' : await response.text();
  return { status: response.status, headers: response.headers, body, location: response.headers.get('location') };
}

const attr = (html, re) => html.match(re)?.[1]?.replace(/&amp;/g, '&').replace(/&#x27;|&#39;/g, "'").replace(/&quot;/g, '"') ?? null;
function parse(html) {
  const meta = (name) => attr(html, new RegExp(`<meta[^>]+(?:name|property)="${name}"[^>]*content="([^"]*)"`, 'i'));
  const jsonLd = [...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)].map((m) => m[1]);
  const graphs = jsonLd.map((raw) => { try { return JSON.parse(raw); } catch { return { parseError: true, raw: raw.slice(0, 120) }; } });
  const nodes = graphs.flatMap((graph) => graph['@graph'] ?? [graph]);
  const imgs = [...html.matchAll(/<img\b[^>]*>/g)].map((m) => m[0]);
  return {
    title: attr(html, /<title[^>]*>([^<]*)<\/title>/i),
    description: meta('description'),
    robots: meta('robots'),
    canonical: attr(html, /<link[^>]+rel="canonical"[^>]*href="([^"]*)"/i),
    og: { title: meta('og:title'), description: meta('og:description'), url: meta('og:url'), image: meta('og:image'), type: meta('og:type') },
    twitter: { card: meta('twitter:card'), title: meta('twitter:title'), description: meta('twitter:description'), image: meta('twitter:image') },
    jsonLdRaw: jsonLd,
    graphs,
    types: nodes.map((node) => node['@type']).flat(),
    ids: nodes.map((node) => node['@id']).filter(Boolean),
    nodes,
    h1: (html.match(/<h1[\s>]/g) ?? []).length,
    imgs: imgs.length,
    imgsNoAlt: imgs.filter((tag) => !/\balt="/.test(tag)).length,
    imgsBadAlt: imgs.filter((tag) => /\balt="(?:undefined|null|[^"]*\.(?:jpe?g|png|webp))"/i.test(tag)).length,
    imgsNoSize: imgs.filter((tag) => !/\bwidth="/.test(tag) || !/\bheight="/.test(tag)).length,
    imgsUndefinedSrc: imgs.filter((tag) => /src="[^"]*undefined/.test(tag)).length,
  };
}

const pages = {};
for (const route of PUBLIC_INDEXABLE) {
  const response = await get(route.path);
  const page = parse(response.body);
  pages[route.path] = { status: response.status, xRobots: response.headers.get('x-robots-tag'), ...page, jsonLdRaw: undefined, nodes: undefined };
  const label = `page ${route.path}`;
  check(`${label}: HTTP 200`, response.status === 200, String(response.status));
  check(`${label}: title`, !!page.title, page.title ?? '');
  check(`${label}: meta description`, !!page.description, page.description ?? '');
  check(`${label}: one H1 in SSR HTML`, page.h1 === 1, `h1=${page.h1}`);
  check(`${label}: images have alt + width/height, no undefined src`, page.imgsNoAlt === 0 && page.imgsBadAlt === 0 && page.imgsNoSize === 0 && page.imgsUndefinedSrc === 0,
    `imgs=${page.imgs} noAlt=${page.imgsNoAlt} badAlt=${page.imgsBadAlt} noSize=${page.imgsNoSize} undefinedSrc=${page.imgsUndefinedSrc}`);
  check(`${label}: JSON-LD parses`, page.graphs.every((graph) => !graph.parseError));
  check(`${label}: JSON-LD cannot break out of <script>`, page.jsonLdRaw?.every?.((raw) => !raw.includes('</')) ?? true);
  if (MODE === 'approved') {
    const expectedUrl = `${ORIGIN}${route.path === '/' ? '/' : route.path}`;
    check(`${label}: robots index`, /(^|,\s*)index/.test(page.robots ?? '') && !/noindex/.test(page.robots ?? ''), page.robots ?? '');
    check(`${label}: canonical absolute = clean URL`, page.canonical === expectedUrl, page.canonical ?? 'none');
    check(`${label}: Open Graph title/description/url`, !!page.og.title && !!page.og.description && page.og.url === expectedUrl, JSON.stringify(page.og));
    check(`${label}: Twitter card`, !!page.twitter.card && !!page.twitter.title, JSON.stringify(page.twitter));
    check(`${label}: og:image absolute https when present`, !page.og.image || page.og.image.startsWith(`${ORIGIN}/`), page.og.image ?? 'none');
    const types = page.types.map((type) => (['Hotel', 'Resort', 'Motel', 'BedAndBreakfast'].includes(type) ? 'LodgingBusiness' : type));
    for (const type of route.schema ?? []) check(`${label}: schema ${type}`, types.includes(type) || (type === 'Organization' && types.includes('TravelAgency')), page.types.join(','));
    check(`${label}: schema ids absolute on the approved origin`, page.ids.every((id) => id.startsWith(`${ORIGIN}/`)), page.ids.join(' '));
    check(`${label}: stable WebPage/breadcrumb ids`, page.ids.includes(`${expectedUrl}#webpage`) && (route.path === '/' || page.ids.includes(`${expectedUrl}#breadcrumb`)), page.ids.join(' '));
    if (route.entityId) check(`${label}: entity id ${route.entityId}`, page.ids.includes(`${expectedUrl}${route.entityId}`), page.ids.join(' '));
    const json = JSON.stringify(page.graphs);
    check(`${label}: no rating/review/geo/offer/internal counters in schema`, FORBIDDEN_SCHEMA_KEYS.every((key) => !json.includes(`"${key}"`)));
    check(`${label}: no Docker/local host in metadata`, !/localhost|127\.0\.0\.1|\/\/web[:/]|\/\/api[:/]/.test(`${page.canonical ?? ''} ${page.og.url ?? ''} ${page.og.image ?? ''} ${json}`));
    const crumbs = page.nodes?.find?.((node) => node['@type'] === 'BreadcrumbList');
    if (route.path !== '/') check(`${label}: breadcrumb JSON-LD present`, !!crumbs);
  } else {
    check(`${label}: robots noindex (indexing closed)`, /noindex/.test(page.robots ?? '') || /noindex/.test(response.headers.get('x-robots-tag') ?? ''), `${page.robots} / ${response.headers.get('x-robots-tag')}`);
    check(`${label}: no canonical while closed`, !page.canonical, page.canonical ?? '');
    check(`${label}: no JSON-LD while closed`, page.graphs.length === 0, String(page.graphs.length));
  }
}

// Private / transactional routes.
for (const path of PRIVATE) {
  const response = await get(path);
  const page = parse(response.body);
  check(`private ${path}: noindex (meta or header)`, /noindex/.test(page.robots ?? '') || /noindex/.test(response.headers.get('x-robots-tag') ?? ''), `${page.robots} / ${response.headers.get('x-robots-tag')}`);
  check(`private ${path}: X-Robots-Tag noindex header`, /noindex/.test(response.headers.get('x-robots-tag') ?? ''), response.headers.get('x-robots-tag') ?? 'none');
  check(`private ${path}: no canonical, no JSON-LD`, !page.canonical && page.graphs.length === 0, `${page.canonical} ${page.graphs.length}`);
}

// Query handling.
{
  const tracked = parse((await get('/phong-nghi?utm_source=newsletter&gclid=abc')).body);
  const filtered = parse((await get('/phong-nghi?sort=price&minPrice=100000')).body);
  const dated = parse((await get('/lich-phong?checkIn=2026-11-01&checkOut=2026-11-02')).body);
  if (MODE === 'approved') {
    check('query: UTM/gclid → canonical clean URL, still index', tracked.canonical === `${ORIGIN}/phong-nghi` && !/noindex/.test(tracked.robots ?? ''), `${tracked.canonical} ${tracked.robots}`);
    const detail = parse((await get(`${DEMO.stay}?checkIn=2026-11-01&checkOut=2026-11-02&adults=2`)).body);
    check('query: detail with dates → canonical clean detail URL', detail.canonical === `${ORIGIN}${DEMO.stay}`, detail.canonical ?? 'none');
  }
  check('query: sort/filter → noindex, no canonical, no JSON-LD', /noindex/.test(filtered.robots ?? '') && !filtered.canonical && filtered.graphs.length === 0, `${filtered.robots} ${filtered.canonical}`);
  check('query: /lich-phong with dates → noindex', /noindex/.test(dated.robots ?? ''), dated.robots ?? '');
}

// Redirects / status codes.
{
  const trailing = await get('/phong-nghi/');
  check('trailing slash → 308 to no-slash URL', trailing.status === 308 && new URL(trailing.location, BASE).pathname === '/phong-nghi', `${trailing.status} ${trailing.location}`);
  const upper = await get('/Phong-Nghi');
  check('uppercase path → 308 lowercase', upper.status === 308 && new URL(upper.location, BASE).pathname === '/phong-nghi', `${upper.status} ${upper.location}`);
  const unknown = await get('/phong-nghi/khong-ton-tai-qa');
  check('unknown detail URL → 404 (not a 200 shell)', unknown.status === 404, String(unknown.status));
  const unknownRoot = await get('/trang-khong-ton-tai-qa');
  check('unknown root URL → 404', unknownRoot.status === 404, String(unknownRoot.status));
  const oldPath = process.env.SEO_QA_OLD_PATH || (MODE === 'approved' ? `${DEMO.stay}-ten-cu` : null);
  const newPath = process.env.SEO_QA_NEW_PATH || (MODE === 'approved' ? DEMO.stay : null);
  if (oldPath && newPath) {
    const old = await get(oldPath);
    const target = old.location ? new URL(old.location, BASE) : null;
    check(`old slug ${oldPath} → 308 ${newPath}`, old.status === 308 && target?.pathname === newPath, `${old.status} ${old.location}`);
    const hop = target ? await get(`${target.pathname}${target.search}`) : null;
    check('redirect is one hop (target answers 200, not another redirect)', hop?.status === 200, String(hop?.status));
    if (hop && MODE === 'approved') check('canonical of the target is the target itself', parse(hop.body).canonical === `${ORIGIN}${newPath}`, parse(hop.body).canonical ?? 'none');
  }
}

// robots.txt / sitemap.xml
{
  const robots = await get('/robots.txt');
  check('robots.txt 200', robots.status === 200);
  check('robots.txt disallows /admin/ and /api/', /Disallow: \/admin\//.test(robots.body) && /Disallow: \/api\//.test(robots.body), robots.body.replace(/\n/g, ' | '));
  check('robots.txt does not block the public site', !/^Disallow: \/\s*$/m.test(robots.body));
  if (MODE === 'approved') check('robots.txt advertises the sitemap on the approved origin', robots.body.includes(`Sitemap: ${ORIGIN}/sitemap.xml`));
  else check('robots.txt has no Sitemap line while closed', !/^Sitemap:/im.test(robots.body));

  const sitemap = await get('/sitemap.xml');
  const locs = [...sitemap.body.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);
  writeFileSync(`${OUT}/sitemap-${MODE}.xml`, sitemap.body);
  check('sitemap.xml 200', sitemap.status === 200);
  if (MODE === 'approved') {
    check('sitemap has URLs', locs.length > 0, String(locs.length));
    check('sitemap: only approved-origin absolute URLs', locs.every((loc) => loc.startsWith(`${ORIGIN}/`)));
    check('sitemap: no /admin /api /dat-phong /doi-tac /lich-phong', locs.every((loc) => !/\/(admin|api|dat-phong|doi-tac|lich-phong)(\/|$)/.test(new URL(loc).pathname)));
    check('sitemap: no query URLs', locs.every((loc) => !loc.includes('?')));
    check('sitemap: no historical redirect URLs', locs.every((loc) => !loc.endsWith('-ten-cu')));
    check('sitemap: contains published detail pages', [DEMO.stay, DEMO.article].every((path) => locs.includes(`${ORIGIN}${path}`)));
    const sample = locs.filter((loc) => !new URL(loc).pathname.startsWith('/chuyen-trang/')).slice(0, 40);
    const statuses = [];
    for (const loc of sample) {
      const path = new URL(loc).pathname;
      const response = await get(path);
      const page = parse(response.body);
      statuses.push({ path, status: response.status, robots: page.robots });
    }
    check('sitemap: every sampled URL answers 200 and is index (no 404/redirect/noindex)', statuses.every((item) => item.status === 200 && !/noindex/.test(item.robots ?? '')), JSON.stringify(statuses.filter((item) => item.status !== 200 || /noindex/.test(item.robots ?? ''))));
  } else {
    check('sitemap: empty while indexing is closed', locs.length === 0, String(locs.length));
  }
}

// Browser pass: console / page / hydration errors on the indexable routes.
if (BROWSER) {
  const browser = await chromium.launch();
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  for (const route of PUBLIC_INDEXABLE) {
    const page = await context.newPage();
    const errors = [];
    page.on('console', (message) => { if (message.type() === 'error' && !/Failed to load resource: the server responded with a status of (401|403|404)/.test(message.text())) errors.push(message.text()); });
    page.on('pageerror', (error) => errors.push(`pageerror: ${error.message}`));
    await page.goto(`${BASE}${route.path}`, { waitUntil: 'networkidle' }).catch((error) => errors.push(`goto: ${error.message}`));
    await page.waitForTimeout(400);
    const hydration = errors.filter((text) => /hydrat|did not match|Minified React error #(418|423|425)/i.test(text));
    check(`browser ${route.path}: 0 hydration errors`, hydration.length === 0, hydration.join(' | ').slice(0, 300));
    check(`browser ${route.path}: 0 console/page errors`, errors.length === 0, errors.join(' | ').slice(0, 300));
    await page.close();
  }
  await browser.close();
}

const failed = results.filter((item) => !item.ok);
writeFileSync(`${OUT}/seo-qa-${MODE}.json`, JSON.stringify({ base: BASE, mode: MODE, origin: ORIGIN, checkedAt: new Date().toISOString(), passed: results.length - failed.length, failed: failed.length, results, pages }, null, 2));
for (const item of results) console.log(`${item.ok ? 'PASS' : 'FAIL'}  ${item.name}${item.ok || !item.detail ? '' : `  — ${item.detail}`}`);
console.log(`\nSEO_QA_${MODE.toUpperCase()}=${failed.length ? 'FAIL' : 'PASS'} (${results.length - failed.length}/${results.length})`);
if (failed.length) process.exitCode = 1;
