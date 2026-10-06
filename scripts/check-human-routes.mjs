#!/usr/bin/env node
/**
 * Route lint (`npm run seo:routes`).
 *
 * 1. Every human-facing route under src/app uses Vietnamese without diacritics:
 *    lowercase ASCII words joined by hyphens (`^[a-z0-9]+(?:-[a-z0-9]+)*$`).
 *    Dynamic `[param]`, route groups `(group)`, private `_folders` and the
 *    technical exceptions (/api, /media, /_next, robots.txt, sitemap.xml,
 *    favicon/icons) are allowed.
 * 2. No new English route segment outside the whitelist.
 * 3. Every page route is registered in src/lib/routes.ts (PUBLIC_ROUTES / ADMIN_ROUTES).
 * 4. Backend RESERVED_SLUGS and frontend RESERVED_ROOT_SEGMENTS are identical,
 *    and every top-level public route is reserved (a CMS page can't shadow it).
 * 5. Internal link literals (href / router.push / redirect) in src use valid segments.
 */
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('..', import.meta.url));
const appDir = join(root, 'src', 'app');
const SEGMENT = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const TECHNICAL_FILES = new Set(['robots.ts', 'sitemap.ts', 'icon.svg', 'apple-icon.png', 'favicon.ico', 'manifest.ts', 'opengraph-image.tsx', 'twitter-image.tsx']);
const TECHNICAL_PREFIXES = ['/api', '/media', '/_next'];
// English words that are accepted as human route segments (universal/loanword).
const ENGLISH_WHITELIST = new Set(['admin', 'menu', 'combo']);
// Common English route words that must not appear as new human segments.
const ENGLISH_WORDS = new Set([
  'about', 'account', 'articles', 'blog', 'booking', 'bookings', 'cart', 'checkout', 'contact', 'customers', 'dashboard',
  'destinations', 'edit', 'help', 'home', 'inquiries', 'inventory', 'login', 'logout', 'media', 'new', 'news', 'pages',
  'partner', 'partners', 'payments', 'posts', 'profile', 'promotions', 'register', 'reports', 'rooms', 'search',
  'settings', 'signin', 'signup', 'stays', 'tours', 'user', 'users',
]);

const failures = [];
const rows = [];

function walk(dir, segments) {
  for (const entry of readdirSync(dir).sort()) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) {
      walk(full, [...segments, entry]);
      continue;
    }
    if (TECHNICAL_FILES.has(entry) && segments.length === 0) {
      rows.push({ route: `/${entry.replace(/\.(ts|tsx)$/, entry.startsWith('robots') ? '.txt' : entry.startsWith('sitemap') ? '.xml' : '')}`, kind: 'technical', ok: true });
      continue;
    }
    if (!/^(page|route)\.(tsx|ts|jsx|js)$/.test(entry)) continue;
    const urlSegments = segments.filter((segment) => !/^\(.*\)$/.test(segment) && !segment.startsWith('@'));
    const route = `/${urlSegments.join('/')}`.replace(/\/$/, '') || '/';
    const problems = [];
    for (const segment of urlSegments) {
      if (/^\[{1,2}(\.\.\.)?[a-zA-Z][a-zA-Z0-9]*\]{1,2}$/.test(segment)) continue;
      if (segment.startsWith('_')) { problems.push(`private folder "${segment}" in URL`); continue; }
      if (!SEGMENT.test(segment)) {
        const why = /[^\x00-\x7f]/.test(segment) ? 'có dấu/Unicode'
          : /[A-Z]/.test(segment) ? 'chữ hoa'
          : /_/.test(segment) ? 'gạch dưới'
          : /\s/.test(segment) ? 'dấu cách'
          : 'ký tự không hợp lệ';
        problems.push(`"${segment}": ${why}`);
      }
      if (ENGLISH_WORDS.has(segment) && !ENGLISH_WHITELIST.has(segment)) problems.push(`"${segment}": route tiếng Anh ngoài whitelist`);
    }
    if (TECHNICAL_PREFIXES.some((prefix) => route === prefix || route.startsWith(`${prefix}/`))) {
      rows.push({ route, kind: 'technical', ok: true, source: relative(root, full) });
      continue;
    }
    rows.push({ route, kind: entry.startsWith('route') ? 'handler' : 'page', ok: problems.length === 0, problems, source: relative(root, full).split(sep).join('/') });
    if (problems.length) failures.push(`${route} (${relative(root, full)}): ${problems.join('; ')}`);
  }
}

walk(appDir, []);

// 3. Registry coverage.
const registrySource = readFileSync(join(root, 'src', 'lib', 'routes.ts'), 'utf8');
const registered = new Set([...registrySource.matchAll(/:\s*'(\/[^']*)'/g)].map((match) => match[1]));
const actionSegments = [...(registrySource.match(/ADMIN_ACTION_SEGMENTS = \[([^\]]*)\]/)?.[1] ?? '').matchAll(/'([^']+)'/g)].map((match) => match[1]);
for (const row of rows.filter((item) => item.kind === 'page')) {
  const staticPart = row.route.split('/').filter((segment) => segment && !segment.startsWith('['));
  let base = `/${staticPart.join('/')}`;
  if (actionSegments.includes(staticPart.at(-1))) base = `/${staticPart.slice(0, -1).join('/')}`;
  if (base === '/' && row.route !== '/' && row.route.startsWith('/[')) continue; // root CMS page `/[slug]`
  if (!registered.has(base)) {
    row.ok = false;
    row.problems = [...(row.problems ?? []), `chưa đăng ký trong src/lib/routes.ts (${base})`];
    failures.push(`${row.route}: chưa đăng ký trong src/lib/routes.ts (${base})`);
  }
}

// 4. Reserved slug parity.
const listFrom = (source, name) => {
  const body = source.match(new RegExp(`${name} = \\[([\\s\\S]*?)\\]`))?.[1];
  if (!body) throw new Error(`Không tìm thấy ${name}`);
  return [...body.matchAll(/'([^']+)'/g)].map((match) => match[1]).sort();
};
const backendReserved = listFrom(readFileSync(join(root, 'backend', 'src', 'content', 'slug.ts'), 'utf8'), 'RESERVED_SLUGS');
const frontendReserved = listFrom(registrySource, 'RESERVED_ROOT_SEGMENTS');
if (JSON.stringify(backendReserved) !== JSON.stringify(frontendReserved)) {
  failures.push(`RESERVED_SLUGS (backend) ≠ RESERVED_ROOT_SEGMENTS (frontend): ${JSON.stringify(backendReserved)} vs ${JSON.stringify(frontendReserved)}`);
}
for (const row of rows.filter((item) => item.kind === 'page')) {
  const first = row.route.split('/')[1];
  if (first && !first.startsWith('[') && !frontendReserved.includes(first)) {
    failures.push(`/${first}: route gốc chưa nằm trong RESERVED_ROOT_SEGMENTS (trang CMS có thể chiếm)`);
  }
}

// 5. Internal link literals.
const linkProblems = [];
function scanSources(dir) {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) { scanSources(full); continue; }
    if (!/\.(tsx?|mjs)$/.test(entry)) continue;
    const text = readFileSync(full, 'utf8');
    const pattern = /(?:href=|href:\s*|router\.(?:push|replace)\(|redirect\(|permanentRedirect\()\s*[{(]?\s*['"`](\/[^'"`?#$]*)/g;
    for (const match of text.matchAll(pattern)) {
      const path = match[1];
      if (TECHNICAL_PREFIXES.some((prefix) => path === prefix || path.startsWith(`${prefix}/`))) continue;
      if (/\.(png|jpe?g|svg|webp|ico|txt|xml|css|js)$/.test(path)) continue;
      const bad = path.split('/').filter(Boolean).filter((segment) => !SEGMENT.test(segment));
      if (bad.length) linkProblems.push(`${relative(root, full)}: ${path}`);
    }
  }
}
scanSources(join(root, 'src'));
failures.push(...linkProblems.map((item) => `link literal: ${item}`));

const width = Math.max(...rows.map((row) => row.route.length), 10);
console.log(`${'ROUTE'.padEnd(width)}  KIND       VI-ASCII`);
for (const row of rows) console.log(`${row.route.padEnd(width)}  ${row.kind.padEnd(9)}  ${row.ok ? 'PASS' : `FAIL ${row.problems.join('; ')}`}`);
console.log(`\nroutes=${rows.length} pages=${rows.filter((row) => row.kind === 'page').length} reservedParity=${JSON.stringify(backendReserved) === JSON.stringify(frontendReserved) ? 'PASS' : 'FAIL'} linkLiteralProblems=${linkProblems.length}`);
if (failures.length) {
  console.error(`\nROUTE_LINT=FAIL (${failures.length})\n- ${failures.join('\n- ')}`);
  process.exit(1);
}
console.log('ROUTE_LINT=PASS');
