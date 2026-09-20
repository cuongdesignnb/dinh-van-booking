// Compares the server HTML with the hydrated DOM to locate a hydration mismatch.
// Usage: node scripts/ssrdiff.mjs <url>
import { chromium } from '@playwright/test';

const url = process.argv[2];
const ssr = await (await fetch(url)).text();
const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 1448, height: 1086 } });
const errs = [];
p.on('pageerror', (e) => errs.push(String(e).slice(0, 120)));
await p.goto(url, { waitUntil: 'load' });
await p.waitForTimeout(1500);
const dom = await p.evaluate(() => document.querySelector('main')?.outerHTML ?? document.body.outerHTML);
await b.close();

const text = (html) =>
  html
    .replace(/<script[\s\S]*?<\/script>/g, '')
    .replace(/<[^>]+>/g, '\n')
    .split('\n')
    .map((s) => s.trim())
    .filter(Boolean);

const mainStart = ssr.indexOf('<main');
const a = text(ssr.slice(mainStart > 0 ? mainStart : 0));
const c = text(dom);
console.log('errors:', errs);
for (let i = 0; i < Math.max(a.length, c.length); i++) {
  if (a[i] !== c[i]) {
    console.log('first text difference at', i);
    console.log('server:', a.slice(Math.max(0, i - 2), i + 4));
    console.log('client:', c.slice(Math.max(0, i - 2), i + 4));
    break;
  }
}
