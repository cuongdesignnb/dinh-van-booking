// Usage: node scripts/errors.mjs <url>... — prints console errors / page errors (ignores prefetch aborts).
import { chromium } from '@playwright/test';
const b = await chromium.launch();
for (const url of process.argv.slice(2)) {
  const p = await b.newPage({ viewport: { width: 1448, height: 1086 } });
  const errs = [];
  p.on('console', (m) => m.type() === 'error' && errs.push(m.text().slice(0, 240)));
  p.on('pageerror', (e) => errs.push('PAGEERROR ' + String(e).slice(0, 240)));
  p.on('requestfailed', (r) => !r.url().includes('_rsc=') && errs.push('FAILED ' + r.url()));
  await p.goto(url, { waitUntil: 'load' });
  await p.waitForTimeout(1500);
  console.log(url.replace('http://localhost:3100', ''), errs.length ? errs : 'OK');
  await p.close();
}
await b.close();
