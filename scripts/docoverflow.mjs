// Usage: node scripts/docoverflow.mjs <url> <w1> <w2> ... — prints document horizontal overflow per width.
import { chromium } from '@playwright/test';
const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 1448, height: 900 } });
await p.goto(process.argv[2], { waitUntil: 'load' });
for (const w of process.argv.slice(3)) {
  await p.setViewportSize({ width: Number(w), height: 900 });
  await p.waitForTimeout(600);
  const o = await p.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  console.log(`${w}: ${o}`);
}
await b.close();
