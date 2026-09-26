import type { MetadataRoute } from 'next';
import { getPublicSeoUrls, getPublicSite } from '@/lib/api/public';
import { canonicalUrl, getSeoPolicy } from '@/lib/seo/policy';

export const dynamic = 'force-dynamic';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [site, urls] = await Promise.all([getPublicSite(), getPublicSeoUrls()]);
  const policy = getSeoPolicy(site);
  if (!policy.indexingAllowed || !policy.canonicalOrigin) return [];

  return urls.flatMap((entry) => {
    const url = canonicalUrl(policy.canonicalOrigin!, entry.path);
    if (!url) return [];
    const lastModified = entry.lastModified ? new Date(entry.lastModified) : undefined;
    return [{ url, ...(lastModified && Number.isFinite(lastModified.getTime()) ? { lastModified } : {}) }];
  });
}
