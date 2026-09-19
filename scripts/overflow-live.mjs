// Samples horizontal overflow repeatedly right after load (catches transient overflow from animations).
import { chromium } from '@playwright/test';
const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: Number(process.argv[3] ?? 390), height: 844 } });
await p.goto(process.argv[2], { waitUntil: 'load' });
for (let i = 0; i < 12; i++) {
  const r = await p.evaluate(() => {
    const vw = document.documentElement.clientWidth;
    const o = document.documentElement.scrollWidth - vw;
    const els = o > 0 ? [...document.querySelectorAll('body *')].filter((e) => e.getBoundingClientRect().right > vw + 1 && !(e.parentElement && e.parentElement.closest('svg')) && !e.closest('.drawer')).slice(0, 4).map((e) => `${e.tagName}.${String(e.className).slice(0, 40)}`) : [];
    return { o, els };
  });
  if (r.o > 0) console.log(i, r);
  await p.waitForTimeout(150);
}
await b.close();
