import { chromium } from '@playwright/test';
const b = await chromium.launch();
const p = await b.newPage();
p.on('console', (m) => m.type() === 'error' && console.log(m.text().slice(0, 1500)));
await p.goto(process.argv[2], { waitUntil: 'load', timeout: 90000 });
await p.waitForTimeout(4000);
await b.close();
