// Usage: DEMO_BASE_URL=http://127.0.0.1:3199 node scripts/ui-demo/shots-batch.mjs <outDir> <width> <name=route>...
// Full-page screenshots of several routes with one browser; prints status/overflow/console errors per route.
import { chromium } from '@playwright/test';

const base = process.env.DEMO_BASE_URL ?? 'http://127.0.0.1:3199';
const [outDir = '/tmp', width = '1440', ...pairs] = process.argv.slice(2);
const browser = await chromium.launch();
for (const pair of pairs) {
  const [name, route] = pair.split('=');
  const page = await browser.newPage({ viewport: { width: Number(width), height: Number(width) < 600 ? 844 : 900 }, deviceScaleFactor: 1 });
  const errors = [];
  page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
  page.on('pageerror', (e) => errors.push(String(e)));
  const response = await page.goto(base + route, { waitUntil: 'load', timeout: 180000 });
  await page.evaluate(async () => {
    document.documentElement.style.scrollBehavior = 'auto';
    await document.fonts.ready;
    for (let y = 0; y < document.body.scrollHeight; y += 500) {
      window.scrollTo(0, y);
      await new Promise((r) => setTimeout(r, 60));
    }
    window.scrollTo(0, 0);
  });
  await page.waitForTimeout(900);
  await page.screenshot({ path: `${outDir}/${name}.png`, fullPage: true });
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  console.log(JSON.stringify({ name, route, width: Number(width), status: response?.status(), overflow, errors }));
  await page.close();
}
await browser.close();
