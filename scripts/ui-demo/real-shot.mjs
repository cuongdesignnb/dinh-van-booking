// Usage: node scripts/ui-demo/real-shot.mjs <url> <out.png> [width] — full-page shot of a real stack URL (no demo route interception).
import { chromium } from '@playwright/test';
const [url, out, width = '1440'] = process.argv.slice(2);
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: Number(width), height: Number(width) < 600 ? 844 : 900 } });
const errors = [];
page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
page.on('pageerror', (e) => errors.push(String(e)));
const res = await page.goto(url, { waitUntil: 'load', timeout: 120000 });
await page.evaluate(async () => { await document.fonts.ready; for (let y = 0; y < document.body.scrollHeight; y += 500) { window.scrollTo(0, y); await new Promise((r) => setTimeout(r, 60)); } window.scrollTo(0, 0); });
await page.waitForTimeout(800);
await page.screenshot({ path: out, fullPage: true });
const info = await page.evaluate(() => ({ overflow: document.documentElement.scrollWidth - innerWidth, h1: document.querySelectorAll('h1').length }));
console.log(JSON.stringify({ url, status: res?.status(), ...info, errors }));
await browser.close();
