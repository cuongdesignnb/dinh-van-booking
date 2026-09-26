import { expect, test } from '@playwright/test';

test('index gate keeps the local site out of search until approved', async ({ page, request }) => {
  const response = await page.goto('/');
  expect(response?.status()).toBe(200);
  expect(response?.headers()['x-robots-tag']).toContain('noindex');
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', /noindex/);
  await expect(page.locator('link[rel="canonical"]')).toHaveCount(0);
  await expect(page.locator('script[type="application/ld+json"]')).toHaveCount(0);

  const policyResponse = await request.get('/api/v1/public/seo/policy');
  expect(policyResponse.status()).toBe(200);
  expect(policyResponse.headers()['x-robots-tag']).toContain('noindex');
  const policy = await policyResponse.json();
  expect(policy.indexingAllowed).toBe(false);
  expect(policy.canonicalOrigin).toBeNull();
  expect(policy.blockedReasons.length).toBeGreaterThan(0);
  expect(policy.structuredData).toMatchObject({ offers: false, reviews: false, vacationRental: false });
});

test('robots and sitemap expose no draft or unapproved URL', async ({ request }) => {
  const [robotsResponse, sitemapResponse] = await Promise.all([
    request.get('/robots.txt'),
    request.get('/sitemap.xml'),
  ]);
  expect(robotsResponse.status()).toBe(200);
  const robots = await robotsResponse.text();
  expect(robots).toContain('Disallow: /admin/');
  expect(robots).toContain('Disallow: /api/');
  expect(robots).not.toMatch(/^Sitemap:/im);

  expect(sitemapResponse.status()).toBe(200);
  const sitemap = await sitemapResponse.text();
  expect(sitemap).toContain('<urlset');
  expect(sitemap).not.toContain('<loc>');

  const urlsResponse = await request.get('/api/v1/public/seo/urls');
  expect(urlsResponse.status()).toBe(200);
  expect((await urlsResponse.json()).items).toEqual([]);
});

test('public API returns only the currently published database projection', async ({ request }) => {
  for (const path of ['stays', 'combos', 'destinations', 'articles', 'pages']) {
    const response = await request.get(`/api/v1/public/${path}`);
    expect(response.status(), path).toBe(200);
    expect(response.headers()['x-robots-tag']).toContain('noindex');
    expect((await response.json()).items).toEqual([]);
  }
});

test('admin remains noindex and protected API data requires a session', async ({ page, request }) => {
  const adminPage = await page.goto('/admin');
  expect(adminPage?.status()).toBe(200);
  expect(adminPage?.headers()['x-robots-tag']).toContain('noindex');
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', /noindex/);
  await expect(page.getByRole('heading', { name: 'Đăng nhập quản trị' })).toBeVisible();

  const protectedResponse = await request.get('/api/v1/content');
  expect(protectedResponse.status()).toBe(401);
  expect(protectedResponse.headers()['x-robots-tag']).toContain('noindex');
});

test('unresolved legacy detail URLs return 404 instead of a fake listing page', async ({ page }) => {
  const combo = await page.goto('/combo-du-lich?combo=seo-smoke-not-found');
  expect(combo?.status()).toBe(404);
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', /noindex/);

  const destination = await page.goto('/diem-den?d=seo-smoke-not-found');
  expect(destination?.status()).toBe(404);
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', /noindex/);
});

test('unknown content has an actual 404 and filtered URLs are noindex', async ({ page }) => {
  const missing = await page.goto('/seo-smoke-route-not-found');
  expect(missing?.status()).toBe(404);
  await expect(page.locator('meta[name="robots"]')).toHaveCount(1);
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', /noindex/);

  const filtered = await page.goto('/phong-nghi?q=smoke-test');
  expect(filtered?.status()).toBe(200);
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', /noindex/);
  await expect(page.locator('link[rel="canonical"]')).toHaveCount(0);
});
