// Loads pages in a loop and records failed requests and page errors, so a
// deployment can be watched while it swaps over. Usage: node scripts/deploywatch.mjs <baseUrl> <seconds>
import { chromium } from '@playwright/test';

const base = process.argv[2];
const seconds = Number(process.argv[3] ?? 180);
const PATHS = ['/', '/diem-den', '/combo-du-lich', '/lien-he'];
const stop = Date.now() + seconds * 1000;
const browser = await chromium.launch();
let n = 0;

while (Date.now() < stop) {
  const path = PATHS[n % PATHS.length];
  n++;
  const ctx = await browser.newContext({ viewport: { width: 1200, height: 800 } });
  const page = await ctx.newPage();
  const failures = [];
  const errors = [];
  page.on('response', (r) => {
    if (r.status() >= 400) failures.push(`${r.status()} ${r.url().replace(base, '')}`);
  });
  page.on('requestfailed', (r) => failures.push(`FAILED ${r.url().replace(base, '')}`));
  page.on('pageerror', (e) => errors.push(String(e).slice(0, 120)));
  try {
    await page.goto(base + path, { waitUntil: 'load', timeout: 30000 });
    await page.waitForTimeout(1200);
  } catch (e) {
    errors.push(`goto: ${String(e).slice(0, 80)}`);
  }
  if (failures.length || errors.length) {
    console.log(`[${new Date().toISOString().slice(11, 19)}] ${path}`);
    if (failures.length) console.log('  failed:', [...new Set(failures)].slice(0, 5).join(' | '));
    if (errors.length) console.log('  errors:', [...new Set(errors)].join(' | '));
  }
  await ctx.close();
}
await browser.close();
console.log(`watched ${n} loads`);
