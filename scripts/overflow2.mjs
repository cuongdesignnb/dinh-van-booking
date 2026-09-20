// Lists elements that widen the document (ignoring clipped subtrees).
import { chromium } from '@playwright/test';
const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: Number(process.argv[3] ?? 390), height: 844 } });
await p.goto(process.argv[2], { waitUntil: 'load' });
await p.waitForTimeout(2200);
console.log(
  await p.evaluate(() => {
    const vw = document.documentElement.clientWidth;
    const clipped = (el) => {
      let c = el.parentElement;
      while (c) {
        if (getComputedStyle(c).overflowX !== 'visible') return true;
        c = c.parentElement;
      }
      return false;
    };
    return [...document.querySelectorAll('body *')]
      .filter((e) => e.getBoundingClientRect().right > vw + 1 && !clipped(e))
      .slice(0, 6)
      .map((e) => {
        const cls = typeof e.className === 'string' ? e.className : e.getAttribute('class');
        return `${e.tagName}.${cls} r=${Math.round(e.getBoundingClientRect().right)} text=${(e.textContent ?? '').trim().slice(0, 40)}`;
      });
  }),
);
await b.close();
