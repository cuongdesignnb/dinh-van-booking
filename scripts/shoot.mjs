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
  page.on('requestfailed', (r) => errors.push(`FAILED ${r.url()}`));
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
  // Freeze ambient loops so captures are deterministic.
  await page.addStyleTag({ content: '*,*::before,*::after{animation-play-state:paused!important} .falling-leaves{display:none!important}' });
  await page.screenshot({ path: `${out}/actual-${width}x${height}.png` });
  const hidden = await page.evaluate(() => [...document.querySelectorAll('[data-reveal]:not(.is-in)')].filter((el) => el.getClientRects().length).length);
  if (hidden) errors.push(`${hidden} reveal targets never entered the viewport`);
  await page.screenshot({ path: `${out}/actual-${width}x${height}-full.png`, fullPage: true });
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  console.log(`${width}x${height}`, 'hOverflow', overflow, 'errors', JSON.stringify(errors));
  await page.close();
}
await browser.close();
