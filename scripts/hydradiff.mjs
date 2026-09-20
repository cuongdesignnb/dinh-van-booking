// Repeats a page load until React reports a hydration error, then prints the
// first place where the server HTML and the hydrated DOM disagree.
// Usage: node scripts/hydradiff.mjs <url> [tries]
import { chromium } from '@playwright/test';

const url = process.argv[2];
const tries = Number(process.argv[3] ?? 8);
const text = (html) =>
  html
    .replace(/<script[\s\S]*?<\/script>/g, '')
    .replace(/<[^>]+>/g, '\n')
    .split('\n')
    .map((s) => s.trim())
    .filter(Boolean);

const b = await chromium.launch();
for (let i = 1; i <= tries; i++) {
  const ssr = await (await fetch(url, { cache: 'no-store' })).text();
  const p = await b.newPage({ viewport: { width: 1448, height: 1086 } });
  if (process.env.SLOW) {
    const cdp = await p.context().newCDPSession(p);
    await cdp.send('Network.enable');
    await cdp.send('Network.emulateNetworkConditions', {
      offline: false,
      latency: 300,
      downloadThroughput: (400 * 1024) / 8,
      uploadThroughput: (400 * 1024) / 8,
    });
    await cdp.send('Emulation.setCPUThrottlingRate', { rate: 6 });
  }
  const errs = [];
  p.on('pageerror', (e) => errs.push(String(e).slice(0, 160)));
  await p.goto(url, { waitUntil: 'load' });
  await p.waitForTimeout(1600);
  const dom = await p.evaluate(() => document.body.outerHTML);
  await p.close();
  if (!errs.length) {
    console.log(`try ${i}: clean`);
    continue;
  }
  console.log(`try ${i}: ${errs.join(' | ')}`);
  const a = text(ssr.slice(ssr.indexOf('<body')));
  const c = text(dom);
  for (let k = 0; k < Math.max(a.length, c.length); k++) {
    if (a[k] !== c[k]) {
      console.log('server:', JSON.stringify(a.slice(Math.max(0, k - 3), k + 3)));
      console.log('client:', JSON.stringify(c.slice(Math.max(0, k - 3), k + 3)));
      break;
    }
  }
  break;
}
await b.close();
