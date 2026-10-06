import type { MetadataRoute } from 'next';
import { getPublicSeoUrls, getPublicSite } from '@/lib/api/public';
import { canonicalUrl, getSeoPolicy } from '@/lib/seo/policy';
import { ALWAYS_NOINDEX_PATTERN } from '@/lib/routes';

export const dynamic = 'force-dynamic';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [site, urls] = await Promise.all([getPublicSite(), getPublicSeoUrls()]);
  const policy = getSeoPolicy(site);
  if (!policy.indexingAllowed || !policy.canonicalOrigin) return [];

  // The API already returns only current, published, indexable, non-demo routes;
  // private/transactional paths and anything with a query are dropped defensively.
  return urls.flatMap((entry) => {
    if (ALWAYS_NOINDEX_PATTERN.test(entry.path) || /[?#]/.test(entry.path)) return [];
    const url = canonicalUrl(policy.canonicalOrigin!, entry.path);
    if (!url) return [];
    const lastModified = entry.lastModified ? new Date(entry.lastModified) : undefined;
    return [{ url, ...(lastModified && Number.isFinite(lastModified.getTime()) ? { lastModified } : {}) }];
  });
}
