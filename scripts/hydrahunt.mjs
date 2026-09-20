/**
 * Hunts an intermittent React hydration mismatch in a production build.
 *
 * For every attempt it fetches the server HTML, then loads the page with a hook
 * installed before any script runs. The hook snapshots the DOM the moment React
 * reports a recoverable error, so the snapshot still shows the server markup
 * that failed to hydrate. The two are then compared element by element and the
 * first divergence is printed with its path.
 *
 * Usage: node scripts/hydrahunt.mjs <baseUrl> [tries] [concurrency]
 */
import { chromium } from '@playwright/test';

const base = process.argv[2];
const tries = Number(process.argv[3] ?? 20);
const concurrency = Number(process.argv[4] ?? 3);
const PATHS = ['/combo-du-lich', '/diem-den', '/lien-he', '/phong-nghi', '/'];

const HOOK = `
  window.__dvbErrors = [];
  window.__dvbSnap = null;
  const snap = (why) => {
    if (!window.__dvbSnap) window.__dvbSnap = { why, html: document.body ? document.body.innerHTML : '' };
  };
  window.addEventListener('error', (e) => {
    window.__dvbErrors.push(String(e.message || e.error));
    snap('error');
  });
  const origError = console.error;
  console.error = (...args) => {
    window.__dvbErrors.push(args.map((a) => (a && a.message) || String(a)).join(' | '));
    snap('console.error');
    origError.apply(console, args);
  };
`;

/** Flatten markup into a list of "path > tag.class" entries for comparison. */
function outline(html) {
  const out = [];
  const stack = [];
  const re = /<(\/?)([a-zA-Z][a-zA-Z0-9-]*)((?:[^>"']|"[^"]*"|'[^']*')*)>/g;
  const VOID = new Set(['br', 'img', 'input', 'hr', 'meta', 'link', 'source', 'path', 'circle', 'rect', 'stop', 'use', 'line', 'polygon', 'ellipse']);
  let m;
  while ((m = re.exec(html))) {
    const [, closing, rawTag, attrs] = m;
    const tag = rawTag.toLowerCase();
    if (closing) {
      const i = stack.lastIndexOf(tag);
      if (i >= 0) stack.length = i;
      continue;
    }
    const cls = (attrs.match(/\sclass="([^"]*)"/) ?? [])[1] ?? '';
    out.push(`${stack.join('>')}>${tag}${cls ? `.${cls.split(/\s+/).slice(0, 2).join('.')}` : ''}`);
    if (!VOID.has(tag) && !/\/\s*$/.test(attrs)) stack.push(tag);
  }
  return out;
}

const browser = await chromium.launch();
let found = false;

for (let round = 0; round < tries && !found; round++) {
  const path = PATHS[round % PATHS.length];
  const url = base + path;

  // Nothing warms the route first: the browser must be the very first request
  // so the serverless function is still cold, which is when the mismatch shows.
  const results = await Promise.all(
    Array.from({ length: concurrency }, async () => {
      const ctx = await browser.newContext({ viewport: { width: 1448, height: 1086 } });
      await ctx.addInitScript(HOOK);
      const page = await ctx.newPage();
      const hard = [];
      page.on('pageerror', (e) => hard.push(String(e).slice(0, 200)));
      await page.goto(url, { waitUntil: 'load' });
      await page.waitForTimeout(1800);
      const data = await page.evaluate(() => ({ errors: window.__dvbErrors ?? [], snap: window.__dvbSnap }));
      await ctx.close();
      return { hard, ...data };
    }),
  );

  const ssr = await (await fetch(url, { cache: 'no-store' })).text();

  for (const r of results) {
    const all = [...r.hard, ...r.errors].filter((e) => /418|423|425|hydrat/i.test(e));
    if (!all.length) continue;
    found = true;
    console.log(`\nHIT on ${path}`);
    console.log('errors:', [...new Set(all)].join('\n        '));
    if (r.snap) {
      const a = outline(ssr.slice(ssr.indexOf('<body')));
      const b = outline(r.snap.html);
      const n = Math.max(a.length, b.length);
      for (let i = 0; i < n; i++) {
        if (a[i] !== b[i]) {
          console.log(`first divergence at node ${i} (snapshot taken on ${r.snap.why})`);
          console.log('server:', a.slice(Math.max(0, i - 2), i + 3).join('\n        '));
          console.log('client:', b.slice(Math.max(0, i - 2), i + 3).join('\n        '));
          break;
        }
      }
    } else {
      console.log('no DOM snapshot was taken');
    }
    break;
  }
  if (!found) process.stdout.write('.');
}

if (!found) console.log(`\nno hydration error in ${tries} rounds × ${concurrency} loads`);
await browser.close();
