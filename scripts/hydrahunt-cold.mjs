// Deploys nothing; it just hits every route of a fresh deployment cold, in
// parallel, the way the test suite does. Usage: node scripts/hydrahunt-cold.mjs <baseUrl>
import { chromium } from '@playwright/test';

const base = process.argv[2];
const PATHS = ['/', '/phong-nghi', '/combo-du-lich', '/diem-den', '/lien-he', '/phong-nghi/cuc-phuong-forest-homestay'];
const HOOK = `
  window.__dvbErrors = [];
  window.__dvbSnap = null;
  const snap = (why) => { if (!window.__dvbSnap) window.__dvbSnap = { why, html: document.body ? document.body.innerHTML : '' }; };
  window.addEventListener('error', (e) => { window.__dvbErrors.push(String(e.message || e.error)); snap('error'); });
  const orig = console.error;
  console.error = (...a) => { window.__dvbErrors.push(a.map((x) => (x && x.message) || String(x)).join(' | ')); snap('console.error'); orig.apply(console, a); };
`;

const browser = await chromium.launch();
const results = await Promise.all(
  PATHS.map(async (path) => {
    const ctx = await browser.newContext({ viewport: { width: 1448, height: 1086 } });
    await ctx.addInitScript(HOOK);
    const page = await ctx.newPage();
    const hard = [];
    page.on('pageerror', (e) => hard.push(String(e).slice(0, 200)));
    await page.goto(base + path, { waitUntil: 'load' });
    await page.waitForTimeout(2000);
    const data = await page.evaluate(() => ({ errors: window.__dvbErrors ?? [], snap: window.__dvbSnap }));
    await ctx.close();
    return { path, hard, ...data };
  }),
);
await browser.close();

for (const r of results) {
  const hits = [...r.hard, ...r.errors].filter((e) => /418|423|425|hydrat/i.test(e));
  console.log(`${r.path}: ${hits.length ? 'HIT — ' + [...new Set(hits)].join(' | ') : 'clean'}`);
  if (hits.length && r.snap) {
    const { writeFileSync } = await import('node:fs');
    const ssr = await (await fetch(base + r.path, { cache: 'no-store' })).text();
    const dir = process.env.OUT ?? '.';
    writeFileSync(`${dir}/hydra-ssr.html`, ssr);
    writeFileSync(`${dir}/hydra-dom.html`, r.snap.html);
    console.log(`  saved ${dir}/hydra-ssr.html and ${dir}/hydra-dom.html (snapshot on ${r.snap.why})`);
  }
}
