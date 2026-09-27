import 'server-only';

import type { Metadata } from 'next';
import type { ImageAsset } from '@/data/types';
import { getPublicSite, type PublicSiteData } from '@/lib/api/public';
import { canonicalUrl, classifySeoQuery, getSeoPolicy, getSiteName } from './policy';

type MetadataOptions = {
  path: string;
  title?: string | null;
  description?: string | null;
  image?: ImageAsset | null;
  noindex?: boolean;
  eligible?: boolean;
  follow?: boolean;
  type?: 'website' | 'article';
  publishedTime?: string | null;
  modifiedTime?: string | null;
  searchParams?: Record<string, string | string[] | undefined>;
  canonical?: boolean;
};

function object(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

function clean(value: unknown): string | undefined {
  if (typeof value !== 'string') return undefined;
  const result = value.replace(/\s+/g, ' ').trim();
  return result || undefined;
}

function applyTemplate(title: string, templateValue: unknown, siteName: string): string {
  const template = clean(templateValue);
  const alreadyBranded = title.toLocaleLowerCase('vi').endsWith(siteName.toLocaleLowerCase('vi'));
  if (template?.includes('%s')) return template.replaceAll('%s', title);
  if (template) return `${title} | ${template}`;
  return alreadyBranded ? title : `${title} | ${siteName}`;
}

function queryString(searchParams: MetadataOptions['searchParams']): URLSearchParams {
  const result = new URLSearchParams();
  for (const [key, raw] of Object.entries(searchParams ?? {})) {
    for (const value of Array.isArray(raw) ? raw : raw === undefined ? [] : [raw]) result.append(key, value);
  }
  return result;
}

function siteImage(site: PublicSiteData, kind: 'og' | 'logo' | 'favicon'): ImageAsset | null {
  const media = object(site.media);
  const asset = media[kind];
  if (!asset || typeof asset !== 'object') return null;
  const candidate = asset as Partial<ImageAsset>;
  return typeof candidate.src === 'string' && candidate.src.startsWith('/') ? candidate as ImageAsset : null;
}

export async function buildPageMetadata(options: MetadataOptions): Promise<Metadata> {
  const site = await getPublicSite();
  return metadataForSite(site, options);
}

export function metadataForSite(site: PublicSiteData, options: MetadataOptions): Metadata {
  const policy = getSeoPolicy(site);
  const seo = object(site.seo);
  const pageSeoRoot = object(site['seo.pages']);
  const pageKey: Record<string, string> = {
    '/': 'home',
    '/phong-nghi': 'stays',
    '/diem-den': 'destinations',
    '/combo-du-lich': 'combos',
    '/lien-he': 'contact',
    '/dat-phong': 'booking',
    '/bai-viet': 'articles',
    '/chuyen-trang': 'staticPages',
  };
  const configuredPageKey = pageKey[options.path.replace(/\/$/, '') || '/'];
  const pageSeo = object(pageSeoRoot[configuredPageKey ?? '']);
  const verification = object(seo.verification);
  const queryPolicy = classifySeoQuery(options.path, queryString(options.searchParams));
  const rawTitle = clean(pageSeo.title) ?? (configuredPageKey ? undefined : clean(options.title)) ?? clean(seo.defaultTitle) ?? clean(site.identity.name);
  const siteName = getSiteName(site);
  const title = rawTitle ? applyTemplate(rawTitle, seo.titleTemplate, siteName) : undefined;
  const description = clean(pageSeo.description) ?? (configuredPageKey ? undefined : clean(options.description)) ?? clean(seo.defaultDescription) ?? clean(site.identity.description);
  const index = policy.indexingAllowed && options.eligible === true && options.noindex !== true && !queryPolicy.noindex;
  const pathForCanonical = queryPolicy.canonicalPath;
  const canonical = options.canonical !== false && pathForCanonical && policy.canonicalOrigin
    ? canonicalUrl(policy.canonicalOrigin, pathForCanonical)
    : null;
  const image = options.image ?? siteImage(site, 'og');
  const imageUrl = image?.src && policy.canonicalOrigin
    ? image.src.startsWith('https://') ? image.src : canonicalUrl(policy.canonicalOrigin, image.src)
    : undefined;
  const openGraphImages = imageUrl ? [{ url: imageUrl, width: image?.width, height: image?.height, ...(image?.alt || title ? { alt: image?.alt || title } : {}) }] : undefined;

  const result: Metadata = {
    title,
    description,
    robots: { index, follow: options.follow ?? true },
    openGraph: {
      type: options.type ?? 'website',
      locale: 'vi_VN',
      ...(siteName ? { siteName } : {}),
      ...(title ? { title } : {}),
      ...(description ? { description } : {}),
      ...(canonical ? { url: canonical } : {}),
      ...(options.type === 'article' ? {
        ...(options.publishedTime ? { publishedTime: options.publishedTime } : {}),
        ...(options.modifiedTime ? { modifiedTime: options.modifiedTime } : {}),
      } : {}),
      ...(openGraphImages ? { images: openGraphImages } : {}),
    },
    twitter: {
      card: openGraphImages ? 'summary_large_image' : 'summary',
      ...(title ? { title } : {}),
      ...(description ? { description } : {}),
      ...(openGraphImages ? { images: openGraphImages.map((entry) => entry.url) } : {}),
    },
  };

  if (canonical) result.alternates = { canonical };
  if (policy.canonicalOrigin) result.metadataBase = new URL(`${policy.canonicalOrigin}/`);
  if (clean(verification.google) || clean(verification.bing)) {
    result.verification = {
      ...(clean(verification.google) ? { google: clean(verification.google) } : {}),
      ...(clean(verification.bing) ? { other: { 'msvalidate.01': clean(verification.bing)! } } : {}),
    };
  }

  const favicon = siteImage(site, 'favicon');
  if (favicon) result.icons = { icon: [{ url: favicon.src, type: 'image/png', sizes: '96x96' }] };
  return result;
}
