import { expect, test } from '@playwright/test';

const routes = [
  ['home', '/'],
  ['stays', '/phong-nghi'],
  ['combos', '/combo-du-lich'],
  ['destinations', '/diem-den'],
  ['contact', '/lien-he'],
  ['checkout-empty', '/dat-phong'],
  ['articles', '/bai-viet'],
  ['static-pages', '/chuyen-trang'],
] as const;

for (const width of [390, 768, 1024, 1440, 1920]) {
  for (const [name, route] of routes) {
    test(`public ${name} renders without overflow or client errors at ${width}px`, async ({ page }) => {
      await page.setViewportSize({ width, height: 900 });
      const pageErrors: string[] = [];
      const hydrationErrors: string[] = [];
      const serverErrors: string[] = [];
      page.on('pageerror', (error) => pageErrors.push(error.message));
      page.on('console', (message) => {
        if (message.type() === 'error' && /hydration failed|hydration mismatch|server rendered html|#418|text content does not match/i.test(message.text())) {
          hydrationErrors.push(message.text());
        }
      });
      page.on('response', (response) => {
        if (response.status() >= 500) serverErrors.push(`${response.status()} ${response.url()}`);
      });

      const response = await page.goto(route, { waitUntil: 'domcontentloaded' });
      expect(response?.status()).toBe(200);
      await page.waitForLoadState('load');
      await expect(page.locator('main')).toBeVisible();
      await expect(page.locator('footer')).toBeVisible();
      expect(await page.locator('main h1').count(), `${route} must have exactly one main heading`).toBe(1);
      expect(await page.locator('img:not([alt])').count(), `${route} has an image without an alt attribute`).toBe(0);
      await page.locator('footer').scrollIntoViewIfNeeded();
      const geometry = await page.evaluate(() => ({
        viewport: window.innerWidth,
        document: document.documentElement.scrollWidth,
        body: document.body.scrollWidth,
      }));
      const protruding = geometry.document > width + 1 ? await page.evaluate(() => [...document.querySelectorAll<HTMLElement>('body *')]
        .map((element) => ({
          tag: element.tagName.toLowerCase(), className: typeof element.className === 'string' ? element.className.slice(0, 100) : '',
          right: Math.round(element.getBoundingClientRect().right), left: Math.round(element.getBoundingClientRect().left),
        }))
        .filter((item) => item.right > window.innerWidth + 1 && item.right < window.innerWidth + 100)
        .sort((a, b) => a.right - b.right)
        .slice(0, 30)) : [];
      expect(geometry.document, JSON.stringify({ geometry, protruding })).toBeLessThanOrEqual(width + 1);
      expect(geometry.body, JSON.stringify({ geometry, protruding })).toBeLessThanOrEqual(width + 1);
      expect(pageErrors).toEqual([]);
      expect(hydrationErrors).toEqual([]);
      expect(serverErrors).toEqual([]);
      if (name === 'stays' || name === 'contact') {
        const heroText = page.locator('.phero__text .rich-content');
        if (await heroText.count()) {
          const colors = await heroText.evaluate((element) => ({
            actual: getComputedStyle(element).color,
            hero: getComputedStyle(element.closest('.phero__text')!).color,
          }));
          expect(colors.actual).toBe(colors.hero);
        }
      }
      if (process.env.DVB_PUBLIC_VISUAL_ARTIFACTS === '1'
        && (width === 390 || width === 1440)
        && (name === 'stays' || name === 'contact')) {
        // Capture the settled composition; the overflow assertion above still runs during reveal motion.
        await page.waitForTimeout(1200);
        await page.screenshot({ path: `artifacts/public-visual-${name}-${width}.png`, fullPage: true });
      }
    });
  }
}
