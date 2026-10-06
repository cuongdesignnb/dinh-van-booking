// Responsive / a11y smoke for the UI redesign, rendered against the fictional demo API.
//   export LD_LIBRARY_PATH=/tmp/shot/root/usr/lib/x86_64-linux-gnu   (only on this WSL box)
//   DEMO_BASE_URL=http://127.0.0.1:3199 node scripts/ui-demo/qa.mjs [--only=admin] [--widths=1440,390]
// Per route × width: HTTP status, console / page / hydration errors, horizontal overflow and a
// keyboard-focus probe. Required screenshots (spec §13) go to artifacts/ui-redesign/, every other
// capture to /tmp/ui-qa-shots for manual review. A reduced-motion probe runs once per route.
import { mkdirSync, writeFileSync } from 'node:fs';
import { chromium } from '@playwright/test';
import { installDemoRoutes } from './route.mjs';

const base = process.env.DEMO_BASE_URL || 'http://127.0.0.1:3199';
const arg = (name) => process.argv.find((a) => a.startsWith(`--${name}=`))?.split('=')[1];
const only = arg('only');
const filter = arg('filter');
const widths = (arg('widths') || '1440,1024,768,390').split(',').map(Number);
const artifactDir = process.env.QA_ARTIFACT_DIR || 'artifacts/ui-redesign';
const tmpDir = '/tmp/ui-qa-shots';
mkdirSync(artifactDir, { recursive: true });
mkdirSync(tmpDir, { recursive: true });

const ROUTES = [
  { persona: 'anon', path: '/', key: 'public-home', shots: [1440, 390] },
  { persona: 'anon', path: '/phong-nghi', key: 'public-stays', shots: [1440, 390] },
  { persona: 'anon', path: '/phong-nghi/demo-nha-rung-cuc-phuong', key: 'public-stay-detail', shots: [1440] },
  { persona: 'anon', path: '/combo-du-lich', key: 'public-combos' },
  { persona: 'anon', path: '/combo-du-lich/demo-kham-pha-rung-cuc-phuong-2n1d', key: 'public-combo-detail' },
  { persona: 'anon', path: '/diem-den', key: 'public-destinations' },
  { persona: 'anon', path: '/diem-den/demo-rung-quoc-gia-cuc-phuong', key: 'public-destination-detail' },
  { persona: 'anon', path: '/lien-he', key: 'public-contact' },
  { persona: 'anon', path: '/dat-phong', key: 'public-booking' },
  { persona: 'anon', path: '/dat-phong?stay=demo-nha-rung-cuc-phuong&room=demo-rt-rung-std&checkIn=2026-10-20&checkOut=2026-10-22&adults=2&children=0&rooms=1', key: 'public-booking-form' },
  { persona: 'anon', path: '/lich-phong', key: 'public-availability', shots: [1440], search: true },
  { persona: 'anon', path: '/doi-tac', key: 'partner-login', shots: [1440] },
  { persona: 'partner', path: '/doi-tac?property=demo-prop-rung', key: 'partner-dashboard', shots: [1440] },
  { persona: 'admin', path: '/admin', key: 'admin-dashboard', shots: [1440] },
  { persona: 'admin', path: '/admin/dat-phong', key: 'admin-bookings' },
  { persona: 'admin', path: '/admin/phong-nghi', key: 'admin-stays', shots: [1440] },
  { persona: 'admin', path: '/admin/hang-phong', key: 'admin-room-types', shots: [1440] },
  { persona: 'admin', path: '/admin/ton-phong', key: 'admin-inventory', shots: [1440, 390] },
  { persona: 'admin', path: '/admin/combo-du-lich', key: 'admin-combos' },
  { persona: 'admin', path: '/admin/diem-den', key: 'admin-destinations' },
  { persona: 'admin', path: '/admin/noi-dung', key: 'admin-content' },
  { persona: 'admin', path: '/admin/thu-vien-anh', key: 'admin-media' },
  { persona: 'admin', path: '/admin/khach-hang', key: 'admin-customers' },
  { persona: 'admin', path: '/admin/yeu-cau-tu-van', key: 'admin-inquiries' },
  { persona: 'admin', path: '/admin/doi-tac', key: 'admin-partners', shots: [1440] },
  { persona: 'admin', path: '/admin/doi-tac/cap-quyen', key: 'admin-partner-permission' },
  { persona: 'admin', path: '/admin/menu', key: 'admin-menu', shots: [1440] },
  { persona: 'admin', path: '/admin/cai-dat', key: 'admin-settings', shots: [1440] },
];

const isNoise = (m) => /Failed to load resource: the server responded with a status of 40[134]/.test(m) || /\[demo-route\]/.test(m);

const browser = await chromium.launch({ headless: true });
const results = [];
for (const route of ROUTES) {
  if (only && route.persona !== only && !route.key.startsWith(only)) continue;
  if (filter && !route.key.includes(filter)) continue;
  for (const width of widths) {
    const context = await browser.newContext({ viewport: { width, height: width < 600 ? 844 : 900 }, locale: 'vi-VN', timezoneId: 'Asia/Ho_Chi_Minh', isMobile: width < 600, hasTouch: width < 600 });
    const page = await context.newPage();
    const consoleErrors = [];
    const pageErrors = [];
    page.on('pageerror', (e) => pageErrors.push(e.message.slice(0, 200)));
    page.on('console', (m) => { if (m.type() === 'error' && !isNoise(m.text())) consoleErrors.push(m.text().slice(0, 200)); });
    const log = await installDemoRoutes(page, route.persona);
    let status = 0;
    try {
      const response = await page.goto(`${base}${route.path}`, { waitUntil: 'networkidle', timeout: 45_000 });
      status = response?.status() ?? 0;
      if (route.search) {
        await page.locator('.availability-form button[type="submit"]').first().click();
        await page.waitForSelector('.availability-result, .avl-result', { timeout: 10_000 }).catch(() => {});
      }
      // Walk the page so scroll-reveal sections render before the full-page capture.
      await page.evaluate(async () => {
        for (let y = 0; y < document.body.scrollHeight; y += 300) { window.scrollTo(0, y); await new Promise((r) => setTimeout(r, 110)); }
        window.scrollTo(0, 0);
      });
      await page.waitForTimeout(700);
    } catch (e) { pageErrors.push(`navigation: ${e.message.slice(0, 160)}`); }

    const overflow = await page.evaluate(() => {
      const doc = document.documentElement;
      const over = doc.scrollWidth - doc.clientWidth;
      if (over <= 1) return null;
      const culprits = [];
      for (const el of document.body.querySelectorAll('*')) {
        const r = el.getBoundingClientRect();
        if (r.right > doc.clientWidth + 1 && r.width > 0) {
          const cs = getComputedStyle(el);
          if (cs.position === 'fixed') continue;
          culprits.push(`${el.tagName.toLowerCase()}.${String(el.className).split(' ').slice(0, 2).join('.')} r=${Math.round(r.right)}`);
        }
        if (culprits.length > 4) break;
      }
      return { over, culprits };
    });

    // Keyboard probe: first few Tab stops must show a visible focus indicator.
    const focus = [];
    for (let i = 0; i < 4; i++) {
      await page.keyboard.press('Tab');
      focus.push(await page.evaluate(() => {
        const el = document.activeElement;
        if (!el || el === document.body) return 'body';
        const cs = getComputedStyle(el);
        const visible = (cs.outlineStyle !== 'none' && parseFloat(cs.outlineWidth) > 0) || (cs.boxShadow && cs.boxShadow !== 'none');
        return `${visible ? 'ok' : 'NOFOCUS'}:${el.tagName.toLowerCase()}`;
      }));
    }
    await page.keyboard.press('Escape');
    const focusOk = focus.filter((f) => f !== 'body').every((f) => f.startsWith('ok'));

    const hydration = [...consoleErrors, ...pageErrors].filter((m) => /hydrat|did not match|server rendered HTML/i.test(m));
    const name = route.shots?.includes(width) ? `${artifactDir}/${route.key}-${width}.png` : `${tmpDir}/${route.key}-${width}.png`;
    await page.screenshot({ path: name, fullPage: true }).catch(() => {});

    const row = {
      key: route.key, width, status, console: consoleErrors.length, pageErrors: pageErrors.length, hydration: hydration.length,
      overflow: overflow ? overflow.over : 0, focus: focusOk ? 'ok' : focus.join(','), unhandled: log.unhandled.length,
      details: [...consoleErrors, ...pageErrors, ...(overflow?.culprits ?? []), ...log.unhandled].slice(0, 4),
    };
    results.push(row);
    const ok = status === 200 && !consoleErrors.length && !pageErrors.length && !row.overflow && focusOk;
    console.log(`${ok ? 'OK  ' : 'FAIL'} ${route.key}@${width} status=${status} console=${row.console} page=${row.pageErrors} hydration=${row.hydration} overflow=${row.overflow} focus=${row.focus}${row.details.length ? ` :: ${JSON.stringify(row.details)}` : ''}`);
    await context.close();
  }

  // Reduced motion: no running CSS animation/transition may last longer than a frame.
  if (!widths.includes(1440)) continue;
  const rm = await browser.newContext({ viewport: { width: 1440, height: 900 }, reducedMotion: 'reduce' });
  const page = await rm.newPage();
  await installDemoRoutes(page, route.persona);
  await page.goto(`${base}${route.path}`, { waitUntil: 'networkidle', timeout: 45_000 }).catch(() => {});
  const longAnimations = await page.evaluate(() => document.getAnimations().filter((a) => {
    const t = a.effect?.getComputedTiming?.();
    return t && typeof t.duration === 'number' && t.duration > 20 && a.playState === 'running';
  }).length);
  results.push({ key: route.key, reducedMotion: longAnimations });
  console.log(`${longAnimations ? 'FAIL' : 'OK  '} ${route.key} reduced-motion running-animations=${longAnimations}`);
  await rm.close();
}
await browser.close();
writeFileSync('/tmp/ui-qa-results.json', JSON.stringify(results, null, 2));
const failed = results.filter((r) => r.reducedMotion ? true : r.reducedMotion === undefined && (r.status !== 200 || r.console || r.pageErrors || r.overflow || r.focus !== 'ok'));
console.log(failed.length ? `${failed.length} check(s) failed` : 'All checks passed');
