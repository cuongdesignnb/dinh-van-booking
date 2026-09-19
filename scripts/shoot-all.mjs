// Usage: node scripts/shoot-all.mjs [outRoot] [widths...]
// Captures every page at the given widths into artifacts/ui/<page>/.
import { chromium } from '@playwright/test';
import fs from 'node:fs';

const BASE = process.env.BASE_URL ?? 'http://localhost:3100';
const out = process.argv[2] ?? 'artifacts/ui';
const widths = process.argv.slice(3).map(Number);
const H = { 1448: 1086, 1440: 900, 1024: 900, 768: 1024, 390: 844, 375: 812 };
const CHECKOUT = '/dat-phong?stay=cuc-phuong-forest-homestay&room=standard-garden&checkIn=2026-11-13&checkOut=2026-11-15&adults=2&children=0&rooms=1&scenario=baseline';
export const PAGES = {
  '00-homepage': '/',
  '01-phong-nghi': '/phong-nghi',
  '02-chi-tiet-phong': '/phong-nghi/cuc-phuong-forest-homestay',
  '03-combo-du-lich': '/combo-du-lich',
  '04-diem-den': '/diem-den',
  '05-lien-he': '/lien-he',
  '06-dat-phong': CHECKOUT,
};

const browser = await chromium.launch();
for (const [name, path] of Object.entries(PAGES)) {
  fs.mkdirSync(`${out}/${name}`, { recursive: true });
  for (const w of widths.length ? widths : [1448, 1024, 768, 390]) {
    const page = await browser.newPage({ viewport: { width: w, height: H[w] ?? 900 }, deviceScaleFactor: 1 });
    const errors = [];
    page.on('pageerror', (e) => errors.push(String(e).slice(0, 160)));
    page.on('console', (m) => m.type() === 'error' && !m.text().includes('Failed to load resource') && errors.push(m.text().slice(0, 160)));
    await page.goto(BASE + path, { waitUntil: 'load' });
    await page.evaluate(async () => {
      document.documentElement.style.scrollBehavior = 'auto';
      await document.fonts.ready;
      for (let y = 0; y < document.body.scrollHeight; y += 400) {
        window.scrollTo(0, y);
        await new Promise((r) => setTimeout(r, 90));
      }
      window.scrollTo(0, 0);
      await Promise.all([...document.images].map((i) => i.decode().catch(() => {})));
    });
    await page.waitForTimeout(2600);
    await page.addStyleTag({ content: '*,*::before,*::after{animation-play-state:paused!important} .falling-leaves{display:none!important}' });
    const label = w === 1448 ? 'desktop' : w === 390 ? 'mobile' : `w${w}`;
    await page.screenshot({ path: `${out}/${name}/${label}.png` });
    await page.screenshot({ path: `${out}/${name}/${label}-full.png`, fullPage: true });
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    console.log(name, w, 'overflow', overflow, errors.length ? errors : '');
    await page.close();
  }
}
await browser.close();
