import type { MetadataRoute } from 'next';
import { getPublicSite } from '@/lib/api/public';
import { getSeoPolicy } from '@/lib/seo/policy';

// Keep public routes crawlable in both states. When indexing is disabled, the
// root layout emits noindex so search engines can visit pages and remove them
// from results; blocking those URLs here would hide that instruction.
export const dynamic = 'force-dynamic';

export default async function robots(): Promise<MetadataRoute.Robots> {
  let sitemap: string | undefined;
  try {
    const site = await getPublicSite();
    const policy = getSeoPolicy(site);
    if (policy.indexingAllowed && policy.canonicalOrigin) sitemap = `${policy.canonicalOrigin}/sitemap.xml`;
  } catch {
    // A transient API failure must not turn robots.txt into a site-wide block.
  }
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: ['/admin/', '/api/'],
    },
    ...(sitemap ? { sitemap } : {}),
  };
}
