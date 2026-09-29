// Usage: node scripts/shoot.mjs [url] [outDir]
// Captures the homepage at the verification viewports after fonts, images and
// reveal animations have settled.
import { chromium } from '@playwright/test';
import fs from 'node:fs';

const url = process.argv[2] ?? 'http://localhost:3100/';
const out = process.argv[3] ?? 'docs/screenshots';
const only = process.argv[4];
fs.mkdirSync(out, { recursive: true });

const viewports = [
  [1448, 1086],
  [1440, 900],
  [1024, 900],
  [768, 1024],
  [390, 844],
  [375, 812],
].filter(([w]) => !only || String(w) === only);

const browser = await chromium.launch();
for (const [width, height] of viewports) {
  const page = await browser.newPage({ viewport: { width, height }, deviceScaleFactor: 1 });
  const errors = [];
  page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
  page.on('pageerror', (e) => errors.push(String(e)));
  page.on('requestfailed', (r) => {
    // Next may cancel speculative RSC prefetches while a screenshot is taken;
    // this is not a failed page dependency. Keep every other failure visible.
    const canceledPrefetch = r.resourceType() === 'fetch'
      && new URL(r.url()).searchParams.has('_rsc')
      && r.failure()?.errorText === 'net::ERR_ABORTED';
    if (!canceledPrefetch) errors.push(`FAILED ${r.url()} ${r.failure()?.errorText ?? ''}`);
  });
  await page.goto(url, { waitUntil: 'load' });
  await page.waitForTimeout(800);
  await page.evaluate(async () => {
    document.documentElement.style.scrollBehavior = 'auto';
    await document.fonts.ready;
    for (let y = 0; y < document.body.scrollHeight; y += 400) {
      window.scrollTo(0, y);
      await new Promise((r) => setTimeout(r, 120));
    }
    window.scrollTo(0, 0);
    await Promise.all([...document.images].map((i) => i.decode().catch(() => {})));
  });
  await page.waitForTimeout(3600);
  // Playwright fast-forwards finite reveals to their final state. Pausing all
  // animations instead can freeze a delayed in-viewport promo at opacity 0.
  await page.addStyleTag({ content: '.falling-leaves{display:none!important}' });
  await page.screenshot({ path: `${out}/actual-${width}x${height}.png`, animations: 'disabled' });
  const hidden = await page.evaluate(() => [...document.querySelectorAll('[data-reveal]:not(.is-in)')].filter((el) => el.getClientRects().length).length);
  if (hidden) errors.push(`${hidden} reveal targets never entered the viewport`);
  await page.screenshot({ path: `${out}/actual-${width}x${height}-full.png`, fullPage: true, animations: 'disabled' });
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  console.log(`${width}x${height}`, 'hOverflow', overflow, 'errors', JSON.stringify(errors));
  await page.close();
}
await browser.close();
