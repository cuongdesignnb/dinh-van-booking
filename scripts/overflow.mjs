// Usage: node scripts/overflow.mjs <url> [width] — lists elements wider than the viewport.
import { chromium } from '@playwright/test';
const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: Number(process.argv[3] ?? 1448), height: 900 } });
await p.goto(process.argv[2], { waitUntil: 'load' });
await p.waitForTimeout(1500);
console.log(
  await p.evaluate(() => {
    const vw = document.documentElement.clientWidth;
    return [...document.querySelectorAll('body *')]
      .map((e) => ({ e, r: e.getBoundingClientRect() }))
      .filter(({ e, r }) => r.right > vw + 1 && r.width > 0 && !e.closest('.drawer, dialog') && !(e.parentElement && e.parentElement.closest('svg')))
      .slice(0, 12)
      .map(({ e, r }) => `${e.tagName}.${String(e.className).slice(0, 60)} right=${Math.round(r.right)}`);
  }),
);
await b.close();
