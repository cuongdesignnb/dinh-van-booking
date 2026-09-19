// Usage: node scripts/hydra.mjs <url> [timezone] — reports hydration/console errors (repeated loads).
import { chromium } from '@playwright/test';
const b = await chromium.launch();
const ctx = await b.newContext({ timezoneId: process.argv[3] ?? 'Asia/Ho_Chi_Minh', viewport: { width: 1448, height: 1086 } });
for (let i = 0; i < Number(process.env.N ?? 4); i++) {
  const p = await ctx.newPage();
  if (process.env.CPU) { const c = await ctx.newCDPSession(p); await c.send('Emulation.setCPUThrottlingRate', { rate: Number(process.env.CPU) }); }
  const errs = [];
  p.on('console', (m) => m.type() === 'error' && errs.push(m.text().slice(0, 6000)));
  p.on('pageerror', (e) => errs.push(String(e).slice(0, 300)));
  await p.goto(process.argv[2], { waitUntil: 'load', timeout: 120000 });
  await p.waitForTimeout(1500);
  if (errs.length) console.log(i, errs.join('\n---\n'));
  await p.close();
}
await b.close();
